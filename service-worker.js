const CACHE_NAME="brain-fart-mobile-web-v0-08";
const ASSETS=["./","./index.html","./styles.css?v=008","./app.js?v=008","./manifest.json","./icons/icon-192.svg","./icons/icon-512.svg"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));
