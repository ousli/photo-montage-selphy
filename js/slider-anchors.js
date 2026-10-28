// Ancres sur les curseurs : valeur par défaut (graduation, aimant, double-clic) et ancres supplémentaires (setSliderAnchors)
(() => {
  const sliders = [...document.querySelectorAll('input[type="range"]')].filter((el) => !el.list);
  const def = new Map();
  const extra = new Map();
  const ticks = new Map();
  sliders.forEach((el) => {
    const v = el.getAttribute("value");
    if (v === null) return;
    def.set(el, Number(v));
    const dl = document.createElement("datalist");
    dl.id = `${el.id}Ticks`;
    el.after(dl);
    el.setAttribute("list", dl.id);
    el.title = "Double-clic : valeur par défaut";
    ticks.set(el, dl);
    drawTicks(el);
  });
  function drawTicks(el) {
    const dl = ticks.get(el);
    dl.textContent = "";
    [def.get(el), ...(extra.get(el) || [])].forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      dl.appendChild(o);
    });
  }
  // valeurs aimantées en plus de la valeur par défaut (ex. marge de sécurité de l'imprimante)
  window.setSliderAnchors = (el, values, title) => {
    if (!def.has(el)) return;
    const next = values.filter((v) => v >= Number(el.min) && v <= Number(el.max)).map(Math.round);
    const cur = extra.get(el) || [];
    if (next.join() === cur.join()) return;
    extra.set(el, next);
    el.title = next.length && title ? `${title} · double-clic : valeur par défaut` : "Double-clic : valeur par défaut";
    drawTicks(el);
  };
  // peinture M3 : fraction de remplissage (--pf) et repères (--tf0..2), recalculés quand la valeur change
  const all = [...document.querySelectorAll('input[type="range"]')];
  function paint(el) {
    const lo = Number(el.min) || 0;
    const r = (Number(el.max) || 100) - lo || 1;
    const f = (v) => Math.min(1, Math.max(0, (v - lo) / r));
    const marks = def.has(el) ? [def.get(el), ...(extra.get(el) || [])] : [];
    el.style.setProperty("--pf", f(el.value));
    for (let i = 0; i < 3; i++) el.style.setProperty("--tf" + i, i < marks.length ? f(marks[i]) : -1);
  }
  const paintAll = () => !document.hidden && all.forEach(paint);
  document.addEventListener("input", (e) => e.target.matches && e.target.matches('input[type="range"]') && paint(e.target));
  setInterval(paintAll, 150);
  paintAll();
  // en capture, pour que l'aimant agisse avant les autres écouteurs
  document.addEventListener(
    "input",
    (e) => {
      const el = e.target;
      if (!def.has(el)) return;
      const range = Number(el.max) - Number(el.min);
      const thr = Math.max(1, Math.round(range * 0.03));
      const near = [def.get(el), ...(extra.get(el) || [])].filter((a) => Math.abs(el.value - a) <= thr);
      if (near.length) el.value = near.sort((a, b) => Math.abs(el.value - a) - Math.abs(el.value - b))[0];
    },
    true
  );
  if (typeof refreshMontageUI === "function") refreshMontageUI(); // ancres dépendantes de l'imprimante
  document.addEventListener("dblclick", (e) => {
    const el = e.target;
    if (!def.has(el)) return;
    el.value = def.get(el);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
})();
