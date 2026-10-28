// Onglets et feuille basse mobile

// Onglets du panneau
const tabBtns = Array.from(document.querySelectorAll(".tabs button"));
function showTab(name) {
  tabBtns.forEach((b) => {
    b.classList.toggle("on", b.dataset.tab === name);
    b.setAttribute("aria-selected", String(b.dataset.tab === name));
  });
  document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = p.dataset.panel !== name));
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
