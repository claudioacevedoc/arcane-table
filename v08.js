(() => {
  'use strict';

  const CURRENT='v0.8';
  const DB_NAME='arcaneTableAudioV08';
  const DB_VERSION=1;
  const CLIP_STORE='clips';
  const PREF_STORE='arcaneTable.web.v0.8.audioPrefs';
  const MAX_CLIPS=20;
  const MAX_MS=10000;
  const ICONS=['🔊','⚔','☠','🔥','👑','✦','🐉','💥','🪄','🔔','🎭','⚡','🩸','🏆','🌀'];

  const app=document.getElementById('app');
  let clips=[];
  let clipMap=new Map();
  let dbPromise=null;
  let viewSounds=false;
  let scheduled=false;
  let enhancing=false;
  let recorder=null;
  let recordingStream=null;
  let recordingChunks=[];
  let recordingStartedAt=0;
  let recordingTimer=null;
  let currentAudio=null;
  let currentAudioUrl=null;
  let playingId=null;
  let statusMessage='';
  let statusKind='';

  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function readPrefs(){
    let p;
    try{p=JSON.parse(localStorage.getItem(PREF_STORE)||'{}')}catch{p={}}
    if(!Array.isArray(p.favorites))p.favorites=[];
    p.favorites=p.favorites.slice(0,5);while(p.favorites.length<5)p.favorites.push(null);
    if(!Number.isFinite(Number(p.volume)))p.volume=.9;
    p.volume=Math.max(0,Math.min(1,Number(p.volume)));
    if(typeof p.muted!=='boolean')p.muted=false;
    return p;
  }
  function writePrefs(p){localStorage.setItem(PREF_STORE,JSON.stringify(p))}
  function setStatus(msg,kind=''){statusMessage=msg;statusKind=kind;const el=document.querySelector('.v08-status');if(el){el.textContent=msg;el.className=`v08-status ${kind}`.trim()}}

  function openDb(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){reject(new Error('IndexedDB no disponible'));return}
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(CLIP_STORE))db.createObjectStore(CLIP_STORE,{keyPath:'id'})};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('No se pudo abrir la biblioteca de audio'));
    });
    return dbPromise;
  }
  async function dbAll(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(CLIP_STORE,'readonly'),r=tx.objectStore(CLIP_STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
  async function dbPut(clip){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(CLIP_STORE,'readwrite'),r=tx.objectStore(CLIP_STORE).put(clip);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
  async function dbDelete(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(CLIP_STORE,'readwrite'),r=tx.objectStore(CLIP_STORE).delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
  async function reloadClips(){
    try{clips=(await dbAll()).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));clipMap=new Map(clips.map(c=>[c.id,c]));sanitizeFavorites();requestEnhance();if(viewSounds)renderSoundScreen(true)}
    catch(e){setStatus(`No se pudo abrir la biblioteca: ${e?.message||e}`,'error')}
  }
  function sanitizeFavorites(){const p=readPrefs();let changed=false;p.favorites=p.favorites.map(id=>{if(id&&!clipMap.has(id)){changed=true;return null}return id});if(changed)writePrefs(p)}
  function newId(){return self.crypto?.randomUUID?.()||`clip-${Date.now()}-${Math.random().toString(36).slice(2)}`}
  function formatDuration(ms){return `${(Math.max(0,Number(ms)||0)/1000).toFixed(1)} s`}

  function requestEnhance(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}

  function favoriteButton(slot,id){
    const c=id?clipMap.get(id):null;
    const icon=c?.icon||'＋';
    const name=c?.name||`Sonido ${slot+1}`;
    return `<button class="v08-quick-sound ${c?'assigned':'empty'} ${playingId===id?'playing':''}" data-v08-quick="${slot}" title="${c?`Reproducir ${esc(name)}`:'Asignar sonido'}"><span>${esc(icon)}</span><b>${esc(c?name:`${slot+1}`)}</b></button>`;
  }
  function ensureTopSoundControls(){
    const tabs=document.querySelector('.tabs');if(!tabs)return;
    let tab=tabs.querySelector('[data-v08-tab]');
    if(!tab){tab=document.createElement('button');tab.className='tab v08-sounds-tab';tab.dataset.v08Tab='1';tab.innerHTML='🔊 SONIDOS';tabs.appendChild(tab)}
    tab.classList.toggle('active',viewSounds);
    if(viewSounds)tabs.querySelectorAll('.tab[data-tab]').forEach(x=>x.classList.remove('active'));
    let bank=tabs.querySelector('.v08-quick-bank');if(!bank){bank=document.createElement('span');bank.className='v08-quick-bank';tabs.appendChild(bank)}
    const p=readPrefs(),html=p.favorites.map((id,i)=>favoriteButton(i,id)).join('');if(bank.innerHTML!==html)bank.innerHTML=html;
  }

  function supportText(){
    if(!window.isSecureContext)return 'La grabación necesita abrir Arcane Table mediante HTTPS.';
    if(!navigator.mediaDevices?.getUserMedia)return 'Este navegador no ofrece acceso al micrófono para esta página.';
    if(!window.MediaRecorder)return 'Este navegador no admite MediaRecorder.';
    return 'El micrófono se solicita solo cuando presionas GRABAR. Las grabaciones quedan guardadas en este dispositivo.';
  }
  function favoritesEditor(){
    const p=readPrefs();
    return p.favorites.map((id,i)=>{const c=id?clipMap.get(id):null;return `<div class="v08-fav-slot ${c?'filled':''}"><div class="v08-slot-num">${i+1}</div><div><strong>${c?`${esc(c.icon||'🔊')} ${esc(c.name)}`:'Sin asignar'}</strong><small>${c?'Acceso rápido superior':'Elige un sonido de la biblioteca'}</small></div>${c?`<button class="v08-icon-btn" data-v08-clear-slot="${i}" title="Quitar de acceso rápido">×</button>`:''}</div>`}).join('');
  }
  function clipRow(c){
    const p=readPrefs(),assigned=p.favorites.map((id,i)=>id===c.id?i+1:null).filter(Boolean);
    const assignButtons=[0,1,2,3,4].map(i=>`<button class="${p.favorites[i]===c.id?'active':''}" data-v08-assign="${esc(c.id)}|${i}">${i+1}</button>`).join('');
    return `<article class="v08-clip-row ${playingId===c.id?'playing':''}" data-v08-clip="${esc(c.id)}">
      <button class="v08-play" data-v08-play="${esc(c.id)}" title="Reproducir">${playingId===c.id?'■':'▶'}</button>
      <select class="v08-icon-select" data-v08-icon="${esc(c.id)}" title="Icono">${ICONS.map(x=>`<option value="${esc(x)}" ${x===(c.icon||'🔊')?'selected':''}>${esc(x)}</option>`).join('')}</select>
      <div class="v08-clip-info"><input data-v08-name="${esc(c.id)}" maxlength="24" value="${esc(c.name||'Sonido')}" aria-label="Nombre del sonido"><small>${formatDuration(c.durationMs)} · ${esc((c.mimeType||'audio').replace('audio/',''))}${assigned.length?` · Mesa ${assigned.join(', ')}`:''}</small></div>
      <div class="v08-assign"><small>MESA</small><div>${assignButtons}</div></div>
      <button class="v08-delete" data-v08-delete="${esc(c.id)}" title="Eliminar">🗑</button>
    </article>`;
  }
  function soundScreenHtml(){
    const p=readPrefs(),recording=recorder&&recorder.state==='recording',support=supportText();
    return `<section class="view v08-sound-view">
      <div class="panel v08-recorder-panel">
        <div class="v08-recorder-head"><div><div class="eyebrow">BIBLIOTECA DE SONIDOS · ${CURRENT}</div><h2>Sonidos personalizados</h2><p>${esc(support)}</p></div><div class="v08-count"><b>${clips.length}</b><span>/ ${MAX_CLIPS}<br>guardados</span></div></div>
        <div class="v08-record-zone ${recording?'recording':''}"><button class="v08-record-btn" ${clips.length>=MAX_CLIPS&&!recording?'disabled':''} data-v08-record>${recording?'■ DETENER':'● GRABAR'}</button><div class="v08-record-meter"><i></i><span data-v08-timer>${recording?'00.0 / 10.0 s':'Máximo 10 segundos por grabación'}</span></div></div>
        <div class="v08-audio-settings"><label>Volumen personalizados <input type="range" min="0" max="100" value="${Math.round(p.volume*100)}" data-v08-volume></label><button class="btn compact" data-v08-mute>${p.muted?'🔇 SILENCIADOS':'🔊 ACTIVOS'}</button><button class="btn compact" data-v08-test ${clips[0]?'':'disabled'}>▶ PROBAR</button></div>
        <div class="v08-status ${esc(statusKind)}">${esc(statusMessage||'Graba un sonido, ponle nombre e icono y asígnalo a uno de los cinco accesos rápidos.')}</div>
      </div>
      <div class="panel v08-favorites-panel"><div class="eyebrow">5 ACCESOS RÁPIDOS</div><h3>Sonidos de Mesa</h3><p>Estos cinco accesos aparecen junto a MAZMORRAS en la barra superior. Puedes reemplazarlos en cualquier momento.</p><div class="v08-fav-grid">${favoritesEditor()}</div></div>
      <div class="panel v08-library-panel"><div class="v08-library-head"><div><div class="eyebrow">BIBLIOTECA LOCAL</div><h3>${clips.length?'Tus grabaciones':'Todavía no hay sonidos'}</h3></div><small>${clips.length}/${MAX_CLIPS}</small></div>
        <div class="v08-library">${clips.length?clips.map(clipRow).join(''):'<div class="v08-empty"><span>🎙</span><strong>Graba tu primer sonido</strong><p>Al terminar quedará disponible para escuchar, renombrar y asignar a los botones rápidos.</p></div>'}</div>
      </div>
    </section>`;
  }
  function renderSoundScreen(force=false){
    const body=document.querySelector('.game-body');if(!body)return;
    if(!force&&body.querySelector('.v08-sound-view'))return;
    body.innerHTML=soundScreenHtml();
    updateRecordingTimer();
  }

  function enhance(){
    if(enhancing)return;enhancing=true;observer.disconnect();
    try{
      document.title='Arcane Table · Web Beta v0.8';
      ensureTopSoundControls();
      if(viewSounds)renderSoundScreen(false);
    }finally{observer.observe(app||document.body,{childList:true,subtree:true});enhancing=false}
  }

  function cleanupRecording(){
    clearInterval(recordingTimer);recordingTimer=null;
    recordingStream?.getTracks?.().forEach(t=>t.stop());recordingStream=null;recorder=null;recordingChunks=[];recordingStartedAt=0;
  }
  function chooseMime(){
    const candidates=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'];
    return candidates.find(t=>window.MediaRecorder?.isTypeSupported?.(t))||'';
  }
  async function startRecording(){
    if(clips.length>=MAX_CLIPS){setStatus(`La biblioteca admite hasta ${MAX_CLIPS} sonidos.`,'warn');return}
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setStatus(supportText(),'error');return}
    try{
      setStatus('Solicitando permiso para usar el micrófono…','');
      recordingStream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=chooseMime(),opts=mime?{mimeType:mime,audioBitsPerSecond:96000}:{audioBitsPerSecond:96000};
      try{recorder=new MediaRecorder(recordingStream,opts)}catch{recorder=new MediaRecorder(recordingStream)}
      recordingChunks=[];recordingStartedAt=performance.now();
      recorder.ondataavailable=e=>{if(e.data?.size)recordingChunks.push(e.data)};
      recorder.onerror=e=>setStatus(`Error de grabación: ${e.error?.message||'desconocido'}`,'error');
      recorder.onstop=async()=>{
        const elapsed=Math.min(MAX_MS,Math.max(100,performance.now()-recordingStartedAt));
        const type=recorder?.mimeType||mime||recordingChunks[0]?.type||'audio/webm';
        const blob=new Blob(recordingChunks,{type});
        try{
          if(!blob.size)throw new Error('La grabación quedó vacía');
          const clip={id:newId(),name:`Sonido ${clips.length+1}`,icon:'🔊',durationMs:Math.round(elapsed),mimeType:type,createdAt:Date.now(),blob};
          await dbPut(clip);
          const p=readPrefs(),free=p.favorites.findIndex(x=>!x);if(free>=0){p.favorites[free]=clip.id;writePrefs(p)}
          setStatus(`“${clip.name}” guardado${free>=0?` y asignado a Mesa ${free+1}`:''}.`,'ok');
        }catch(e){setStatus(`No se pudo guardar: ${e?.message||e}`,'error')}
        cleanupRecording();await reloadClips();
      };
      recorder.start();
      recordingTimer=setInterval(()=>{updateRecordingTimer();if(recorder?.state==='recording'&&performance.now()-recordingStartedAt>=MAX_MS)stopRecording()},100);
      setStatus('Grabando… toca DETENER o espera al límite de 10 segundos.','recording');
      if(viewSounds)renderSoundScreen(true);
    }catch(e){cleanupRecording();const denied=e?.name==='NotAllowedError';setStatus(denied?'Permiso de micrófono rechazado. Puedes habilitarlo en los permisos del navegador.':`No se pudo iniciar el micrófono: ${e?.message||e}`,'error');if(viewSounds)renderSoundScreen(true)}
  }
  function stopRecording(){if(recorder?.state==='recording')recorder.stop()}
  function updateRecordingTimer(){
    const t=document.querySelector('[data-v08-timer]');if(!t||!recordingStartedAt||recorder?.state!=='recording')return;
    const elapsed=Math.min(MAX_MS,performance.now()-recordingStartedAt);t.textContent=`${(elapsed/1000).toFixed(1).padStart(4,'0')} / 10.0 s`;
  }

  function stopPlayback(){
    if(currentAudio){try{currentAudio.pause();currentAudio.currentTime=0}catch{}}
    if(currentAudioUrl)URL.revokeObjectURL(currentAudioUrl);
    currentAudio=null;currentAudioUrl=null;playingId=null;requestEnhance();if(viewSounds)renderSoundScreen(true);
  }
  async function playClip(id){
    const c=clipMap.get(id);if(!c?.blob){setStatus('Ese sonido ya no está disponible en este dispositivo.','error');return}
    if(playingId===id){stopPlayback();return}
    stopPlayback();
    try{
      const p=readPrefs();currentAudioUrl=URL.createObjectURL(c.blob);currentAudio=new Audio(currentAudioUrl);currentAudio.volume=p.muted?0:p.volume;playingId=id;
      currentAudio.onended=()=>stopPlayback();currentAudio.onerror=()=>{setStatus('No se pudo reproducir ese formato de audio.','error');stopPlayback()};
      await currentAudio.play();requestEnhance();if(viewSounds)renderSoundScreen(true);
    }catch(e){setStatus(`No se pudo reproducir: ${e?.message||e}`,'error');stopPlayback()}
  }
  async function updateClip(id,patch){const c=clipMap.get(id);if(!c)return;Object.assign(c,patch);try{await dbPut(c);await reloadClips()}catch(e){setStatus(`No se pudo actualizar: ${e?.message||e}`,'error')}}
  async function deleteClip(id){
    const c=clipMap.get(id);if(!c)return;if(playingId===id)stopPlayback();
    try{await dbDelete(id);const p=readPrefs();p.favorites=p.favorites.map(x=>x===id?null:x);writePrefs(p);setStatus(`“${c.name}” eliminado.`,'ok');await reloadClips()}catch(e){setStatus(`No se pudo eliminar: ${e?.message||e}`,'error')}
  }
  function assignSlot(id,slot){const p=readPrefs();p.favorites[slot]=id;writePrefs(p);setStatus(`Asignado a Mesa ${slot+1}.`,'ok');requestEnhance();if(viewSounds)renderSoundScreen(true)}
  function clearSlot(slot){const p=readPrefs();p.favorites[slot]=null;writePrefs(p);requestEnhance();if(viewSounds)renderSoundScreen(true)}

  document.addEventListener('click',e=>{
    const coreTab=e.target.closest?.('.tab[data-tab]');if(coreTab){viewSounds=false;return}
    const tab=e.target.closest?.('[data-v08-tab]');if(tab){e.preventDefault();e.stopPropagation();viewSounds=true;requestEnhance();return}
    const quick=e.target.closest?.('[data-v08-quick]');if(quick){e.preventDefault();e.stopPropagation();const slot=Number(quick.dataset.v08Quick),id=readPrefs().favorites[slot];if(id)playClip(id);else{viewSounds=true;requestEnhance()}return}
    const record=e.target.closest?.('[data-v08-record]');if(record){e.preventDefault();e.stopPropagation();if(recorder?.state==='recording')stopRecording();else startRecording();return}
    const play=e.target.closest?.('[data-v08-play]');if(play){e.preventDefault();e.stopPropagation();playClip(play.dataset.v08Play);return}
    const del=e.target.closest?.('[data-v08-delete]');if(del){e.preventDefault();e.stopPropagation();deleteClip(del.dataset.v08Delete);return}
    const assign=e.target.closest?.('[data-v08-assign]');if(assign){e.preventDefault();e.stopPropagation();const [id,s]=assign.dataset.v08Assign.split('|');assignSlot(id,Number(s));return}
    const clear=e.target.closest?.('[data-v08-clear-slot]');if(clear){e.preventDefault();e.stopPropagation();clearSlot(Number(clear.dataset.v08ClearSlot));return}
    const mute=e.target.closest?.('[data-v08-mute]');if(mute){e.preventDefault();e.stopPropagation();const p=readPrefs();p.muted=!p.muted;writePrefs(p);if(currentAudio)currentAudio.volume=p.muted?0:p.volume;if(viewSounds)renderSoundScreen(true);requestEnhance();return}
    const test=e.target.closest?.('[data-v08-test]');if(test&&clips[0]){e.preventDefault();e.stopPropagation();playClip(clips[0].id)}
  },true);

  document.addEventListener('input',e=>{
    if(e.target.matches?.('[data-v08-volume]')){const p=readPrefs();p.volume=Math.max(0,Math.min(1,Number(e.target.value)/100));writePrefs(p);if(currentAudio&&!p.muted)currentAudio.volume=p.volume}
  },true);
  document.addEventListener('change',e=>{
    const name=e.target.closest?.('[data-v08-name]');if(name){const value=name.value.trim()||'Sonido';updateClip(name.dataset.v08Name,{name:value.slice(0,24)});return}
    const icon=e.target.closest?.('[data-v08-icon]');if(icon){updateClip(icon.dataset.v08Icon,{icon:icon.value});return}
  },true);

  window.addEventListener('beforeunload',()=>{recordingStream?.getTracks?.().forEach(t=>t.stop());if(currentAudioUrl)URL.revokeObjectURL(currentAudioUrl)});
  const observer=new MutationObserver(()=>requestEnhance());
  window.addEventListener('load',async()=>{
    observer.observe(app||document.body,{childList:true,subtree:true});
    requestEnhance();
    try{await reloadClips()}catch{}
  });
})();
