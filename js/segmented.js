// Boutons segmentés

// Remplace chaque <select> par des boutons segmentés synchronisés avec lui
function segmented(select) {
  const group = document.createElement("div");
  group.className = "seg";
  const pill = document.createElement("span");
  pill.className = "seg-pill";
  group.appendChild(pill);
  const sync = () => {
    group.querySelectorAll("button").forEach((b) => {
      const on = b.dataset.v === select.value;
      b.classList.toggle("on", on);
      if (on) {
        pill.style.width = `${b.offsetWidth}px`;
        pill.style.transform = `translateX(${b.offsetLeft}px)`;
      }
    });
  };
  window.addEventListener("resize", sync);
  Array.from(select.options).forEach((o) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.v = o.value;
    b.textContent = o.textContent;
    b.onclick = () => {
      select.value = o.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    };
    group.appendChild(b);
  });
  select.addEventListener("change", sync);
  select.hidden = true;
  select.after(group);
  sync();
  return sync;
}
const syncSegs = [ratioSelect, orientationSelect, countSelect].map(segmented);
$("resetAllBtn").addEventListener("click", () => syncSegs.forEach((f) => f()));

// Petite animation de l'aperçu quand le format change
[ratioSelect, orientationSelect, countSelect].forEach((el) =>
  el.addEventListener("change", () => {
    canvas.classList.remove("changed");
    void canvas.offsetWidth;
    canvas.classList.add("changed");
  })
);
canvas.addEventListener("animationend", () => canvas.classList.remove("changed"));
