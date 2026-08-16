const VERSION = '0.2.0-web-beta';
const STORE_KEY = 'arcaneTable.web.v0.2.state';
const BANK_KEY = 'arcaneTable.web.v0.2.bank';
const API = 'https://api.scryfall.com';
const COLORS = [
  {id:'white',name:'Blanco',hex:'#e8dfc4'}, {id:'blue',name:'Azul',hex:'#5fb4ff'}, {id:'black',name:'Negro',hex:'#a58cab'},
  {id:'red',name:'Rojo',hex:'#ff745e'}, {id:'green',name:'Verde',hex:'#68d08a'}, {id:'gold',name:'Multicolor',hex:'#d9b86c'}
];
const ARCHETYPES = ['Hechicero','Guardián','Nigromante','Berserker','Druida','Artífice'];
const $ = s => document.querySelector(s);
const app = $('#app');
const modal = $('#modal');
let installPrompt = null;
let ui = {screen:'setup',tab:'table',tokenPlayer:0,selectedPlane:0,selectedDungeon:0,syncing:false,installHelp:false};
let state = loadState();
let bank = loadBank();

function defaultState(){
  return {
    started:false, mode:'ffa', playerCount:2, startLife:40,
    modules:{planechase:false,dungeons:false,daynight:false}, dayNight:'day',
    players:Array.from({length:6},(_,i)=>({id:i,name:`Jugador ${i+1}`,color:COLORS[i%COLORS.length].id,archetype:ARCHETYPES[i%ARCHETYPES.length],life:40,poison:0,tokens:{treasure:0,clue:0,food:0},groups:[]})),
    teamLives:[40,40,40], planeDeck:[], planePos:0
  };
}
function loadState(){try{return Object.assign(defaultState(),JSON.parse(localStorage.getItem(STORE_KEY)||'{}'))}catch{return defaultState()}}
function saveState(){localStorage.setItem(STORE_KEY,JSON.stringify(state))}
function loadBank(){try{return JSON.parse(localStorage.getItem(BANK_KEY)||'{"planes":[],"dungeons":[],"syncedAt":null}')}catch{return {planes:[],dungeons:[],syncedAt:null}}}
function saveBank(){localStorage.setItem(BANK_KEY,JSON.stringify(bank))}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function delay(ms){return new Promise(r=>setTimeout(r,ms))}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),2100)}
function activePlayers(){return state.players.slice(0,state.playerCount)}
function colorHex(id){return COLORS.find(c=>c.id===id)?.hex||'#d9b86c'}
function teamForPlayer(i){ if(state.mode==='giant2') return Math.floor(i/2); if(state.mode==='giant3') return Math.floor(i/3); return i; }
function getLife(i){return state.mode.startsWith('giant')?state.teamLives[teamForPlayer(i)]:state.players[i].life}
function setLife(i,v){if(state.mode.startsWith('giant')) state.teamLives[teamForPlayer(i)]=Math.max(-999,v); else state.players[i].life=Math.max(-999,v);saveState();render()}
function moduleTabs(){return ['table','tokens',...(state.modules.planechase?['planes']:[]),...(state.modules.dungeons?['dungeons']:[])]}

