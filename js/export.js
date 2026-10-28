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

render();
