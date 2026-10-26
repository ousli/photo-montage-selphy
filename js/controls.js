// Groupes de puces, EXIF, infobulle, texte, réinitialisation

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
  if (k === "place" && s.exif && s.exif.placeState === "error") delete s.exif.placeState;
  render();
});
(function () {
  const tip = document.createElement("button");
  tip.type = "button";
  tip.className = "info-tip";
  tip.textContent = "i";
  tip.setAttribute("aria-label", "Informations sur le lieu");
  tip.dataset.tip = "Le nom du lieu est cherché via OpenStreetMap : seules des coordonnées arrondies (~1 km) sont envoyées. Les coordonnées GPS exactes ne quittent jamais ton navigateur.";
  $("exifFields").appendChild(tip);
  // l'infobulle vit dans <body> (position fixe) pour ne jamais être coupée par le panneau
  const bubble = document.createElement("div");
  bubble.className = "tip-bubble";
  bubble.textContent = tip.dataset.tip;
  document.body.appendChild(bubble);
  const show = () => {
    const r = tip.getBoundingClientRect();
    const w = Math.min(240, window.innerWidth - 16);
    bubble.style.width = `${w}px`;
    bubble.style.left = `${Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8))}px`;
    bubble.style.bottom = `${window.innerHeight - r.top + 8}px`;
    bubble.classList.add("on");
  };
  const hide = () => bubble.classList.remove("on");
  tip.addEventListener("mouseenter", show);
  tip.addEventListener("mouseleave", hide);
  tip.addEventListener("focus", show);
  tip.addEventListener("blur", hide);
})();
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

const setTitlePosChips = chipGroup($("titlePos"), { top: "Titre en haut", bottom: "Titre en bas" }, (k) => {
  titlePosKey = k;
  syncTextUI();
  render();
});
const setTitleAlignChips = chipGroup($("titleAlignChips"), { left: "À gauche", center: "Centré", right: "À droite" }, (k) => {
  titleAlign = k;
  syncTextUI();
  render();
});
const syncTextUI = () => {
  titleText.disabled = !titleOn.checked;
  titleDate.disabled = !titleOn.checked;
  setTitlePosChips((k) => k === titlePosKey, !titleOn.checked);
  setTitleAlignChips((k) => k === titleAlign, !titleOn.checked);
  titleEditor.setDisabled(!titleOn.checked);
};
[titleOn, titleText, titleDate].forEach((el) =>
  el.addEventListener("input", () => {
    syncTextUI();
    render();
  })
);
captionsOn.addEventListener("input", () => {
  const s = slots[selected];
  if (!s) return;
  s.capOn = captionsOn.checked;
  render();
});
$("capAllOn").onclick = () => {
  slots.slice(0, count()).forEach((s) => s && (s.capOn = true));
  render();
  setMessage("Légende activée sur toutes les photos.");
};
syncTextUI();
captionInput.addEventListener("input", () => {
  const s = slots[selected];
  if (!s) return;
  s.caption = captionInput.value;
  render();
});

$("resetAllBtn2").onclick = () => $("resetAllBtn").click();
$("resetAllBtn").onclick = () => {
  if (!confirm("Réinitialiser les réglages et retirer toutes les photos ?")) return;
  slots.fill(null);
  setSettings(DEFAULT_SETTINGS);
  selected = 0;
  render();
  setMessage("Tout a été réinitialisé.");
};

[ratioSelect, orientationSelect, gapInput, ...Object.values(customInputs), $("outerGap"), $("radius"), $("frameW"), $("frameOn"), $("gapLink"), $("guides")].forEach((el) =>
  el.addEventListener("input", () => render())
);
countSelect.addEventListener("change", () => {
  selected = Math.min(selected, count() - 1);
  render();
});