function topbar(){
  if(!state.started) return '';
  const labels={table:'◈ MESA',tokens:'◆ FICHAS',planes:'◎ PLANOS',dungeons:'⌂ MAZMORRAS'};
  return `<header class="topbar"><div class="brand"><div class="sigil"></div><div><strong>ARCANE TABLE</strong><small>WEB BETA</small></div><span class="version">v0.2</span></div><nav class="tabs">${moduleTabs().map(t=>`<button class="tab ${ui.tab===t?'active':''}" data-tab="${t}">${labels[t]}</button>`).join('')}</nav><div class="top-actions"><button class="icon-btn" data-action="share" title="Compartir">↗</button><button class="icon-btn" data-action="install" title="Instalar">⬇</button><button class="icon-btn" data-action="settings" title="Configuración">⚙</button></div></header>`;
}
function render(){
  app.innerHTML=`<div class="shell">${topbar()}${state.started?`<div class="game-body">${renderView()}</div>`:renderSetup()}</div><div class="orientation-note"><div><strong>Gira el teléfono</strong>Arcane Table está diseñada para jugar en horizontal.</div></div>`;
  bind();
}
function renderSetup(){
  const modeChoice=(id,label)=>`<button class="choice ${state.mode===id?'active':''}" data-mode="${id}">${label}</button>`;
  const lifeChoice=n=>`<button class="choice ${state.startLife===n?'active':''}" data-life="${n}">${n}</button>`;
  return `<section class="setup"><div class="panel hero"><div><div class="eyebrow">Arcane Table · Web Beta v0.2</div><h1>Tu mesa.<br><span>Tus reglas.</span></h1><p>Configura cada partida de forma independiente. Planos, Mazmorras y Día/Noche son opcionales; Fichas siempre está disponible.</p></div><div class="hero-mark"><div class="orb">✦</div></div></div>
  <div class="setup-grid"><div class="panel section"><h2>Formato de partida</h2><div class="field-row">${modeChoice('ffa','Todos contra todos')}${modeChoice('giant2','Gigante · 2 cabezas')}${modeChoice('giant3','Gigante · 3 cabezas')}</div><h2 style="margin-top:16px">Jugadores</h2><div class="field-row">${[1,2,3,4,5,6].map(n=>`<button class="choice ${state.playerCount===n?'active':''}" data-count="${n}">${n}</button>`).join('')}</div><h2 style="margin-top:16px">Vida inicial</h2><div class="field-row">${[20,30,40,60].map(lifeChoice).join('')}</div></div>
  <div class="panel section"><h2>Módulos de esta partida</h2>${toggle('planechase','Planechase','Planos, Fenómenos y dado planar')}${toggle('dungeons','Mazmorras','Banco de mazmorras')}${toggle('daynight','Día / Noche','Estado global visible')}</div></div>
  <div class="panel section" style="margin-top:12px"><h2>Jugadores</h2><div class="players-config">${activePlayers().map((p,i)=>playerConfig(p,i)).join('')}</div><div class="setup-footer"><button class="btn" data-action="reset-all">Restablecer</button><button class="btn primary" data-action="start">INICIAR PARTIDA</button></div></div></section>`;
}
function toggle(key,title,desc){return `<div class="toggle"><div><strong>${title}</strong><div style="color:var(--muted);font-size:11px;margin-top:2px">${desc}</div></div><div class="switch ${state.modules[key]?'on':''}" data-toggle="${key}"><i></i></div></div>`}
function playerConfig(p,i){return `<div class="player-config" style="--pc:${colorHex(p.color)}"><strong>Jugador ${i+1}</strong><input data-player-name="${i}" value="${esc(p.name)}" maxlength="18"><select data-archetype="${i}">${ARCHETYPES.map(a=>`<option ${a===p.archetype?'selected':''}>${a}</option>`).join('')}</select><div class="color-row">${COLORS.map(c=>`<button class="color-dot ${p.color===c.id?'active':''}" data-color="${i}|${c.id}" title="${c.name}" style="background:${c.hex}"></button>`).join('')}</div></div>`}
function renderView(){if(ui.tab==='tokens')return renderTokens();if(ui.tab==='planes')return renderCards('planes');if(ui.tab==='dungeons')return renderCards('dungeons');return renderTable()}
function renderTable(){
  const n=state.playerCount;const cols=n<=2?n:n<=4?2:3;
  return `<section class="view table-view"><div class="players-grid" style="--cols:${cols}">${activePlayers().map((p,i)=>playerPanel(p,i)).join('')}</div><div class="table-tools"><button class="btn compact" data-roll="6">🎲 D6</button><button class="btn compact" data-roll="20">🎲 D20</button>${state.modules.planechase?`<button class="btn compact" data-roll="planar">◉ DADO PLANAR</button>`:''}<span id="rollResult" class="roll-result">—</span>${state.modules.daynight?`<button class="daynight ${state.dayNight}" data-action="daynight">${state.dayNight==='day'?'☀ DÍA':'☾ NOCHE'}</button>`:''}</div></section>`;
}
function playerPanel(p,i){const life=getLife(i);const team=state.mode.startsWith('giant')?` · Equipo ${teamForPlayer(i)+1}`:'';return `<article class="player-card" style="--pc:${colorHex(p.color)}"><div class="player-info"><div class="player-name">${esc(p.name)}</div><div class="player-meta">${esc(p.archetype)}${team}</div></div><div class="life-block"><div class="life">${life}</div><div class="life-controls"><button data-lifechange="${i}|-5">−5</button><button data-lifechange="${i}|5">+5</button><button data-lifechange="${i}|-1">−1</button><button data-lifechange="${i}|1">+1</button></div></div><div class="counter-strip"><div class="mini-counter">☠ VENENO <button data-poison="${i}|-1">−</button><b>${p.poison}</b><button data-poison="${i}|1">+</button></div></div><button class="btn compact token-link" data-tokenplayer="${i}">◆ FICHAS</button></article>`}

