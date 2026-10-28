// Thème clair / sombre : suit le système, avec un choix mémorisé (bouton de l'en-tête).
// Chargé dans <head> pour appliquer le thème avant le premier affichage.
(function () {
  const KEY = "montage-theme";
  const root = document.documentElement;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const saved = () => {
    try {
      const v = localStorage.getItem(KEY);
      return v === "dark" || v === "light" ? v : null;
    } catch (e) {
      return null;
    }
  };
  const effective = () => saved() || (mq.matches ? "dark" : "light");

  const SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function apply() {
    const s = saved();
    if (s) root.dataset.theme = s;
    else delete root.dataset.theme;
    const dark = effective() === "dark";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#141218" : "#fef7ff";
    const btn = document.getElementById("themeBtn");
    if (btn) {
      btn.innerHTML = dark ? SUN : MOON;
      btn.title = btn.ariaLabel = dark ? "Passer au thème clair" : "Passer au thème sombre";
    }
  }

  apply();
  mq.addEventListener && mq.addEventListener("change", apply);
  function toggle() {
    const btn = document.getElementById("themeBtn");
    const next = effective() === "dark" ? "light" : "dark";
    const change = () => {
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
      apply();
      const svg = btn.querySelector("svg");
      if (svg) svg.classList.add("theme-spin");
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) return change();
    // le nouveau thème se propage en cercle depuis le bouton
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add("theme-anim");
    const t = document.startViewTransition(change);
    t.ready
      .then(() =>
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 320, easing: "ease-out", pseudoElement: "::view-transition-new(root)" }
        )
      )
      .catch(() => {});
    t.finished.finally(() => root.classList.remove("theme-anim"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    apply();
    document.getElementById("themeBtn").onclick = toggle;
  });
})();
