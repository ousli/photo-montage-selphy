// Onglets et feuille basse mobile

// Onglets du panneau
const tabBtns = Array.from(document.querySelectorAll(".tabs button"));
// Desktop : réglages globaux à gauche (panneau Montage), inspecteur contextuel à droite
const wideMq = matchMedia("(min-width: 861px)");
const isWide = () => wideMq.matches;
function showTab(name) {
  if (isWide() && name === "montage") name = "photo";
  tabBtns.forEach((b) => {
    b.classList.toggle("on", b.dataset.tab === name);
    b.setAttribute("aria-selected", String(b.dataset.tab === name));
  });
  document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = p.dataset.panel !== name && !(isWide() && p.dataset.panel === "montage")));
  try { localStorage.setItem("montage-tab", name); } catch (e) {}
}
tabBtns.forEach((b) => b.addEventListener("click", () => {
  showTab(b.dataset.tab);
  if (isMobile() && sheetState === "min") setSheet("mid");
}));

// Feuille basse (mobile) : min = onglets seuls, mid = réglages, max = grand panneau
const sheet = $("sheet");
const SHEET_STEPS = ["min", "mid", "max"];
const isMobile = () => matchMedia("(max-width: 860px)").matches;
let sheetState = "mid";
try { sheetState = localStorage.getItem("montage-sheet") || "mid"; } catch (e) {}
if (!SHEET_STEPS.includes(sheetState)) sheetState = "mid";
function setSheet(state) {
  sheetState = state;
  sheet.dataset.sheet = state;
  document.body.classList.toggle("sheet-min", state === "min");
  document.body.classList.toggle("sheet-max", state === "max");
  try { localStorage.setItem("montage-sheet", state); } catch (e) {}
}
setSheet(sheetState);
let handleDrag = null;
const handle = $("sheetHandle");
handle.addEventListener("pointerdown", (ev) => {
  handle.setPointerCapture(ev.pointerId);
  handleDrag = { y: ev.clientY };
});
handle.addEventListener("pointerup", (ev) => {
  if (!handleDrag) return;
  const dy = ev.clientY - handleDrag.y;
  handleDrag = null;
  const i = SHEET_STEPS.indexOf(sheetState);
  if (dy < -25) setSheet(SHEET_STEPS[Math.min(2, i + 1)]);
  else if (dy > 25) setSheet(SHEET_STEPS[Math.max(0, i - 1)]);
  else setSheet(sheetState === "min" ? "mid" : sheetState === "max" ? "mid" : "min");
});
handle.addEventListener("pointercancel", () => (handleDrag = null));
const currentTab = () => (tabBtns.find((b) => b.classList.contains("on")) || {}).dataset.tab;
let savedTab = "montage";
try { savedTab = localStorage.getItem("montage-tab") || "montage"; } catch (e) {}
showTab(savedTab);

// Déplace les panneaux entre la colonne gauche/inspecteur (desktop) et la feuille basse (mobile)
function layoutPanels() {
  const insp = $("inspector"), body = document.querySelector(".sheet-body"), nav = document.querySelector(".tabs");
  const panels = Array.from(document.querySelectorAll(".tab-panel")).filter((p) => p.dataset.panel !== "montage");
  const msg = $("message");
  if (isWide()) {
    insp.append(nav, ...panels);
    document.body.classList.add("wide-layout");
  } else {
    body.append(...panels, msg);
    $("sheet").append(nav);
    document.body.classList.remove("wide-layout");
  }
  showTab(currentTab() || "montage");
}
wideMq.addEventListener("change", layoutPanels);
layoutPanels();

// App bar : se remplit (surface container) dès que la page défile
(function () {
  const bar = document.querySelector(".topbar");
  const upd = () => bar.classList.toggle("scrolled", scrollY > 0);
  addEventListener("scroll", upd, { passive: true });
  upd();
})();
