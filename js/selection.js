// Échange de photos, rafraîchissement de l'interface, sélection

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
  $("editorTitle").textContent = `Photo ${selected + 1} sur ${count()}`;
  $("pickBtn").textContent = slots[selected] ? "Remplacer la photo" : "Choisir une photo";
  $("removeBtn").disabled = !slots[selected];
  $("fitBtn").disabled = !slots[selected];
  const s = slots[selected];
  zoomInput.disabled = !s;
  rotInput.disabled = !s;
  $("rotLeftBtn").disabled = !s;
  $("rotRightBtn").disabled = !s;
  rotInput.value = s ? s.rot : 0;
  $("resetBtn").disabled = !s;
  zoomInput.value = s ? Math.round(s.zoom * 100) : 100;
  captionsOn.checked = !!(s && s.capOn);
  captionsOn.disabled = !s;
  captionInput.disabled = !s || !s.capOn;
  captionInput.placeholder = "Texte sous la photo";
  const capMsg = !s
    ? "Ajoute d'abord une photo dans cette case pour écrire sa légende."
    : !s.capOn
    ? "Active « Légende sous cette photo » pour écrire une légende."
    : "";
  $("capNote").textContent = capMsg;
  $("capNote").hidden = !capMsg;
  const cap = s ? s.caption || "" : "";
  if (captionInput.value !== cap) captionInput.value = cap;
  capEditor.set(capStyleOf(s));
  capEditor.setDisabled(!s || !hasBand(s));
  $("capApplyAll").disabled = !s || !hasBand(s);
  $("capAllOn").disabled = !slots.slice(0, count()).some(Boolean);
  refreshMontageUI();
  refreshExifUI(s);
}

function refreshExifUI(s) {
  const has = !!(s && s.exif);
  const mode = exifModeOf(s);
  $("exifNote").textContent = !s
    ? "Ajoute une photo pour voir ses infos EXIF."
    : has
    ? mode === "none"
      ? "Données EXIF trouvées. Choisis Légende ou Overlay pour les afficher."
      : exifLines(s).join(" · ") || "Aucun champ sélectionné."
    : "Aucune donnée EXIF dans cette photo.";
  setModeChips((k) => k === mode, !has);
  const data = $("exifData");
  data.innerHTML = "";
  Object.keys(EXIF_FIELD_LABELS).forEach((k) => {
    if (!exifAvailable(s, k)) return;
    const row = document.createElement("div");
    const v = k === "place" ? s.exif.place || (s.exif.placeState === "loading" ? "recherche…" : "—") : s.exif[k];
    row.innerHTML = "<span></span><b></b>";
    row.firstChild.textContent = EXIF_FIELD_LABELS[k];
    row.lastChild.textContent = v;
    data.appendChild(row);
  });
  $("exifStyleNote").hidden = mode !== "none";
  setFieldChips((k) => !!exifFieldsOf(s)[k] && exifAvailable(s, k), !has || mode === "none");
  const place = has && mode !== "none" && exifFieldsOf(s).place ? s.exif.placeState : null;
  if (place === "loading") $("exifNote").textContent = "Recherche du lieu…";
  if (place === "error") $("exifNote").textContent = "Lieu introuvable (hors ligne ?). Les coordonnées GPS restent disponibles.";

  setCornerChips((k) => k === (s && s.exifCorner ? s.exifCorner : "bl"), !has || mode !== "overlay");
  exifCapEditor.set(capStyleOf(s));
  exifCapEditor.setDisabled(!has || mode !== "caption");
  $("exifCapAdv").hidden = mode !== "caption";
  $("exifOvlAdv").hidden = mode !== "overlay";
  ovlEditor.set(ovlStyleOf(s));
  ovlEditor.setDisabled(!has || mode !== "overlay");
  $("exifApplyAll").disabled = !has;
}

function select(i) {
  selected = i;
  if (currentTab() === "montage") showTab("photo");
  render();
}

const FORMAT_EXT = /\.(jpe?g|png|webp|heic|heif|avif|gif)$/i;
