(() => {
  'use strict';
  const CACHE='arcane-audio-backup-v0.8.1';
  const META='arcaneTable.web.v0.8.audioBackupMeta';
  const originalPut=IDBObjectStore.prototype.put;
  const originalDelete=IDBObjectStore.prototype.delete;
  const readMeta=()=>{try{return JSON.parse(localStorage.getItem(META)||'{}')}catch{return {}}};
  const writeMeta=m=>{try{localStorage.setItem(META,JSON.stringify(m))}catch{}};
  const url=id=>new URL(`./__arcane_audio_backup__/${encodeURIComponent(id)}`,location.href).href;
  async function backup(v){
    if(!v?.id||!(v.blob instanceof Blob)||!('caches' in window))return;
    try{
      const cache=await caches.open(CACHE);
      await cache.put(url(v.id),new Response(v.blob,{headers:{'Content-Type':v.mimeType||v.blob.type||'audio/webm'}}));
      const m=readMeta();m[v.id]={id:v.id,name:v.name||'Sonido',icon:v.icon||'🔊',durationMs:Number(v.durationMs)||0,mimeType:v.mimeType||v.blob.type||'audio/webm',createdAt:Number(v.createdAt)||Date.now()};writeMeta(m);
    }catch{}
  }
  async function removeBackup(id){
    try{const cache=await caches.open(CACHE);await cache.delete(url(id));const m=readMeta();delete m[id];writeMeta(m)}catch{}
  }
  IDBObjectStore.prototype.put=function(value,...args){const r=originalPut.call(this,value,...args);if(this.name==='clips')backup(value);return r};
  IDBObjectStore.prototype.delete=function(key,...args){const r=originalDelete.call(this,key,...args);if(this.name==='clips'&&typeof key==='string')removeBackup(key);return r};
  window.__ARCANE_AUDIO_BACKUP__={cache:CACHE,meta:META,url,readMeta};
})();