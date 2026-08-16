(() => {
  'use strict';
  const CURRENT='v0.8.1';
  const CORE_STORE='arcaneTable.web.v0.2.state';
  const DB_NAME='arcaneTableAudioV08';
  const DB_VERSION=1;
  const CLIP_STORE='clips';
  const CACHE='arcane-audio-backup-v0.8.1';
  const META='arcaneTable.web.v0.8.audioBackupMeta';
  const PERSIST='arcaneTable.web.v0.8.storagePersistent';
  const app=document.getElementById('app');
  let scheduled=false,dbPromise=null;

  function readCore(){try{return JSON.parse(localStorage.getItem(CORE_STORE)||'{}')}catch{return {}}}
  function readMeta(){try{return JSON.parse(localStorage.getItem(META)||'{}')}catch{return {}}}
  function writeMeta(m){try{localStorage.setItem(META,JSON.stringify(m))}catch{}}
  function backupUrl(id){return new URL(`./__arcane_audio_backup__/${encodeURIComponent(id)}`,location.href).href}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}

  function applyLayout(){
    const s=readCore(),mobile=matchMedia('(max-width:1000px) and (max-height:620px)').matches,root=document.documentElement;
    root.classList.toggle('v081-mobile-table',mobile&&!!s.started);
    root.classList.toggle('v081-six',mobile&&!!s.started&&Number(s.playerCount)===6);
    root.classList.toggle('v081-giant2',mobile&&!!s.started&&s.mode==='giant2');
    root.classList.toggle('v081-giant3',mobile&&!!s.started&&s.mode==='giant3');
  }

  function openDb(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){reject(new Error('IndexedDB no disponible'));return}
      const r=indexedDB.open(DB_NAME,DB_VERSION);
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(CLIP_STORE))r.result.createObjectStore(CLIP_STORE,{keyPath:'id'})};
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('No se pudo abrir audio'));
    });
    return dbPromise;
  }
  async function allClips(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(CLIP_STORE,'readonly'),r=tx.objectStore(CLIP_STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
  async function putClip(v){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(CLIP_STORE,'readwrite');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);tx.objectStore(CLIP_STORE).put(v)})}

  async function requestPersistentStorage(){
    if(!navigator.storage?.persist)return false;
    try{const already=await navigator.storage.persisted?.();const ok=already||await navigator.storage.persist();localStorage.setItem(PERSIST,ok?'1':'0');return ok}catch{localStorage.setItem(PERSIST,'0');return false}
  }

  async function seedBackups(){
    if(!('caches' in window))return;
    try{
      const list=await allClips(),cache=await caches.open(CACHE),meta=readMeta();
      for(const c of list){
        if(!c?.id||!(c.blob instanceof Blob))continue;
        await cache.put(backupUrl(c.id),new Response(c.blob,{headers:{'Content-Type':c.mimeType||c.blob.type||'audio/webm'}}));
        meta[c.id]={id:c.id,name:c.name||'Sonido',icon:c.icon||'🔊',durationMs:Number(c.durationMs)||0,mimeType:c.mimeType||c.blob.type||'audio/webm',createdAt:Number(c.createdAt)||Date.now()};
      }
      writeMeta(meta);
    }catch{}
  }

  async function recoverMissing(){
    if(!('caches' in window))return 0;
    try{
      const existing=await allClips(),ids=new Set(existing.map(x=>x.id)),meta=readMeta(),cache=await caches.open(CACHE);let restored=0;
      for(const [id,m] of Object.entries(meta)){
        if(ids.has(id))continue;
        const res=await cache.match(backupUrl(id));if(!res)continue;
        const blob=await res.blob();if(!blob.size)continue;
        await putClip({...m,id,blob,mimeType:m.mimeType||blob.type||'audio/webm'});restored++;
      }
      return restored;
    }catch{return 0}
  }

  function storageNote(){
    const panel=document.querySelector('.v08-recorder-panel');if(!panel||panel.querySelector('.v081-storage-note'))return;
    const persistent=localStorage.getItem(PERSIST)==='1',note=document.createElement('div');note.className=`v081-storage-note ${persistent?'ok':''}`;
    note.innerHTML=`<span>${persistent?'✓':'•'}</span><div><strong>${persistent?'ALMACENAMIENTO PERSISTENTE':'ALMACENAMIENTO LOCAL'}</strong><small>${persistent?'Las grabaciones tienen protección reforzada en este dispositivo.':'Las grabaciones se guardan en este dispositivo; el navegador puede gestionar su espacio.'}</small></div>`;
    panel.appendChild(note);
  }

  function enhance(){document.title='Arcane Table · Web Beta v0.8.1';applyLayout();storageNote()}

  const observer=new MutationObserver(schedule);observer.observe(app||document.body,{childList:true,subtree:true});
  addEventListener('resize',schedule);addEventListener('orientationchange',()=>setTimeout(schedule,100));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')seedBackups()});
  window.addEventListener('load',async()=>{
    schedule();await requestPersistentStorage();
    const restored=await recoverMissing();await seedBackups();schedule();
    if(restored>0&&!sessionStorage.getItem('arcaneTable.web.v0.8.1.recovered')){sessionStorage.setItem('arcaneTable.web.v0.8.1.recovered','1');location.reload()}
  });
})();