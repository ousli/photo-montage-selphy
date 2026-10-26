const $ = (id) => document.getElementById(id);
const ratioSelect = $("ratio");
const orientationSelect = $("orientation");
const countSelect = $("photoCount");
const gapInput = $("gap");
const zoomInput = $("zoom");
const rotInput = $("rot");
const fileInput = $("fileInput");
const slotsEl = $("slots");
const messageEl = $("message");
const canvas = $("montageCanvas");
const ctx = canvas.getContext("2d");

const LONG_EDGE_PX = 1800;
const captionsOn = $("captionsOn");
const titleOn = $("titleOn");
const titleText = $("titleText");
const DEFAULT_TITLE = { font: "sans", color: "#1f2430", size: 72 };
const DEFAULT_CAP = { font: "sans", color: "#1f2430", size: 40 };
const FONTS = {
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Trebuchet MS", "Arial Rounded MT Bold", Verdana, sans-serif',
  script: '"Snell Roundhand", "Brush Script MT", "Segoe Script", cursive',
  mono: '"Courier New", Courier, monospace',
};
const FONT_LABELS = { sans: "Sans-serif", serif: "Serif", rounded: "Arrondie", script: "Manuscrite", mono: "Machine à écrire" };
const PALETTE = ["#1f2430", "#ffffff", "#c0392b", "#e67e22", "#f1c40f", "#27ae60", "#2980b9", "#8e44ad"];
let titleStyle = { ...DEFAULT_TITLE };
const capStyleOf = (s) => (s && s.style) || DEFAULT_CAP;
// la bande de légende est la même pour toutes les cases : elle suit la plus grande taille choisie
const captionH = () => {
  const sizes = slots.slice(0, count()).filter(Boolean).map((s) => capStyleOf(s).size);
  return Math.round((sizes.length ? Math.max(...sizes) : DEFAULT_CAP.size) * 1.9);
};
const DEFAULT_OVL = { font: "sans", color: "#ffffff", size: 30 };
const DEFAULT_EXIF_FIELDS = { date: true, camera: true, settings: true, gps: false };
const EXIF_FIELD_LABELS = { date: "Date", camera: "Appareil", settings: "Réglages", gps: "Lieu GPS" };
const CORNER_LABELS = { tl: "↖ Haut gauche", tr: "↗ Haut droite", bl: "↙ Bas gauche", br: "↘ Bas droite" };
const ovlStyleOf = (s) => (s && s.exifStyle) || DEFAULT_OVL;
const exifFieldsOf = (s) => (s && s.exifFields) || DEFAULT_EXIF_FIELDS;
const exifModeOf = (s) => (s && s.exifMode) || "none";

// certains fichiers donnent les rationnels sous forme [numérateur, dénominateur]
const num = (v) => (v && typeof v === "object" && v.length === 2 ? v[0] / v[1] : Number(v));

