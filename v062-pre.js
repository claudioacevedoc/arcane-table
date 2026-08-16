(() => {
  'use strict';
  const CURRENT='v0.8.1';
  window.__ARCANE_CURRENT_VERSION__=CURRENT;
  try{
    const proto=Node.prototype;
    const d=Object.getOwnPropertyDescriptor(proto,'textContent');
    if(!d||!d.get||!d.set||d.configurable===false)return;
    Object.defineProperty(proto,'textContent',{
      configurable:d.configurable,
      enumerable:d.enumerable,
      get:d.get,
      set(value){
        let next=value==null?'':String(value);
        if(this instanceof Element){
          if(this.matches('.version')) next=CURRENT;
          else if(this.matches('.v04-home-brand small')&&/WEB BETA/i.test(next)) next=`WEB BETA · ${CURRENT}`;
          else if(this.matches('.eyebrow')&&/WEB BETA/i.test(next)) next=next.replace(/v0\.\d+(?:\.\d+)?/ig,CURRENT);
        }
        if(d.get.call(this)===next)return;
        return d.set.call(this,next);
      }
    });
  }catch(_){/* narrow compatibility fallback: newer layer still syncs visible labels */}
})();
