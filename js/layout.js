// État du montage, grille et mises en page

const titleDate = $("titleDate");
let titlePosKey = "top";
let titleAlign = "center";
const todayFr = () => new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const titleString = () => [titleText.value.trim(), titleDate.checked ? todayFr() : ""].filter(Boolean).join(" · ");
const titleActive = () => titleOn.checked && titleString() !== "";
const titleBase = () => Math.round(titleStyle.size * 1.8);
const titleH = () => (titleActive() ? titleBase() + safeInsetPx(...canvasSize()) : 0);
const captionInput = $("caption");
// slot: { img, zoom (1 = remplit la case), rot (degrés), ox, oy (décalage en fraction de la case) }
const slots = Array.from({ length: 8 }, () => null);
let selected = 0;
let cells = [];

const count = () => Number(countSelect.value);
const isLandscape = () => orientationSelect.value === "landscape";

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? "#e5383b" : "var(--text)";
}

function canvasSize() {
  const pi = paperInfo();
  const [a, b] = pi ? [pi.w, pi.h] : ratioSelect.value.split(":").map(Number);
  const short = Math.round((LONG_EDGE_PX * Math.min(a, b)) / Math.max(a, b));
  return isLandscape() ? [LONG_EDGE_PX, short] : [short, LONG_EDGE_PX];
}

function gridFor(n) {
  const land = isLandscape();
  if (n === 2) return land ? [1, 2] : [2, 1];
  if (n === 3) return land ? [1, 3] : [3, 1];
  if (n === 4) return [2, 2];
  if (n === 8) return land ? [2, 4] : [4, 2];
  return land ? [2, 3] : [3, 2];
}

// Mises en page non régulières, définies en paysage (inversées en portrait).
// Cellules en unités [col, ligne, largeur, hauteur]. Les nombres de photos absents retombent sur la grille.
const LAYOUT_DEFS = {
  grid: {
    5: { cols: 6, rows: 2, cells: [[0, 0, 3, 1], [3, 0, 3, 1], [0, 1, 2, 1], [2, 1, 2, 1], [4, 1, 2, 1]] },
  },
  hero: {
    2: { cols: 3, rows: 1, cells: [[0, 0, 2, 1], [2, 0, 1, 1]] },
    3: { cols: 3, rows: 2, cells: [[0, 0, 2, 2], [2, 0, 1, 1], [2, 1, 1, 1]] },
    4: { cols: 3, rows: 3, cells: [[0, 0, 2, 3], [2, 0, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]] },
    6: { cols: 3, rows: 3, cells: [[0, 0, 2, 2], [2, 0, 1, 1], [2, 1, 1, 1], [0, 2, 1, 1], [1, 2, 1, 1], [2, 2, 1, 1]] },
    8: { cols: 4, rows: 4, cells: [[0, 0, 3, 3], [3, 0, 1, 1], [3, 1, 1, 1], [3, 2, 1, 1], [0, 3, 1, 1], [1, 3, 1, 1], [2, 3, 1, 1], [3, 3, 1, 1]] },
  },
  mosaic: {
    3: { cols: 2, rows: 2, cells: [[0, 0, 2, 1], [0, 1, 1, 1], [1, 1, 1, 1]] },
    4: { cols: 3, rows: 2, cells: [[0, 0, 1, 2], [1, 0, 2, 1], [1, 1, 1, 1], [2, 1, 1, 1]] },
    5: { cols: 3, rows: 3, cells: [[0, 0, 2, 2], [2, 0, 1, 1], [2, 1, 1, 2], [0, 2, 1, 1], [1, 2, 1, 1]] },
    6: { cols: 3, rows: 3, cells: [[0, 0, 1, 2], [1, 0, 1, 1], [2, 0, 1, 2], [1, 1, 1, 2], [0, 2, 1, 1], [2, 2, 1, 1]] },
  },
};
const LAYOUT_LABELS = { grid: "Grille", hero: "Une grande photo", mosaic: "Mosaïque" };
let layoutKey = "grid";
const layoutDef = (key, n) => (LAYOUT_DEFS[key] || {})[n] || null;
// la mise en page choisie existe-t-elle pour ce nombre de photos ? (la grille régulière existe toujours)
const layoutAvailable = (key, n) => key === "grid" || !!layoutDef(key, n);
function currentLayout() {
  const n = count();
  const land = isLandscape();
  let L = layoutDef(layoutKey, n) || layoutDef("grid", n);
  if (L) {
    if (!land) L = { cols: L.rows, rows: L.cols, cells: L.cells.map(([c, r, sw, sh]) => [r, c, sh, sw]) };
  } else {
    const [rows, cols] = gridFor(n);
    L = { cols, rows, cells: Array.from({ length: n }, (_, i) => [i % cols, Math.floor(i / cols), 1, 1]) };
  }
  return L;
}
const gapV = () => Number(gapInput.value);
const outerV = () => ($("gapLink").checked ? gapV() : Number($("outerGap").value));
const radiusV = () => Number($("radius").value);
const frameV = () => ($("frameOn").checked ? Number($("frameW").value) : 0);

function computeCells() {
  const [w, h] = canvasSize();
  const L = currentLayout();
  const g = gapV();
  const m = outerV();
  const top = titlePosKey === "top" ? titleH() : 0;
  const bottom = titlePosKey === "bottom" ? titleH() : 0;
  const cw = (w - 2 * m - g * (L.cols - 1)) / L.cols;
  const ch = (h - top - bottom - 2 * m - g * (L.rows - 1)) / L.rows;
  cells = L.cells.map(([c, r, sw, sh]) => ({
    x: m + c * (cw + g),
    y: top + m + r * (ch + g),
    w: sw * cw + (sw - 1) * g,
    h: sh * ch + (sh - 1) * g,
  }));
}

function clampOffset(s) {
  const lim = Math.max(0, 0.5 * s.zoom) + 0.5; // garde toujours une partie visible
  s.ox = Math.max(-lim, Math.min(lim, s.ox));
  s.oy = Math.max(-lim, Math.min(lim, s.oy));
}

// Quand la case touche le bas du montage, la bande de légende descend dans la zone rognée par la Selphy : on l'agrandit d'autant
function bandExtra(c) {
  return Math.max(0, c.y + c.h - (canvas.height - safeInsetPx(canvas.width, canvas.height)));
}

// Zone occupée par la photo : la cellule moins la bande de légende
function photoRect(c, s) {
  return hasBand(s) ? { ...c, h: c.h - captionH() - bandExtra(c) } : c;
}
