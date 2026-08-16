(() => {
  'use strict';

  const CURRENT='v0.7';
  const CORE_STORE='arcaneTable.web.v0.2.state';
  const V05_STORE='arcaneTable.web.v0.5.playerState';
  const V06_STORE='arcaneTable.web.v0.6.meta';
  const V07_STORE='arcaneTable.web.v0.7.tableState';
  const modal=document.getElementById('modal');
  const app=document.getElementById('app');

  const AVATARS={
    'Hechicero':'✦','Guardián':'⛨','Nigromante':'☠','Berserker':'⚔','Druida':'❦','Artífice':'⚙',
    'Caballero':'♞','Demonio':'♠','Ángel':'✧','Dragón':'🐉','Elfo':'🏹','Vampiro':'🦇','Zombie':'☣','Chamán':'☼','Asesino':'◈'
  };
  const EXTRA_ARCHETYPES=['Caballero','Demonio','Ángel','Dragón','Elfo','Vampiro','Zombie','Chamán','Asesino'];

  const DUNGEON_GRAPH={
    madmage:{
      yawning:{name:'Portal Bostezante',next:['dungeon']},dungeon:{name:'Nivel de la mazmorra',next:['bazaar','twisted']},
      bazaar:{name:'Bazar de los goblins',next:['lost']},twisted:{name:'Cavernas Retorcidas',next:['lost']},lost:{name:'Nivel perdido',next:['runestone','graveyard']},
      runestone:{name:'Cavernas de piedras rúnicas',next:['deep']},graveyard:{name:'Cementerio de Muiral',next:['deep']},deep:{name:'Minas profundas',next:['lair']},lair:{name:'Guarida del Mago Loco',next:[]}
    },
    phandelver:{
      cave:{name:'Entrada de la cueva',next:['goblin','mine']},goblin:{name:'Guarida de los goblins',next:['store','pool']},mine:{name:'Túneles de la mina',next:['pool','fungi']},
      store:{name:'Almacén',next:['temple']},pool:{name:'Estanque oscuro',next:['temple']},fungi:{name:'Caverna de hongos',next:['temple']},temple:{name:'Templo de Dumathoin',next:[]}
    },
    tomb:{
      trapped:{name:'Entrada con trampas',next:['veils','oubliette']},veils:{name:'Velos del miedo',next:['sand']},oubliette:{name:'Oubliette',next:['cradle']},sand:{name:'Celda de arena',next:['cradle']},cradle:{name:'Cuna del Dios de la Muerte',next:[]}
    },
    undercity:{
      secret:{name:'Entrada secreta',next:['forge','well']},forge:{name:'Forja',next:['trap','arena']},well:{name:'Pozo perdido',next:['arena','stash']},
      trap:{name:'¡Trampa!',next:['archives']},arena:{name:'Arena',next:['archives','catacombs']},stash:{name:'Alijo',next:['catacombs']},
      archives:{name:'Archivos',next:['throne']},catacombs:{name:'Catacumbas',next:['throne']},throne:{name:'Trono de los Tres Muertos',next:[]}
    }
  };

  let scheduled=false;
  function clone(x){return JSON.parse(JSON.stringify(x))}
  function readJson(k,fallback){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(fallback))}catch{return clone(fallback)}}
  function writeJson(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function readCore(){return readJson(CORE_STORE,{players:[],playerCount:0,modules:{}})}
  function read07(){
    const s=readJson(V07_STORE,{monarch:null,initiative:null,pendingChoice:null,visual:'arcane',reduceMotion:false});
    if(!['calm','arcane','epic'].includes(s.visual))s.visual='arcane';
    if(typeof s.reduceMotion!=='boolean')s.reduceMotion=false;
    if(!Number.isInteger(s.monarch))s.monarch=null;
    if(!Number.isInteger(s.initiative))s.initiative=null;
    return s;
  }
  function write07(s){writeJson(V07_STORE,s)}
  function players(){const c=readCore();return (c.players||[]).slice(0,Number(c.playerCount)||0)}
  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function requestEnhance(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}

  function soundOn(){return readJson(V06_STORE,{sound:true}).sound!==false}
  function eventTone(kind){
    if(!soundOn())return;
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
    const ctx=eventTone.ctx||(eventTone.ctx=new C());if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    const seq=kind==='monarch'?[[392,.00],[523,.08],[784,.17]]:[[220,.00],[440,.06],[660,.14],[990,.22]];
    seq.forEach(([f,d],n)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+d;o.type=n%2?'triangle':'sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.18);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.2)});
  }

  function applyVisualSettings(){
    const s=read07(),root=document.documentElement;
    if(root.dataset.v07Visual!==s.visual)root.dataset.v07Visual=s.visual;
    root.classList.toggle('v07-reduce-motion',s.reduceMotion);
  }

  function injectArchetypes(){
    const core=readCore();
    document.querySelectorAll('select[data-archetype]').forEach(sel=>{
      EXTRA_ARCHETYPES.forEach(a=>{if(![...sel.options].some(o=>o.value===a)){const o=document.createElement('option');o.value=a;o.textContent=a;sel.appendChild(o)}});
      const i=Number(sel.dataset.archetype),actual=core.players?.[i]?.archetype;if(actual&&sel.value!==actual)sel.value=actual;
    });
  }

  function playerIndex(card){const t=card.querySelector('[data-tokenplayer]');return Number.isFinite(Number(t?.dataset.tokenplayer))?Number(t.dataset.tokenplayer):Number(card.dataset.v03Player)}
  function enhancePlayerCards(){
    const core=readCore(),s=read07();
    document.querySelectorAll('.player-card').forEach(card=>{
      const i=playerIndex(card),p=core.players?.[i];if(!p||!Number.isFinite(i))return;
      card.dataset.v07Color=p.color||'gold';
      card.classList.toggle('v07-monarch',s.monarch===i);
      card.classList.toggle('v07-initiative',s.initiative===i);
      const glyph=AVATARS[p.archetype]||'✧';
      const av=card.querySelector('.player-avatar span');if(av&&av.textContent!==glyph)av.textContent=glyph;
      const labels=card.querySelector('.player-labels')||card.querySelector('.player-info');
      if(labels){
        let holder=labels.querySelector('.v07-holder-inline');
        const bits=[s.monarch===i?'<span class="monarch">♛ MONARCA</span>':'',s.initiative===i?'<span class="initiative">✦ INICIATIVA</span>':''].filter(Boolean).join('');
        if(bits){if(!holder){holder=document.createElement('div');holder.className='v07-holder-inline';labels.appendChild(holder)}if(holder.innerHTML!==bits)holder.innerHTML=bits}
        else holder?.remove();
      }
    });
    document.querySelectorAll('.player-config').forEach(box=>{
      const sel=box.querySelector('[data-archetype]'),i=Number(sel?.dataset.archetype),p=core.players?.[i];if(!p)return;
      const av=box.querySelector('.setup-avatar'),glyph=AVATARS[p.archetype]||'✧';if(av&&av.textContent!==glyph)av.textContent=glyph;
    });
  }

  function tableStatusHtml(){
    const s=read07(),ps=players(),m=s.monarch!==null?ps[s.monarch]?.name:null,ini=s.initiative!==null?ps[s.initiative]?.name:null;
    return `<button class="v07-state-chip monarch ${m?'active':''}" data-v07-state="monarch"><span>♛</span><small>MONARCA</small><b>${esc(m||'—')}</b></button><button class="v07-state-chip initiative ${ini?'active':''}" data-v07-state="initiative"><span>✦</span><small>INICIATIVA</small><b>${esc(ini||'—')}</b></button>`;
  }
  function ensureTableStates(){
    const tools=document.querySelector('.table-tools');if(!tools)return;
    let host=tools.querySelector('.v07-global-states');if(!host){host=document.createElement('div');host.className='v07-global-states';tools.prepend(host)}
    const html=tableStatusHtml();if(host.innerHTML!==html)host.innerHTML=html;
  }

  function showEvent(kind,title,sub=''){
    let host=document.getElementById('v07Event');if(!host){host=document.createElement('div');host.id='v07Event';document.body.appendChild(host)}
    host.className=`v07-event ${kind}`;host.innerHTML=`<span>${kind==='monarch'?'♛':'✦'}</span><strong>${esc(title)}</strong>${sub?`<small>${esc(sub)}</small>`:''}`;
    requestAnimationFrame(()=>host.classList.add('show'));clearTimeout(showEvent.t);showEvent.t=setTimeout(()=>host.classList.remove('show'),1500);
    eventTone(kind);
  }

  function stateModal(kind){
    const s=read07(),ps=players(),isMonarch=kind==='monarch',holder=isMonarch?s.monarch:s.initiative;
    const choices=ps.map((p,i)=>`<button class="v07-player-choice ${holder===i?'active':''}" data-v07-${kind}="${i}"><span>${AVATARS[p.archetype]||'✧'}</span><b>${esc(p.name||`Jugador ${i+1}`)}</b>${holder===i?'<small>ACTUAL</small>':''}</button>`).join('');
    const pending=!isMonarch&&s.pendingChoice&&s.pendingChoice.player===holder?s.pendingChoice:null;
    const route=pending?`<div class="v07-pending"><strong>El avance requiere elegir ruta</strong><p>La Iniciativa exige completar este “adentrarse”. Elige la siguiente sala:</p><div>${pending.options.map(id=>`<button class="btn primary" data-v07-route="${id}">→ ${esc(DUNGEON_GRAPH[pending.dungeonId]?.[id]?.name||id)}</button>`).join('')}</div></div>`:'';
    modal.innerHTML=`<div class="modal-inner v07-state-modal"><div class="modal-head"><div><div class="eyebrow">ESTADO GLOBAL · ${CURRENT}</div><strong>${isMonarch?'♛ MONARCA':'✦ INICIATIVA'}</strong></div><button class="modal-close" data-v07-close>CERRAR</button></div>
      <p class="v07-rule">${isMonarch?'Solo un jugador puede ser el Monarca. Al comienzo de su paso final roba una carta; si una criatura le hace daño de combate, su controlador se convierte en el Monarca.':'Solo un jugador puede tener la Iniciativa. Al tomarla se aventura en Bajociudad; mientras la conserve, vuelve a aventurarse al comienzo de su mantenimiento.'}</p>
      <div class="v07-player-choices">${choices}</div>
      ${!isMonarch&&holder!==null?`<div class="v07-initiative-actions"><button class="btn primary" data-v07-upkeep>⟳ MANTENIMIENTO · AVENTURARSE</button><small>Úsalo al comienzo del mantenimiento del jugador que conserva la Iniciativa.</small></div>`:''}
      ${route}
      <button class="btn compact danger" data-v07-clear="${kind}">${isMonarch?'SIN MONARCA':'SIN INICIATIVA'}</button>
    </div>`;
    if(!modal.open)modal.showModal();
  }

  function ensureDungeonState(s,i){while((s.dungeons||(s.dungeons=[])).length<=i)s.dungeons.push({dungeonId:null,roomId:null,path:[],completed:0});const d=s.dungeons[i];if(!Array.isArray(d.path))d.path=[];if(!Number.isFinite(d.completed))d.completed=0;return d}
  function ventureInitiative(i){
    const v=read07(),ds=readJson(V05_STORE,{players:[],dungeons:[],dungeonPlayer:0}),d=ensureDungeonState(ds,i);
    ds.dungeonPlayer=i;
    const graph=DUNGEON_GRAPH[d.dungeonId];
    if(!d.dungeonId||!d.roomId||!graph?.[d.roomId]){
      d.dungeonId='undercity';d.roomId='secret';d.path=['secret'];v.pendingChoice=null;writeJson(V05_STORE,ds);write07(v);return {kind:'start',room:'Entrada secreta'};
    }
    const next=graph[d.roomId].next||[];
    if(next.length>1){v.pendingChoice={player:i,dungeonId:d.dungeonId,options:next};writeJson(V05_STORE,ds);write07(v);return {kind:'choice'};}
    if(next.length===1){d.roomId=next[0];d.path.push(next[0]);v.pendingChoice=null;writeJson(V05_STORE,ds);write07(v);return {kind:'advance',room:DUNGEON_GRAPH[d.dungeonId][next[0]].name};}
    d.completed+=1;d.dungeonId='undercity';d.roomId='secret';d.path=['secret'];v.pendingChoice=null;writeJson(V05_STORE,ds);write07(v);return {kind:'restart',room:'Entrada secreta'};
  }
  function choosePendingRoute(id){
    const v=read07(),p=v.pendingChoice;if(!p||!p.options.includes(id))return false;
    const ds=readJson(V05_STORE,{players:[],dungeons:[],dungeonPlayer:0}),d=ensureDungeonState(ds,p.player);if(d.dungeonId!==p.dungeonId)return false;
    d.roomId=id;d.path.push(id);ds.dungeonPlayer=p.player;v.pendingChoice=null;writeJson(V05_STORE,ds);write07(v);return true;
  }

  function setHolder(kind,i){
    const s=read07(),ps=players(),p=ps[i];if(!p)return;
    s[kind]=i;write07(s);
    if(kind==='initiative'){
      const r=ventureInitiative(i);showEvent('initiative','INICIATIVA',p.name||`Jugador ${i+1}`);
      if(r.kind==='choice')setTimeout(()=>stateModal('initiative'),40);
    }else showEvent('monarch','NUEVO MONARCA',p.name||`Jugador ${i+1}`);
    requestEnhance();
  }

  function augmentSettings(){
    if(!modal?.open)return;const inner=modal.querySelector('.modal-inner');if(!inner||inner.querySelector('.v07-visual-settings'))return;
    const s=read07(),section=document.createElement('section');section.className='v07-visual-settings';
    section.innerHTML=`<div class="eyebrow">APARIENCIA DE MESA</div><h3>Intensidad visual</h3><div class="v07-visual-choices">${[['calm','DISCRETO'],['arcane','ARCANO'],['epic','ÉPICO']].map(([id,n])=>`<button class="choice ${s.visual===id?'active':''}" data-v07-visual="${id}">${n}</button>`).join('')}</div><label class="v07-motion-toggle"><input type="checkbox" data-v07-motion ${s.reduceMotion?'checked':''}> Reducir movimiento</label><p>Arcano mantiene el equilibrio actual. Épico aumenta halos y transiciones; Discreto prioriza máxima calma visual.</p>`;
    inner.insertBefore(section,inner.children[2]||null);
  }

  function flashPlayer(i,kind){
    setTimeout(()=>{document.querySelectorAll('.player-card').forEach(card=>{if(playerIndex(card)!==i)return;card.classList.remove('v07-hit','v07-heal','v07-poison-hit');void card.offsetWidth;card.classList.add(kind);setTimeout(()=>card.classList.remove(kind),520)})},30);
  }

  function resetMatchState(){const s=read07();s.monarch=null;s.initiative=null;s.pendingChoice=null;write07(s)}

  function enhance(){
    applyVisualSettings();injectArchetypes();enhancePlayerCards();ensureTableStates();
    document.title=`Arcane Table · Web Beta ${CURRENT}`;
  }

  document.addEventListener('click',e=>{
    const state=e.target.closest?.('[data-v07-state]');if(state){e.preventDefault();stateModal(state.dataset.v07State);return}
    const close=e.target.closest?.('[data-v07-close]');if(close){e.preventDefault();modal.close();return}
    const m=e.target.closest?.('[data-v07-monarch]');if(m){e.preventDefault();setHolder('monarch',Number(m.dataset.v07Monarch));stateModal('monarch');return}
    const ini=e.target.closest?.('[data-v07-initiative]');if(ini){e.preventDefault();setHolder('initiative',Number(ini.dataset.v07Initiative));if(!read07().pendingChoice)stateModal('initiative');return}
    const upkeep=e.target.closest?.('[data-v07-upkeep]');if(upkeep){e.preventDefault();const s=read07();if(s.initiative!==null){ventureInitiative(s.initiative);showEvent('initiative','AVENTURARSE',players()[s.initiative]?.name||'Iniciativa');stateModal('initiative')}return}
    const route=e.target.closest?.('[data-v07-route]');if(route){e.preventDefault();if(choosePendingRoute(route.dataset.v07Route)){showEvent('initiative','RUTA ELEGIDA','Mazmorra');stateModal('initiative');requestEnhance()}return}
    const clear=e.target.closest?.('[data-v07-clear]');if(clear){e.preventDefault();const s=read07();s[clear.dataset.v07Clear]=null;if(clear.dataset.v07Clear==='initiative')s.pendingChoice=null;write07(s);stateModal(clear.dataset.v07Clear);requestEnhance();return}

    const visual=e.target.closest?.('[data-v07-visual]');if(visual){e.preventDefault();const s=read07();s.visual=visual.dataset.v07Visual;write07(s);applyVisualSettings();modal.querySelectorAll('[data-v07-visual]').forEach(b=>b.classList.toggle('active',b===visual));return}

    const life=e.target.closest?.('[data-lifechange]');if(life){const [i,d]=life.dataset.lifechange.split('|').map(Number);flashPlayer(i,d<0?'v07-hit':'v07-heal')}
    const poison=e.target.closest?.('[data-poison]');if(poison){const [i,d]=poison.dataset.poison.split('|').map(Number);if(d>0)flashPlayer(i,'v07-poison-hit')}
    if(e.target.closest?.('[data-action="next-plane"]'))showEvent('initiative','PLANESWALK','La realidad cambia');
    if(e.target.closest?.('[data-v05-complete]'))showEvent('monarch','MAZMORRA COMPLETADA','El recorrido termina');
    if(e.target.closest?.('[data-action="settings"]'))setTimeout(augmentSettings,20);
    if(e.target.closest?.('[data-action="start"]'))resetMatchState();
    setTimeout(requestEnhance,30);
  },true);

  document.addEventListener('change',e=>{
    const archetype=e.target.closest?.('[data-archetype]');if(archetype)setTimeout(requestEnhance,20);
    const motion=e.target.closest?.('[data-v07-motion]');if(motion){const s=read07();s.reduceMotion=motion.checked;write07(s);applyVisualSettings()}
  },true);

  const observer=new MutationObserver(()=>requestEnhance());
  window.addEventListener('load',()=>{observer.observe(app||document.body,{childList:true,subtree:true});applyVisualSettings();requestEnhance();setTimeout(requestEnhance,250)});
})();