function renderTokens(){
  const p=state.players[Math.min(ui.tokenPlayer,state.playerCount-1)];
  return `<section class="view token-view"><div class="player-selector">${activePlayers().map((x,i)=>`<button class="player-pill ${i===ui.tokenPlayer?'active':''}" style="--pc:${colorHex(x.color)}" data-tokenplayer="${i}">${esc(x.name)}</button>`).join('')}</div>
  <div class="resource-bar">${resourceCard('treasure','◆','Tesoro',p.tokens.treasure)}${resourceCard('clue','?','Pista',p.tokens.clue)}${resourceCard('food','●','Comida',p.tokens.food)}<div class="panel resource-card"><div><strong>⚔ Criaturas</strong><div style="font-size:10px;color:var(--muted)">grupos activos</div></div><span class="n">${p.groups.length}</span></div></div>
  <div class="token-main"><div class="panel creature-form"><h3>Nueva ficha de criatura</h3><div class="form-grid"><input id="cName" placeholder="Nombre (Zombie, Goblin...)" value="Ficha"><input id="cPow" type="number" inputmode="numeric" value="1" placeholder="F"><input id="cTou" type="number" inputmode="numeric" value="1" placeholder="R"><input id="cQty" type="number" inputmode="numeric" value="1" min="1" placeholder="Cant."></div><button class="btn primary" style="width:100%;margin-top:8px" data-action="add-creature">+ AGREGAR CRIATURAS</button><p style="font-size:11px;color:var(--muted);line-height:1.45">Los grupos se separan automáticamente cuando solo una parte recibe +1/+1 o −1/−1. Las nuevas criaturas entran sin contadores.</p></div><div class="panel groups"><h3>Grupos de ${esc(p.name)}</h3>${p.groups.length?p.groups.map((g,gi)=>groupCard(g,gi)).join(''):`<div class="empty"><div><strong>Aún no hay criaturas</strong>Agrega una ficha desde el panel izquierdo.</div></div>`}</div></div></section>`;
}
function resourceCard(key,icon,label,n){return `<div class="panel resource-card"><div><strong>${icon} ${label}</strong><div class="stepper"><button data-resource="${key}|-1">−</button><button data-resource="${key}|1">+</button></div></div><span class="n">${n}</span></div>`}
function groupCard(g,gi){const pt=`${Number(g.power)+g.plus-g.minus}/${Number(g.toughness)+g.plus-g.minus}`;return `<div class="group-card"><div class="group-title"><strong>${esc(g.name)} · ${pt}</strong><small>${g.qty} total · +1/+1: ${g.plus} · −1/−1: ${g.minus}</small></div><div class="stat-badge">⚔ ${g.attacking}/${g.qty}</div><div><small style="color:var(--muted)">Aplicar a</small><input class="selected-count" type="number" min="1" max="${g.qty}" value="${g.qty}" data-selected="${gi}"></div><div class="attack-stat"><small style="color:var(--muted)">Atacando</small><div class="stepper"><button data-attack="${gi}|-1">−</button><button data-attack="${gi}|1">+</button></div></div><div class="group-actions"><button data-groupmod="${gi}|plus">+1/+1</button><button data-groupmod="${gi}|minus">−1/−1</button><button data-groupmod="${gi}|add">+ nuevas</button><button data-groupmod="${gi}|remove">− quitar</button></div></div>`}

