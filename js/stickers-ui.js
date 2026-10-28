// Onglet « Stickers » : emoji, import d'image et réglages du sticker sélectionné

const EMOJI_CATS = {
  "Visages": "😀 😂 🥰 😍 😎 🤩 😘 😜 🥳 😇 🤗 😴 🤔 😭 😡 🤯",
  "Fêtes": "🎉 🎊 🎂 🎈 🎁 🥂 🍾 ✨ 🎀 🎄 🎃 💐 🌹 💍 🎓 🏆",
  "Cœurs": "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💖 💘 💕 💯 ⭐ 🌟 🔥 💫",
  "Nature": "☀️ 🌈 ☁️ ❄️ 🌸 🌻 🌴 🍀 🌊 🌙 🐶 🐱 🦋 🐝 🐢 🦄",
  "Voyage": "✈️ 🏖️ 🏔️ 🚗 ⛵ 🗺️ 📍 🎒 📷 🎵 ⚽ 🏄 🍕 🍔 🍦 🍹",
};
let emojiCat = Object.keys(EMOJI_CATS)[0];

const setEmojiCatChips = chipGroup($("emojiCats"), Object.fromEntries(Object.keys(EMOJI_CATS).map((k) => [k, k])), (k) => {
  emojiCat = k;
  fillEmojiGrid();
});

function fillEmojiGrid() {
  const grid = $("emojiGrid");
  grid.textContent = "";
  EMOJI_CATS[emojiCat].split(" ").forEach((ch) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "emoji-btn";
    b.textContent = ch;
    b.setAttribute("aria-label", `Ajouter ${ch}`);
    b.onclick = () => {
      addSticker({ kind: "emoji", char: ch });
      setMessage("Sticker ajouté : glisse-le sur le montage.");
    };
    grid.appendChild(b);
  });
  setEmojiCatChips((k) => k === emojiCat, false);
}

$("stickerImportBtn").onclick = () => $("stickerFile").click();
$("stickerFile").onchange = async (ev) => {
  const files = [...ev.target.files];
  ev.target.value = "";
  for (const f of files) await importStickerFile(f);
};

$("stickerSize").oninput = (ev) => {
  const s = currentSticker();
  if (!s) return;
  s.size = clampSize(ev.target.value / 100);
  render();
};
$("stickerRot").oninput = (ev) => {
  const s = currentSticker();
  if (!s) return;
  s.rot = Number(ev.target.value);
  render();
};
$("stickerDup").onclick = duplicateSticker;
$("stickerFront").onclick = () => moveSticker(1);
$("stickerBack").onclick = () => moveSticker(-1);
$("stickerDel").onclick = () => removeSticker();

// Suppr / Retour arrière supprime le sticker sélectionné (sauf pendant la saisie de texte)
document.addEventListener("keydown", (ev) => {
  if (ev.key !== "Delete" && ev.key !== "Backspace") return;
  const t = ev.target;
  if (t && (t.tagName === "TEXTAREA" || t.tagName === "SELECT" || (t.tagName === "INPUT" && t.type !== "range"))) return;
  if (!currentSticker()) return;
  ev.preventDefault();
  removeSticker();
});

function refreshStickerUI() {
  const s = currentSticker();
  $("stickerNote").hidden = !!s;
  $("stickerNote").textContent = stickers.length ? "Touche un sticker sur le montage pour le sélectionner." : "Ajoute un emoji ou une image, puis déplace-le, agrandis-le (coin) ou fais-le pivoter (rond).";
  const i = stickers.findIndex((x) => x.id === selectedSticker);
  const size = $("stickerSize");
  const rot = $("stickerRot");
  [size, rot, $("stickerDup"), $("stickerFront"), $("stickerBack"), $("stickerDel")].forEach((el) => (el.disabled = !s));
  $("stickerFront").disabled = !s || i === stickers.length - 1;
  $("stickerBack").disabled = !s || i === 0;
  if (s) {
    size.value = Math.round(s.size * 100);
    rot.value = s.rot;
  }
  size.closest("label").querySelector(":scope > b").textContent = s ? `${size.value} %` : "";
  rot.closest("label").querySelector(":scope > b").textContent = s ? `${rot.value}°` : "";
}

fillEmojiGrid();
