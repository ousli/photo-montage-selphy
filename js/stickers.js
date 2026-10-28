// Stickers posés par-dessus tout le montage : modèle, rendu et détection des poignées.
// Position (x, y = centre) en fraction du canevas, taille en fraction du plus petit côté → ils suivent un changement de ratio.
// L'ordre du tableau est l'ordre d'empilement (le dernier est au-dessus).

let stickers = [];
let selectedSticker = null; // id du sticker sélectionné

const STICKER_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const STICKER_MIN = 0.04;
const STICKER_MAX = 1.5;
const STICKER_IMG_MAX_PX = 1024;
const stickerId = () => "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const stickerBase = () => Math.min(canvas.width, canvas.height);
const getSticker = (id) => stickers.find((s) => s.id === id) || null;
const currentSticker = () => getSticker(selectedSticker);

// copie d'un sticker ; l'image et son blob restent partagés
function snapSticker(s) {
  const { img, blob, ...rest } = s;
  return { ...rest, img, blob };
}

// un sticker sélectionné désélectionne la photo, et inversement (selectPhoto)
function selectSticker(id) {
  selectedSticker = id;
  selected = -1;
  if (id != null && typeof isWide === "function" && isWide() && currentTab() !== "stickers") showTab("stickers");
}

// point d'entrée unique pour ajouter un sticker (emoji, image importée, futures sources)
function addSticker(data) {
  const s = { id: stickerId(), x: 0.5, y: 0.5, size: 0.2, rot: 0, ...data };
  stickers.push(s);
  selectSticker(s.id);
  render();
  return s;
}

function removeSticker(id = selectedSticker) {
  const i = stickers.findIndex((s) => s.id === id);
  if (i < 0) return;
  stickers.splice(i, 1);
  if (selectedSticker === id) selectedSticker = null;
  render();
}

function duplicateSticker() {
  const s = currentSticker();
  if (!s) return;
  const { id, ...c } = snapSticker(s);
  addSticker({ ...c, x: Math.min(0.95, s.x + 0.04), y: Math.min(0.95, s.y + 0.04) });
}

function moveSticker(dir) {
  const i = stickers.findIndex((s) => s.id === selectedSticker);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= stickers.length) return;
  [stickers[i], stickers[j]] = [stickers[j], stickers[i]];
  render();
}

function clearStickers() {
  stickers = [];
  selectedSticker = null;
}

// demi-largeur et demi-hauteur de la boîte du sticker, en pixels du canevas
function stickerHalf(s) {
  const S = s.size * stickerBase();
  if (s.kind === "image" && s.img) {
    const ar = (s.img.naturalWidth || s.img.width) / (s.img.naturalHeight || s.img.height) || 1;
    return ar >= 1 ? [S / 2, S / 2 / ar] : [(S / 2) * ar, S / 2];
  }
  return [S / 2, S / 2];
}