function renderCards(kind){
  const arr=bank[kind]||[];const idx=kind==='planes'?ui.selectedPlane:ui.selectedDungeon;const c=arr[idx];
  const title=kind==='planes'?'PLANOS / FENÓMENOS':'MAZMORRAS';
  return `<section class="view card-view"><aside class="panel card-sidebar"><div class="eyebrow">${title}</div><div class="plane-controls"><button class="btn compact primary" data-action="sync-bank">↻ ACTUALIZAR BANCO</button>${arr.length?`<button class="btn compact" data-action="cache-images">⇩ IMÁGENES OFFLINE</button>`:''}</div><div id="syncStatus" class="sync-status">${bank.syncedAt?`Última actualización: ${new Date(bank.syncedAt).toLocaleString('es-CL')}<br>${bank.planes.length} planos/fenómenos · ${bank.dungeons.length} mazmorras`:'Banco aún no sincronizado.'}</div>${kind==='planes'&&arr.length?`<div class="plane-controls"><button class="btn compact" data-action="shuffle-planes">BARAJAR</button><button class="btn compact" data-action="prev-plane">←</button><button class="btn compact" data-action="next-plane">PLANESWALK →</button></div>`:''}<div class="card-list">${arr.slice(0,500).map((x,i)=>`<button class="${i===idx?'active':''}" data-cardselect="${kind}|${i}">${esc(x.nameEs||x.name)}</button>`).join('')}</div></aside><article class="panel card-detail">${c?cardDetail(c,kind):`<div class="empty"><div><strong>${ui.syncing?'Sincronizando…':'Sin banco cargado'}</strong>${ui.syncing?'Espera a que termine la actualización.':'Con Internet, pulsa “Actualizar banco”. Los datos quedan guardados en este dispositivo.'}</div></div>`}</article></section>`;
}
function cardDetail(c,kind){const hasEs=!!c.textEs;const text=hasEs?c.textEs:(c.oracleText||'El texto principal está representado gráficamente en la carta.');return `<div class="eyebrow">${kind==='planes'?(c.typeLine?.includes('Phenomenon')?'FENÓMENO':'PLANO'):'MAZMORRA'}</div><h2>${esc(c.nameEs||c.name)}</h2><div class="type-line">${esc(c.typeEs||c.typeLine||'')}</div><span class="locale-badge">${hasEs?'ES OFICIAL':'SIN TEXTO OFICIAL ES · ORACLE EN'}</span><div class="oracle-text">${esc(text)}</div><div class="detail-actions">${c.image?`<button class="btn primary" data-image="${esc(c.image)}|${esc(c.nameEs||c.name)}">VER CARTA</button>`:''}${kind==='planes'?`<button class="btn" data-roll="planar">◉ LANZAR DADO PLANAR</button>`:''}</div><div class="card-mini">${c.setName?`${esc(c.setName)} · `:''}${esc(c.name)}${c.lang==='es'?' · impresión ES':''}</div>`}

