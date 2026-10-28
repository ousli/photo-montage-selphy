// Dessin du montage sur le canvas

// Chemin rectangulaire à coins arrondis
function roundRectPath(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const fontSpec = (st, size) =>
  `${st.italic ? "italic " : ""}${st.bold ? "bold " : ""}${size}px ${FONTS[st.font] || FONTS.sans}`;

function fitText(text, st, maxW) {
  let size = st.size;
  ctx.font = fontSpec(st, size);
  while (size > 14 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = fontSpec(st, size);
  }
  return size;
}

// ombre lisible sur n'importe quel fond : sombre pour un texte clair, claire pour un texte foncé
function textShadow(color, size) {
  const n = parseInt(color.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  ctx.shadowColor = lum > 0.55 ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.8)";
  ctx.shadowBlur = size * 0.25;
}

// Dessine un texte avec son style complet (gras, italique, souligné, majuscules), rétréci pour tenir dans maxW
function drawText(raw, x, y, st, maxW) {
  const text = st.upper ? raw.toUpperCase() : raw;
  const size = fitText(text, st, maxW);
  if (st.shadow) textShadow(st.color, size);
  ctx.fillText(text, x, y);
  if (st.underline) {
    const wd = ctx.measureText(text).width;
    const left = ctx.textAlign === "center" ? x - wd / 2 : ctx.textAlign === "right" ? x - wd : x;
    ctx.fillRect(left, y + size * 0.55, wd, Math.max(2, size * 0.06));
  }
}

function drawCaption(text, c, st) {
  ctx.save();
  ctx.fillStyle = st.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const d = safeInsetPx(canvas.width, canvas.height);
  const left = Math.max(c.x, d);
  const right = Math.min(c.x + c.w, canvas.width - d);
  drawText(text, (left + right) / 2, c.y + c.h - bandExtra(c) - captionH() / 2, st, right - left - 32);
  ctx.restore();
}

function drawTitle(w) {
  ctx.save();
  ctx.fillStyle = titleStyle.color;
  ctx.textAlign = titleAlign;
  ctx.textBaseline = "middle";
  const d = safeInsetPx(canvas.width, canvas.height);
  const x = titleAlign === "left" ? d + 40 : titleAlign === "right" ? w - d - 40 : w / 2;
  const y = titlePosKey === "bottom" ? canvas.height - d - titleBase() / 2 - 6 : d + titleBase() / 2 + 6;
  drawText(titleString(), x, y, titleStyle, w - 2 * d - 80);
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
  textShadow(st.color, st.size);
  ctx.fillStyle = st.color;
  ctx.textAlign = right ? "right" : "left";
  ctx.textBaseline = "middle";
  // le texte reste hors de la zone rognée par la Selphy, même si la photo touche le bord du montage
  const d = safeInsetPx(canvas.width, canvas.height);
  const sx = Math.max(pr.x, d);
  const sy = Math.max(pr.y, d);
  const sw = Math.min(pr.x + pr.w, canvas.width - d) - sx;
  const sh = Math.min(pr.y + pr.h, canvas.height - d) - sy;
  const x = right ? sx + sw - pad : sx + pad;
  const y0 = top ? sy + pad + lh / 2 : sy + sh - pad - lh / 2 - (lines.length - 1) * lh;
  lines.forEach((t, i) => {
    drawText(t, x, y0 + i * lh, st, sw - pad * 2);
  });
  ctx.restore();
}

// Retouche d'une photo : { look: none | bw | sepia | vivid | portra | fuji, bright, contrast } (100 = inchangé)
const FILTER_LABELS = { none: "Aucun", bw: "Noir et blanc", sepia: "Sépia", vivid: "Vif", portra: "Portra", fuji: "Fuji" };
const filterOf = (s) => ({ look: s.look === "film" ? "portra" : s.look || "none", bright: s.bright ?? 100, contrast: s.contrast ?? 100 });
const hasFilter = (s) => {
  const f = filterOf(s);
  return f.look !== "none" || f.bright !== 100 || f.contrast !== 100;
};
const filterCss = (s) => {
  const f = filterOf(s);
  return `brightness(${f.bright}%) contrast(${f.contrast}%)${LOOK_CSS[f.look] || ""}`;
};
// Vif : couleurs plus denses pour l'impression thermique. Portra / Fuji : émulations de pellicule (voir FILM_STOCKS), calculées pixel par pixel
const LOOK_CSS = {
  bw: " grayscale(1)",
  sepia: " sepia(1)",
  vivid: " saturate(1.38) contrast(1.08)",
};
// Émulations de pellicule : courbe par canal (noir relevé, blanc adouci, contraste en S), saturation et grain stable (hash de la position, donc identique à chaque rendu)
const FILM_STOCKS = {
  portra: { ch: [[0.05, 1, 0.22], [0.045, 0.985, 0.22], [0.07, 0.925, 0.18]], sat: 0.9, grain: 5 },
  fuji: { ch: [[0.03, 0.98, 0.42], [0.055, 1, 0.42], [0.065, 0.955, 0.36]], sat: 1.14, grain: 7 },
};
const filmLut = {};
function filmLuts(look) {
  if (filmLut[look]) return filmLut[look];
  return (filmLut[look] = FILM_STOCKS[look].ch.map(([lo, hi, c]) => {
    const t = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      const x = v / 255;
      const sm = x * x * (3 - 2 * x);
      t[v] = Math.round(255 * (lo + (hi - lo) * (x + c * (sm - x))));
    }
    return t;
  }));
}
const filmNoise = (x, y) => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) & 255) / 127.5 - 1;
};
const LUM = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const sepiaMix = (r, g, b, a) => [
  r + a * (0.393 * r + 0.769 * g + 0.189 * b - r),
  g + a * (0.349 * r + 0.686 * g + 0.168 * b - g),
  b + a * (0.272 * r + 0.534 * g + 0.131 * b - b),
];
// Safari n'a pas toujours ctx.filter : repli par traitement des pixels
const CTX_FILTER = typeof ctx.filter === "string";
function filterPixels(g, w, h, s) {
  const f = filterOf(s);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const b = f.bright / 100;
  const k = f.contrast / 100;
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * b, gr = d[i + 1] * b, bl = d[i + 2] * b;
    r = (r - 127.5) * k + 127.5;
    gr = (gr - 127.5) * k + 127.5;
    bl = (bl - 127.5) * k + 127.5;
    if (f.look === "bw") {
      r = gr = bl = LUM(r, gr, bl);
    } else if (f.look === "sepia") {
      [r, gr, bl] = sepiaMix(r, gr, bl, 1);
    } else if (f.look === "vivid") {
      const l = LUM(r, gr, bl);
      r = l + 1.38 * (r - l); gr = l + 1.38 * (gr - l); bl = l + 1.38 * (bl - l);
      r = (r - 127.5) * 1.08 + 127.5; gr = (gr - 127.5) * 1.08 + 127.5; bl = (bl - 127.5) * 1.08 + 127.5;
    } else if (FILM_STOCKS[f.look]) {
      const st = FILM_STOCKS[f.look];
      const lut = filmLuts(f.look);
      r = lut[0][clamp(r) | 0]; gr = lut[1][clamp(gr) | 0]; bl = lut[2][clamp(bl) | 0];
      const l = LUM(r, gr, bl);
      const n = filmNoise((i >> 2) % w, ((i >> 2) / w) | 0) * st.grain * (1 - Math.abs(l / 127.5 - 1) * 0.6);
      r = l + st.sat * (r - l) + n; gr = l + st.sat * (gr - l) + n; bl = l + st.sat * (bl - l) + n;
    }
    d[i] = clamp(r);
    d[i + 1] = clamp(gr);
    d[i + 2] = clamp(bl);
  }
  g.putImageData(img, 0, 0);
}

