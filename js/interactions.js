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
let stickerDrag = null; // { part, id, ... } geste en cours sur un sticker
let swap = null; // { x, y } position du pointeur en coordonnées canvas pendant un échange
const LONG_PRESS_MS = 400;
const pointers = new Map();
let pinch = null;

canvas.addEventListener("pointerdown", (ev) => {
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  canvas.setPointerCapture(ev.pointerId);
  if (pointers.size === 1) {
    // les stickers sont au-dessus de tout : ils ont la priorité sur la photo en dessous
    const pt = canvasPoint(ev);
    const hit = stickerHit(pt.x, pt.y, ev.pointerType !== "mouse");
    if (hit && hit.part === "del") {
      hideMenu();
      removeSticker(hit.s.id);
      return;
    }
    if (hit) {
      hideMenu();
      selectSticker(hit.s.id);
      const s = hit.s;
      const cx = s.x * canvas.width;
      const cy = s.y * canvas.height;
      stickerDrag = {
        part: hit.part,
        id: s.id,
        dx: pt.x - cx,
        dy: pt.y - cy,
        size0: s.size,
        dist0: Math.hypot(pt.x - cx, pt.y - cy) || 1,
        ang0: Math.atan2(pt.y - cy, pt.x - cx),
        rot0: s.rot,
      };
      canvas.style.cursor = "grabbing";
      renderNow();
      return;
    }
    if (selectedSticker) {
      selectedSticker = null;
      renderNow();
    }
  }
  if (pointers.size === 2) {
    // deuxième doigt : pincement pour zoomer la photo de la case sélectionnée
    const [a, b] = [...pointers.values()];
    pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    drag = null;
    stickerDrag = null;
    return;
  }
  const i = cellAt(ev);
  if (i < 0) return;
  selectPhoto(i);
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
      renderNow();
    }, LONG_PRESS_MS);
  }
  renderNow();
});
canvas.addEventListener("pointermove", (ev) => {
  if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  const s = slots[selected];
  if (stickerDrag) return moveStickerGesture(ev);
  if (pinch && pointers.size >= 2 && currentSticker()) return pinchSticker(currentSticker());
  if (!pointers.size && ev.pointerType === "mouse") return hoverCursor(ev);
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
    renderNow();
    return;
  }
  if (drag && drag.swap) {
    swap = canvasPoint(ev);
    renderNow();
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
  renderNow();
});
function moveStickerGesture(ev) {
  const st = currentSticker();
  if (!st || !stickerDrag) return;
  const pt = canvasPoint(ev);
  const cx = st.x * canvas.width;
  const cy = st.y * canvas.height;
  if (stickerDrag.part === "scale") {
    st.size = clampSize((stickerDrag.size0 * (Math.hypot(pt.x - cx, pt.y - cy) || 1)) / stickerDrag.dist0);
    snapStickerSize(st);
  } else if (stickerDrag.part === "rotate") {
    const da = ((Math.atan2(pt.y - cy, pt.x - cx) - stickerDrag.ang0) * 180) / Math.PI;
    st.rot = Math.round(wrapAngle(stickerDrag.rot0 + da));
  } else {
    st.x = Math.max(0, Math.min(1, (pt.x - stickerDrag.dx) / canvas.width));
    st.y = Math.max(0, Math.min(1, (pt.y - stickerDrag.dy) / canvas.height));
    snapStickerMove(st);
  }
  renderNow();
}

// deux doigts avec un sticker sélectionné : taille, rotation et déplacement du sticker
function pinchSticker(st) {
  const [a, b] = [...pointers.values()];
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  if (pinch.dist > 0) st.size = clampSize(st.size * (dist / pinch.dist));
  st.rot = Math.round(wrapAngle(st.rot + ((ang - pinch.ang) * 180) / Math.PI));
  const r = canvas.getBoundingClientRect();
  st.x = Math.max(0, Math.min(1, st.x + (mx - pinch.mx) / r.width));
  st.y = Math.max(0, Math.min(1, st.y + (my - pinch.my) / r.height));
  Object.assign(pinch, { dist, ang, mx, my });
  renderNow();
}

// souris : curseur adapté au survol d'un sticker ou d'une poignée
function hoverCursor(ev) {
  const pt = canvasPoint(ev);
  const hit = stickerHit(pt.x, pt.y, false);
  canvas.style.cursor = !hit ? "grab" : hit.part === "scale" ? "nwse-resize" : hit.part === "rotate" ? "crosshair" : hit.part === "del" ? "pointer" : "move";
}