async function fetchPaged(query, onStatus){
  let url=`${API}/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=name`;const out=[];let page=1;
  while(url){onStatus?.(`Datos · página ${page}`);const res=await fetch(url,{headers:{Accept:'application/json'}});if(!res.ok)throw new Error(`Scryfall ${res.status}`);const data=await res.json();out.push(...data.data);url=data.has_more?data.next_page:null;page++;if(url)await delay(560)}
  return out;
}
function normalizeCard(en,es){
  const image=(es?.image_uris||en?.image_uris||es?.card_faces?.[0]?.image_uris||en?.card_faces?.[0]?.image_uris||{}).normal || (es?.image_uris||en?.image_uris||{}).large || null;
  return {id:en.id,oracleId:en.oracle_id||en.id,name:en.name,nameEs:es?.printed_name||es?.name||null,typeLine:en.type_line||'',typeEs:es?.printed_type_line||null,oracleText:en.oracle_text||en.card_faces?.map(f=>f.oracle_text).filter(Boolean).join('\n\n')||'',textEs:es?.printed_text||es?.card_faces?.map(f=>f.printed_text).filter(Boolean).join('\n\n')||null,image,setName:(es||en).set_name||'',lang:es?'es':'en'}
}
function mergeLocalized(enArr,esArr){const map=new Map(esArr.map(c=>[c.oracle_id||c.name,c]));return enArr.map(c=>normalizeCard(c,map.get(c.oracle_id||c.name)))}
async function syncBank(){
  if(ui.syncing)return;ui.syncing=true;render();const status=()=>$('#syncStatus');
  try{
    const st=t=>{const e=status();if(e)e.textContent=t};
    st('Consultando Planos y Fenómenos…');
    const planesEn=await fetchPaged('(type:plane OR type:phenomenon) game:paper',st);await delay(600);
    const planesEs=await fetchPaged('lang:es (type:plane OR type:phenomenon) game:paper',st).catch(()=>[]);await delay(600);
    st('Consultando Mazmorras…');
    const dungeonsEn=await fetchPaged('type:dungeon game:paper',st);await delay(600);
    const dungeonsEs=await fetchPaged('lang:es type:dungeon game:paper',st).catch(()=>[]);
    bank={planes:mergeLocalized(planesEn,planesEs),dungeons:mergeLocalized(dungeonsEn,dungeonsEs),syncedAt:new Date().toISOString()};saveBank();
    state.planeDeck=bank.planes.map((_,i)=>i);state.planePos=0;saveState();toast(`Banco listo · ${bank.planes.length} planos/fenómenos · ${bank.dungeons.length} mazmorras`);
  }catch(e){toast(`No se pudo actualizar: ${e.message}`)}finally{ui.syncing=false;render()}
}
async function cacheImages(){
  if(!('caches'in window)){toast('Este navegador no permite caché manual de imágenes.');return}
  const all=[...bank.planes,...bank.dungeons].filter(c=>c.image);if(!all.length)return;
  const cache=await caches.open('arcane-card-images-v0.2.0');let ok=0;
  for(let i=0;i<all.length;i++){
    const el=$('#syncStatus');if(el)el.textContent=`Guardando imágenes offline · ${i+1}/${all.length}`;
    try{const req=new Request(all[i].image,{mode:'cors'});if(!(await cache.match(req))){const r=await fetch(req);if(r.ok)await cache.put(req,r.clone())}ok++}catch{}
    await delay(80);
  }
  toast(`Imágenes offline preparadas: ${ok}/${all.length}`);render();
}
function shufflePlanes(){const deck=bank.planes.map((_,i)=>i);for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}state.planeDeck=deck;state.planePos=0;ui.selectedPlane=deck[0]||0;saveState();render()}
function advancePlane(dir){if(!bank.planes.length)return;if(!state.planeDeck?.length)shufflePlanes();state.planePos=(state.planePos+dir+state.planeDeck.length)%state.planeDeck.length;ui.selectedPlane=state.planeDeck[state.planePos];saveState();render()}
function roll(type){let text='';if(type==='planar'){const r=Math.floor(Math.random()*6);text=r===0?'◎ PLANESWALK':r===1?'✦ CAOS':'○ BLANCO';if(r===0&&ui.tab==='planes')setTimeout(()=>advancePlane(1),500)}else{text=`D${type}: ${1+Math.floor(Math.random()*Number(type))}`};const el=$('#rollResult');if(el){el.textContent=text;el.animate([{transform:'scale(.8)',opacity:.3},{transform:'scale(1.18)',opacity:1},{transform:'scale(1)',opacity:1}],{duration:360})}else toast(text)}
function addCreature(){const p=state.players[ui.tokenPlayer];const name=$('#cName').value.trim()||'Ficha';const power=Number($('#cPow').value)||0;const toughness=Number($('#cTou').value)||0;const qty=Math.max(1,Number($('#cQty').value)||1);p.groups.push({name,power,toughness,qty,plus:0,minus:0,attacking:0});saveState();render()}
function splitAndModify(gi,kind){const p=state.players[ui.tokenPlayer],g=p.groups[gi];if(!g)return;const inp=document.querySelector(`[data-selected="${gi}"]`);const n=Math.max(1,Math.min(g.qty,Number(inp?.value)||g.qty));if(kind==='add'){const found=p.groups.find(x=>x!==g&&x.name===g.name&&x.power===g.power&&x.toughness===g.toughness&&x.plus===0&&x.minus===0);if(found)found.qty+=n;else p.groups.push({name:g.name,power:g.power,toughness:g.toughness,qty:n,plus:0,minus:0,attacking:0});saveState();render();return}
  if(kind==='remove'){g.qty-=n;g.attacking=Math.min(g.attacking,g.qty);if(g.qty<=0)p.groups.splice(gi,1);saveState();render();return}
  if(n===g.qty){if(kind==='plus')g.plus++;else g.minus++;}else{g.qty-=n;g.attacking=Math.min(g.attacking,g.qty);p.groups.push({...g,qty:n,attacking:0,plus:g.plus+(kind==='plus'?1:0),minus:g.minus+(kind==='minus'?1:0)});}saveState();render()}
