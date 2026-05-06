const CACHE_NAME="brain-fart-mobile-web-v1-04";
const ASSETS=["./","./index.html","./styles.css?v=104","./app.js?v=104","./manifest.json","./icons/brain-pink-v08a-192.svg","./icons/brain-pink-v08a-512.svg"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));
