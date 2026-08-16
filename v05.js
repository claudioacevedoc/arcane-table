(() => {
  'use strict';

  const CORE_STORE = 'arcaneTable.web.v0.2.state';
  const V05_STORE = 'arcaneTable.web.v0.5.playerState';
  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  let scheduled = false;
  let enhancing = false;
  let modalPlayer = null;

  const PRESETS = [
    {name:'Energía',icon:'⚡'},
    {name:'Experiencia',icon:'✦'},
    {name:'Radiación',icon:'☢'},
    {name:'Carga',icon:'◈'}
  ];

  const DUNGEONS = {
    madmage:{
      title:'La Mazmorra del Mago Loco', kind:'normal',
      note:'Adentrarse en la mazmorra.',
      levels:[['yawning'],['dungeon'],['bazaar','twisted'],['lost'],['runestone','graveyard'],['deep'],['lair']],
      rooms:{
        yawning:{name:'Portal Bostezante',effect:'Ganas 1 vida.',next:['dungeon']},
        dungeon:{name:'Nivel de la mazmorra',effect:'Adivina 1.',next:['bazaar','twisted']},
        bazaar:{name:'Bazar de los goblins',effect:'Crea una ficha de Tesoro.',next:['lost']},
        twisted:{name:'Cavernas Retorcidas',effect:'La criatura objetivo no puede atacar hasta tu próximo turno.',next:['lost']},
        lost:{name:'Nivel perdido',effect:'Adivina 2.',next:['runestone','graveyard']},
        runestone:{name:'Cavernas de piedras rúnicas',effect:'Exilia las dos primeras cartas de tu biblioteca. Puedes jugarlas.',next:['deep']},
        graveyard:{name:'Cementerio de Muiral',effect:'Crea dos fichas de criatura Esqueleto negras 1/1.',next:['deep']},
        deep:{name:'Minas profundas',effect:'Adivina 3.',next:['lair']},
        lair:{name:'Guarida del Mago Loco',effect:'Roba tres cartas y muéstralas. Puedes lanzar una de ellas sin pagar su coste de maná.',next:[]}
      }
    },
    phandelver:{
      title:'La Mina Perdida de Phandelver', kind:'normal',
      note:'Adentrarse en la mazmorra.',
      levels:[['cave'],['goblin','mine'],['store','pool','fungi'],['temple']],
      rooms:{
        cave:{name:'Entrada de la cueva',effect:'Adivina 1.',next:['goblin','mine']},
        goblin:{name:'Guarida de los goblins',effect:'Crea una ficha de criatura Goblin roja 1/1.',next:['store','pool']},
        mine:{name:'Túneles de la mina',effect:'Crea una ficha de Tesoro.',next:['pool','fungi']},
        store:{name:'Almacén',effect:'Pon un contador +1/+1 sobre la criatura objetivo.',next:['temple']},
        pool:{name:'Estanque oscuro',effect:'Cada oponente pierde 1 vida y tú ganas 1 vida.',next:['temple']},
        fungi:{name:'Caverna de hongos',effect:'La criatura objetivo obtiene -4/-0 hasta tu próximo turno.',next:['temple']},
        temple:{name:'Templo de Dumathoin',effect:'Roba una carta.',next:[]}
      }
    },
    tomb:{
      title:'La Tumba de la Aniquilación', kind:'normal',
      note:'Adentrarse en la mazmorra. Oubliette conecta directamente con la sala final.',
      levels:[['trapped'],['veils','oubliette'],['sand'],['cradle']],
      rooms:{
        trapped:{name:'Entrada con trampas',effect:'Cada jugador pierde 1 vida.',next:['veils','oubliette']},
        veils:{name:'Velos del miedo',effect:'Cada jugador pierde 2 vidas a menos que descarte una carta.',next:['sand']},
        oubliette:{name:'Oubliette',effect:'Descarta una carta y sacrifica una criatura, un artefacto y una tierra.',next:['cradle']},
        sand:{name:'Celda de arena',effect:'Cada jugador pierde 2 vidas a menos que sacrifique una criatura, un artefacto o una tierra.',next:['cradle']},
        cradle:{name:'Cuna del Dios de la Muerte',effect:'Crea El Atropal, una ficha de criatura legendaria Horror Dios negra 4/4 con toque mortal.',next:[]}
      }
    },
    undercity:{
      title:'Bajociudad (Undercity)', kind:'initiative',
      note:'Se inicia al adentrarse en Bajociudad, normalmente al tomar la iniciativa.',
      levels:[['secret'],['forge','well'],['trap','arena','stash'],['archives','catacombs'],['throne']],
      rooms:{
        secret:{name:'Entrada secreta',effect:'Busca en tu biblioteca una carta de tierra básica, muéstrala, ponla en tu mano y luego baraja.',next:['forge','well']},
        forge:{name:'Forja',effect:'Pon dos contadores +1/+1 sobre la criatura objetivo.',next:['trap','arena']},
        well:{name:'Pozo perdido',effect:'Adivina 2.',next:['arena','stash']},
        trap:{name:'¡Trampa!',effect:'El jugador objetivo pierde 5 vidas.',next:['archives']},
        arena:{name:'Arena',effect:'Incita a la criatura objetivo.',next:['archives','catacombs']},
        stash:{name:'Alijo',effect:'Crea una ficha de Tesoro.',next:['catacombs']},
        archives:{name:'Archivos',effect:'Roba una carta.',next:['throne']},
        catacombs:{name:'Catacumbas',effect:'Crea una ficha de criatura Esqueleto negra 4/1 con amenaza.',next:['throne']},
        throne:{name:'Trono de los Tres Muertos',effect:'Muestra las diez primeras cartas de tu biblioteca. Pon en el campo de batalla una criatura de entre ellas con tres contadores +1/+1. Gana antimaleficio hasta tu próximo turno. Luego baraja.',next:[]}
      }
    }
  };

  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function readCore(){try{return JSON.parse(localStorage.getItem(CORE_STORE)||'{}')}catch{return {}}}
  function readState(){
    try{
      const s=JSON.parse(localStorage.getItem(V05_STORE)||'{}');
      if(!Array.isArray(s.players))s.players=[];
      if(!Array.isArray(s.dungeons))s.dungeons=[];
      if(!Number.isFinite(s.dungeonPlayer))s.dungeonPlayer=0;
      return s;
    }catch{return {players:[],dungeons:[],dungeonPlayer:0}}
  }
  function writeState(s){localStorage.setItem(V05_STORE,JSON.stringify(s))}
  function ensurePlayer(s,i){
    while(s.players.length<=i)s.players.push({commander:{},counters:[]});
    const p=s.players[i];
    if(!p.commander||typeof p.commander!=='object')p.commander={};
    if(!Array.isArray(p.counters))p.counters=[];
    return p;
  }
  function ensureDungeon(s,i){
    while(s.dungeons.length<=i)s.dungeons.push({dungeonId:null,roomId:null,path:[],completed:0});
    const d=s.dungeons[i];
    if(!Array.isArray(d.path))d.path=[];
    if(!Number.isFinite(d.completed))d.completed=0;
    return d;
  }
  function activePlayers(core){return (core.players||[]).slice(0,Number(core.playerCount)||0)}
  function requestEnhance(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}

  function updateVersion(){
    document.title='Arcane Table · Web Beta v0.5';
    document.querySelectorAll('.version').forEach(e=>e.textContent='v0.5');
    document.querySelectorAll('.v04-home-brand small').forEach(e=>e.textContent='WEB BETA · v0.5');
    document.querySelectorAll('.eyebrow').forEach(e=>{
      if(/web beta v0\.[234]/i.test(e.textContent))e.textContent=e.textContent.replace(/v0\.[234]/i,'v0.5');
    });
  }

  function counterSummary(p){
    const active=p.counters.filter(c=>Number(c.value)>0);
    const lethal=Object.values(p.commander).some(v=>Number(v)>=21);
    if(!active.length&&!lethal)return'';
    const chips=active.slice(0,2).map(c=>`<span>${esc(c.icon||'✦')} ${esc(c.name)} <b>${Number(c.value)||0}</b></span>`).join('');
    const more=active.length>2?`<span>+${active.length-2}</span>`:'';
    const cmd=lethal?'<span class="v05-lethal-chip">⚔ CMD 21+</span>':'';
    return chips+more+cmd;
  }

  function decoratePlayers(core,s){
    document.querySelectorAll('.player-card').forEach(card=>{
      const token=card.querySelector('[data-tokenplayer]');
      const i=Number(token?.dataset.tokenplayer);
      if(!Number.isFinite(i))return;
      const ps=ensurePlayer(s,i);
      let actions=card.querySelector('.v05-player-actions');
      if(!actions){
        actions=document.createElement('div');actions.className='v05-player-actions';
        if(token)actions.appendChild(token);
        const b=document.createElement('button');b.className='btn compact v05-state-btn';b.textContent='☷ ESTADO';b.dataset.v05State=String(i);
        actions.appendChild(b);card.appendChild(actions);
      }
      const labels=card.querySelector('.player-labels')||card.querySelector('.player-info');
      if(labels){
        let sum=labels.querySelector('.v05-mini-counters');
        const html=counterSummary(ps);
        if(html){if(!sum){sum=document.createElement('div');sum.className='v05-mini-counters';labels.appendChild(sum)}sum.innerHTML=html}
        else sum?.remove();
      }
    });
  }

  function stateModalHtml(i){
    const core=readCore(),s=readState(),players=activePlayers(core),p=ensurePlayer(s,i),target=players[i]||{name:`Jugador ${i+1}`};
    const cmdRows=players.map((src,j)=>{
      if(j===i)return'';
      const v=Number(p.commander[j])||0;
      return `<div class="v05-cmd-row ${v>=21?'lethal':''}"><div><strong>${esc(src.name||`Jugador ${j+1}`)}</strong><small>daño recibido de su comandante</small></div><b>${v}</b><div class="v05-step"><button data-v05-cmd="${j}|-5">−5</button><button data-v05-cmd="${j}|-1">−1</button><button data-v05-cmd="${j}|1">+1</button><button data-v05-cmd="${j}|5">+5</button></div>${v>=21?'<span class="v05-lethal">21+ LETAL</span>':''}</div>`
    }).join('');
    const counters=p.counters.map((c,k)=>`<div class="v05-counter-row"><div><span class="v05-counter-icon">${esc(c.icon||'✦')}</span><strong>${esc(c.name)}</strong></div><b>${Number(c.value)||0}</b><div class="v05-step"><button data-v05-counter="${k}|-1">−1</button><button data-v05-counter="${k}|1">+1</button><button data-v05-counter="${k}|5">+5</button></div><button class="v05-remove" data-v05-remove="${k}" title="Quitar contador">×</button></div>`).join('');
    const presets=PRESETS.map(x=>`<button class="btn compact" data-v05-preset="${esc(x.name)}|${esc(x.icon)}">${esc(x.icon)} ${esc(x.name)}</button>`).join('');
    return `<div class="modal-inner v05-state-modal"><div class="modal-head"><div><div class="eyebrow">ESTADO DEL JUGADOR</div><strong>${esc(target.name||`Jugador ${i+1}`)}</strong></div><button class="modal-close" data-v05-close>CERRAR</button></div>
      <div class="v05-state-grid">
        <section><h3>⚔ DAÑO DE COMANDANTE</h3><p class="v05-help">Se registra por comandante de cada oponente. Al llegar a 21 se marca como letal; la app no modifica la vida automáticamente.</p><div class="v05-cmd-list">${cmdRows||'<div class="v05-empty">No hay otros jugadores activos.</div>'}</div></section>
        <section><h3>✦ CONTADORES</h3><p class="v05-help">Agrega solo los contadores que necesites durante esta partida.</p><div class="v05-presets">${presets}</div><div class="v05-new-counter"><input id="v05CounterName" maxlength="20" placeholder="Otro contador…"><button class="btn primary compact" data-v05-add>+ AGREGAR</button></div><div class="v05-counter-list">${counters||'<div class="v05-empty">Sin contadores adicionales.</div>'}</div></section>
      </div></div>`;
  }

  function openPlayerState(i){modalPlayer=i;renderPlayerStateModal();if(!modal.open)modal.showModal()}
  function renderPlayerStateModal(){
    if(modalPlayer===null)return;
    modal.innerHTML=stateModalHtml(modalPlayer);
    modal.querySelector('[data-v05-close]')?.addEventListener('click',()=>modal.close());
    modal.querySelectorAll('[data-v05-cmd]').forEach(b=>b.addEventListener('click',()=>{
      const [src,d]=b.dataset.v05Cmd.split('|').map(Number),s=readState(),p=ensurePlayer(s,modalPlayer);
      p.commander[src]=Math.max(0,(Number(p.commander[src])||0)+d);writeState(s);renderPlayerStateModal();requestEnhance();
    }));
    modal.querySelectorAll('[data-v05-counter]').forEach(b=>b.addEventListener('click',()=>{
      const [k,d]=b.dataset.v05Counter.split('|').map(Number),s=readState(),p=ensurePlayer(s,modalPlayer),c=p.counters[k];if(!c)return;
      c.value=Math.max(0,(Number(c.value)||0)+d);writeState(s);renderPlayerStateModal();requestEnhance();
    }));
    modal.querySelectorAll('[data-v05-remove]').forEach(b=>b.addEventListener('click',()=>{
      const s=readState(),p=ensurePlayer(s,modalPlayer);p.counters.splice(Number(b.dataset.v05Remove),1);writeState(s);renderPlayerStateModal();requestEnhance();
    }));
    modal.querySelectorAll('[data-v05-preset]').forEach(b=>b.addEventListener('click',()=>{
      const [name,icon]=b.dataset.v05Preset.split('|'),s=readState(),p=ensurePlayer(s,modalPlayer);
      let c=p.counters.find(x=>x.name.toLowerCase()===name.toLowerCase());if(c)c.value=(Number(c.value)||0)+1;else p.counters.push({name,icon,value:1});
      writeState(s);renderPlayerStateModal();requestEnhance();
    }));
    modal.querySelector('[data-v05-add]')?.addEventListener('click',()=>{
      const input=modal.querySelector('#v05CounterName'),name=input?.value.trim();if(!name)return;
      const s=readState(),p=ensurePlayer(s,modalPlayer);let c=p.counters.find(x=>x.name.toLowerCase()===name.toLowerCase());if(c)c.value=(Number(c.value)||0)+1;else p.counters.push({name,icon:'✦',value:1});
      writeState(s);renderPlayerStateModal();requestEnhance();
    });
  }

  function roomClass(ds,id,next){if(ds.roomId===id)return'current';if(ds.path.includes(id))return'visited';if(next.includes(id))return'available';return'locked'}
  function dungeonMap(d,ds){
    const current=d.rooms[ds.roomId],next=current?.next||[];
    return `<div class="v05-dungeon-map">${d.levels.map((level,idx)=>`${idx?'<div class="v05-down">↓</div>':''}<div class="v05-level">${level.map(id=>{const r=d.rooms[id],available=next.includes(id);return `<button class="v05-room ${roomClass(ds,id,next)}" ${available?`data-v05-room="${id}"`:'disabled'}><strong>${esc(r.name)}</strong><small>${esc(r.effect)}</small></button>`}).join('')}</div>`).join('')}</div>`;
  }
  function dungeonAction(d,ds){
    if(!ds.dungeonId)return'';
    const current=d.rooms[ds.roomId],next=current?.next||[];
    if(next.length===1)return `<button class="btn primary" data-v05-room="${next[0]}">AVENTURARSE → ${esc(d.rooms[next[0]].name)}</button>`;
    if(next.length>1)return `<div class="v05-route-choice"><span>ELIGE LA SIGUIENTE SALA</span>${next.map(id=>`<button class="btn primary" data-v05-room="${id}">→ ${esc(d.rooms[id].name)}</button>`).join('')}</div>`;
    return '<button class="btn good" data-v05-complete>✓ RESOLVER SALA FINAL Y COMPLETAR</button>';
  }
  function dungeonExplorerHtml(core,s){
    const players=activePlayers(core);s.dungeonPlayer=Math.max(0,Math.min(Number(s.dungeonPlayer)||0,Math.max(0,players.length-1)));
    const i=s.dungeonPlayer,ds=ensureDungeon(s,i),d=ds.dungeonId?DUNGEONS[ds.dungeonId]:null;
    const pills=players.map((p,j)=>`<button class="dungeon-player-pill ${j===i?'active':''}" data-v05-dplayer="${j}">${esc(p.name||`Jugador ${j+1}`)}</button>`).join('');
    const choose=`<div class="v05-dungeon-choices">
      ${Object.entries(DUNGEONS).map(([id,x])=>`<button class="v05-dungeon-choice ${x.kind==='initiative'?'initiative':''}" data-v05-dstart="${id}"><span>${x.kind==='initiative'?'♛':'⌂'}</span><div><strong>${esc(x.title)}</strong><small>${esc(x.note)}</small></div></button>`).join('')}
    </div>`;
    if(!d)return `<section class="v05-dungeon-explorer"><div class="v05-dungeon-top"><div><div class="eyebrow">RECORRIDO INTERACTIVO · v0.5</div><h2>Mazmorras</h2></div><div class="v05-completed"><b>${ds.completed}</b><span>completadas<br>por ${esc(players[i]?.name||'Jugador')}</span></div></div><div class="dungeon-player-row">${pills}</div><p class="v05-help">Selecciona la mazmorra que este jugador va a comenzar. Bajociudad se inicia mediante la Iniciativa; el banco de cartas de la izquierda queda como referencia independiente.</p>${choose}<div class="v05-reference-note">Baldur's Gate Wilderness puede aparecer en el banco como ayuda especial de evento; no forma parte del recorrido reutilizable normal.</div></section>`;
    const current=d.rooms[ds.roomId],path=ds.path.map(x=>d.rooms[x]?.name).filter(Boolean).join(' → ');
    return `<section class="v05-dungeon-explorer"><div class="v05-dungeon-top"><div><div class="eyebrow">RECORRIDO DE ${esc(players[i]?.name||'Jugador')}</div><h2>${esc(d.title)}</h2><p>${esc(d.note)}</p></div><div class="v05-completed"><b>${ds.completed}</b><span>completadas</span></div></div><div class="dungeon-player-row">${pills}</div>${dungeonMap(d,ds)}<div class="v05-current-room"><span>SALA ACTUAL</span><strong>${esc(current?.name||'')}</strong><p>${esc(current?.effect||'')}</p></div><div class="v05-dungeon-actions">${dungeonAction(d,ds)}<button class="btn compact" data-v05-undo>← DESHACER</button><button class="btn compact danger" data-v05-reset>REINICIAR</button><button class="btn compact" data-v05-refimage>VER CARTA</button></div>${path?`<div class="v05-path"><span>Recorrido:</span> ${esc(path)}</div>`:''}</section>`;
  }

  function bindDungeon(host,detail){
    host.querySelectorAll('[data-v05-dplayer]').forEach(b=>b.addEventListener('click',()=>{const s=readState();s.dungeonPlayer=Number(b.dataset.v05Dplayer);writeState(s);renderDungeon(detail,true)}));
    host.querySelectorAll('[data-v05-dstart]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.v05Dstart,d=DUNGEONS[id],s=readState(),ds=ensureDungeon(s,s.dungeonPlayer);if(!d)return;const first=d.levels[0][0];ds.dungeonId=id;ds.roomId=first;ds.path=[first];writeState(s);renderDungeon(detail,true)}));
    host.querySelectorAll('[data-v05-room]').forEach(b=>b.addEventListener('click',()=>{const s=readState(),ds=ensureDungeon(s,s.dungeonPlayer),d=DUNGEONS[ds.dungeonId],id=b.dataset.v05Room;if(!d||!(d.rooms[ds.roomId]?.next||[]).includes(id))return;ds.roomId=id;ds.path.push(id);writeState(s);renderDungeon(detail,true)}));
    host.querySelector('[data-v05-complete]')?.addEventListener('click',()=>{const s=readState(),ds=ensureDungeon(s,s.dungeonPlayer);ds.completed+=1;ds.dungeonId=null;ds.roomId=null;ds.path=[];writeState(s);renderDungeon(detail,true)});
    host.querySelector('[data-v05-reset]')?.addEventListener('click',()=>{const s=readState(),ds=ensureDungeon(s,s.dungeonPlayer);ds.dungeonId=null;ds.roomId=null;ds.path=[];writeState(s);renderDungeon(detail,true)});
    host.querySelector('[data-v05-undo]')?.addEventListener('click',()=>{const s=readState(),ds=ensureDungeon(s,s.dungeonPlayer);if(ds.path.length>1){ds.path.pop();ds.roomId=ds.path[ds.path.length-1]}else{ds.dungeonId=null;ds.roomId=null;ds.path=[]}writeState(s);renderDungeon(detail,true)});
    host.querySelector('[data-v05-refimage]')?.addEventListener('click',()=>{const btn=[...detail.children].find(e=>e!==host)?.querySelector?.('[data-image]')||detail.querySelector('[data-image]');if(btn)btn.click();else alert('Selecciona la carta correspondiente en la lista izquierda para ver su imagen.')});
  }
  function renderDungeon(detail,force=false){
    const core=readCore(),s=readState();
    let host=detail.querySelector(':scope > .v05-dungeon-explorer');
    const sig=JSON.stringify({p:s.dungeonPlayer,d:s.dungeons?.[s.dungeonPlayer]||null,n:activePlayers(core).map(x=>x.name)});
    if(host&&!force&&host.dataset.sig===sig)return;
    if(!host){host=document.createElement('section');host.className='v05-dungeon-explorer';detail.prepend(host)}
    const tmp=document.createElement('div');tmp.innerHTML=dungeonExplorerHtml(core,s);const fresh=tmp.firstElementChild;host.className=fresh.className;host.innerHTML=fresh.innerHTML;host.dataset.sig=sig;detail.classList.add('v05-route-active');bindDungeon(host,detail);
  }
  function enhanceDungeon(){
    if(!/MAZMORRAS/i.test(document.querySelector('.tab.active')?.textContent||''))return;
    const detail=document.querySelector('.card-detail');if(detail)renderDungeon(detail,false);
  }

  function enhance(){
    if(enhancing)return;enhancing=true;observer.disconnect();
    try{const core=readCore(),s=readState();updateVersion();decoratePlayers(core,s);enhanceDungeon()}
    finally{observer.observe(app||document.body,{childList:true,subtree:true});enhancing=false}
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-v05-state]');if(b){e.preventDefault();e.stopPropagation();openPlayerState(Number(b.dataset.v05State))}
  },true);
  modal?.addEventListener('close',()=>{modalPlayer=null});
  const observer=new MutationObserver(()=>requestEnhance());
  window.addEventListener('load',()=>{observer.observe(app||document.body,{childList:true,subtree:true});requestEnhance()});
})();