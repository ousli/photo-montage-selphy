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
    if (meta) meta.content = dark ? "#1b1f29" : "#3366ff";
    const btn = document.getElementById("themeBtn");
    if (btn) {
      btn.innerHTML = dark ? SUN : MOON;
      btn.title = btn.ariaLabel = dark ? "Passer au thème clair" : "Passer au thème sombre";
    }
  }

  apply();
  mq.addEventListener && mq.addEventListener("change", apply);
  document.addEventListener("DOMContentLoaded", () => {
    apply();
    document.getElementById("themeBtn").onclick = () => {
      try {
        localStorage.setItem(KEY, effective() === "dark" ? "light" : "dark");
      } catch (e) {}
      apply();
    };
  });
})();
