// Sélecteur d'imprimante, papier et zone imprimable

// sélecteur visuel (recherche + liste par marque) au-dessus du <select> conservé comme source de vérité
const printerBtn = $("printerBtn");
const printerPanel = $("printerPanel");
const printerSearch = $("printerSearch");
const printerList = $("printerList");
function printerLabel(id) {
  if (id === PRINTER_CUSTOM) return "Imprimante personnalisée";
  if (id === PRINTER_FREE) return "Aucune (ratio libre)";
  const p = printerOf(id);
  return p ? `${p.brand} ${p.name}` : "";
}
let printerDown = null;
let lastPick = 0;
function renderPrinterList() {
  const q = printerSearch.value.trim().toLowerCase();
  // ne reconstruit pas la liste sous le doigt/curseur (correcteur du clavier, appui en cours) : le clic serait perdu
  const sig = q + "|" + printerId;
  if (renderPrinterList.sig === sig && printerList.children.length) return;
  if (printerDown) return;
  renderPrinterList.sig = sig;
  printerList.innerHTML = "";
  const add = (id, title, sub, group) => {
    if (group !== undefined && group !== renderPrinterList.last) {
      renderPrinterList.last = group;
      const h = document.createElement("div");
      h.className = "printer-group";
      h.textContent = group;
      printerList.appendChild(h);
    }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "printer-item" + (id === printerId ? " on" : "");
    b.innerHTML = `<strong></strong><small></small>`;
    b.firstChild.textContent = title;
    b.lastChild.textContent = sub;
    b.dataset.id = id;
    printerList.appendChild(b);
  };
  renderPrinterList.last = null;
  let n = 0;
  PRINTERS.slice().sort((a, b) => a.brand.localeCompare(b.brand) || 0).forEach((p) => {
    if (q && !`${p.brand} ${p.name}`.toLowerCase().includes(q)) return;
    n++;
    add(p.id, p.name, p.papers.map((x) => x.label).join(" · "), p.brand);
  });
  if (!q || "personnalisée libre autre".includes(q)) {
    add(PRINTER_CUSTOM, "Imprimante personnalisée…", "Saisir le papier et la marge", "Autre");
    add(PRINTER_FREE, "Aucune (ratio libre)", "Sans zone imprimable", "Autre");
  } else if (!n) {
    printerList.textContent = "Aucun résultat.";
  }
}
// mobile : le panneau suit la zone réellement visible (le clavier la réduit)
function fitPrinterPanel() {
  const vv = window.visualViewport;
  if (!vv || printerPanel.hidden) return;
  printerPanel.style.setProperty("--pp-top", `${vv.offsetTop + 8}px`);
  printerPanel.style.setProperty("--pp-h", `${Math.max(160, vv.height - 16)}px`);
}
if (window.visualViewport) {
  visualViewport.addEventListener("resize", fitPrinterPanel);
  visualViewport.addEventListener("scroll", fitPrinterPanel);
}
$("printerClose").onclick = () => togglePrinterPanel(false);
function togglePrinterPanel(open) {
  printerPanel.hidden = !open;
  // mobile : hors de la feuille basse (qui rogne), sinon le panneau reste coincé dedans
  const home = open && isMobile() ? document.body : $("printerPicker");
  if (printerPanel.parentElement !== home) home.appendChild(printerPanel);
  if (open) fitPrinterPanel();
  printerBtn.setAttribute("aria-expanded", open);
  if (open) {
    printerSearch.value = "";
    renderPrinterList.sig = null;
    renderPrinterList();
    printerSearch.focus({ preventScroll: true });
  }
}
printerBtn.onclick = () => togglePrinterPanel(printerPanel.hidden);
printerSearch.oninput = renderPrinterList;
// garder le focus sur la recherche : sinon le premier appui ne fait que fermer le clavier / déplacer la liste
printerList.addEventListener("mousedown", (e) => e.preventDefault());
function pickPrinter(id) {
  printerSel.value = id;
  printerSel.dispatchEvent(new Event("change", { bubbles: true }));
  togglePrinterPanel(false);
}
// sélection au relâchement du doigt/souris (avant que le clavier ne se ferme et ne décale la liste), sauf si on fait défiler
printerList.addEventListener("pointerdown", (e) => (printerDown = { x: e.clientX, y: e.clientY }));
printerList.addEventListener("pointercancel", () => (printerDown = null));
printerList.addEventListener("pointerup", (e) => {
  const it = e.target.closest(".printer-item");
  const d = printerDown;
  printerDown = null;
  if (it && d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) {
    lastPick = Date.now();
    pickPrinter(it.dataset.id);
  }
});
printerList.addEventListener("click", (e) => {
  const it = e.target.closest(".printer-item");
  // secours si pointerup a été perdu (et activation au clavier)
  if (it && Date.now() - lastPick > 600) pickPrinter(it.dataset.id);
});
document.addEventListener("click", (e) => {
  if (!printerPanel.hidden && !e.target.closest("#printerPicker, #printerPanel")) togglePrinterPanel(false);
});
document.addEventListener("keydown", (e) => e.key === "Escape" && togglePrinterPanel(false));

const clampNum = (v, lo, hi, d) => (Number.isFinite(Number(v)) && v !== "" ? Math.max(lo, Math.min(hi, Number(v))) : d);
const customPaper = () => ({
  w: clampNum(customInputs.w.value, 20, 600, DEFAULT_CUSTOM.w),
  h: clampNum(customInputs.h.value, 20, 600, DEFAULT_CUSTOM.h),
  safe: clampNum(customInputs.safe.value, 0, 15, DEFAULT_CUSTOM.safe),
});
// papier effectif {w (grand côté), h, safe, label} ; null = pas d'imprimante (ratio libre)
function paperInfo() {
  if (printerId === PRINTER_FREE) return null;
  if (printerId === PRINTER_CUSTOM) {
    const c = customPaper();
    return { w: Math.max(c.w, c.h), h: Math.min(c.w, c.h), safe: c.safe, label: "Personnalisé" };
  }
  const pr = printerOf(printerId) || printerOf(DEFAULT_PRINTER);
  return pr.papers.find((x) => x.id === paperId) || pr.papers[0];
}
function setPrinterState(id, pid, custom) {
  printerId = id === PRINTER_CUSTOM || id === PRINTER_FREE || printerOf(id) ? id : DEFAULT_PRINTER;
  const pr = printerOf(printerId);
  paperId = pr ? (pr.papers.some((x) => x.id === pid) ? pid : pr.papers[0].id) : "";
  const c = { ...DEFAULT_CUSTOM, ...(custom || {}) };
  customInputs.w.value = c.w;
  customInputs.h.value = c.h;
  customInputs.safe.value = c.safe;
  printerSel.value = printerId;
}
function safeInsetPx(w, h) {
  const pi = paperInfo();
  return pi ? (pi.safe * Math.max(w, h)) / pi.w : 0;
}
function drawGuides(w, h) {
  if (!$("guides").checked) return;
  const d = safeInsetPx(w, h);
  if (!d) return;
  ctx.save();
  ctx.fillStyle = "rgba(20, 30, 70, 0.16)";
  ctx.fillRect(0, 0, w, d);
  ctx.fillRect(0, h - d, w, d);
  ctx.fillRect(0, d, d, h - 2 * d);
  ctx.fillRect(w - d, d, d, h - 2 * d);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 12]);
  ctx.strokeRect(d, d, w - 2 * d, h - 2 * d);
  ctx.restore();
}
