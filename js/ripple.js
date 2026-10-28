// Ripple M3 : onde de l'état « pressé » sur boutons, chips et onglets (désactivée si le mouvement est réduit)
(function () {
  const SKIP = "input, select, .swatch, .accent-dot, .sheet-handle, .seg-pill, [disabled], .round.plain";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  document.addEventListener(
    "pointerdown",
    (ev) => {
      if (reduce.matches || ev.button > 0) return;
      const b = ev.target.closest && ev.target.closest("button, .chip, .tabs button, [role=menuitemradio]");
      if (!b || b.matches(SKIP) || b.closest(".sheet-handle")) return;
      const host = b.querySelector(":scope > .tab-ic") || b;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      const box = host.querySelector(":scope > .ripple") || host.appendChild(Object.assign(document.createElement("span"), { className: "ripple" }));
      const r = host.getBoundingClientRect();
      const size = Math.hypot(Math.max(ev.clientX - r.left, r.right - ev.clientX), Math.max(ev.clientY - r.top, r.bottom - ev.clientY)) * 2;
      const dot = document.createElement("i");
      dot.style.cssText = `width:${size}px;height:${size}px;left:${ev.clientX - r.left - size / 2}px;top:${ev.clientY - r.top - size / 2}px`;
      box.appendChild(dot);
      const end = () => {
        dot.classList.add("out");
        setTimeout(() => dot.remove(), 260);
        removeEventListener("pointerup", end, true);
        removeEventListener("pointercancel", end, true);
      };
      addEventListener("pointerup", end, true);
      addEventListener("pointercancel", end, true);
    },
    true
  );
})();
