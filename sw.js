// Incrémente la version pour forcer la mise à jour du cache
const CACHE = "montage-photo-v60";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/core.js",
  "./js/exif.js",
  "./js/layout.js",
  "./js/render.js",
  "./js/stickers.js",
  "./js/stickers-ui.js",
  "./js/printers-data.js",
  "./js/printers.js",
  "./js/selection.js",
  "./js/import.js",
  "./js/cell-menu.js",
  "./js/interactions.js",
  "./js/editors.js",
  "./js/pickers.js",
  "./js/montage-ui.js",
  "./js/settings.js",
  "./js/controls.js",
  "./js/export.js",
  "./js/segmented.js",
  "./js/presets.js",
  "./js/pwa.js",
  "./js/theme.js",
  "./js/tabs.js",
  "./js/slider-anchors.js",
  "./js/main.js",
  "./js/history.js",
  "./js/projects.js",
  "./vendor/exifr.full.umd.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (toujours la dernière version), cache en secours hors ligne
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    // si le réseau ne répond pas en 4 s (connexion très faible), on sert le cache
    Promise.race([fetch(req), new Promise((_, rej) => setTimeout(rej, 4000))])
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("./index.html")))
  );
});
