// Menu contextuel d'une case

function hideMenu() {
  menuEl.hidden = true;
}
function showMenu(ev) {
  const i = selected;
  const items = slots[i]
    ? [["Remplacer la photo", () => pickFor(i)], ["Supprimer la photo", () => { slots[i] = null; render(); }]]
    : [["Choisir une photo", () => pickFor(i)]];
  menuEl.innerHTML = "";
  items.forEach(([label, fn]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.onclick = () => { hideMenu(); fn(); };
    menuEl.appendChild(b);
  });
  const fixed = matchMedia("(max-width: 860px)").matches;
  const x = fixed ? ev.clientX : ev.pageX;
  const y = fixed ? ev.clientY : ev.pageY;
  menuEl.style.left = `${x}px`;
  menuEl.style.top = `${y}px`;
  menuEl.hidden = false;
  if (fixed) {
    menuEl.style.left = "0px";
    const r = { width: menuEl.offsetWidth, height: menuEl.offsetHeight };
    const left = Math.max(8, Math.min(x, innerWidth - r.width - 8));
    const top = y + r.height + 8 > innerHeight ? Math.max(8, y - r.height - 8) : y;
    menuEl.style.left = `${left}px`;
    menuEl.style.top = `${top}px`;
  }
}
document.addEventListener("pointerdown", (ev) => {
  if (!menuEl.contains(ev.target) && ev.target !== canvas) hideMenu();
});

function pickFor(index) {
  selectPhoto(index);
  fileInput.value = "";
  fileInput.click();
}
