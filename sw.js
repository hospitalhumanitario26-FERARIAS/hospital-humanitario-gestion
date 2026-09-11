/* =====================================================================
   Trabajador de servicio · Gestión Hospitalaria HH
   Estrategia: la página y los datos SIEMPRE se piden a la red primero,
   para que una versión nueva nunca quede atrapada en caché. La caché
   solo entra en juego si no hay conexión, y para íconos y recursos fijos.
   ===================================================================== */
const CACHE = "hh-gestion-v12";
const FIJOS = ["./icono-192.png", "./icono-512.png", "./icono-ios.png", "./manifest.webmanifest"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FIJOS).catch(() => {})));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* nunca se intercepta Supabase ni las funciones del servidor */
  if (url.origin !== location.origin) return;
  if (url.pathname.includes("/.netlify/")) return;

  /* íconos y manifiesto: primero la caché */
  if (FIJOS.some(f => url.pathname.endsWith(f.replace("./", "")))) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }

  /* todo lo demás, incluida la aplicación: primero la red */
  e.respondWith(
    fetch(req)
      .then(r => {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
