// Tests de non-régression du rendu (Playwright). N'ajoute rien à l'app.
//   cd tests && npm install && node run.js            compare aux références
//   node run.js --update                              (ré)écrit les références
//   node run.js --browser=chromium|webkit|all         (défaut : all)
// Les références sont par navigateur et par OS (polices et emoji varient selon la machine).
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium, webkit } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const BASE = path.join(__dirname, "baseline.json");
const args = process.argv.slice(2);
const UPDATE = args.includes("--update");
const only = (args.find((a) => a.startsWith("--browser=")) || "--browser=all").split("=")[1];
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

function serve() {
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }).end(fs.readFileSync(p));
  });
  return new Promise((ok) => srv.listen(0, () => ok(srv)));
}

// Scénarios : réglages (fusionnés à DEFAULT_SETTINGS), nombre de photos chargées, retouches de cases, stickers
const FREE = "__free__";
const scenarios = [];
const add = (name, s) => scenarios.push({ photos: 2, ...s, name });

add("defaut", { settings: {} });
for (const ratio of ["3:2", "4:3", "16:9"])
  for (const orientation of ["landscape", "portrait"])
    add(`libre-${ratio}-${orientation}`, { settings: { printer: FREE, ratio, orientation, count: "2" } });
for (const count of [1, 2, 3, 4, 5, 6])
  add(`libre-${count}-photos`, { photos: count, settings: { printer: FREE, count: String(count) } });
for (const layout of ["grid", "hero", "mosaic"])
  add(`mise-en-page-${layout}`, { photos: 4, settings: { printer: FREE, count: "4", layout } });
add("marges-cadre-arrondi", { settings: { printer: FREE, gap: 30, outerSep: true, outer: 10, radius: 24, frameOn: true, frameW: 14, frameColor: "#cc3355", bg: "#223344" } });
add("titre", { settings: { printer: FREE, titleOn: true, titleText: "Vacances", titlePos: "bottom", titleAlign: "left" } });
add("legendes", { slotFields: { caption: "Légende", capOn: true } });
add("retouche-nb", { slotFields: { look: "bw", bright: 110, contrast: 120 } });
add("retouche-sepia", { slotFields: { look: "sepia", bright: 95 } });
add("cadrage-zoom-rotation", { slotFields: { zoom: 1.6, rot: 90, ox: 0.1, oy: -0.05 } });
add("sticker-emoji", { stickers: [{ kind: "emoji", char: "⭐", x: 0.3, y: 0.4, size: 0.2, rot: 20 }] });
add("sticker-image-contour", { stickers: [{ kind: "image", fixture: true, x: 0.6, y: 0.5, size: 0.3, rot: -15, outline: true, outW: 6, outColor: "#ffffff" }] });
add("imprimante-par-defaut", { settings: {} });
add("imprimante-autre", { settings: {}, printerIndex: 3 });

// Exécuté dans la page
async function inPage(sc, FREE_ID) {
  const fixture = (i) =>
    new Promise((res) => {
      const c = document.createElement("canvas");
      c.width = 1200 + i * 100;
      c.height = 800;
      const g = c.getContext("2d");
      const grad = g.createLinearGradient(0, 0, c.width, c.height);
      grad.addColorStop(0, `hsl(${i * 55}, 70%, 55%)`);
      grad.addColorStop(1, `hsl(${i * 55 + 120}, 70%, 35%)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = "#fff";
      g.fillRect(80, 80, 300, 200);
      g.fillStyle = "#111";
      g.beginPath();
      g.arc(c.width - 250, c.height - 220, 150, 0, 7);
      g.fill();
      c.toBlob((b) => res(new File([b], `fixture-${i}.png`, { type: "image/png" })), "image/png");
    });
  const fixtureImg = () =>
    new Promise((res) => {
      const c = document.createElement("canvas");
      c.width = c.height = 300;
      const g = c.getContext("2d");
      g.fillStyle = "#e0a000";
      g.beginPath();
      g.arc(150, 150, 110, 0, 7);
      g.fill();
      const i = new Image();
      i.onload = () => res(i);
      i.src = c.toDataURL();
    });

  slots.fill(null);
  clearStickers();
  const settings = { ...DEFAULT_SETTINGS, ...sc.settings };
  if (settings.printer === "__free__") settings.printer = FREE_ID;
  if (sc.printerIndex != null) {
    const ids = [...printerSel.options].map((o) => o.value).filter((v) => printerOf(v));
    settings.printer = ids[sc.printerIndex % ids.length];
    settings.paper = printerOf(settings.printer).papers[0].id;
  }
  setSettings(settings);
  for (let i = 0; i < sc.photos; i++) await loadFile(await fixture(i), i);
  if (sc.slotFields) slots.forEach((s) => s && Object.assign(s, sc.slotFields));
  for (const st of sc.stickers || []) {
    const d = { ...st };
    if (d.fixture) {
      delete d.fixture;
      d.img = await fixtureImg();
      d.uid = stickerId();
      d.blob = null;
    }
    addSticker(d);
  }
  selectSticker(null);
  selected = 0;
  await new Promise((r) => setTimeout(r, 60)); // laisse finir les rendus asynchrones (EXIF)
  render(true);
  const w = canvas.width;
  const h = canvas.height;
  const px = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const digest = await crypto.subtle.digest("SHA-256", px);
  render();
  return { w, h, sha: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("") };
}

async function runBrowser(name, type, port, baseline) {
  const key = `${name}-${process.platform}`;
  const browser = await type.launch();
  const ctxb = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: "block" });
  const page = await ctxb.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction('typeof setModeChips !== "undefined"');
  await page.waitForTimeout(800);
  const freeId = await page.evaluate("PRINTER_FREE");
  const got = {};
  let fail = 0;
  for (const sc of scenarios) {
    const r = await page.evaluate(`(${inPage.toString()})(${JSON.stringify(sc)}, ${JSON.stringify(freeId)})`);
    got[sc.name] = r;
    const ref = (baseline[key] || {})[sc.name];
    if (UPDATE) continue;
    const ok = ref && ref.sha === r.sha && ref.w === r.w && ref.h === r.h;
    if (!ok) fail++;
    console.log(`${ok ? "ok  " : "FAIL"} ${name} ${sc.name}${ref ? "" : " (pas de référence)"}`);
  }
  if (errors.length) {
    fail += errors.length;
    console.log(`FAIL ${name} erreurs console :\n  ${[...new Set(errors)].join("\n  ")}`);
  }
  await browser.close();
  if (UPDATE) {
    baseline[key] = got;
    console.log(`références ${key} : ${Object.keys(got).length} scénarios`);
  }
  return fail;
}

(async () => {
  const baseline = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, "utf8")) : {};
  const srv = await serve();
  const port = srv.address().port;
  let fail = 0;
  const list = [["chromium", chromium], ["webkit", webkit]].filter(([n]) => only === "all" || only === n);
  for (const [n, t] of list) fail += await runBrowser(n, t, port, baseline);
  if (UPDATE) fs.writeFileSync(BASE, JSON.stringify(baseline, null, 1) + "\n");
  srv.close();
  console.log(fail ? `\n${fail} échec(s)` : "\ntout est conforme");
  process.exit(fail ? 1 : 0);
})();
