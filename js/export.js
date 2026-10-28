// Export, téléchargement et impression

function exportDataUrl() {
  renderNow(true);
  const url = canvas.toDataURL("image/jpeg", 0.95);
  renderNow();
  return url;
}

function exportBlob() {
  return new Promise((res) => {
    renderNow(true);
    canvas.toBlob((b) => {
      renderNow();
      res(b);
    }, "image/jpeg", 0.95);
  });
}

function exportName() {
  const pi = paperInfo();
  return `montage-${pi ? `${pi.w}x${pi.h}mm` : ratioSelect.value.replace(":", "x")}-${orientationSelect.value}.jpg`;
}

// Sur mobile, « Télécharger » ouvre la feuille de partage (Photos, Fichiers, app d'impression…) ; sinon, téléchargement classique
$("downloadBtn").onclick = async () => {
  const name = exportName();
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare) {
    const blob = await exportBlob();
    const file = new File([blob], name, { type: "image/jpeg" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch (e) {
        // fermer la feuille de partage n'est pas une erreur ; sinon on retombe sur le téléchargement
        if (e && e.name !== "AbortError") downloadFile(blob, name);
      }
      return;
    }
  }
  const a = document.createElement("a");
  a.download = name;
  a.href = exportDataUrl();
  a.click();
};

function downloadFile(blob, name) {
  const a = document.createElement("a");
  a.download = name;
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// Sur mobile avec partage de fichiers, un seul bouton (« Télécharger ») : la feuille de partage propose déjà Imprimer
const canShareFiles = () => {
  try {
    return matchMedia("(pointer: coarse)").matches && !!navigator.canShare && navigator.canShare({ files: [new File([""], "a.jpg", { type: "image/jpeg" })] });
  } catch {
    return false;
  }
};
if (canShareFiles()) $("printBtn").hidden = true;

$("printBtn").onclick = () => {
  const w = window.open("", "_blank");
  if (!w) return setMessage("Popup bloquée : autorise-la pour imprimer.", true);
  const url = exportDataUrl();
  const pi = paperInfo();
  const paper = pi ? [pi.w, pi.h] : { "3:2": [148, 100], "4:3": [119, 89] }[ratioSelect.value];
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
