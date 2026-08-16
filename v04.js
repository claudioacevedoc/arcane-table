(() => {
  'use strict';

  const CORE_STORE = 'arcaneTable.web.v0.2.state';
  const SESSION_KEY = 'arcaneTable.web.v0.4.homeSeen';
  const app = document.getElementById('app');
  let enhancing = false;
  let scheduled = false;

  function readCore(){
    try{return JSON.parse(localStorage.getItem(CORE_STORE)||'{}')}catch{return {}}
  }
  function writeCore(s){localStorage.setItem(CORE_STORE,JSON.stringify(s))}
  function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function requestEnhance(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}
  function formatLabel(s){
    if(s.mode==='giant2') return 'Gigante de 2 cabezas · 2 vs 2';
    if(s.mode==='giant3') return 'Gigante de 3 cabezas · 3 vs 3';
    if(Number(s.playerCount)===2) return 'Duelo · 1 vs 1';
    return `Todos contra todos · ${s.playerCount||2} jugadores`;
  }

  function updateVersion(){
    document.querySelectorAll('.version').forEach(e=>e.textContent='v0.5');
    document.querySelectorAll('.eyebrow').forEach(e=>{
      if(/web beta v0\.[234]/i.test(e.textContent)) e.textContent=e.textContent.replace(/v0\.[234]/i,'v0.5');
    });
  }

  function ensureHomeButton(){
    const actions=document.querySelector('.top-actions');
    if(!actions||actions.querySelector('[data-v04-home]'))return;
    const b=document.createElement('button');
    b.className='icon-btn v04-home-btn';
    b.dataset.v04Home='1';
    b.title='Inicio / Nueva partida';
    b.textContent='⌂';
    b.addEventListener('click',()=>showHome(true));
    actions.prepend(b);
  }

  function homeMarkup(s){
    const hasGame=!!s.started;
    const modules=[];
    if(s.modules?.planechase)modules.push('Planechase');
    if(s.modules?.dungeons)modules.push('Mazmorras');
    if(s.modules?.daynight)modules.push('Día/Noche');
    return `<div class="v04-home-backdrop" data-v04-backdrop>
      <section class="v04-home-panel panel">
        <div class="v04-home-brand"><div class="v04-home-sigil">✦</div><div><span>ARCANE TABLE</span><small>WEB BETA · v0.5</small></div></div>
        <div class="v04-home-copy"><div class="eyebrow">TU MESA · TUS REGLAS</div><h1>${hasGame?'Partida guardada':'Nueva partida'}</h1><p>${hasGame?'Puedes continuar exactamente donde quedaste o volver a configurar la mesa.':'Configura el formato, los jugadores y los módulos antes de comenzar.'}</p></div>
        ${hasGame?`<div class="v04-resume-card"><div><span>PARTIDA ACTUAL</span><strong>${esc(formatLabel(s))}</strong><small>${Number(s.startLife)||40} vidas iniciales${modules.length?' · '+esc(modules.join(' · ')):''}</small></div><div class="v04-resume-life">${Number(s.startLife)||40}</div></div>`:''}
        <div class="v04-home-actions">
          ${hasGame?'<button class="btn primary v04-big" data-v04-continue>CONTINUAR PARTIDA</button>':''}
          <button class="btn ${hasGame?'':'primary'} v04-big" data-v04-new>NUEVA PARTIDA</button>
        </div>
        <div class="v04-format-preview">
          <div><b>1 VS 1 / LIBRE</b><span>1–6 jugadores</span></div>
          <div><b>GIGANTE 2 CABEZAS</b><span>4 jugadores · 2 vs 2</span></div>
          <div><b>GIGANTE 3 CABEZAS</b><span>6 jugadores · 3 vs 3</span></div>
        </div>
      </section>
    </div>`;
  }

  function showHome(force=false){
    const s=readCore();
    if(document.querySelector('.v04-home-backdrop'))return;
    if(!force && (!s.started || sessionStorage.getItem(SESSION_KEY)==='1'))return;
    document.body.insertAdjacentHTML('beforeend',homeMarkup(s));
    const host=document.querySelector('.v04-home-backdrop');
    host.querySelector('[data-v04-continue]')?.addEventListener('click',()=>{sessionStorage.setItem(SESSION_KEY,'1');host.remove()});
    host.querySelector('[data-v04-new]')?.addEventListener('click',()=>{
      const n=readCore();n.started=false;writeCore(n);sessionStorage.setItem(SESSION_KEY,'1');location.reload();
    });
  }

  function decorateSetup(s){
    const setup=document.querySelector('.setup');
    if(!setup)return;
    setup.classList.add('v04-setup');
    const formatButtons=[...setup.querySelectorAll('[data-mode]')];
    formatButtons.forEach(b=>{
      const m=b.dataset.mode;
      if(m==='ffa')b.textContent='◈ DUELO / TODOS CONTRA TODOS';
      if(m==='giant2')b.textContent='◉ GIGANTE · 2 CABEZAS';
      if(m==='giant3')b.textContent='✦ GIGANTE · 3 CABEZAS';
    });
    const formatRow=formatButtons[0]?.parentElement;
    if(formatRow&&!formatRow.nextElementSibling?.classList.contains('v04-format-help')){
      formatRow.insertAdjacentHTML('afterend',`<div class="v04-format-help">
        <div class="${s.mode==='ffa'?'active':''}"><b>LIBRE</b><span>Con 2 jugadores es 1 vs 1; con 3–6, todos contra todos.</span></div>
        <div class="${s.mode==='giant2'?'active':''}"><b>2 CABEZAS</b><span>2 equipos de 2. La vida pertenece al equipo.</span></div>
        <div class="${s.mode==='giant3'?'active':''}"><b>3 CABEZAS</b><span>2 equipos de 3. La vida pertenece al equipo.</span></div>
      </div>`);
    }
    const counts=[...setup.querySelectorAll('[data-count]')];
    const fixed=s.mode==='giant2'?4:s.mode==='giant3'?6:null;
    counts.forEach(b=>{
      const n=Number(b.dataset.count);b.disabled=!!fixed&&n!==fixed;b.classList.toggle('v04-locked',!!fixed&&n!==fixed);
    });
    const playersHeading=[...setup.querySelectorAll('h2')].find(h=>h.textContent.trim()==='Jugadores');
    if(playersHeading&&fixed&&!playersHeading.querySelector('.v04-team-note')){
      playersHeading.insertAdjacentHTML('beforeend',` <span class="v04-team-note">· ${fixed===4?'2 equipos de 2':'2 equipos de 3'}</span>`);
    }
  }

  function enforceFormatClick(e){
    const modeBtn=e.target.closest?.('[data-mode]');
    if(!modeBtn)return;
    const mode=modeBtn.dataset.mode;
    if(mode!=='giant2'&&mode!=='giant3')return;
    const desired=mode==='giant2'?4:6;
    setTimeout(()=>{
      const target=document.querySelector(`[data-count="${desired}"]`);
      if(target&&!target.disabled)target.click();
      else{
        const s=readCore();s.playerCount=desired;writeCore(s);location.reload();
      }
    },30);
  }

  function enhance(){
    if(enhancing)return;enhancing=true;observer.disconnect();
    try{const s=readCore();updateVersion();ensureHomeButton();decorateSetup(s)}
    finally{observer.observe(app||document.body,{childList:true,subtree:true});enhancing=false}
  }

  document.addEventListener('click',enforceFormatClick,true);
  const observer=new MutationObserver(()=>requestEnhance());
  window.addEventListener('load',()=>{
    observer.observe(app||document.body,{childList:true,subtree:true});
    requestEnhance();
    setTimeout(()=>showHome(false),120);
  });
})();