const endDrag = () => {
  if (drag) clearTimeout(drag.timer);
  const wasSwapping = !!swap;
  drag = null;
  swap = null;
  if (wasSwapping) renderNow();
  canvas.style.cursor = "grab";
};
canvas.addEventListener("pointerup", (ev) => {
  pointers.delete(ev.pointerId);
  if (stickerDrag) {
    stickerDrag = null;
    canvas.style.cursor = "grab";
    render();
    return;
  }
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
  stickerDrag = null;
  endDrag();
});

canvas.addEventListener(
  "wheel",
  (ev) => {
    const pt = canvasPoint(ev);
    const hit = stickerHit(pt.x, pt.y, false);
    if (hit) {
      ev.preventDefault();
      selectSticker(hit.s.id);
      hit.s.size = clampSize(hit.s.size * (ev.deltaY < 0 ? 1.06 : 1 / 1.06));
      render();
      return;
    }
    const i = cellAt(ev);
    if (i < 0 || !slots[i]) return;
    ev.preventDefault();
    selectPhoto(i);
    const s = slots[i];
    s.zoom = Math.max(0.2, Math.min(4, s.zoom * (ev.deltaY < 0 ? 1.06 : 1 / 1.06)));
    render();
  },
  { passive: false }
);
canvas.addEventListener("dragover", (ev) => ev.preventDefault());
canvas.addEventListener("drop", (ev) => {
  ev.preventDefault();
  if (currentTab() === "stickers") {
    if (addStickerFromFiles(ev.dataTransfer.files)) return;
  }
  const i = cellAt(ev);
  const file = ev.dataTransfer.files[0];
  if (i >= 0 && file) {
    selectPhoto(i);
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
const amtInput = $("filmAmt");
// Filtres : vignettes d'aperçu calculées sur la photo sélectionnée (filtre CSS, identique au rendu final)
const lookBox = $("lookChips");
const lookTiles = Object.entries(FILTER_LABELS).map(([k, label]) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "look-tile";
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 64;
  if (!FILM_STOCKS[k]) c.style.filter = filterCss({ look: k });
  const span = document.createElement("span");
  span.textContent = label;
  if (FILM_NOTES[k]) b.title = `Style inspiré de Kodak ${FILM_NOTES[k]}`;
  b.append(c, span);
  b.onclick = () => {
    const s = slots[selected];
    if (!s) return;
    s.look = k;
    s.amt = FILM_AMT;
    render();
  };
  lookBox.appendChild(b);
  return [k, b, c];
});
let lookThumbSrc = null;
function drawLookThumbs(img) {
  if (img === lookThumbSrc) return;
  lookThumbSrc = img;
  for (const [k, , c] of lookTiles) {
    const g = c.getContext("2d");
    if (img) {
      const sc = Math.max(c.width / img.width, c.height / img.height);
      g.drawImage(img, (c.width - img.width * sc) / 2, (c.height - img.height * sc) / 2, img.width * sc, img.height * sc);
      if (FILM_STOCKS[k]) filterPixels(g, c.width, c.height, { look: k });
    } else {
      const gr = g.createLinearGradient(0, 0, c.width, c.height);
      gr.addColorStop(0, "#e9a14a");
      gr.addColorStop(0.5, "#5aa0d8");
      gr.addColorStop(1, "#4c9a5a");
      g.fillStyle = gr;
      g.fillRect(0, 0, c.width, c.height);
    }
  }
}
const setLookChips = (isOn, disabled) => {
  const s = slots[selected];
  drawLookThumbs(s && s.img);
  lookTiles.forEach(([k, b]) => {
    b.classList.toggle("on", isOn(k));
    b.disabled = disabled;
  });
};
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
amtInput.addEventListener("input", () => {
  const s = slots[selected];
  if (!s) return;
  s.amt = Number(amtInput.value);
  render();
});
$("filterResetBtn").onclick = () => {
  const s = slots[selected];
  if (!s) return;
  s.look = "none";
  s.bright = 100;
  s.contrast = 100;
  s.amt = FILM_AMT;
  render();
};
$("filterAllBtn").onclick = () => {
  const src = slots[selected];
  if (!src) return;
  const f = filterOf(src);
  slots.slice(0, count()).forEach((s) => s && Object.assign(s, { look: f.look, bright: f.bright, contrast: f.contrast, amt: f.amt }));
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
  selectPhoto(targets[0]);
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
