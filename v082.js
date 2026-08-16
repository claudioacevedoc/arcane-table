(() => {
  'use strict';
  const CURRENT='v0.8.2';
  const app=document.getElementById('app');
  let scheduled=false;
  function sync(){
    document.title='Arcane Table · Web Beta v0.8.2';
    window.__ARCANE_CURRENT_VERSION__=CURRENT;
    document.querySelectorAll('.version').forEach(e=>{if(e.textContent!==CURRENT)e.textContent=CURRENT});
  }
  function requestSync(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync()})}
  const observer=new MutationObserver(requestSync);
  if(app)observer.observe(app,{childList:true,subtree:true});
  window.addEventListener('load',sync);
  window.addEventListener('resize',requestSync);
  sync();
})();
