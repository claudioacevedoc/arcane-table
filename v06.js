(() => {
  'use strict';

  const CORE_STORE='arcaneTable.web.v0.2.state';
  const V05_STORE='arcaneTable.web.v0.5.playerState';
  const V06_STORE='arcaneTable.web.v0.6.meta';
  const app=document.getElementById('app');
  const modal=document.getElementById('modal');
  let scheduled=false,enhancing=false,activeStatePlayer=null,audioCtx=null;

  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function readJson(k,fallback){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(fallback))}catch{return structuredClone(fallback)}}
  function writeJson(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function readCore(){return readJson(CORE_STORE,{})}
  function read05(){const s=readJson(V05_STORE,{players:[],dungeons:[],dungeonPlayer:0});if(!Array.isArray(s.players))s.players=[];return s}
  function read06(){const s=readJson(V06_STORE,{sound:true,players:[]});if(typeof s.sound!=='boolean')s.sound=true;if(!Array.isArray(s.players))s.players=[];return s}
  function write06(s){writeJson(V06_STORE,s)}
  function ensure06Player(s,i){while(s.players.length<=i)s.players.push({commanderName:'',deaths:0,blood:0});const p=s.players[i];if(typeof p.commanderName!=='string')p.commanderName='';if(!Number.isFinite(p.deaths))p.deaths=0;if(!Number.isFinite(p.blood))p.blood=0;return p}
  function ensure05Player(s,i){while(s.players.length<=i)s.players.push({commander:{},counters:[]});const p=s.players[i];if(!p.commander||typeof p.commander!=='object')p.commander={};if(!Array.isArray(p.counters))p.counters=[];return p}
  function activePlayers(core){return (core.players||[]).slice(0,Number(core.playerCount)||0)}
  function requestEnhance(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}

  function soundEnabled(){return read06().sound}
  function getAudio(){if(!soundEnabled())return null;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;if(!audioCtx)audioCtx=new C();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx}
  function tone(freq=440,dur=.12,type='sine',gain=.055,slide=null,delay=0){const c=getAudio();if(!c)return;const t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(25,slide),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(c.destination);o.start(t);o.stop(t+dur+.02)}
  function noise(dur=.1,gain=.025,delay=0){const c=getAudio();if(!c)return;const rate=c.sampleRate,len=Math.max(1,Math.floor(rate*dur)),buf=c.createBuffer(1,len,rate),data=buf.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);const src=c.createBufferSource(),g=c.createGain(),t=c.currentTime+delay;src.buffer=buf;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(g).connect(c.destination);src.start(t)}
  function sfx(kind){if(!soundEnabled())return;switch(kind){
    case 'lifeUp': tone(440,.09,'sine',.04,620);tone(660,.12,'sine',.028,880,.055);break;
    case 'lifeDown': tone(190,.12,'triangle',.05,105);noise(.07,.015);break;
    case 'defeat': tone(145,.24,'sawtooth',.05,55);tone(92,.36,'triangle',.04,38,.1);break;
    case 'poison': noise(.13,.023);tone(115,.17,'sine',.035,73);break;
    case 'token': tone(720,.07,'sine',.028,980);tone(1080,.08,'sine',.018,1320,.04);break;
    case 'dice': noise(.055,.025);noise(.045,.02,.065);tone(280,.06,'triangle',.018,360,.12);break;
    case 'planar': tone(130,.18,'sine',.035,260);tone(390,.22,'sine',.025,620,.07);tone(780,.18,'triangle',.018,940,.15);break;
    case 'dungeon': tone(220,.1,'sine',.025,330);tone(440,.13,'triangle',.026,660,.07);break;
    case 'commander': tone(155,.1,'square',.025,115);tone(310,.12,'triangle',.02,230,.04);break;
    case 'lethal': tone(110,.22,'sawtooth',.055,52);tone(440,.15,'square',.025,220,.07);break;
  }}

  function updateVersion(){document.title='Arcane Table · Web Beta v0.6';document.querySelectorAll('.version').forEach(e=>e.textContent='v0.6');document.querySelectorAll('.v04-home-brand small').forEach(e=>e.textContent='WEB BETA · v0.6');document.querySelectorAll('.eyebrow').forEach(e=>{if(/web beta v0\.[2345]/i.test(e.textContent))e.textContent=e.textContent.replace(/v0\.[2345]/i,'v0.6')})}

  function ensureSoundButton(){const actions=document.querySelector('.top-actions');if(!actions)return;let b=actions.querySelector('[data-v06-sound]');const on=soundEnabled();if(!b){b=document.createElement('button');b.className='icon-btn v06-sound-btn';b.dataset.v06Sound='1';b.title='Sonidos arcanos';actions.prepend(b);b.addEventListener('click',()=>{const s=read06();s.sound=!s.sound;write06(s);if(s.sound)sfx('token');requestEnhance()})}b.textContent=on?'🔊':'🔇';b.setAttribute('aria-label',on?'Desactivar sonidos':'Activar sonidos')}

  function decorateSetup(core,meta){document.querySelectorAll('.player-config').forEach(box=>{const nameInput=box.querySelector('[data-player-name]'),i=Number(nameInput?.dataset.playerName);if(!Number.isFinite(i))return;const mp=ensure06Player(meta,i);let cmd=box.querySelector('[data-v06-commander]');if(!cmd){cmd=document.createElement('input');cmd.dataset.v06Commander=String(i);cmd.maxLength=32;cmd.placeholder='Comandante (opcional)';const select=box.querySelector('[data-archetype]');(select||nameInput).insertAdjacentElement('afterend',cmd);cmd.addEventListener('change',()=>{const s=read06(),p=ensure06Player(s,i);p.commanderName=cmd.value.trim();write06(s);requestEnhance()})}if(document.activeElement!==cmd)cmd.value=mp.commanderName||''})}

  function resourceHtml(coreP,metaP){const t=coreP?.tokens||{};return `<span title="Tesoro">◆ <b>${Number(t.treasure)||0}</b></span><span title="Pista">? <b>${Number(t.clue)||0}</b></span><span title="Comida">● <b>${Number(t.food)||0}</b></span><span title="Sangre" class="blood">♥ <b>${Number(metaP.blood)||0}</b></span>`}
  function commanderDamageHtml(core,s05,s06,i){const ps=ensure05Player(s05,i),players=activePlayers(core);return players.map((op,j)=>{if(j===i)return'';const dmg=Number(ps.commander?.[j])||0,src=ensure06Player(s06,j),label=(src.commanderName||op.name||`J${j+1}`).trim(),short=label.length>10?label.slice(0,9)+'…':label;return `<span class="v06-cmd-chip ${dmg>=21?'lethal':''}" title="Daño del comandante ${esc(label)}"><i>⚔</i>${esc(short)} <b>${dmg}</b></span>`}).join('')}

  function decoratePlayerCards(core,s05,s06){document.querySelectorAll('.player-card').forEach(card=>{const token=card.querySelector('[data-tokenplayer]'),i=Number(token?.dataset.tokenplayer);if(!Number.isFinite(i))return;const coreP=core.players?.[i]||{},mp=ensure06Player(s06,i);let cmdLine=card.querySelector('.v06-own-commander');const labels=card.querySelector('.player-labels')||card.querySelector('.player-info');if(labels){if(!cmdLine){cmdLine=document.createElement('div');cmdLine.className='v06-own-commander';labels.appendChild(cmdLine)}cmdLine.innerHTML=`<span>♛ ${mp.commanderName?esc(mp.commanderName):'Comandante sin asignar'}</span><b title="Muertes del comandante">☠ ${mp.deaths}</b>`}
    let bar=card.querySelector('.v06-table-status');if(!bar){bar=document.createElement('div');bar.className='v06-table-status';bar.innerHTML='<div class="v06-resources"></div><div class="v06-cmd-damage"></div>';card.appendChild(bar)}bar.querySelector('.v06-resources').innerHTML=resourceHtml(coreP,mp);bar.querySelector('.v06-cmd-damage').innerHTML=commanderDamageHtml(core,s05,s06,i)
  })}

  function selectedTokenPlayer(){const active=document.querySelector('.player-pill.active[data-tokenplayer]');if(active)return Number(active.dataset.tokenplayer);const first=document.querySelector('.player-pill[data-tokenplayer]');return Number(first?.dataset.tokenplayer)||0}
  function decorateTokens(core,s06){const bar=document.querySelector('.resource-bar');if(!bar)return;const i=selectedTokenPlayer(),mp=ensure06Player(s06,i);let blood=bar.querySelector('.v06-blood-card');if(!blood){blood=document.createElement('div');blood.className='panel resource-card v06-blood-card';const creature=bar.lastElementChild;bar.insertBefore(blood,creature)}blood.innerHTML=`<div><strong>♥ Sangre</strong><div class="stepper"><button data-v06-blood="-1">−</button><button data-v06-blood="1">+</button></div></div><span class="n">${mp.blood}</span>`;blood.querySelectorAll('[data-v06-blood]').forEach(b=>b.addEventListener('click',()=>{const s=read06(),p=ensure06Player(s,i);p.blood=Math.max(0,p.blood+Number(b.dataset.v06Blood));write06(s);sfx('token');requestEnhance()}))}

  function augmentStateModal(core,s06){if(activeStatePlayer===null||!modal?.open)return;const host=modal.querySelector('.v05-state-modal');if(!host)return;const p=ensure06Player(s06,activeStatePlayer),target=core.players?.[activeStatePlayer]||{};let sec=host.querySelector('.v06-commander-section');if(!sec){sec=document.createElement('section');sec.className='v06-commander-section';const grid=host.querySelector('.v05-state-grid');host.insertBefore(sec,grid);sec.addEventListener('change',e=>{if(e.target.matches('[data-v06-cmd-name]')){const s=read06(),mp=ensure06Player(s,activeStatePlayer);mp.commanderName=e.target.value.trim();write06(s);requestEnhance()}});sec.addEventListener('click',e=>{const b=e.target.closest('[data-v06-death]');if(!b)return;const s=read06(),mp=ensure06Player(s,activeStatePlayer);mp.deaths=Math.max(0,mp.deaths+Number(b.dataset.v06Death));write06(s);sfx('commander');augmentStateModal(readCore(),s);requestEnhance()})}
    sec.innerHTML=`<div class="v06-commander-head"><div><h3>♛ COMANDANTE</h3><p>Identidad del comandante y muertes registradas durante la partida.</p></div><div class="v06-deaths"><span>MUERTES</span><div><button data-v06-death="-1">−</button><b>${p.deaths}</b><button data-v06-death="1">+</button></div></div></div><div class="v06-commander-input"><label>Comandante de ${esc(target.name||`Jugador ${activeStatePlayer+1}`)}</label><input data-v06-cmd-name maxlength="32" value="${esc(p.commanderName)}" placeholder="Ej. Atraxa, Edgar Markov, Muldrotha…"></div>`;
    const rivals=activePlayers(core).map((x,j)=>({x,j})).filter(x=>x.j!==activeStatePlayer);host.querySelectorAll('.v05-cmd-row').forEach((row,k)=>{const r=rivals[k];if(!r)return;const name=ensure06Player(s06,r.j).commanderName;const strong=row.querySelector('strong'),small=row.querySelector('small');if(name&&strong){strong.textContent=name;if(small)small.textContent=`comandante de ${r.x.name||`Jugador ${r.j+1}`}`}})
  }

  function resetMatchStatePreservingCommanders(){writeJson(V05_STORE,{players:[],dungeons:[],dungeonPlayer:0});const s=read06();s.players.forEach(p=>{p.deaths=0;p.blood=0});write06(s)}

  function enhance(){if(enhancing)return;enhancing=true;observer.disconnect();try{const core=readCore(),s05=read05(),s06=read06();updateVersion();ensureSoundButton();decorateSetup(core,s06);decoratePlayerCards(core,s05,s06);decorateTokens(core,s06);augmentStateModal(core,s06)}finally{observer.observe(app||document.body,{childList:true,subtree:true});enhancing=false}}

  document.addEventListener('click',e=>{
    const stateBtn=e.target.closest?.('[data-v05-state]');if(stateBtn){activeStatePlayer=Number(stateBtn.dataset.v05State);setTimeout(requestEnhance,20)}
    const start=e.target.closest?.('[data-action="start"]');if(start&&document.querySelector('.setup'))resetMatchStatePreservingCommanders();
    const lc=e.target.closest?.('[data-lifechange]');if(lc){const [,d]=lc.dataset.lifechange.split('|').map(Number),life=Number(lc.closest('.player-card')?.querySelector('.life')?.textContent||0);if(d<0&&life+d<=0)sfx('defeat');else sfx(d<0?'lifeDown':'lifeUp')}
    const poison=e.target.closest?.('[data-poison]');if(poison)sfx('poison');
    const roll=e.target.closest?.('[data-roll]');if(roll)sfx(roll.dataset.roll==='planar'?'planar':'dice');
    const resource=e.target.closest?.('[data-resource]');if(resource)sfx('token');
    const room=e.target.closest?.('[data-v05-room],[data-v05-dstart],[data-v05-complete]');if(room)sfx('dungeon');
    const cmd=e.target.closest?.('[data-v05-cmd]');if(cmd){setTimeout(()=>{const s=read05(),p=ensure05Player(s,activeStatePlayer??0),[src]=cmd.dataset.v05Cmd.split('|').map(Number),v=Number(p.commander[src])||0;sfx(v>=21?'lethal':'commander');requestEnhance()},20)}
  },true);

  const observer=new MutationObserver(()=>requestEnhance());
  window.addEventListener('load',()=>{observer.observe(app||document.body,{childList:true,subtree:true});requestEnhance()});
})();
