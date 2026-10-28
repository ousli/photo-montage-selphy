// Onglet « Stickers » : emoji, import d'image et réglages du sticker sélectionné

const EMOJI_CATS = {
  "Visages": "😀 😂 🥰 😍 😎 🤩 😘 😜 🥳 😇 🤗 😴 🤔 😭 😡 🤯",
  "Fêtes": "🎉 🎊 🎂 🎈 🎁 🥂 🍾 ✨ 🎀 🎄 🎃 💐 🌹 💍 🎓 🏆",
  "Cœurs": "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💖 💘 💕 💯 ⭐ 🌟 🔥 💫",
  "Nature": "☀️ 🌈 ☁️ ❄️ 🌸 🌻 🌴 🍀 🌊 🌙 🐶 🐱 🦋 🐝 🐢 🦄",
  "Animaux": "🐶 🐱 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐸 🐵 🐧 🦉 🐙 🐬 🦖",
  "Gourmand": "🍓 🍒 🍑 🍉 🍋 🥑 🍩 🍪 🧁 🍰 🍫 ☕ 🍷 🍺 🥐 🍣",
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
const stickerOutPicker = createColorPicker($("stickerOutPicker"), $("stickerOutHex"), "#ffffff", (c) => {
  const s = currentSticker();
  if (s) s.outColor = c;
});
$("stickerOutOn").onchange = (ev) => {
  const s = currentSticker();
  if (!s) return;
  s.outline = ev.target.checked;
  if (s.outline && !s.outW) s.outW = Number($("stickerOutW").value);
  $("stickerOutBox").hidden = !s.outline;
  render();
};
$("stickerOutW").oninput = (ev) => {
  const s = currentSticker();
  if (!s) return;
  s.outW = Number(ev.target.value);
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
  $("stickerSel").hidden = !s;
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
    $("stickerOutOn").checked = !!s.outline;
    $("stickerOutBox").hidden = !s.outline;
    $("stickerOutW").value = s.outW || 4;
    stickerOutPicker.set(s.outColor || "#ffffff");
  }
  const ow = $("stickerOutW");
  ow.closest("label").querySelector(":scope > b").textContent = s ? `${ow.value} %` : "";
  const isImg = !!s && s.kind === "image";
  $("stickerCutBox").hidden = !isImg;
  if ($("stickerCutBox").open && (!isImg || !cutPreview || cutPreview.id !== s.id)) {
    cutPreview = null;
    $("stickerCutBox").open = false;
  }
  size.closest("label").querySelector(":scope > b").textContent = s ? `${size.value} %` : "";
  rot.closest("label").querySelector(":scope > b").textContent = s ? `${rot.value}°` : "";
}

// Retrait du fond : aperçu en direct (rose) quand le bloc est ouvert, puis Appliquer
let cutRaf = 0;
let cutMode = "uni";
const STICKER_TOL_DEFAULT = 40;
const setCutModeChips = chipGroup($("stickerCutModes"), { uni: "Fond uni", auto: "Fond varié" }, (k) => {
  cutMode = k;
  if (cutPreview) cutPreview.alpha = null;
  cutUpdate();
});
function cutUpdate() {
  const s = currentSticker();
  if (!s || s.kind !== "image" || !$("stickerCutBox").open) return;
  setCutModeChips((k) => k === cutMode, false);
  $("cutUniBox").hidden = cutMode !== "uni";
  $("cutAutoBox").hidden = cutMode !== "auto";
  if (!cutPreview || cutPreview.id !== s.id)
    if (!cutStart(s)) {
      // bords déjà transparents : on referme tout de suite le bloc au lieu de le laisser ouvert sans aperçu
      $("stickerCutBox").open = false;
      return setMessage("Ce sticker a déjà un fond transparent : rien à retirer.", true);
    }
  const inset = $("stickerInset");
  inset.closest("label").querySelector(":scope > b").textContent = `${inset.value} %`;
  if (cutMode === "auto") {
    const want = Number(inset.value) / 100;
    if (!cutPreview.alpha || cutPreview.autoInset !== want) {
      $("stickerCutInfo").textContent = "Calcul du détourage…";
      const id = cutPreview.id;
      return setTimeout(() => {
        if (!cutPreview || cutPreview.id !== id || cutMode !== "auto" || !$("stickerCutBox").open) return;
        if (!cutAuto(want)) {
          $("stickerCutInfo").textContent = "Sujet introuvable : essaie « Fond uni » ou change la marge.";
          return;
        }
        const r = cutRender(0, false);
        $("stickerCutInfo").textContent = `${r.pct} % de l'image sera effacé`;
        render();
      }, 30);
    }
  }
  const r = cutRender(Number($("stickerTol").value), false, $("stickerCutHoles").checked);
  $("stickerCutInfo").textContent = `${r.pct} % de l'image sera effacé`;
  render();
}
function cutClose() {
  cancelAnimationFrame(cutRaf);
  cutCancel();
}
$("stickerTol").oninput = () => {
  const tol = $("stickerTol");
  if (Math.abs(tol.value - STICKER_TOL_DEFAULT) <= 4) tol.value = STICKER_TOL_DEFAULT; // aimant sur la valeur par défaut
  cancelAnimationFrame(cutRaf);
  cutRaf = requestAnimationFrame(cutUpdate);
};
$("stickerTol").ondblclick = () => {
  $("stickerTol").value = STICKER_TOL_DEFAULT;
  cutUpdate();
};
$("stickerCutHoles").onchange = cutUpdate;
$("stickerInset").oninput = () => {
  clearTimeout(cutUpdate.t);
  cutUpdate.t = setTimeout(cutUpdate, 250);
};
$("stickerCutBox").addEventListener("toggle", () => ($("stickerCutBox").open ? cutUpdate() : cutClose()));
$("stickerCutCancel").onclick = () => {
  $("stickerCutBox").open = false;
};
$("stickerCutApply").onclick = async () => {
  if (!cutPreview) return;
  const ok = await cutApply(Number($("stickerTol").value), $("stickerCutHoles").checked);
  $("stickerCutBox").open = false;
  setMessage(ok ? "Fond retiré. Tu peux annuler avec ↶." : "Presque rien à effacer : augmente la quantité.", !ok);
};

$("stickerPasteBtn").onclick = async () => {
  try {
    const items = await navigator.clipboard.read();
    const files = [];
    for (const it of items) {
      const type = it.types.find((t) => t.startsWith("image/"));
      if (type) files.push(new File([await it.getType(type)], "collage.png", { type }));
    }
    if (!addStickerFromFiles(files)) setMessage("Aucune image dans le presse-papiers : copie d'abord une image.", true);
  } catch (e) {
    setMessage("Impossible de lire le presse-papiers : autorise l'accès ou importe le fichier.", true);
  }
};
document.addEventListener("paste", (ev) => {
  if (currentTab() !== "stickers") return;
  const t = ev.target;
  if (t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && t.type !== "range"))) return;
  if (addStickerFromFiles(ev.clipboardData ? ev.clipboardData.files : [])) ev.preventDefault();
});

fillEmojiGrid();