function showImage(src,title){modal.innerHTML=`<div class="modal-inner"><div class="modal-head"><strong>${esc(title)}</strong><button class="modal-close" data-action="close-modal">CERRAR</button></div><img src="${esc(src)}" alt="${esc(title)}"></div>`;modal.showModal();modal.querySelector('[data-action="close-modal"]').onclick=()=>modal.close()}
async function share(){if(navigator.share){try{await navigator.share({title:'Arcane Table',text:'Prueba Arcane Table Web Beta',url:location.href})}catch{}}else{await navigator.clipboard?.writeText(location.href);toast('Enlace copiado') }}
async function installApp(){if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return}const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent);modal.innerHTML=`<div class="modal-inner" style="max-width:500px"><div class="modal-head"><strong>Instalar Arcane Table</strong><button class="modal-close" data-action="close-modal">CERRAR</button></div><p>${isiOS?'En iPhone/iPad: abre esta página en Safari, toca <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.':'Si no aparece el aviso automático, abre el menú del navegador y elige “Instalar aplicación” o “Añadir a pantalla de inicio”.'}</p></div>`;modal.showModal();modal.querySelector('[data-action="close-modal"]').onclick=()=>modal.close()}
function diagnostics(){return `Arcane Table ${VERSION}\n${navigator.userAgent}\nViewport ${innerWidth}x${innerHeight}\nOnline ${navigator.onLine}\nPlayers ${state.playerCount}\nMode ${state.mode}\nBank ${bank.planes.length}/${bank.dungeons.length}`}
function openSettings(){modal.innerHTML=`<div class="modal-inner" style="min-width:min(520px,90vw)"><div class="modal-head"><strong>Configuración · v0.2</strong><button class="modal-close" data-action="close-modal">CERRAR</button></div><p style="color:var(--muted)">La partida se guarda automáticamente en este dispositivo.</p><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="btn" data-action="back-setup">NUEVA CONFIGURACIÓN</button><button class="btn" data-action="copy-diagnostics">COPIAR DIAGNÓSTICO</button><button class="btn danger" data-action="reset-game">BORRAR PARTIDA</button></div></div>`;modal.showModal();modal.querySelector('[data-action="close-modal"]').onclick=()=>modal.close();modal.querySelector('[data-action="back-setup"]').onclick=()=>{modal.close();state.started=false;saveState();render()};modal.querySelector('[data-action="copy-diagnostics"]').onclick=async()=>{await navigator.clipboard?.writeText(diagnostics());toast('Diagnóstico copiado')};modal.querySelector('[data-action="reset-game"]').onclick=()=>{localStorage.removeItem(STORE_KEY);state=defaultState();modal.close();render()}}

