// Étalonnage de la zone imprimable : page de test à imprimer, puis saisie de la marge réellement rognée.
// La valeur est mémorisée par imprimante + papier (calibSet dans printers.js) et remplace l'estimation.

const CALIB_PX_PER_MM = 12; // ≈ 305 dpi
const CALIB_MAX_MM = 8;

const calibAvailable = () => printerId !== PRINTER_FREE && printerId !== PRINTER_CUSTOM && !!paperInfo();

function syncCalib() {
  const box = $("calibBox");
  const ok = calibAvailable();
  box.hidden = !ok;
  if (!ok) return;
  const pi = paperInfo();
  if (document.activeElement !== $("calibSafe")) $("calibSafe").value = pi.safe;
  $("calibReset").disabled = !pi.calibrated;
  $("calibNote").textContent = pi.calibrated ? `Marge étalonnée : ${pi.safe} mm.` : `Estimation actuelle : ${pi.safe} mm (non étalonnée).`;
}

// page de test à la taille exacte du papier : cadres à 0, 1, 2… 8 mm du bord, numérotés
function calibPageUrl(pi) {
  const k = CALIB_PX_PER_MM;
  const c = document.createElement("canvas");
  c.width = Math.round(pi.w * k);
  c.height = Math.round(pi.h * k);
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `bold ${Math.round(k * 0.8)}px sans-serif`;
  for (let m = 0; m <= CALIB_MAX_MM; m++) {
    const d = m * k;
    g.strokeStyle = m % 2 ? "#d11" : "#111";
    g.fillStyle = g.strokeStyle;
    g.lineWidth = 2;
    g.strokeRect(d + 1, d + 1, c.width - 2 * d - 2, c.height - 2 * d - 2);
    const lab = String(m);
    const x = c.width * (0.15 + 0.7 * (m / CALIB_MAX_MM));
    const y = c.height * (0.2 + 0.6 * (m / CALIB_MAX_MM));
    g.fillText(lab, x, d + k / 2 + 1);
    g.fillText(lab, x, c.height - d - k / 2 - 1);
    g.fillText(lab, d + k / 2 + 1, y);
    g.fillText(lab, c.width - d - k / 2 - 1, y);
  }
  g.fillStyle = "#111";
  g.font = `${Math.round(k * 1.4)}px sans-serif`;
  g.fillText("Étalonnage : le plus grand cadre entièrement visible", c.width / 2, c.height / 2 - k * 1.2);
  g.fillText(`indique la marge rognée (mm)  —  ${pi.label}`, c.width / 2, c.height / 2 + k * 1.2);
  return c.toDataURL("image/png");
}

$("calibPrint").onclick = () => {
  const pi = paperInfo();
  if (!pi) return;
  const w = window.open("", "_blank");
  if (!w) return setMessage("Popup bloquée : autorise-la pour imprimer la page de test.", true);
  w.document.write(
    `<html><head><title>Page de test</title><style>
      @page{margin:0;size:${pi.w}mm ${pi.h}mm}html,body{margin:0;height:100%}
      body{display:flex;align-items:center;justify-content:center}
      img{width:100%;height:100%;object-fit:contain}
    </style></head><body><img src="${calibPageUrl(pi)}" onload="window.print()"></body></html>`
  );
  w.document.close();
};

$("calibSave").onclick = () => {
  const v = Number($("calibSafe").value);
  if ($("calibSafe").value === "" || !Number.isFinite(v)) return setMessage("Saisis la marge en mm (0 à 15).", true);
  calibSet(printerId, paperId, Math.max(0, Math.min(15, Math.round(v * 2) / 2)));
  render();
  setMessage("Marge enregistrée pour cette imprimante et ce papier.");
};

$("calibReset").onclick = () => {
  calibSet(printerId, paperId, null);
  $("calibSafe").blur();
  render();
  setMessage("Retour à la valeur par défaut.");
};
