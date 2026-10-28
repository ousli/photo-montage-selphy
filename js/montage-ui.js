// Synchronisation des réglages de montage et d'imprimante

function syncRangeValues() {
  Object.entries(RANGE_UNITS).forEach(([id, u]) => {
    const b = $(id).closest("label").querySelector(":scope > b");
    if (b) b.textContent = $(id).value + u;
  });
}

function refreshMontageUI() {
  syncRangeValues();
  setLayoutChips((k) => k === layoutKey, false);
  const miss = !layoutAvailable(layoutKey, count());
  $("layoutNote").hidden = !miss;
  if (miss) $("layoutNote").textContent = `Pas de mise en page « ${LAYOUT_LABELS[layoutKey]} » pour ${count()} photos : la grille est utilisée.`;
  $("outerWrap").hidden = $("gapLink").checked;
  setGapChips((v) => Number(v) === gapV() && ($("gapLink").checked || Number($("outerGap").value) === gapV()), false);
  // ancre aimantée sur la marge mécanique de l'imprimante (zone rognée au tirage)
  if (window.setSliderAnchors) {
    const safe = safeInsetPx(...canvasSize());
    const mm = paperInfo() ? ` (${paperInfo().safe} mm)` : "";
    const list = safe > 0 ? [safe] : [];
    const t = `Repère : marge de sécurité de l'imprimante${mm}`;
    setSliderAnchors($("outerGap"), list, t);
    setSliderAnchors($("gap"), $("gapLink").checked ? list : [], t);
  }
  $("frameBox").hidden = !$("frameOn").checked;
  refreshPrinterUI();
}

let paperChipsFor = null;
function refreshPrinterUI() {
  const pr = printerOf(printerId);
  $("printerBtnLabel").textContent = printerLabel(printerId);
  $("ratioWrap").hidden = printerId !== PRINTER_FREE;
  $("customPaper").hidden = printerId !== PRINTER_CUSTOM;
  const chips = $("paperChips");
  chips.hidden = !pr || pr.papers.length < 2;
  const key = printerId + "|" + (pr ? pr.papers.length : 0);
  if (paperChipsFor !== key) {
    paperChipsFor = key;
    chips.innerHTML = "";
    (pr ? pr.papers : []).forEach((x) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "font-chip";
      b.dataset.id = x.id;
      b.textContent = `${x.label} · ${x.h}×${x.w}`;
      b.onclick = () => choosePaper(x.id);
      chips.appendChild(b);
    });
  }
  chips.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.id === paperId));
  const pi = paperInfo();
  const dims = pi ? `${isLandscape() ? pi.w : pi.h} × ${isLandscape() ? pi.h : pi.w} mm` : "";
  $("paperNote").textContent = !pi
    ? "Sans imprimante : pas de zone imprimable affichée."
    : !$("guides").checked
      ? `Papier ${dims}.`
      : pi.safe > 0
        ? `Papier ${dims}. La partie grisée (environ ${pi.safe} mm, estimation) peut être rognée à l'impression.`
        : `Papier ${dims}. Pas de rognage estimé pour ce modèle.`;
}

const DEFAULT_GAP = 14;
