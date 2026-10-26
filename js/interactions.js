// Interactions canvas (glisser, pincer, déposer) et contrôles de la photo

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
    pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
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
    // deux doigts : rotation selon l'angle entre les doigts
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    let da = ang - pinch.ang;
    if (da > Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;
    s.rot = ((((s.rot + (da * 180) / Math.PI + 180) % 360) + 360) % 360) - 180;
    pinch.ang = ang;
    // et déplacement du milieu des deux doigts
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const r = canvas.getBoundingClientRect();
    const c = photoRect(cells[selected], slots[selected]);
    s.ox += (((mx - pinch.mx) * canvas.width) / r.width) / c.w;
    s.oy += (((my - pinch.my) * canvas.width) / r.width) / c.h;
    pinch.mx = mx;
    pinch.my = my;
    clampOffset(s);
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
  const c = photoRect(cells[selected], slots[selected]);
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

// Retouche de la photo sélectionnée
const brightInput = $("bright");
const contrastInput = $("contrast");
const setLookChips = chipGroup($("lookChips"), FILTER_LABELS, (k) => {
  const s = slots[selected];
  if (!s) return;
  s.look = k;
  render();
});
brightInput.addEventListener("input", () => {
  const s = slots[selected];
  if (!s) return;
  s.bright = Number(brightInput.value);
  render();
});
contrastInput.addEventListener("input", () => {
  const s = slots[selected];
  if (!s) return;
  s.contrast = Number(contrastInput.value);
  render();
});
$("filterResetBtn").onclick = () => {
  const s = slots[selected];
  if (!s) return;
  s.look = "none";
  s.bright = 100;
  s.contrast = 100;
  render();
};
$("filterAllBtn").onclick = () => {
  const src = slots[selected];
  if (!src) return;
  const f = filterOf(src);
  slots.slice(0, count()).forEach((s) => s && Object.assign(s, { look: f.look, bright: f.bright, contrast: f.contrast }));
  render();
  setMessage("Retouche appliquée à toutes les photos.");
};
$("rotLeftBtn").onclick = () => rotateBy(-90);
$("rotRightBtn").onclick = () => rotateBy(90);
$("pickBtn").onclick = () => pickFor(selected);
$("removeBtn").onclick = () => {
  slots[selected] = null;
  render();
};
$("fitBtn").onclick = () => {
  const s = slots[selected];
  if (!s) return;
  s.zoom = 1;
  s.ox = 0;
  s.oy = 0;
  render();
};
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

// Import de plusieurs photos : remplit les cases vides dans l'ordre
const multiInput = $("multiInput");
$("multiBtn").onclick = () => {
  multiInput.value = "";
  multiInput.click();
};
multiInput.addEventListener("change", () => {
  const files = Array.from(multiInput.files).filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;
  let n = Number(countSelect.value);
  let free = [];
  for (let k = 0; k < n; k++) if (!slots[k]) free.push(k);
  if (files.length > (free.length || n)) {
    // plus de photos que de cases : propose le nombre de cases le plus proche
    const needed = (free.length ? n - free.length : 0) + files.length;
    const best = Array.from(countSelect.options, (o) => Number(o.value)).find((v) => v >= needed) || 8;
    if (best > n && confirm(`Tu as choisi ${files.length} photos pour ${n} cases.\nPasser à ${best} cases ?`)) {
      countSelect.value = String(best);
      countSelect.dispatchEvent(new Event("change", { bubbles: true }));
      n = best;
      free = [];
      for (let k = 0; k < n; k++) if (!slots[k]) free.push(k);
    }
  }
  // s'il n'y a plus de case vide, on remplace depuis la première
  const targets = free.length ? free : Array.from({ length: n }, (_, k) => k);
  selected = targets[0];
  Promise.all(files.slice(0, targets.length).map((f, k) => loadFile(f, targets[k]))).then(() => {
    const extra = files.length - targets.length;
    setMessage(extra > 0 ? `${targets.length} photos importées, ${extra} ignorée(s) : pas assez de cases.` : `${files.length} photo(s) importée(s).`, extra > 0);
    render();
  });
});


const setGapChips = chipGroup($("gapChips"), { 0: "Aucune", 6: "Fines", 14: "Normales", 30: "Larges" }, (k) => {
  gapInput.value = k;
  $("outerGap").value = k;
  render();
});