function formatExif(r) {
  if (!r) return null;
  const out = {};
  const d = r.DateTimeOriginal || r.CreateDate;
  if (d instanceof Date && !isNaN(d)) {
    out.date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }
  const make = (r.Make || "").trim();
  const model = (r.Model || "").trim();
  const cam = model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`.trim();
  if (cam) out.camera = cam;
  const parts = [];
  if (r.ISO) parts.push(`ISO ${r.ISO}`);
  if (num(r.FNumber)) parts.push(`f/${Math.round(num(r.FNumber) * 10) / 10}`);
  if (num(r.ExposureTime)) {
    const t = num(r.ExposureTime);
    parts.push(t < 1 ? `1/${Math.round(1 / t)} s` : `${Math.round(t * 10) / 10} s`);
  }
  if (num(r.FocalLength)) parts.push(`${Math.round(num(r.FocalLength))} mm`);
  if (parts.length) out.settings = parts.join(" · ");
  if (typeof r.latitude === "number" && typeof r.longitude === "number") {
    out.gps = `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`;
  }
  return Object.keys(out).length ? out : null;
}

async function readExif(file) {
  if (typeof exifr === "undefined") return null;
  try {
    return formatExif(await exifr.parse(file, { gps: true }));
  } catch (e) {
    return null;
  }
}

// lignes EXIF actives pour une photo
function exifLines(s) {
  if (!s || !s.exif) return [];
  const f = exifFieldsOf(s);
  return Object.keys(EXIF_FIELD_LABELS).filter((k) => f[k] && s.exif[k]).map((k) => s.exif[k]);
}
const hasExifCaption = (s) => exifModeOf(s) === "caption" && exifLines(s).length > 0;
// texte sous la photo : légende manuelle et/ou infos EXIF
function captionTextOf(s) {
  const parts = [];
  if (captionsOn.checked && s.caption) parts.push(s.caption);
  if (hasExifCaption(s)) parts.push(exifLines(s).join(" · "));
  return parts.join(" · ");
}
const bandOn = () => captionsOn.checked || slots.slice(0, count()).some(hasExifCaption);

const titleActive = () => titleOn.checked && titleText.value.trim() !== "";
const titleH = () => (titleActive() ? Math.round(titleStyle.size * 1.8) : 0);
const captionInput = $("caption");
// slot: { img, zoom (1 = remplit la case), rot (degrés), ox, oy (décalage en fraction de la case) }
const slots = Array.from({ length: 6 }, () => null);
let selected = 0;
let cells = [];

const count = () => Number(countSelect.value);
const isLandscape = () => orientationSelect.value === "landscape";

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? "#c62828" : "#1f2430";
}

function canvasSize() {
  const [a, b] = ratioSelect.value.split(":").map(Number);
  const short = Math.round((LONG_EDGE_PX * Math.min(a, b)) / Math.max(a, b));
  return isLandscape() ? [LONG_EDGE_PX, short] : [short, LONG_EDGE_PX];
}

function gridFor(n) {
  const land = isLandscape();
  if (n === 2) return land ? [1, 2] : [2, 1];
  if (n === 4) return [2, 2];
  return land ? [2, 3] : [3, 2];
}

function computeCells() {
  const [w, h] = canvasSize();
  const [rows, cols] = gridFor(count());
  const gap = Number(gapInput.value);
  const cw = (w - gap * (cols + 1)) / cols;
  const top = titleH();
  const ch = (h - top - gap * (rows + 1)) / rows;
  cells = [];
  for (let i = 0; i < count(); i++) {
    cells.push({
      x: gap + (i % cols) * (cw + gap),
      y: top + gap + Math.floor(i / cols) * (ch + gap),
      w: cw,
      h: ch,
    });
  }
}

function clampOffset(s) {
  const lim = Math.max(0, 0.5 * (s.zoom - 0.0)) + 0.5; // garde toujours une partie visible
  s.ox = Math.max(-lim, Math.min(lim, s.ox));
  s.oy = Math.max(-lim, Math.min(lim, s.oy));
}

// Zone occupée par la photo : la cellule moins la bande de légende
function photoRect(c) {
  return bandOn() ? { ...c, h: c.h - captionH() } : c;
}

function fitText(text, st, maxW) {
  let size = st.size;
  const fam = FONTS[st.font] || FONTS.sans;
  ctx.font = `${size}px ${fam}`;
  while (size > 14 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${size}px ${fam}`;
  }
}

function drawCaption(text, c, st) {
  ctx.save();
  fitText(text, st, c.w - 32);
  ctx.fillStyle = st.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, c.x + c.w / 2, c.y + c.h - captionH() / 2);
  ctx.restore();
}

function drawTitle(w) {
  ctx.save();
  fitText(titleText.value.trim(), titleStyle, w - 80);
  ctx.fillStyle = titleStyle.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(titleText.value.trim(), w / 2, titleH() / 2 + 6);
  ctx.restore();
}

