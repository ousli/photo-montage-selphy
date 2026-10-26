// Éditeurs de style : titre, légendes, incrustation

// Éditeur de style (police, couleur, taille) réutilisable pour le titre et les légendes
function createStyleEditor(box, { min, max, sizeLabel, onChange }) {
  box.innerHTML = `
    <div class="color-field">
      <span class="color-head">Police</span>
      <div class="fonts"></div>
    </div>
    <div class="color-field">
      <span class="color-head">Couleur <b class="se-hex"></b></span>
      <div class="color-row">
        <div class="swatches"></div>
        <input class="swatch custom se-color" type="color" title="Couleur personnalisée" aria-label="Couleur personnalisée" />
      </div>
    </div>
    <div class="color-field">
      <span class="color-head">Style</span>
      <div class="se-flags fonts"></div>
    </div>
    <label>${sizeLabel} <b class="se-sizeval"></b>
      <input class="se-size" type="range" min="${min}" max="${max}" />
    </label>
    <button type="button" class="ghost small se-reset">Reset</button>`;
  const q = (c) => box.querySelector(c);
  const color = q(".se-color"), size = q(".se-size"), sw = q(".swatches");
  let defaults = null;
  let fontKey = "sans";
  const fontBtns = Object.entries(FONT_LABELS).map(([k, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "font-chip";
    b.textContent = label;
    b.style.fontFamily = FONTS[k];
    b.onclick = () => {
      fontKey = k;
      changed();
    };
    q(".fonts").appendChild(b);
    return [k, b];
  });
  const flags = { bold: false, italic: false, underline: false, upper: false };
  const FLAG_LABELS = { bold: "G", italic: "I", underline: "S", upper: "AA" };
  const FLAG_TITLES = { bold: "Gras", italic: "Italique", underline: "Souligné", upper: "Majuscules" };
  const flagBtns = Object.keys(FLAG_LABELS).map((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `font-chip flag flag-${k}`;
    b.textContent = FLAG_LABELS[k];
    b.title = FLAG_TITLES[k];
    b.setAttribute("aria-label", FLAG_TITLES[k]);
    b.onclick = () => {
      flags[k] = !flags[k];
      changed();
    };
    q(".se-flags").appendChild(b);
    return [k, b];
  });
  const buttons = PALETTE.map((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.dataset.color = c;
    b.style.setProperty("--c", c);
    b.setAttribute("aria-label", c);
    b.onclick = () => {
      color.value = c;
      changed();
    };
    sw.appendChild(b);
    return b;
  });
  const read = () => ({ font: fontKey, color: color.value, size: Number(size.value), ...flags });
  const refresh = () => {
    fontBtns.forEach(([k, b]) => b.classList.toggle("on", k === fontKey));
    flagBtns.forEach(([k, b]) => b.classList.toggle("on", flags[k]));
    q(".se-hex").textContent = color.value;
    q(".se-sizeval").textContent = size.value + " px";
    const cur = color.value.toLowerCase();
    buttons.forEach((b) => b.classList.toggle("on", b.dataset.color === cur));
    color.classList.toggle("on", !PALETTE.includes(cur));
  };
  const changed = () => {
    refresh();
    onChange(read());
  };
  [color, size].forEach((el) => el.addEventListener("input", changed));
  q(".se-reset").onclick = () => {
    if (!defaults) return;
    api.set(defaults);
    onChange(read());
  };
  const api = {
    set(st) {
      fontKey = st.font;
      Object.keys(flags).forEach((k) => (flags[k] = !!st[k]));
      color.value = st.color;
      size.value = st.size;
      refresh();
    },
    setDefaults(d) { defaults = d; },
    setDisabled(d) {
      box.classList.toggle("disabled", d);
      box.querySelectorAll("select, input, button").forEach((el) => (el.disabled = d));
    },
  };
  return api;
}

const titleEditor = createStyleEditor($("titleStyle"), {
  min: 30, max: 140, sizeLabel: "Taille du titre",
  onChange: (st) => {
    titleStyle = st;
    render();
  },
});
titleEditor.setDefaults(DEFAULT_TITLE);
titleEditor.set(titleStyle);

// Deux éditeurs pour le même style de légende : onglet Texte et onglet Infos (EXIF en légende)
const capOpts = {
  min: 20, max: 80, sizeLabel: "Taille de la légende",
  onChange: (st) => {
    const s = slots[selected];
    if (!s) return;
    s.style = st;
    render();
  },
};
const capEditor = createStyleEditor($("capStyle"), capOpts);
capEditor.setDefaults(DEFAULT_CAP);
const exifCapEditor = createStyleEditor($("exifCapStyle"), capOpts);
exifCapEditor.setDefaults(DEFAULT_CAP);
const ovlEditor = createStyleEditor($("exifStyle"), {
  min: 14, max: 60, sizeLabel: "Taille de l'overlay",
  onChange: (st) => {
    const s = slots[selected];
    if (!s) return;
    s.exifStyle = st;
    render();
  },
});
ovlEditor.setDefaults(DEFAULT_OVL);
