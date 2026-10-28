// Sélecteurs de couleur, fond, cadre, mise en page

// Sélecteur de couleur simple (pastilles + couleur personnalisée), utilisé pour le fond et le cadre
const BG_PALETTE = ["#ffffff", "#000000", "#f3ead9", "#1f2430", "#fde68a", "#fbcfe8", "#bfdbfe", "#bbf7d0"];
function createColorPicker(box, hexEl, initial, onChange) {
  box.classList.add("color-row");
  box.innerHTML = '<div class="swatches"></div><input class="swatch custom" type="color" title="Couleur personnalisée" aria-label="Couleur personnalisée" />';
  const custom = box.querySelector("input");
  const sw = box.querySelector(".swatches");
  custom.value = initial;
  const buttons = BG_PALETTE.map((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.dataset.color = c;
    b.style.setProperty("--c", c);
    b.setAttribute("aria-label", c);
    b.onclick = () => {
      custom.value = c;
      changed();
    };
    sw.appendChild(b);
    return b;
  });
  const refresh = () => {
    const cur = custom.value.toLowerCase();
    hexEl.textContent = cur;
    buttons.forEach((b) => b.classList.toggle("on", b.dataset.color === cur));
    custom.classList.toggle("on", !BG_PALETTE.includes(cur));
  };
  const changed = () => {
    refresh();
    onChange && onChange(custom.value);
    render();
  };
  custom.addEventListener("input", changed);
  refresh();
  return { get: () => custom.value, set: (c) => { custom.value = c; refresh(); } };
}
const bgPicker = createColorPicker($("bgPicker"), $("bgHex"), "#ffffff");
const framePicker = createColorPicker($("framePicker"), $("frameHex"), "#ffffff");

const setLayoutChips = chipGroup($("layoutChips"), LAYOUT_LABELS, (k) => {
  layoutKey = k;
  render();
});

const RANGE_UNITS = { zoom: " %", rot: "°", bright: " %", contrast: " %", filmAmt: " %", gap: " px", outerGap: " px", radius: " px", frameW: " px" };
