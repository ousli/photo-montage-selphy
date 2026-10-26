// Préréglages et choix du format

// Préréglages
// préréglages intégrés : un par format de papier de l'imprimante choisie
function builtinPresets() {
  const pr = printerOf(printerId);
  if (!pr) return [];
  return pr.papers.map((x) => ({
    name: `${pr.name} · ${x.label}`,
    printer: pr.id, paper: x.id, ratio: ratioSelect.value, orientation: "landscape",
    count: x.w >= 140 ? "2" : x.w >= 100 ? "4" : "2", gap: DEFAULT_GAP, builtin: true,
  }));
}
const PRESET_KEY = "montage-presets";
const presetList = $("presetList");
const presetName = $("presetName");

const loadUserPresets = () => {
  try {
    return JSON.parse(localStorage.getItem(PRESET_KEY)) || [];
  } catch {
    return [];
  }
};
const saveUserPresets = (list) => localStorage.setItem(PRESET_KEY, JSON.stringify(list));

function applyPreset(p) {
  if (p.printer) {
    setPrinterState(p.printer, p.paper, p.custom || customPaper());
  } else {
    // ancien préréglage sans imprimante : formats du modèle actuel de même ratio, sinon ratio libre
    const [ra, rb] = p.ratio.split(":").map(Number);
    const pr = printerOf(printerId);
    const hit = pr && pr.papers.find((x) => Math.abs(x.w / x.h - ra / rb) < 0.02);
    if (hit) paperId = hit.id;
    else setPrinterState(PRINTER_FREE, null, customPaper());
  }
  ratioSelect.value = p.ratio;
  orientationSelect.value = p.orientation;
  countSelect.value = p.count;
  gapInput.value = p.gap;
  if (p.printer) snapRatio();
  [ratioSelect, orientationSelect, countSelect, gapInput].forEach((el) => {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  renderPresets();
  setMessage(`Préréglage « ${p.name} » appliqué.`);
}

// Imprimante : le choix du format de papier fixe le ratio
function snapRatio() {
  const pi = paperInfo();
  if (!pi) return;
  const r = pi.w / pi.h;
  const opts = ["3:2", "4:3", "16:9"];
  const best = opts.reduce((m, k) => {
    const [a, b] = k.split(":").map(Number);
    return Math.abs(a / b - r) < Math.abs(m[0] - r) ? [a / b, k] : m;
  }, [Infinity, "3:2"])[1];
  ratioSelect.value = best;
  syncSegs.forEach((f) => f());
}
function afterPrinterChange() {
  snapRatio();
  renderPresets();
  render();
}
function choosePaper(id) {
  paperId = id;
  afterPrinterChange();
}
printerSel.addEventListener("change", () => {
  setPrinterState(printerSel.value, null, customPaper());
  afterPrinterChange();
});

function renderPresets() {
  presetList.innerHTML = "";
  const user = loadUserPresets();
  [...builtinPresets(), ...user].forEach((p) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "secondary small";
    b.textContent = p.name;
    b.title = `${p.printer ? (printerOf(p.printer) || {}).name + " · " : ""}${p.ratio} · ${p.orientation === "landscape" ? "paysage" : "portrait"} · ${p.count} photos · marge ${p.gap}px`;
    b.onclick = () => applyPreset(p);
    chip.appendChild(b);
    if (!p.builtin) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "ghost small chip-del";
      del.textContent = "✕";
      del.title = "Supprimer";
      del.onclick = () => {
        saveUserPresets(loadUserPresets().filter((u) => u.name !== p.name));
        renderPresets();
      };
      chip.appendChild(del);
    }
    presetList.appendChild(chip);
  });
}

$("presetSave").onclick = () => {
  const name = presetName.value.trim();
  if (!name) return setMessage("Donne un nom au préréglage.", true);
  const preset = {
    name,
    ratio: ratioSelect.value,
    orientation: orientationSelect.value,
    count: countSelect.value,
    gap: Number(gapInput.value),
    printer: printerId,
    paper: paperId,
    custom: customPaper(),
  };
  const list = loadUserPresets().filter((u) => u.name !== name);
  list.push(preset);
  saveUserPresets(list);
  presetName.value = "";
  renderPresets();
  setMessage(`Préréglage « ${name} » enregistré.`);
};
presetName.addEventListener("keydown", (e) => e.key === "Enter" && $("presetSave").click());

renderPresets();
