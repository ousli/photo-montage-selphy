// Références DOM, constantes et styles de texte par défaut

const $ = (id) => document.getElementById(id);

// Groupe de boutons-puces ; renvoie une fonction de synchronisation (isOn, disabled)
function chipGroup(box, entries, onPick) {
  const btns = Object.entries(entries).map(([k, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "font-chip";
    b.textContent = label;
    b.onclick = () => onPick(k);
    box.appendChild(b);
    return [k, b];
  });
  return (isOn, disabled) =>
    btns.forEach(([k, b]) => {
      b.classList.toggle("on", isOn(k));
      b.disabled = disabled;
    });
}

const ratioSelect = $("ratio");
const orientationSelect = $("orientation");
const countSelect = $("photoCount");
const gapInput = $("gap");
const zoomInput = $("zoom");
const rotInput = $("rot");
const fileInput = $("fileInput");
const messageEl = $("message");
const canvas = $("montageCanvas");
const ctx = canvas.getContext("2d");

const LONG_EDGE_PX = 1800;
const captionsOn = $("captionsOn");
const titleOn = $("titleOn");
const titleText = $("titleText");
const DEFAULT_TITLE = { font: "sans", color: "#1f2430", size: 72 };
const DEFAULT_CAP = { font: "sans", color: "#1f2430", size: 40 };
const FONTS = {
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  rounded: '"Trebuchet MS", "Arial Rounded MT Bold", Verdana, sans-serif',
  script: '"Snell Roundhand", "Brush Script MT", "Segoe Script", cursive',
  mono: '"Courier New", Courier, monospace',
  display: 'Impact, "Arial Narrow Bold", "Haettenschweiler", sans-serif',
  elegant: '"Didot", "Bodoni 72", "Playfair Display", Georgia, serif',
  marker: '"Marker Felt", "Chalkboard SE", "Comic Sans MS", cursive',
};
const FONT_LABELS = { sans: "Sans-serif", serif: "Serif", rounded: "Arrondie", script: "Manuscrite", mono: "Machine à écrire", display: "Affiche", elegant: "Élégante", marker: "Feutre" };
const PALETTE = ["#1f2430", "#ffffff", "#c0392b", "#e67e22", "#f1c40f", "#27ae60", "#2980b9", "#8e44ad"];
let titleStyle = { ...DEFAULT_TITLE };
const capStyleOf = (s) => (s && s.style) || DEFAULT_CAP;
