// Export, téléchargement et impression

function exportDataUrl() {
  render(true);
  const url = canvas.toDataURL("image/jpeg", 0.95);
  render();
  return url;
}

$("downloadBtn").onclick = () => {
  const a = document.createElement("a");
  const pi = paperInfo();
  a.download = `montage-${pi ? `${pi.w}x${pi.h}mm` : ratioSelect.value.replace(":", "x")}-${orientationSelect.value}.jpg`;
  a.href = exportDataUrl();
  a.click();
};

$("printBtn").onclick = async () => {
  // Sur mobile, la feuille de partage donne accès à Imprimer / AirPrint
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare) {
    const blob = await new Promise((res) => {
      render(true);
      canvas.toBlob((b) => { render(); res(b); }, "image/jpeg", 0.95);
    });
    const file = new File([blob], "montage.jpg", { type: "image/jpeg" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {}
      return;
    }
  }
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
