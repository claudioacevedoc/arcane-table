(() => {
  'use strict';
  const CURRENT='v0.6.2';
  const CORE_STORE='arcaneTable.web.v0.2.state';
  const V06_STORE='arcaneTable.web.v0.6.meta';
  const modal=document.getElementById('modal');
  let statePlayer=null;

  function readJson(k,fallback){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(fallback))}catch{return JSON.parse(JSON.stringify(fallback))}}
  function writeJson(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function readCore(){return readJson(CORE_STORE,{})}
  function readMeta(){const s=readJson(V06_STORE,{sound:true,players:[]});if(!Array.isArray(s.players))s.players=[];return s}
  function ensurePlayer(s,i){while(s.players.length<=i)s.players.push({commanderName:'',deaths:0,blood:0});const p=s.players[i];if(typeof p.commanderName!=='string')p.commanderName='';if(!Number.isFinite(p.deaths))p.deaths=0;if(!Number.isFinite(p.blood))p.blood=0;return p}
  function writeMeta(s){writeJson(V06_STORE,s)}
  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function selectedTokenPlayer(){const a=document.querySelector('.player-pill.active[data-tokenplayer]');if(a)return Number(a.dataset.tokenplayer);const f=document.querySelector('.player-pill[data-tokenplayer]');return Number(f?.dataset.tokenplayer)||0}

  function syncVersion(){
    document.title='Arcane Table · Web Beta v0.6.2';
    document.querySelectorAll('.version').forEach(e=>{if(e.textContent!==CURRENT)e.textContent=CURRENT});
    document.querySelectorAll('.v04-home-brand small').forEach(e=>{const v=`WEB BETA · ${CURRENT}`;if(e.textContent!==v)e.textContent=v});
    document.querySelectorAll('.eyebrow').forEach(e=>{if(/WEB BETA/i.test(e.textContent)&&/v0\./i.test(e.textContent)){const v=e.textContent.replace(/v0\.\d+(?:\.\d+)?/ig,CURRENT);if(v!==e.textContent)e.textContent=v}});
  }

  function updatePlayerCard(i){
    const meta=readMeta(),p=ensurePlayer(meta,i);
    document.querySelectorAll('.player-card').forEach(card=>{
      const n=Number(card.querySelector('[data-tokenplayer]')?.dataset.tokenplayer);
      if(n!==i)return;
      const line=card.querySelector('.v06-own-commander');
      if(line){const name=line.querySelector('span'),deaths=line.querySelector('b');if(name)name.textContent=`♛ ${p.commanderName||'Comandante sin asignar'}`;if(deaths)deaths.textContent=`☠ ${p.deaths}`}
      const blood=card.querySelector('.v06-resources .blood b');if(blood)blood.textContent=String(p.blood);
    });
    const setup=document.querySelector(`[data-v06-commander="${i}"]`);if(setup&&document.activeElement!==setup)setup.value=p.commanderName;
  }

  function refreshRivalCommanderNames(){
    const core=readCore(),meta=readMeta(),players=(core.players||[]).slice(0,Number(core.playerCount)||0);
    document.querySelectorAll('.player-card').forEach(card=>{
      const receiver=Number(card.querySelector('[data-tokenplayer]')?.dataset.tokenplayer);if(!Number.isFinite(receiver))return;
      const chips=[...card.querySelectorAll('.v06-cmd-chip')];
      const rivals=players.map((x,j)=>({x,j})).filter(x=>x.j!==receiver);
      chips.forEach((chip,k)=>{const r=rivals[k];if(!r)return;const p=ensurePlayer(meta,r.j),label=(p.commanderName||r.x.name||`J${r.j+1}`).trim(),short=label.length>10?label.slice(0,9)+'…':label;const b=chip.querySelector('b'),dmg=b?.textContent||'0';chip.innerHTML=`<i>⚔</i>${esc(short)} <b>${esc(dmg)}</b>`;chip.title=`Daño del comandante ${label}`});
    });
  }

  function ensureCommanderSection(){
    if(statePlayer===null||!modal?.open)return;
    const host=modal.querySelector('.v05-state-modal');if(!host)return;
    const core=readCore(),meta=readMeta(),p=ensurePlayer(meta,statePlayer),target=core.players?.[statePlayer]||{};
    let sec=host.querySelector('.v06-commander-section');
    if(!sec){
      sec=document.createElement('section');sec.className='v06-commander-section';
      const grid=host.querySelector('.v05-state-grid');host.insertBefore(sec,grid||null);
    }
    sec.dataset.v062Player=String(statePlayer);
    if(!sec.querySelector('[data-v06-cmd-name]')){
      sec.innerHTML=`<div class="v06-commander-head"><div><h3>♛ COMANDANTE</h3><p>Identidad del comandante y muertes registradas durante la partida.</p></div><div class="v06-deaths"><span>MUERTES</span><div><button type="button" data-v06-death="-1">−</button><b>${p.deaths}</b><button type="button" data-v06-death="1">+</button></div></div></div><div class="v06-commander-input"><label>Comandante de ${esc(target.name||`Jugador ${statePlayer+1}`)}</label><input data-v06-cmd-name maxlength="32" value="${esc(p.commanderName)}" placeholder="Ej. Atraxa, Edgar Markov, Muldrotha…"></div>`;
    }else{
      const input=sec.querySelector('[data-v06-cmd-name]');if(input&&document.activeElement!==input)input.value=p.commanderName;
      const n=sec.querySelector('.v06-deaths b');if(n)n.textContent=String(p.deaths);
    }
  }

  function setCommander(i,value){const s=readMeta(),p=ensurePlayer(s,i);p.commanderName=String(value||'').trimStart().slice(0,32);writeMeta(s);updatePlayerCard(i);refreshRivalCommanderNames()}
  function changeDeaths(i,delta){const s=readMeta(),p=ensurePlayer(s,i);p.deaths=Math.max(0,p.deaths+delta);writeMeta(s);updatePlayerCard(i);const n=modal?.querySelector('.v06-deaths b');if(n)n.textContent=String(p.deaths)}
  function changeBlood(i,delta){const s=readMeta(),p=ensurePlayer(s,i);p.blood=Math.max(0,p.blood+delta);writeMeta(s);updatePlayerCard(i);const n=document.querySelector('.v06-blood-card .n');if(n)n.textContent=String(p.blood)}

  document.addEventListener('click',e=>{
    const state=e.target.closest?.('[data-v05-state]');
    if(state){statePlayer=Number(state.dataset.v05State);setTimeout(()=>{ensureCommanderSection();syncVersion()},35);return}

    const blood=e.target.closest?.('[data-v06-blood]');
    if(blood){e.preventDefault();e.stopPropagation();changeBlood(selectedTokenPlayer(),Number(blood.dataset.v06Blood)||0);return}

    const death=e.target.closest?.('[data-v06-death]');
    if(death){e.preventDefault();e.stopPropagation();if(statePlayer!==null)changeDeaths(statePlayer,Number(death.dataset.v06Death)||0);return}

    setTimeout(()=>{syncVersion();if(modal?.open)ensureCommanderSection()},35);
  },true);

  document.addEventListener('input',e=>{
    const setup=e.target.closest?.('[data-v06-commander]');
    if(setup){e.stopPropagation();setCommander(Number(setup.dataset.v06Commander),setup.value);return}
    const modalInput=e.target.closest?.('[data-v06-cmd-name]');
    if(modalInput&&statePlayer!==null){e.stopPropagation();setCommander(statePlayer,modalInput.value)}
  },true);

  document.addEventListener('change',e=>{
    if(e.target.closest?.('[data-v06-commander],[data-v06-cmd-name]'))e.stopPropagation();
  },true);

  modal?.addEventListener('close',()=>{statePlayer=null});

  window.addEventListener('load',()=>{
    syncVersion();
    const meta=readMeta();meta.players.forEach((_,i)=>updatePlayerCard(i));
    refreshRivalCommanderNames();
    setTimeout(syncVersion,250);
  });
})();
