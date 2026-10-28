// Marge de sécurité : curseur en demi-millimètres (0 à 5 mm). Ancres : 1 mm (minimum conseillé, valeur par défaut du curseur)
// et l'estimation du catalogue pour l'imprimante choisie. Mémorisé par imprimante + papier (safeSet dans printers.js).

const safeAvailable = () => printerId !== PRINTER_FREE && printerId !== PRINTER_CUSTOM && !!paperInfo();
const fmtMm = (v) => `${v} mm`.replace(".", ",");

function syncSafe() {
  const ok = safeAvailable();
  $("safeWrap").hidden = !ok;
  if (!ok) return;
  const pi = paperInfo();
  const el = $("safeMm");
  if (document.activeElement !== el) el.value = Math.round(pi.safe * 2);
  el.closest("label").querySelector(":scope > b").textContent = fmtMm(Number(el.value) / 2);
  if (window.setSliderAnchors) {
    const est = pi.est ?? pi.safe;
    setSliderAnchors(el, est > 0 ? [est * 2] : [], `Repère : marge estimée pour cette imprimante (${fmtMm(est)}), 1 mm = minimum`);
  }
}

$("safeMm").addEventListener("input", () => {
  safeSet(printerId, paperId, Number($("safeMm").value) / 2);
  render();
});
