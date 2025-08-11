const CACHE='kg-disc-v5-1754918832';
const ASSETS=['./','index.html','styles.css','app.js','manifest.json','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install', e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener('activate', e=>{ e.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.map(k=> k===CACHE? null : caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener('fetch', e=>{ e.respondWith((async()=>{ try{ const net=await fetch(e.request,{cache:'reload'}); const c=await caches.open(CACHE); c.put(e.request, net.clone()); return net; }catch(_){
  const r=await caches.match(e.request); return r || Response.error(); } })()); });