function drawOverlay(s, pr) {
  const lines = exifLines(s);
  if (!lines.length) return;
  const st = ovlStyleOf(s);
  const pad = Math.round(st.size * 0.8);
  const corner = s.exifCorner || "bl";
  const right = corner.endsWith("r");
  const top = corner.startsWith("t");
  const lh = st.size * 1.3;
  ctx.save();
  ctx.beginPath();
  ctx.rect(pr.x, pr.y, pr.w, pr.h);
  ctx.clip();
  const n = parseInt(st.color.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  ctx.shadowColor = lum > 0.55 ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.8)";
  ctx.shadowBlur = st.size * 0.25;
  ctx.fillStyle = st.color;
  ctx.textAlign = right ? "right" : "left";
  ctx.textBaseline = "middle";
  const x = right ? pr.x + pr.w - pad : pr.x + pad;
  const y0 = top ? pr.y + pad + lh / 2 : pr.y + pr.h - pad - lh / 2 - (lines.length - 1) * lh;
  lines.forEach((t, i) => {
    fitText(t, st, pr.w - pad * 2);
    ctx.fillText(t, x, y0 + i * lh);
  });
  ctx.restore();
}

function drawSlot(s, c) {
  const rad = (s.rot * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  // taille de la boîte englobante de l'image pivotée, pour qu'elle remplisse la case à zoom 100 %
  const bw = s.img.width * cos + s.img.height * sin;
  const bh = s.img.width * sin + s.img.height * cos;
  const cover = Math.max(c.w / bw, c.h / bh) * s.zoom;
  const dw = s.img.width * cover;
  const dh = s.img.height * cover;
  const cx = c.x + c.w / 2 + s.ox * c.w;
  const cy = c.y + c.h / 2 + s.oy * c.h;
  ctx.translate(cx, cy);
  ctx.rotate(rad);
  ctx.drawImage(s.img, -dw / 2, -dh / 2, dw, dh);
}

function render(forExport = false) {
  const [w, h] = canvasSize();
  canvas.width = w;
  canvas.height = h;
  computeCells();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  // pendant un échange, la case survolée montre déjà le résultat
  const shown = slots.slice();
  const hover = !forExport && swap ? swapTarget() : -1;
  if (hover >= 0) [shown[selected], shown[hover]] = [shown[hover], shown[selected]];

  if (titleActive()) drawTitle(w);

  cells.forEach((c, i) => {
    const s = shown[i];
    if (!s) {
      if (!forExport) {
        ctx.fillStyle = "#eef1f8";
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = "#8b94ab";
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Photo ${i + 1}`, c.x + c.w / 2, c.y + c.h / 2);
      }
      return;
    }
    const pr = photoRect(c);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pr.x, pr.y, pr.w, pr.h);
    ctx.clip();
    drawSlot(s, pr);
    ctx.restore();
    const txt = captionTextOf(s);
    if (txt) drawCaption(txt, c, capStyleOf(s));
    if (exifModeOf(s) === "overlay") drawOverlay(s, pr);
  });

  if (!forExport && cells[selected]) {
    const c = cells[selected];
    ctx.strokeStyle = "#3366ff";
    ctx.lineWidth = 8;
    ctx.strokeRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
  }
  if (!forExport && swap) drawSwapOverlay();
  refreshUI();
}

function swapTarget() {
  const t = cells.findIndex(
    (c) => swap.x >= c.x && swap.x <= c.x + c.w && swap.y >= c.y && swap.y <= c.y + c.h
  );
  return t === selected ? -1 : t;
}

function drawSwapOverlay() {
  const hover = swapTarget();
  ctx.save();
  cells.forEach((c, i) => {
    if (i === selected) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(c.x, c.y, c.w, c.h);
      return;
    }
    const on = i === hover;
    ctx.fillStyle = on ? "rgba(51,102,255,0.22)" : "rgba(51,102,255,0.08)";
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = "#3366ff";
    ctx.lineWidth = on ? 10 : 5;
    ctx.setLineDash(on ? [] : [24, 16]);
    ctx.strokeRect(c.x + 6, c.y + 6, c.w - 12, c.h - 12);
    // pastille d'indication au centre de chaque zone de dépôt
    const r = Math.min(c.w, c.h) * 0.09;
    ctx.setLineDash([]);
    ctx.fillStyle = on ? "#3366ff" : "rgba(51,102,255,0.75)";
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2, c.y + c.h / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.round(r * 1.3)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⇄", c.x + c.w / 2, c.y + c.h / 2);
  });
  ctx.restore();
  // miniature qui suit le pointeur
  const src = cells[selected];
  const g = { x: swap.x - src.w * 0.2, y: swap.y - src.h * 0.2, w: src.w * 0.4, h: src.h * 0.4 };
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.rect(g.x, g.y, g.w, g.h);
  ctx.clip();
  drawSlot(slots[selected], g);
  ctx.restore();
}

function refreshUI() {
  // Les boutons sont réutilisés pour ne pas rejouer l'animation à chaque rendu
  while (slotsEl.children.length > count()) slotsEl.lastChild.remove();
  for (let i = slotsEl.children.length; i < count(); i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = `Photo ${i + 1}`;
    b.onclick = () => select(i);
    slotsEl.appendChild(b);
  }
  Array.from(slotsEl.children).forEach((b, i) => {
    b.classList.toggle("active", i === selected);
    b.classList.toggle("filled", !!slots[i]);
  });
  $("editorTitle").textContent = `Photo ${selected + 1}`;
  const s = slots[selected];
  zoomInput.disabled = !s;
  rotInput.disabled = !s;
  $("rotLeftBtn").disabled = !s;
  $("rotRightBtn").disabled = !s;
  rotInput.value = s ? s.rot : 0;
  $("resetBtn").disabled = !s;
  zoomInput.value = s ? Math.round(s.zoom * 100) : 100;
  captionInput.disabled = !s || !captionsOn.checked;
  captionInput.placeholder = captionsOn.checked ? "Texte sous la photo" : "Active « Légendes sous les photos »";
  const cap = s ? s.caption || "" : "";
  if (captionInput.value !== cap) captionInput.value = cap;
  capEditor.set(capStyleOf(s));
  capEditor.setDisabled(!s || !bandOn());
  $("capApplyAll").disabled = !s || !bandOn();
  refreshExifUI(s);
}

function refreshExifUI(s) {
  const has = !!(s && s.exif);
  const mode = exifModeOf(s);
  $("exifNote").textContent = !s
    ? "Ajoute une photo pour voir ses infos EXIF."
    : has
    ? exifLines(s).join(" · ") || "Aucun champ sélectionné."
    : "Aucune donnée EXIF dans cette photo.";
  setModeChips((k) => k === mode, !has);
  setFieldChips((k) => !!exifFieldsOf(s)[k] && !!(s && s.exif && s.exif[k]), !has || mode === "none");
  setCornerChips((k) => k === (s && s.exifCorner ? s.exifCorner : "bl"), !has || mode !== "overlay");
  ovlEditor.set(ovlStyleOf(s));
  ovlEditor.setDisabled(!has || mode !== "overlay");
  $("exifApplyAll").disabled = !has;
}

function select(i) {
  selected = i;
  render();
}

function loadFile(file, index) {
  if (!file || !file.type.startsWith("image/")) {
    return setMessage("Fichier non valide (image attendue).", true);
  }
  const img = new Image();
  const url = URL.createObjectURL(file);
  const exifP = readExif(file);
  img.onload = () => {
    const prev = slots[index];
    const slot = { img, zoom: 1, rot: 0, ox: 0, oy: 0 };
    slots[index] = slot;
    if (prev) {
      ["caption", "style", "exifMode", "exifFields", "exifCorner", "exifStyle"].forEach((k) => (slot[k] = prev[k]));
    }
    exifP.then((ex) => {
      slot.exif = ex;
      render();
    });
    setMessage(`Photo ${index + 1} : ${file.name}`);
    render();
  };
  img.onerror = () => setMessage(`Image illisible : ${file.name}`, true);
  img.src = url;
}

const menuEl = $("cellMenu");
function hideMenu() {
  menuEl.hidden = true;
}
function showMenu(ev) {
  const i = selected;
  const items = slots[i]
    ? [["Remplacer la photo", () => pickFor(i)], ["Supprimer la photo", () => { slots[i] = null; render(); }]]
    : [["Choisir une photo", () => pickFor(i)]];
  menuEl.innerHTML = "";
  items.forEach(([label, fn]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.onclick = () => { hideMenu(); fn(); };
    menuEl.appendChild(b);
  });
  menuEl.style.left = `${ev.pageX}px`;
  menuEl.style.top = `${ev.pageY}px`;
  menuEl.hidden = false;
}
document.addEventListener("pointerdown", (ev) => {
  if (!menuEl.contains(ev.target) && ev.target !== canvas) hideMenu();
});

function pickFor(index) {
  selected = index;
  fileInput.value = "";
  fileInput.click();
}

function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - r.left) * canvas.width) / r.width,
    y: ((ev.clientY - r.top) * canvas.height) / r.height,
  };
}

function cellAt(ev) {
  const { x, y } = canvasPoint(ev);
  return cells.findIndex((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
}

let drag = null;
let swap = null; // { x, y } position du pointeur en coordonnées canvas pendant un échange
const LONG_PRESS_MS = 400;
const pointers = new Map();
let pinch = null;

canvas.addEventListener("pointerdown", (ev) => {
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  canvas.setPointerCapture(ev.pointerId);
  if (pointers.size === 2) {
    // deuxième doigt : pincement pour zoomer la photo de la case sélectionnée
    const [a, b] = [...pointers.values()];
    pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
    drag = null;
    return;
  }
  const i = cellAt(ev);
  if (i < 0) return;
  selected = i;
  hideMenu();
  drag = { x: ev.clientX, y: ev.clientY, sx: ev.clientX, sy: ev.clientY, moved: false, swap: false };
  canvas.style.cursor = "grabbing";
  // appui long sur une photo sans bouger : mode échange
  if (slots[i]) {
    const d = drag;
    d.timer = setTimeout(() => {
      if (drag !== d || d.moved) return;
      d.swap = true;
      swap = canvasPoint(ev);
      canvas.style.cursor = "move";
      navigator.vibrate?.(20);
      render();
    }, LONG_PRESS_MS);
  }
  render();
});
canvas.addEventListener("pointermove", (ev) => {
  if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  const s = slots[selected];
  if (pinch && pointers.size >= 2) {
    if (!s) return;
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch.dist > 0) s.zoom = Math.max(0.2, Math.min(4, s.zoom * (dist / pinch.dist)));
    pinch.dist = dist;
    render();
    return;
  }
  if (drag && drag.swap) {
    swap = canvasPoint(ev);
    render();
    return;
  }
  if (!drag || !s) return;
  if (Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 5) {
    drag.moved = true;
    clearTimeout(drag.timer);
  }
  const r = canvas.getBoundingClientRect();
  const k = canvas.width / r.width;
  const c = photoRect(cells[selected]);
  s.ox += ((ev.clientX - drag.x) * k) / c.w;
  s.oy += ((ev.clientY - drag.y) * k) / c.h;
  clampOffset(s);
  drag.x = ev.clientX;
  drag.y = ev.clientY;
  render();
});
const endDrag = () => {
  if (drag) clearTimeout(drag.timer);
  const wasSwapping = !!swap;
  drag = null;
  swap = null;
  if (wasSwapping) render();
  canvas.style.cursor = "grab";
};
canvas.addEventListener("pointerup", (ev) => {
  pointers.delete(ev.pointerId);
  if (pinch) {
    if (pointers.size < 2) pinch = null;
    endDrag();
    return;
  }
  if (drag && drag.swap) {
    const to = cellAt(ev);
    if (to >= 0 && to !== selected) {
      [slots[selected], slots[to]] = [slots[to], slots[selected]];
      selected = to;
      setMessage(`Photos échangées.`);
    }
    endDrag();
    return;
  }
  const wasClick = drag && !drag.moved;
  endDrag();
  if (wasClick) showMenu(ev);
});
canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
canvas.addEventListener("selectstart", (ev) => ev.preventDefault());
// iOS : empêche l'appui long de lancer la sélection / la bulle copier-traduire
canvas.addEventListener("touchstart", (ev) => ev.preventDefault(), { passive: false });
document.addEventListener("selectionchange", () => {
  const sel = getSelection();
  if (drag && sel && !sel.isCollapsed) sel.removeAllRanges();
});
canvas.addEventListener("pointercancel", (ev) => {
  pointers.delete(ev.pointerId);
  if (pointers.size < 2) pinch = null;
  endDrag();
});

canvas.addEventListener(
  "wheel",
  (ev) => {
    const i = cellAt(ev);
    if (i < 0 || !slots[i]) return;
    ev.preventDefault();
    selected = i;
    const s = slots[i];
    s.zoom = Math.max(0.2, Math.min(4, s.zoom * (ev.deltaY < 0 ? 1.06 : 1 / 1.06)));
    render();
  },
  { passive: false }
);
canvas.addEventListener("dragover", (ev) => ev.preventDefault());
canvas.addEventListener("drop", (ev) => {
  ev.preventDefault();
  const i = cellAt(ev);
  const file = ev.dataTransfer.files[0];
  if (i >= 0 && file) {
    selected = i;
    loadFile(file, i);
  }
});

zoomInput.addEventListener("input", () => {
  const s = slots[selected];
  if (!s) return;
  s.zoom = Number(zoomInput.value) / 100;
  render();
});
function rotateBy(deg) {
  const s = slots[selected];
  if (!s) return;
  s.rot = ((((s.rot + deg + 180) % 360) + 360) % 360) - 180;
  render();
}
rotInput.addEventListener("input", () => {
  const s = slots[selected];
  if (!s) return;
  s.rot = Number(rotInput.value);
  render();
});
$("rotLeftBtn").onclick = () => rotateBy(-90);
$("rotRightBtn").onclick = () => rotateBy(90);
$("resetBtn").onclick = () => {
  const s = slots[selected];
  if (s) {
    s.zoom = 1;
    s.rot = 0;
    s.ox = 0;
    s.oy = 0;
    render();
  }
};
fileInput.addEventListener("change", () => loadFile(fileInput.files[0], selected));

const DEFAULT_GAP = 14;
gapInput.addEventListener("input", () => ($("gapValue").textContent = gapInput.value));
$("gapReset").onclick = () => {
  gapInput.value = DEFAULT_GAP;
  $("gapValue").textContent = DEFAULT_GAP;
  render();
};

// Éditeur de style (police, couleur, taille) réutilisable pour le titre et les légendes
function createStyleEditor(box, { min, max, sizeLabel, onChange }) {
  box.innerHTML = `
    <div class="color-field">
      <span class="color-head">Police</span>
      <div class="fonts"></div>
    </div>
    <div class="color-field">
      <span class="color-head">Couleur <b class="se-hex"></b></span>
      <div class="color-row">
        <div class="swatches"></div>
        <input class="swatch custom se-color" type="color" title="Couleur personnalisée" aria-label="Couleur personnalisée" />
      </div>
    </div>
    <label>${sizeLabel} <b class="se-sizeval"></b>
      <input class="se-size" type="range" min="${min}" max="${max}" />
    </label>
    <button type="button" class="ghost small se-reset">Reset</button>`;
  const q = (c) => box.querySelector(c);
  const color = q(".se-color"), size = q(".se-size"), sw = q(".swatches");
  let defaults = null;
  let fontKey = "sans";
  const fontBtns = Object.entries(FONT_LABELS).map(([k, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "font-chip";
    b.textContent = label;
    b.style.fontFamily = FONTS[k];
    b.onclick = () => {
      fontKey = k;
      changed();
    };
    q(".fonts").appendChild(b);
    return [k, b];
  });
  const buttons = PALETTE.map((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.dataset.color = c;
    b.style.setProperty("--c", c);
    b.setAttribute("aria-label", c);
    b.onclick = () => {
      color.value = c;
      changed();
    };
    sw.appendChild(b);
    return b;
  });
  const read = () => ({ font: fontKey, color: color.value, size: Number(size.value) });
  const refresh = () => {
    fontBtns.forEach(([k, b]) => b.classList.toggle("on", k === fontKey));
    q(".se-hex").textContent = color.value;
    q(".se-sizeval").textContent = size.value;
    const cur = color.value.toLowerCase();
    buttons.forEach((b) => b.classList.toggle("on", b.dataset.color === cur));
    color.classList.toggle("on", !PALETTE.includes(cur));
  };
  const changed = () => {
    refresh();
    onChange(read());
  };
  [color, size].forEach((el) => el.addEventListener("input", changed));
  q(".se-reset").onclick = () => {
    if (!defaults) return;
    api.set(defaults);
    onChange(read());
  };
  const api = {
    set(st) {
      fontKey = st.font;
      color.value = st.color;
      size.value = st.size;
      refresh();
    },
    setDefaults(d) { defaults = d; },
    setDisabled(d) {
      box.classList.toggle("disabled", d);
      box.querySelectorAll("select, input, button").forEach((el) => (el.disabled = d));
    },
  };
  return api;
}

const titleEditor = createStyleEditor($("titleStyle"), {
  min: 30, max: 140, sizeLabel: "Taille du titre",
  onChange: (st) => {
    titleStyle = st;
    render();
  },
});
titleEditor.setDefaults(DEFAULT_TITLE);
titleEditor.set(titleStyle);

const capEditor = createStyleEditor($("capStyle"), {
  min: 20, max: 80, sizeLabel: "Taille de la légende",
  onChange: (st) => {
    const s = slots[selected];
    if (!s) return;
    s.style = st;
    render();
  },
});
capEditor.setDefaults(DEFAULT_CAP);
const ovlEditor = createStyleEditor($("exifStyle"), {
  min: 14, max: 60, sizeLabel: "Taille de l'overlay",
  onChange: (st) => {
    const s = slots[selected];
    if (!s) return;
    s.exifStyle = st;
    render();
  },
});
ovlEditor.setDefaults(DEFAULT_OVL);

function chipGroup(box, entries, onPick) {
  const btns = Object.entries(entries).map(([k, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "font-chip";
    b.textContent = label;
    b.onclick = () => onPick(k);
    box.appendChild(b);
    return [k, b];
  });
  return (isOn, disabled) =>
    btns.forEach(([k, b]) => {
      b.classList.toggle("on", isOn(k));
      b.disabled = disabled;
    });
}
const setModeChips = chipGroup($("exifMode"), { none: "Aucun", caption: "Légende", overlay: "Overlay" }, (k) => {
  const s = slots[selected];
  if (!s) return;
  s.exifMode = k;
  render();
});
const setCornerChips = chipGroup($("exifCorner"), CORNER_LABELS, (k) => {
  const s = slots[selected];
  if (!s) return;
  s.exifCorner = k;
  render();
});
const setFieldChips = chipGroup($("exifFields"), EXIF_FIELD_LABELS, (k) => {
  const s = slots[selected];
  if (!s) return;
  s.exifFields = { ...exifFieldsOf(s), [k]: !exifFieldsOf(s)[k] };
  render();
});
$("exifApplyAll").onclick = () => {
  const src = slots[selected];
  if (!src) return;
  slots.forEach((s) => {
    if (!s) return;
    s.exifMode = exifModeOf(src);
    s.exifFields = { ...exifFieldsOf(src) };
    s.exifCorner = src.exifCorner || "bl";
    s.exifStyle = { ...ovlStyleOf(src) };
  });
  render();
  setMessage("Réglages EXIF appliqués à toutes les photos.");
};

$("capApplyAll").onclick = () => {
  const src = slots[selected];
  if (!src) return;
  const st = { ...capStyleOf(src) };
  slots.forEach((s) => s && (s.style = { ...st }));
  render();
  setMessage("Style appliqué à toutes les légendes.");
};

const syncTextUI = () => {
  titleText.disabled = !titleOn.checked;
  titleEditor.setDisabled(!titleOn.checked);
};
[captionsOn, titleOn, titleText].forEach((el) =>
  el.addEventListener("input", () => {
    syncTextUI();
    render();
  })
);
syncTextUI();
captionInput.addEventListener("input", () => {
  const s = slots[selected];
  if (!s) return;
  s.caption = captionInput.value;
  render();
});

$("resetAllBtn").onclick = () => {
  if (!confirm("Réinitialiser les réglages et retirer toutes les photos ?")) return;
  ratioSelect.value = "3:2";
  orientationSelect.value = "landscape";
  countSelect.value = "2";
  gapInput.value = DEFAULT_GAP;
  $("gapValue").textContent = DEFAULT_GAP;
  slots.fill(null);
  captionsOn.checked = false;
  titleOn.checked = false;
  titleText.value = "";
  titleStyle = { ...DEFAULT_TITLE };
  titleEditor.set(titleStyle);
  syncTextUI();
  selected = 0;
  render();
  setMessage("Tout a été réinitialisé.");
};

[ratioSelect, orientationSelect, gapInput].forEach((el) =>
  el.addEventListener("input", () => render())
);
countSelect.addEventListener("change", () => {
  selected = Math.min(selected, count() - 1);
  render();
});

function exportDataUrl() {
  render(true);
  const url = canvas.toDataURL("image/jpeg", 0.95);
  render();
  return url;
}

$("downloadBtn").onclick = () => {
  const a = document.createElement("a");
  a.download = `montage-${ratioSelect.value.replace(":", "x")}-${orientationSelect.value}.jpg`;
  a.href = exportDataUrl();
  a.click();
};

$("printBtn").onclick = async () => {
  // Sur mobile, la feuille de partage donne accès à Imprimer / AirPrint
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare) {
    const blob = await new Promise((res) => {
      render(true);
      canvas.toBlob((b) => { render(); res(b); }, "image/jpeg", 0.95);
    });
    const file = new File([blob], "montage.jpg", { type: "image/jpeg" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {}
      return;
    }
  }
  const w = window.open("", "_blank");
  if (!w) return setMessage("Popup bloquée : autorise-la pour imprimer.", true);
  const url = exportDataUrl();
  const paper = { "3:2": [148, 100], "4:3": [119, 89] }[ratioSelect.value];
  const [pw, ph] = paper ? (isLandscape() ? paper : [paper[1], paper[0]]) : [];
  const pageSize = paper ? `size:${pw}mm ${ph}mm;` : "";
  w.document.write(
    `<html><head><title>Impression</title><style>
      @page{margin:0;${pageSize}}html,body{margin:0;height:100%}
      body{display:flex;align-items:center;justify-content:center}
      img{width:100%;height:100%;object-fit:contain}
    </style></head><body><img src="${url}" onload="window.print()"></body></html>`
  );
  w.document.close();
};

render();
setMessage("Clique sur une case pour choisir, remplacer ou supprimer sa photo.");

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

// Préréglages
const BUILTIN_PRESETS = [
  { name: "Selphy · Carte postale", ratio: "3:2", orientation: "landscape", count: "2", gap: 14, builtin: true },
  { name: "Selphy · Format L (4:3)", ratio: "4:3", orientation: "landscape", count: "4", gap: 14, builtin: true },
  { name: "Selphy · Carte postale portrait", ratio: "3:2", orientation: "portrait", count: "4", gap: 14, builtin: true },
];
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
  ratioSelect.value = p.ratio;
  orientationSelect.value = p.orientation;
  countSelect.value = p.count;
  gapInput.value = p.gap;
  $("gapValue").textContent = p.gap;
  [ratioSelect, orientationSelect, countSelect, gapInput].forEach((el) => {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  setMessage(`Préréglage « ${p.name} » appliqué.`);
}

function renderPresets() {
  presetList.innerHTML = "";
  const user = loadUserPresets();
  [...BUILTIN_PRESETS, ...user].forEach((p) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "secondary small";
    b.textContent = p.name;
    b.title = `${p.ratio} · ${p.orientation === "landscape" ? "paysage" : "portrait"} · ${p.count} photos · marge ${p.gap}px`;
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

// PWA : le service worker n'est disponible qu'en https (ou localhost)
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

// Cartes repliables, état mémorisé
(function () {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("montage-folds") || "{}"); } catch (e) {}
  document.querySelectorAll("[data-fold]").forEach((card) => {
    const key = card.dataset.fold;
    const head = card.querySelector(":scope > h2");
    const collapsed = key in saved ? saved[key] : card.hasAttribute("data-collapsed");
    const apply = (c) => {
      card.classList.toggle("collapsed", c);
      head.setAttribute("aria-expanded", String(!c));
    };
    head.tabIndex = 0;
    head.setAttribute("role", "button");
    apply(collapsed);
    const toggle = () => {
      const c = !card.classList.contains("collapsed");
      apply(c);
      saved[key] = c;
      try { localStorage.setItem("montage-folds", JSON.stringify(saved)); } catch (e) {}
    };
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });
})();
