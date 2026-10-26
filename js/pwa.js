// Service worker et mode hors ligne

// PWA : le service worker n'est disponible qu'en https (ou localhost)
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
  navigator.serviceWorker.ready.then(() => {
    if (localStorage.getItem("offlineReady")) return;
    localStorage.setItem("offlineReady", "1");
    setMessage("Installé : l'outil fonctionne maintenant sans connexion.");
  });
}

// Mode hors ligne : pastille dans la barre du haut, et nouvelle tentative du lieu EXIF au retour du réseau
const offlinePill = $("offlinePill");
function syncOnline() {
  offlinePill.hidden = navigator.onLine;
}
addEventListener("offline", () => {
  syncOnline();
  setMessage("Hors ligne : tout fonctionne, sauf la recherche du nom de lieu.");
});
addEventListener("online", () => {
  syncOnline();
  setMessage("");
  slots.forEach((s) => {
    if (s && s.exif && s.exif.placeState === "error") delete s.exif.placeState;
  });
  render();
});
syncOnline();