// dx, dy : origine de la case dans le contexte g (0 quand on dessine directement sur le canvas)
function paintSlot(g, s, c, dx, dy) {
  const rad = (s.rot * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  // taille de la boîte englobante de l'image pivotée, pour qu'elle remplisse la case à zoom 100 %
  const bw = s.img.width * cos + s.img.height * sin;
  const bh = s.img.width * sin + s.img.height * cos;
  const cover = Math.max(c.w / bw, c.h / bh) * s.zoom;
  const dw = s.img.width * cover;
  const dh = s.img.height * cover;
  const cx = c.x - dx + c.w / 2 + s.ox * c.w;
  const cy = c.y - dy + c.h / 2 + s.oy * c.h;
  g.translate(cx, cy);
  g.rotate(rad);
  g.drawImage(s.img, -dw / 2, -dh / 2, dw, dh);
}

function drawSlot(s, c) {
  if (!hasFilter(s)) return paintSlot(ctx, s, c, 0, 0);
  if (CTX_FILTER && !FILM_STOCKS[filterOf(s).look]) {
    ctx.filter = filterCss(s);
    return paintSlot(ctx, s, c, 0, 0);
  }
  const off = document.createElement("canvas");
  off.width = Math.max(1, Math.ceil(c.w));
  off.height = Math.max(1, Math.ceil(c.h));
  const g = off.getContext("2d");
  paintSlot(g, s, c, c.x, c.y);
  filterPixels(g, off.width, off.height, s);
  ctx.drawImage(off, c.x, c.y);
}

// render() regroupe les demandes d'une même image (un seul dessin par frame) ; l'export dessine tout de suite
let renderQueued = false;
function render(forExport = false) {
  if (forExport) return renderNow(true);
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderNow(false);
  });
}

function renderNow(forExport = false) {
  const [w, h] = canvasSize();
  canvas.width = w;
  canvas.height = h;
  computeCells();
  ctx.fillStyle = bgPicker.get();
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
        roundRectPath(c.x, c.y, c.w, c.h, radiusV());
        ctx.fill();
        ctx.fillStyle = "#8b94ab";
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Photo ${i + 1}`, c.x + c.w / 2, c.y + c.h / 2);
      }
      return;
    }
    const pr = photoRect(c, s);
    ctx.save();
    roundRectPath(pr.x, pr.y, pr.w, pr.h, radiusV());
    ctx.clip();
    drawSlot(s, pr);
    ctx.restore();
    const fw = frameV();
    if (fw) {
      ctx.save();
      ctx.strokeStyle = framePicker.get();
      ctx.lineWidth = fw;
      roundRectPath(pr.x + fw / 2, pr.y + fw / 2, pr.w - fw, pr.h - fw, radiusV() - fw / 2);
      ctx.stroke();
      ctx.restore();
    }
    const txt = captionTextOf(s);
    if (txt) drawCaption(txt, c, capStyleOf(s));
    if (exifModeOf(s) === "overlay") drawOverlay(s, pr);
  });

  if (!forExport) drawGuides(w, h);

  if (!forExport && !selectedSticker && cells[selected]) {
    const c = cells[selected];
    ctx.strokeStyle = "#3366ff";
    ctx.lineWidth = 8;
    roundRectPath(c.x + 4, c.y + 4, c.w - 8, c.h - 8, radiusV());
    ctx.stroke();
  }
  if (!forExport && swap) drawSwapOverlay();
  drawStickers(forExport);
  refreshUI();
  refreshStickerUI();
}