function bind(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ui.tab=b.dataset.tab;render()});
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;if(state.mode==='giant2'&&state.playerCount<4)state.playerCount=4;if(state.mode==='giant3'&&state.playerCount<6)state.playerCount=6;saveState();render()});
  document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{state.playerCount=Number(b.dataset.count);if(state.mode==='giant2'&&state.playerCount<4)state.mode='ffa';if(state.mode==='giant3'&&state.playerCount<6)state.mode='ffa';saveState();render()});
  document.querySelectorAll('[data-life]').forEach(b=>b.onclick=()=>{state.startLife=Number(b.dataset.life);saveState();render()});
  document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{const k=b.dataset.toggle;state.modules[k]=!state.modules[k];saveState();render()});
  document.querySelectorAll('[data-player-name]').forEach(i=>i.onchange=()=>{state.players[Number(i.dataset.playerName)].name=i.value.trim()||`Jugador ${Number(i.dataset.playerName)+1}`;saveState()});
  document.querySelectorAll('[data-archetype]').forEach(i=>i.onchange=()=>{state.players[Number(i.dataset.archetype)].archetype=i.value;saveState()});
  document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{const [i,c]=b.dataset.color.split('|');state.players[Number(i)].color=c;saveState();render()});
  document.querySelectorAll('[data-lifechange]').forEach(b=>b.onclick=()=>{const[i,d]=b.dataset.lifechange.split('|').map(Number);setLife(i,getLife(i)+d)});
  document.querySelectorAll('[data-poison]').forEach(b=>b.onclick=()=>{const[i,d]=b.dataset.poison.split('|').map(Number);state.players[i].poison=Math.max(0,state.players[i].poison+d);saveState();render()});
  document.querySelectorAll('[data-tokenplayer]').forEach(b=>b.onclick=()=>{ui.tokenPlayer=Number(b.dataset.tokenplayer);ui.tab='tokens';render()});
  document.querySelectorAll('[data-roll]').forEach(b=>b.onclick=()=>roll(b.dataset.roll));
  document.querySelectorAll('[data-resource]').forEach(b=>b.onclick=()=>{const[k,d]=b.dataset.resource.split('|');const p=state.players[ui.tokenPlayer];p.tokens[k]=Math.max(0,p.tokens[k]+Number(d));saveState();render()});
  document.querySelectorAll('[data-attack]').forEach(b=>b.onclick=()=>{const[gi,d]=b.dataset.attack.split('|').map(Number);const g=state.players[ui.tokenPlayer].groups[gi];g.attacking=Math.max(0,Math.min(g.qty,g.attacking+d));saveState();render()});
  document.querySelectorAll('[data-groupmod]').forEach(b=>b.onclick=()=>{const[gi,k]=b.dataset.groupmod.split('|');splitAndModify(Number(gi),k)});
  document.querySelectorAll('[data-cardselect]').forEach(b=>b.onclick=()=>{const[k,i]=b.dataset.cardselect.split('|');if(k==='planes')ui.selectedPlane=Number(i);else ui.selectedDungeon=Number(i);render()});
  document.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>{const sep=b.dataset.image.indexOf('|');showImage(b.dataset.image.slice(0,sep),b.dataset.image.slice(sep+1))});
  const action=a=>document.querySelector(`[data-action="${a}"]`);
  action('start')&&(action('start').onclick=()=>{state.started=true;activePlayers().forEach(p=>p.life=state.startLife);state.teamLives=[state.startLife,state.startLife,state.startLife];saveState();ui.tab='table';render()});
  action('reset-all')&&(action('reset-all').onclick=()=>{state=defaultState();saveState();render()});
  action('add-creature')&&(action('add-creature').onclick=addCreature);
  action('sync-bank')&&(action('sync-bank').onclick=syncBank);action('cache-images')&&(action('cache-images').onclick=cacheImages);action('shuffle-planes')&&(action('shuffle-planes').onclick=shufflePlanes);action('next-plane')&&(action('next-plane').onclick=()=>advancePlane(1));action('prev-plane')&&(action('prev-plane').onclick=()=>advancePlane(-1));
  action('daynight')&&(action('daynight').onclick=()=>{state.dayNight=state.dayNight==='day'?'night':'day';saveState();render()});action('share')&&(action('share').onclick=share);action('install')&&(action('install').onclick=installApp);action('settings')&&(action('settings').onclick=openSettings);
}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
window.addEventListener('online',()=>{$('#offlineBanner')?.classList.add('hidden')});window.addEventListener('offline',()=>{$('#offlineBanner')?.classList.remove('hidden')});
if(!navigator.onLine)$('#offlineBanner').classList.remove('hidden');
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
render();
