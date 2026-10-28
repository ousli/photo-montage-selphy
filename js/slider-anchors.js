// Ancre à la valeur par défaut sur chaque curseur : graduation, aimant, double-clic pour revenir
(() => {
  const sliders = [...document.querySelectorAll('input[type="range"]')].filter((el) => !el.list);
  const def = new Map();
  sliders.forEach((el) => {
    const v = el.getAttribute("value");
    if (v === null) return;
    def.set(el, Number(v));
    const dl = document.createElement("datalist");
    dl.id = `${el.id}Ticks`;
    const o = document.createElement("option");
    o.value = v;
    dl.appendChild(o);
    el.after(dl);
    el.setAttribute("list", dl.id);
    el.title = "Double-clic : valeur par défaut";
  });
  // en capture, pour que l'aimant agisse avant les autres écouteurs
  document.addEventListener(
    "input",
    (e) => {
      const el = e.target;
      if (!def.has(el)) return;
      const d = def.get(el);
      const range = Number(el.max) - Number(el.min);
      if (Math.abs(el.value - d) <= Math.max(1, Math.round(range * 0.03))) el.value = d;
    },
    true
  );
  document.addEventListener("dblclick", (e) => {
    const el = e.target;
    if (!def.has(el)) return;
    el.value = def.get(el);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
})();