let stickerExport = false;
function drawSticker(s) {
  const [hw, hh] = stickerHalf(s);
  ctx.save();
  ctx.translate(s.x * canvas.width, s.y * canvas.height);
  ctx.rotate((s.rot * Math.PI) / 180);
  if (s.kind === "image") {
    const im = cutPreview && cutPreview.id === s.id && !stickerExport ? cutPreview.canvas : s.img;
    if (im) {
      if (im !== s.img) ctx.drawImage(s.img, -hw, -hh, hw * 2, hh * 2);
      ctx.drawImage(im, -hw, -hh, hw * 2, hh * 2);
    }
  } else {
    const S = hw * 2;
    ctx.font = `${S * 0.82}px ${STICKER_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(s.char, 0, S * 0.05);
  }
  ctx.restore();
}

// pixels du canevas pour un pixel d'écran
// Butée aimantée sur la zone imprimable (bord mécanique de l'imprimante) : déplacement et taille
function stickerBounds(s) {
  const [hw, hh] = stickerHalf(s);
  const a = (s.rot * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const n = Math.abs(Math.sin(a));
  return [hw * c + hh * n, hw * n + hh * c];
}
function snapStickerMove(s) {
  const d = safeInsetPx(canvas.width, canvas.height);
  if (!d) return;
  const thr = 10 * screenK();
  const [bw, bh] = stickerBounds(s);
  const x = s.x * canvas.width;
  const y = s.y * canvas.height;
  const sx = (edge, lo, hi) => (Math.abs(edge - lo) < thr ? lo : Math.abs(edge - hi) < thr ? hi : null);
  const nx = sx(x, d + bw, canvas.width - d - bw);
  const ny = sx(y, d + bh, canvas.height - d - bh);
  if (nx !== null) s.x = nx / canvas.width;
  if (ny !== null) s.y = ny / canvas.height;
}
function snapStickerSize(s) {
  const d = safeInsetPx(canvas.width, canvas.height);
  if (!d) return;
  const thr = 10 * screenK();
  const [bw, bh] = stickerBounds(s);
  const cx = s.x * canvas.width;
  const cy = s.y * canvas.height;
  let best = null;
  [
    [bw, cx - d], [bw, canvas.width - d - cx],
    [bh, cy - d], [bh, canvas.height - d - cy],
  ].forEach(([cur, room]) => {
    if (room > 0 && Math.abs(cur - room) < thr && (!best || Math.abs(cur - room) < best.gap)) best = { gap: Math.abs(cur - room), f: room / cur };
  });
  if (best) s.size = clampSize(s.size * best.f);
}
const screenK = () => canvas.width / canvas.getBoundingClientRect().width;

function drawStickers(forExport) {
  stickerExport = !!forExport;
  stickers.forEach(drawSticker);
  const s = forExport ? null : currentSticker();
  if (!s) return;
  const k = screenK();
  const [hw, hh] = stickerHalf(s);
  const h = stickerHandles(s);
  ctx.save();
  ctx.translate(s.x * canvas.width, s.y * canvas.height);
  ctx.rotate((s.rot * Math.PI) / 180);
  ctx.strokeStyle = "#3366ff";
  ctx.lineWidth = 2 * k;
  ctx.setLineDash([6 * k, 4 * k]);
  ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.lineTo(0, -hh - h.rotDist);
  ctx.stroke();
  ctx.restore();
  [[h.scale, "scale"], [h.rotate, "rotate"], [h.del, "del"]].forEach(([p, kind]) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10 * k, 0, Math.PI * 2);
    ctx.fillStyle = kind === "del" ? "#e5383b" : "#fff";
    ctx.fill();
    ctx.strokeStyle = kind === "del" ? "#fff" : "#3366ff";
    ctx.lineWidth = 2.5 * k;
    ctx.stroke();
    ctx.beginPath();
    if (kind === "del") {
      ctx.moveTo(p.x - 4 * k, p.y - 4 * k);
      ctx.lineTo(p.x + 4 * k, p.y + 4 * k);
      ctx.moveTo(p.x + 4 * k, p.y - 4 * k);
      ctx.lineTo(p.x - 4 * k, p.y + 4 * k);
    } else if (kind === "rotate") ctx.arc(p.x, p.y, 4.5 * k, -Math.PI * 0.8, Math.PI * 0.55);
    else {
      ctx.moveTo(p.x - 4 * k, p.y + 4 * k);
      ctx.lineTo(p.x + 4 * k, p.y - 4 * k);
    }
    ctx.stroke();
  });
}

// positions des poignées (taille au coin bas-droit, rotation au-dessus) en pixels du canevas
function stickerHandles(s) {
  const k = screenK();
  const [hw, hh] = stickerHalf(s);
  const a = (s.rot * Math.PI) / 180;
  const cx = s.x * canvas.width;
  const cy = s.y * canvas.height;
  const rotDist = 30 * k;
  const at = (lx, ly) => ({ x: cx + lx * Math.cos(a) - ly * Math.sin(a), y: cy + lx * Math.sin(a) + ly * Math.cos(a) });
  return { scale: at(hw, hh), rotate: at(0, -hh - rotDist), del: at(-hw, -hh), rotDist, cx, cy };
}

// renvoie { s, part: "scale" | "rotate" | "body" } pour le point (px, py) du canevas, ou null
function stickerHit(px, py, touch) {
  const k = screenK();
  const r = (touch ? 22 : 14) * k;
  const cur = currentSticker();
  if (cur) {
    const h = stickerHandles(cur);
    if (Math.hypot(px - h.scale.x, py - h.scale.y) <= r) return { s: cur, part: "scale" };
    if (Math.hypot(px - h.rotate.x, py - h.rotate.y) <= r) return { s: cur, part: "rotate" };
    if (Math.hypot(px - h.del.x, py - h.del.y) <= r) return { s: cur, part: "del" };
  }
  for (let i = stickers.length - 1; i >= 0; i--) {
    const s = stickers[i];
    const a = (-s.rot * Math.PI) / 180;
    const dx = px - s.x * canvas.width;
    const dy = py - s.y * canvas.height;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    const [hw, hh] = stickerHalf(s);
    const pad = s === cur ? 0 : 4 * k;
    if (Math.abs(lx) <= hw + pad && Math.abs(ly) <= hh + pad) return { s, part: "body" };
  }
  return null;
}

const clampSize = (v) => Math.max(STICKER_MIN, Math.min(STICKER_MAX, v));
const wrapAngle = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

// image importée : réduite si grande, ré-encodée en PNG pour garder la transparence
async function importStickerFile(file) {
  if (!/^image\/(png|webp|gif|avif|jpeg)$/i.test(file.type)) return setMessage(`Format non pris en charge : ${file.name || "fichier"} (PNG ou WebP conseillés).`, true);
  if (file.size > 20 * 1024 * 1024) return setMessage("Image trop lourde (20 Mo maximum).", true);
  const url = URL.createObjectURL(file);
  const img = await new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = url;
  });
  if (!img) {
    URL.revokeObjectURL(url);
    return setMessage(`Image illisible : ${file.name}.`, true);
  }
  let out = img;
  let blob = file;
  const long = Math.max(img.naturalWidth, img.naturalHeight);
  if (long > STICKER_IMG_MAX_PX || file.size > 2 * 1024 * 1024) {
    const k = Math.min(1, STICKER_IMG_MAX_PX / long);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    blob = (await new Promise((res) => c.toBlob(res, "image/png"))) || file;
    out = c;
  }
  addSticker({ kind: "image", uid: stickerId(), img: out, blob, size: 0.3 });
  setMessage(`Sticker ajouté : ${file.name}`);
}

// Retrait de fond : aperçu non destructif (cutPreview) puis application.
// Le fond = pixels proches (distance RVB <= tol) de la couleur des bords, atteignables depuis les bords.
let cutPreview = null; // { id, w, h, data, bg, canvas }

function cutStart(s) {
  const src = s.img;
  const w = src.naturalWidth || src.width;
  const h = src.naturalHeight || src.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.drawImage(src, 0, 0);
  const data = cx.getImageData(0, 0, w, h);
  const d = data.data;
  const ch = [[], [], []];
  const edge = (x, y) => {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 8) return;
    for (let k = 0; k < 3; k++) ch[k].push(d[i + k]);
  };
  for (let x = 0; x < w; x++) (edge(x, 0), edge(x, h - 1));
  for (let y = 0; y < h; y++) (edge(0, y), edge(w - 1, y));
  if (!ch[0].length) return false;
  const bg = ch.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
  cutPreview = { id: s.id, w, h, data, bg, canvas: document.createElement("canvas"), cx: null };
  cutPreview.canvas.width = w;
  cutPreview.canvas.height = h;
  cutPreview.cx = cutPreview.canvas.getContext("2d");
  return true;
}

// recalcule le canevas d'aperçu (fond en rose translucide) ou final (fond transparent)
function cutRender(tol, final) {
  const { w, h, data, bg } = cutPreview;
  const d = data.data;
  const t2 = tol * tol;
  const near = (i) => {
    const dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2];
    return d[i + 3] < 8 || dr * dr + dg * dg + db * db <= t2;
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const p = y * w + x;
    if (seen[p] || !near(p * 4)) return;
    seen[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) (push(x, 0), push(x, h - 1));
  for (let y = 0; y < h; y++) (push(0, y), push(w - 1, y));
  let n = 0;
  while (stack.length) {
    const p = stack.pop();
    n++;
    const x = p % w, y = (p - x) / w;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  const out = new ImageData(w, h);
  const o = out.data;
  o.set(d);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (seen[p]) {
      if (final) o[i + 3] = 0;
      else (o[i] = 255), (o[i + 1] = 40), (o[i + 2] = 160), (o[i + 3] = 110);
    }
  }
  if (final) {
    // adoucit d'un pixel le contour
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        if (!seen[p] && (seen[p - 1] || seen[p + 1] || seen[p - w] || seen[p + w])) o[p * 4 + 3] = 150;
      }
  }
  cutPreview.cx.putImageData(out, 0, 0);
  return { n, pct: Math.round((n / (w * h)) * 100) };
}

function cutCancel() {
  if (!cutPreview) return;
  cutPreview = null;
  render();
}

async function cutApply(tol) {
  const s = getSticker(cutPreview && cutPreview.id);
  if (!s) return cutCancel();
  const r = cutRender(tol, true);
  const blob = await new Promise((res) => cutPreview.canvas.toBlob(res, "image/png"));
  if (!blob || r.n < 16) return false;
  s.img = cutPreview.canvas;
  s.blob = blob;
  s.uid = stickerId();
  cutPreview = null;
  render();
  return true;
}

// image collée ou déposée (ex. « Copier l'image » depuis Pinterest)
function addStickerFromFiles(files) {
  const imgs = [...files].filter((f) => f.type.startsWith("image/"));
  if (!imgs.length) return false;
  imgs.reduce((p, f) => p.then(() => importStickerFile(f)), Promise.resolve());
  return true;
}
