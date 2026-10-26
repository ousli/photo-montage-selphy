// État du montage, grille et mises en page

const titleDate = $("titleDate");
let titlePosKey = "top";
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
  messageEl.style.color = isError ? "#c62828" : "#1f2430";
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
  if (n === 4) return [2, 2];
  if (n === 8) return land ? [2, 4] : [4, 2];
  return land ? [2, 3] : [3, 2];
}

// Mises en page : grille régulière ou une grande photo + des petites (cellules en unités [col, ligne, largeur, hauteur])
const HERO = {
  2: { cols: 3, rows: 1, cells: [[0, 0, 2, 1], [2, 0, 1, 1]] },
  4: { cols: 3, rows: 3, cells: [[0, 0, 2, 3], [2, 0, 1, 1], [2, 1, 1, 1], [2, 2, 1, 1]] },
  6: { cols: 3, rows: 3, cells: [[0, 0, 2, 2], [2, 0, 1, 1], [2, 1, 1, 1], [0, 2, 1, 1], [1, 2, 1, 1], [2, 2, 1, 1]] },
  8: { cols: 4, rows: 4, cells: [[0, 0, 3, 3], [3, 0, 1, 1], [3, 1, 1, 1], [3, 2, 1, 1], [0, 3, 1, 1], [1, 3, 1, 1], [2, 3, 1, 1], [3, 3, 1, 1]] },
};
let layoutKey = "grid";
function currentLayout() {
  const n = count();
  const land = isLandscape();
  let L;
  if (layoutKey === "hero" && HERO[n]) {
    L = HERO[n];
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
