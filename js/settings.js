// Réglages : valeurs par défaut, lecture et application

const DEFAULT_SETTINGS = {
  ratio: "3:2", orientation: "landscape", count: "2", gap: DEFAULT_GAP, outerSep: false, outer: DEFAULT_GAP,
  printer: DEFAULT_PRINTER, paper: "postcard", custom: DEFAULT_CUSTOM,
  layout: "grid", bg: "#ffffff", radius: 0, frameOn: false, frameW: 8, frameColor: "#ffffff",
  titleOn: false, titleText: "", titleDate: false, titleStyle: DEFAULT_TITLE, titlePos: "top", titleAlign: "center",
};
function getSettings() {
  return {
    ratio: ratioSelect.value, orientation: orientationSelect.value, count: countSelect.value,
    gap: gapV(), outerSep: !$("gapLink").checked, outer: Number($("outerGap").value),
    printer: printerId, paper: paperId, custom: customPaper(),
    layout: layoutKey, bg: bgPicker.get(), radius: radiusV(), frameOn: $("frameOn").checked,
    frameW: Number($("frameW").value), frameColor: framePicker.get(),
    titleOn: titleOn.checked, titleText: titleText.value, titleDate: titleDate.checked,
    titleStyle: { ...titleStyle }, titlePos: titlePosKey, titleAlign,
  };
}
function setSettings(o) {
  // anciens montages sans imprimante : on garde le ratio tel quel
  setPrinterState(o.printer || PRINTER_FREE, o.paper, o.custom);
  ratioSelect.value = o.ratio;
  orientationSelect.value = o.orientation;
  countSelect.value = o.count;
  gapInput.value = o.gap;
  $("gapLink").checked = !o.outerSep;
  $("outerGap").value = o.outer;
  layoutKey = o.layout;
  bgPicker.set(o.bg);
  $("radius").value = o.radius;
  $("frameOn").checked = o.frameOn;
  $("frameW").value = o.frameW;
  framePicker.set(o.frameColor);
  titleOn.checked = o.titleOn;
  titleText.value = o.titleText;
  titleDate.checked = o.titleDate;
  titleStyle = { ...o.titleStyle };
  titleEditor.set(titleStyle);
  titlePosKey = o.titlePos;
  titleAlign = o.titleAlign || "center";
  syncTextUI();
  syncSegs.forEach((f) => f());
  selected = Math.min(selected, count() - 1);
}
