(() => {
  'use strict';

  const CORE_STORE = 'arcaneTable.web.v0.2.state';
  const DUNGEON_STORE = 'arcaneTable.web.v0.3.dungeons';
  const UI_STORE = 'arcaneTable.web.v0.3.ui';

  const AVATARS = {
    'Hechicero':'✦', 'Guardián':'⛨', 'Nigromante':'☠', 'Berserker':'⚔', 'Druida':'❦', 'Artífice':'⚙'
  };

  const DUNGEONS = {
    madmage: {
      names:['dungeon of the mad mage','la mazmorra del mago loco','mazmorra del mago loco'],
      title:'La Mazmorra del Mago Loco',
      note:'Recorrido normal de mazmorra.',
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
    phandelver: {
      names:['lost mine of phandelver','la mina perdida de phandelver','mina perdida de phandelver'],
      title:'La Mina Perdida de Phandelver',note:'Recorrido normal de mazmorra.',
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
    tomb: {
      names:['tomb of annihilation','la tumba de la aniquilacion','tumba de la aniquilación','tumba de la aniquilacion'],
      title:'La Tumba de la Aniquilación',note:'La ruta de Oubliette salta directamente a la sala final.',
      levels:[['trapped'],['veils','oubliette'],['sand'],['cradle']],
      rooms:{
        trapped:{name:'Entrada con trampas',effect:'Cada jugador pierde 1 vida.',next:['veils','oubliette']},
        veils:{name:'Velos del miedo',effect:'Cada jugador pierde 2 vidas a menos que descarte una carta.',next:['sand']},
        oubliette:{name:'Oubliette',effect:'Descarta una carta y sacrifica una criatura, un artefacto y una tierra.',next:['cradle']},
        sand:{name:'Celda de arena',effect:'Cada jugador pierde 2 vidas a menos que sacrifique una criatura, un artefacto o una tierra de su elección.',next:['cradle']},
        cradle:{name:'Cuna del Dios de la Muerte',effect:'Crea El Atropal, una ficha de criatura legendaria Horror Dios negra 4/4 con toque mortal.',next:[]}
      }
    },
    undercity: {
      names:['undercity','bajociudad','la bajociudad'],title:'Bajociudad (Undercity)',
      note:'Solo debe iniciarse mediante “adentrarse en Bajociudad”, normalmente al tomar la iniciativa.',
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
        throne:{name:'Trono de los Tres Muertos',effect:'Muestra las diez primeras cartas de tu biblioteca. Pon en el campo de batalla una carta de criatura de entre ellas con tres contadores +1/+1. Gana antimaleficio hasta tu próximo turno. Luego baraja.',next:[]}
      }
    }
  };

  let dungeonPlayer=loadUi().dungeonPlayer||0,scheduled=false,enhancing=false;
  const app=document.getElementById('app');
  function loadCore(){try{return JSON.parse(localStorage.getItem(CORE_STORE)||'{}')}catch{return {}}}
  function loadUi(){try{return JSON.parse(localStorage.getItem(UI_STORE)||'{}')}catch{return {}}}
  function saveUi(){localStorage.setItem(UI_STORE,JSON.stringify({dungeonPlayer}))}
  function loadDungeonState(){try{const s=JSON.parse(localStorage.getItem(DUNGEON_STORE)||'{}');if(!Array.isArray(s.players))s.players=[];return s}catch{return {players:[]}}}
  function saveDungeonState(s){localStorage.setItem(DUNGEON_STORE,JSON.stringify(s))}
  function ensureDungeonPlayer(s,i){while(s.players.length<=i)s.players.push({dungeonId:null,roomId:null,path:[],completed:0});const p=s.players[i];if(!Array.isArray(p.path))p.path=[];if(!Number.isFinite(p.completed))p.completed=0;return p}
  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function normalize(s=''){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
  function avatarGlyph(a){return AVATARS[a]||'✧'}
  function requestEnhance(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}

  function updateVersion(){document.querySelectorAll('.version').forEach(e=>e.textContent='v0.3');document.querySelectorAll('.eyebrow').forEach(e=>{if(/web beta v0\.2/i.test(e.textContent))e.textContent=e.textContent.replace(/v0\.2/i,'v0.3')})}
  function decoratePlayerCards(core){document.querySelectorAll('.player-card').forEach(card=>{const token=card.querySelector('[data-tokenplayer]'),i=Number(token?.dataset.tokenplayer),p=core.players?.[i];if(!p)return;card.dataset.v03Player=String(i);const info=card.querySelector('.player-info');if(info&&!info.querySelector('.player-avatar')){const name=info.querySelector('.player-name'),meta=info.querySelector('.player-meta'),labels=document.createElement('div');labels.className='player-labels';if(name)labels.appendChild(name);if(meta)labels.appendChild(meta);const av=document.createElement('div');av.className='player-avatar';av.innerHTML=`<span>${esc(avatarGlyph(p.archetype))}</span>`;info.classList.add('v03-info');info.append(av,labels)}const life=Number(card.querySelector('.life')?.textContent||0);card.classList.toggle('defeated',life<=0)})}
  function decorateSetup(core){document.querySelectorAll('.player-config').forEach(box=>{const input=box.querySelector('[data-player-name]'),i=Number(input?.dataset.playerName),p=core.players?.[i];if(!p||box.querySelector('.setup-avatar'))return;const av=document.createElement('span');av.className='setup-avatar';av.textContent=avatarGlyph(p.archetype);box.querySelector('strong')?.after(av)})}
  function enhanceGiant(core){const grid=document.querySelector('.players-grid');if(!grid||grid.classList.contains('v03-teams-ready')||!String(core.mode||'').startsWith('giant'))return;const heads=core.mode==='giant3'?3:2,cards=[...grid.querySelectorAll(':scope > .player-card')];if(!cards.length)return;const teams=Math.ceil(cards.length/heads);grid.classList.add('v03-teams-ready','teams-grid');grid.style.setProperty('--teams',String(teams));grid.innerHTML='';for(let t=0;t<teams;t++){const members=cards.slice(t*heads,t*heads+heads);if(!members.length)continue;const memberIndex=Number(members[0].dataset.v03Player||0),life=members[0].querySelector('.life')?.textContent||'',team=document.createElement('article');team.className='team-card panel';team.innerHTML=`<div class="team-header"><div><span class="eyebrow">EQUIPO ${t+1}</span><small>${heads} cabezas · vida compartida</small></div><div class="team-life">${esc(life)}</div><div class="team-life-controls"><button data-v03-team-life="-5">−5</button><button data-v03-team-life="-1">−1</button><button data-v03-team-life="1">+1</button><button data-v03-team-life="5">+5</button></div></div><div class="team-heads"></div>`;const headsBox=team.querySelector('.team-heads');members.forEach(c=>{c.classList.add('team-member');headsBox.appendChild(c)});team.querySelectorAll('[data-v03-team-life]').forEach(b=>b.addEventListener('click',()=>document.querySelector(`[data-lifechange="${memberIndex}|${Number(b.dataset.v03TeamLife)}"]`)?.click()));grid.appendChild(team)}}

  function selectedDungeonFromPage(){const n=normalize(document.querySelector('.card-detail h2')?.textContent||'');return Object.entries(DUNGEONS).find(([,d])=>d.names.some(x=>n.includes(normalize(x))))?.[0]||null}
  function dungeonRoomClass(ps,id,next){if(ps.roomId===id)return'current';if(ps.path.includes(id))return'visited';if(next.includes(id))return'available';return'locked'}
  function dungeonMapHtml(d,ps){const current=d.rooms[ps.roomId],next=current?.next||[];return `<div class="dungeon-map">${d.levels.map((level,li)=>`${li?'<div class="dungeon-arrow">↓</div>':''}<div class="dungeon-level">${level.map(id=>{const r=d.rooms[id],selectable=next.includes(id);return `<button class="dungeon-room ${dungeonRoomClass(ps,id,next)}" ${selectable?`data-v03-room="${id}"`:'disabled'}><span>${esc(r.name)}</span><small>${esc(r.effect)}</small></button>`}).join('')}</div>`).join('')}</div>`}
  function dungeonExplorerHtml(core,selectedId){const ds=loadDungeonState();dungeonPlayer=Math.max(0,Math.min(dungeonPlayer,(core.playerCount||1)-1));const ps=ensureDungeonPlayer(ds,dungeonPlayer),activeId=ps.dungeonId,shownId=activeId||selectedId,d=shownId?DUNGEONS[shownId]:null,players=(core.players||[]).slice(0,core.playerCount||0),pills=players.map((p,i)=>`<button class="dungeon-player-pill ${i===dungeonPlayer?'active':''}" data-v03-dplayer="${i}">${esc(p.name||`Jugador ${i+1}`)}</button>`).join('');if(!d)return `<section class="dungeon-explorer"><div class="dungeon-player-row">${pills}</div><div class="dungeon-empty"><strong>Recorrido interactivo</strong>Selecciona una mazmorra para iniciar el seguimiento.</div></section>`;const current=ps.roomId?d.rooms[ps.roomId]:null,next=current?.next||[];let action='';if(!activeId)action=`<button class="btn primary" data-v03-dstart="${shownId}">ENTRAR EN ESTA MAZMORRA</button>`;else if(current&&next.length===1)action=`<button class="btn primary" data-v03-room="${next[0]}">AVENTURARSE → ${esc(d.rooms[next[0]].name)}</button>`;else if(current&&next.length>1)action=`<div class="dungeon-choice"><span>ELIGE RUTA</span>${next.map(id=>`<button class="btn primary" data-v03-room="${id}">→ ${esc(d.rooms[id].name)}</button>`).join('')}</div>`;else if(current)action='<button class="btn good" data-v03-complete>✓ MARCAR MAZMORRA COMPLETADA</button>';const path=ps.path.map(id=>d.rooms[id]?.name).filter(Boolean).join(' → ');return `<section class="dungeon-explorer"><div class="dungeon-player-row">${pills}</div><div class="dungeon-head"><div><div class="eyebrow">RECORRIDO DE ${esc(players[dungeonPlayer]?.name||'JUGADOR')}</div><h3>${esc(d.title)}</h3><p>${esc(d.note)}</p></div><div class="dungeon-score"><b>${ps.completed}</b><span>completadas</span></div></div>${activeId?dungeonMapHtml(d,ps):`<div class="dungeon-preview"><strong>${esc(d.title)}</strong><span>El primer “adentrarse” coloca el marcador en la sala superior.</span></div>`}${current?`<div class="current-room-effect"><span>SALA ACTUAL</span><strong>${esc(current.name)}</strong><p>${esc(current.effect)}</p></div>`:''}<div class="dungeon-actions">${action}${activeId?'<button class="btn compact danger" data-v03-dreset>REINICIAR RECORRIDO</button>':''}</div>${path?`<div class="dungeon-path"><span>Recorrido:</span> ${esc(path)}</div>`:''}</section>`}
  function bindDungeon(host){host.querySelectorAll('[data-v03-dplayer]').forEach(b=>b.addEventListener('click',()=>{dungeonPlayer=Number(b.dataset.v03Dplayer);saveUi();requestEnhance()}));host.querySelectorAll('[data-v03-dstart]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.v03Dstart,d=DUNGEONS[id];if(!d)return;const ds=loadDungeonState(),ps=ensureDungeonPlayer(ds,dungeonPlayer),first=d.levels[0][0];ps.dungeonId=id;ps.roomId=first;ps.path=[first];saveDungeonState(ds);requestEnhance()}));host.querySelectorAll('[data-v03-room]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.v03Room,ds=loadDungeonState(),ps=ensureDungeonPlayer(ds,dungeonPlayer),d=DUNGEONS[ps.dungeonId];if(!d||!ps.roomId||!(d.rooms[ps.roomId]?.next||[]).includes(id))return;ps.roomId=id;ps.path.push(id);saveDungeonState(ds);requestEnhance()}));host.querySelector('[data-v03-complete]')?.addEventListener('click',()=>{const ds=loadDungeonState(),ps=ensureDungeonPlayer(ds,dungeonPlayer);ps.completed+=1;ps.dungeonId=null;ps.roomId=null;ps.path=[];saveDungeonState(ds);requestEnhance()});host.querySelector('[data-v03-dreset]')?.addEventListener('click',()=>{const ds=loadDungeonState(),ps=ensureDungeonPlayer(ds,dungeonPlayer);ps.dungeonId=null;ps.roomId=null;ps.path=[];saveDungeonState(ds);requestEnhance()})}
  function enhanceDungeon(core){if(!/MAZMORRAS/i.test(document.querySelector('.tab.active')?.textContent||''))return;const detail=document.querySelector('.card-detail');if(!detail)return;detail.querySelector('.dungeon-explorer')?.remove();detail.classList.add('v03-dungeon-detail');const host=document.createElement('div');host.innerHTML=dungeonExplorerHtml(core,selectedDungeonFromPage());const explorer=host.firstElementChild;detail.prepend(explorer);bindDungeon(explorer)}
  function enhance(){if(enhancing)return;enhancing=true;observer.disconnect();try{const core=loadCore();updateVersion();decorateSetup(core);decoratePlayerCards(core);enhanceGiant(core);enhanceDungeon(core)}finally{observer.observe(app||document.body,{childList:true,subtree:true});enhancing=false}}
  const observer=new MutationObserver(()=>requestEnhance());window.addEventListener('load',()=>{observer.observe(app||document.body,{childList:true,subtree:true});requestEnhance()});
})();
