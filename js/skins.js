// Styles d'interface à comparer (choix mémorisé ; ?style=nom pour forcer)
(function () {
  const KEY = "montage-style";
  const NAMES = { classique: "Classique", studio: "Studio", papier: "Papier", pastel: "Pastel", minimal: "Minimal" };
  const root = document.documentElement;
  const get = () => {
    const q = new URLSearchParams(location.search).get("style");
    try {
      return q && NAMES[q] ? q : localStorage.getItem(KEY) || "classique";
    } catch (e) {
      return "classique";
    }
  };
  const apply = (n) => {
    if (!NAMES[n]) n = "classique";
    if (n === "classique") delete root.dataset.style;
    else root.dataset.style = n;
    try { localStorage.setItem(KEY, n); } catch (e) {}
  };
  apply(get());
  document.addEventListener("DOMContentLoaded", () => {
    const sel = document.createElement("select");
    sel.className = "style-pick";
    sel.title = "Style de l'interface";
    sel.setAttribute("aria-label", "Style de l'interface");
    for (const [k, v] of Object.entries(NAMES)) sel.add(new Option("Style : " + v, k));
    sel.value = get();
    sel.onchange = () => apply(sel.value);
    const bar = document.querySelector(".top-actions");
    bar.insertBefore(sel, bar.firstChild);
  });
})();
