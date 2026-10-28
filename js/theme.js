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

  // Couleur d'accent : palettes officielles M3 (HCT, schéma Tonal Spot) calculées par vendor/m3-palette.js ; le violet d'origine est celui de styles.css
  const AKEY = "montage-accent";
  const ACCENTS = [
    { id: "violet", name: "Violet", seed: "#6750A4" },
    { id: "bleu", name: "Bleu", seed: "#2F6BDB" },
    { id: "turquoise", name: "Turquoise", seed: "#00897B" },
    { id: "vert", name: "Vert", seed: "#2E7D32" },
    { id: "ambre", name: "Ambre", seed: "#F9A825" },
    { id: "orange", name: "Orange", seed: "#E65100" },
    { id: "rose", name: "Rose", seed: "#C2185B" },
    { id: "rouge", name: "Rouge", seed: "#B3261E" },
  ];
  const savedAccent = () => {
    try {
      const v = localStorage.getItem(AKEY);
      return ACCENTS.some((a) => a.id === v) ? v : "violet";
    } catch (e) {
      return "violet";
    }
  };
  const TOKENS = ["primary", "on-primary", "primary-container", "on-primary-container", "secondary-container", "on-secondary-container", "surface", "sc-lowest", "sc-low", "sc", "sc-high", "sc-highest", "outline", "outline-variant", "on-surface-variant"];
  function applyAccent(dark) {
    const a = ACCENTS.find((x) => x.id === savedAccent());
    TOKENS.forEach((k) => root.style.removeProperty("--md-" + k));
    if (a.id === "violet") return;
    if (!window.M3Palette) {
      // palette (88 Ko) chargée seulement pour un accent autre que le violet ; en bloquant au démarrage pour éviter un flash de couleur
      if (document.readyState === "loading") document.write('<script src="./vendor/m3-palette.js"><\/script>');
      else {
        const sc = document.createElement("script");
        sc.src = "./vendor/m3-palette.js";
        sc.onload = () => applyAccent(dark);
        document.head.appendChild(sc);
        return;
      }
      if (!window.M3Palette) return;
    }
    const t = window.M3Palette(a.seed, dark);
    TOKENS.forEach((k) => root.style.setProperty("--md-" + k, t[k]));
  }

  function apply() {
    const s = saved();
    if (s) root.dataset.theme = s;
    else delete root.dataset.theme;
    const dark = effective() === "dark";
    applyAccent(dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(root).getPropertyValue("--md-surface").trim() || (dark ? "#141218" : "#fef7ff");
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

  const PALETTE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/></svg>';
  function setupAccentMenu() {
    const btn = document.getElementById("accentBtn");
    if (!btn) return;
    btn.innerHTML = PALETTE;
    btn.setAttribute("aria-haspopup", "menu");
    const menu = document.createElement("div");
    menu.className = "accent-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    document.body.appendChild(menu);
    const swatch = (a) => `<i class="accent-dot" style="background:${a.seed}"></i>`;
    const render = () => {
      const cur = savedAccent();
      menu.innerHTML = ACCENTS.map(
        (a) => `<button type="button" role="menuitemradio" aria-checked="${a.id === cur}" data-id="${a.id}">${swatch(a)}<span>${a.name}</span><b>${a.id === cur ? "✓" : ""}</b></button>`
      ).join("");
    };
    const close = () => {
      btn.setAttribute("aria-expanded", "false");
      if (menu.hidden || menu.classList.contains("closing")) return;
      menu.classList.add("closing");
      setTimeout(() => {
        menu.hidden = true;
        menu.classList.remove("closing");
      }, 150);
    };
    btn.onclick = (e) => {
      e.stopPropagation();
      if (!menu.hidden) return close();
      render();
      menu.classList.remove("closing");
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      const r = btn.getBoundingClientRect();
      menu.style.top = r.bottom + 6 + "px";
      menu.style.left = Math.max(8, Math.min(innerWidth - menu.offsetWidth - 8, r.right - menu.offsetWidth)) + "px";
      const on = menu.querySelector('[aria-checked="true"]');
      on && on.focus();
    };
    menu.onclick = (e) => {
      const b = e.target.closest("button[data-id]");
      if (!b) return;
      try {
        localStorage.setItem(AKEY, b.dataset.id);
      } catch (err) {}
      apply();
      close();
      btn.focus();
    };
    document.addEventListener("click", (e) => !menu.hidden && !menu.contains(e.target) && close());
    document.addEventListener("keydown", (e) => {
      if (menu.hidden) return;
      if (e.key === "Escape") {
        close();
        btn.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [...menu.querySelectorAll("button")];
        const i = items.indexOf(document.activeElement);
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    apply();
    document.getElementById("themeBtn").onclick = toggle;
    setupAccentMenu();
  });
})();
