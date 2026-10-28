// Lecture EXIF, lieu et texte des légendes

// la bande de légende est la même pour toutes les cases : elle suit la plus grande taille choisie
const captionH = () => {
  const sizes = slots.slice(0, count()).filter(Boolean).map((s) => capStyleOf(s).size);
  return Math.round((sizes.length ? Math.max(...sizes) : DEFAULT_CAP.size) * 1.9);
};
const DEFAULT_OVL = { font: "sans", color: "#ffffff", size: 30 };
const DEFAULT_EXIF_FIELDS = { date: true, camera: true, settings: true, place: false, gps: false };
const EXIF_FIELD_LABELS = { date: "Date", camera: "Appareil", settings: "Réglages", place: "Lieu", gps: "Coordonnées GPS", stamp: "Date tampon" };
const CORNER_LABELS = { tl: "↖ Haut gauche", tr: "↗ Haut droite", bl: "↙ Bas gauche", br: "↘ Bas droite" };
const ovlStyleOf = (s) => (s && s.exifStyle) || DEFAULT_OVL;
const exifFieldsOf = (s) => (s && s.exifFields) || DEFAULT_EXIF_FIELDS;
const exifModeOf = (s) => (s && s.exifMode) || "none";

// certains fichiers donnent les rationnels sous forme [numérateur, dénominateur]
const num = (v) => (v && typeof v === "object" && v.length === 2 ? v[0] / v[1] : Number(v));

function formatExif(r) {
  if (!r) return null;
  const out = {};
  const d = r.DateTimeOriginal || r.CreateDate;
  if (d instanceof Date && !isNaN(d)) {
    out.date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    // tampon façon appareil jetable : 'AA MM JJ
    const z = (n) => String(n).padStart(2, "0");
    out.stamp = `'${z(d.getFullYear() % 100)} ${z(d.getMonth() + 1)} ${z(d.getDate())}`;
  }
  const make = (r.Make || "").trim();
  const model = (r.Model || "").trim();
  const cam = model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`.trim();
  if (cam) out.camera = cam;
  const parts = [];
  if (r.ISO) parts.push(`ISO ${r.ISO}`);
  if (num(r.FNumber)) parts.push(`f/${Math.round(num(r.FNumber) * 10) / 10}`);
  if (num(r.ExposureTime)) {
    const t = num(r.ExposureTime);
    parts.push(t < 1 ? `1/${Math.round(1 / t)} s` : `${Math.round(t * 10) / 10} s`);
  }
  if (num(r.FocalLength)) parts.push(`${Math.round(num(r.FocalLength))} mm`);
  if (parts.length) out.settings = parts.join(" · ");
  if (typeof r.latitude === "number" && typeof r.longitude === "number") {
    out.gps = `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`;
    out.lat = r.latitude;
    out.lon = r.longitude;
  }
  return Object.keys(out).length ? out : null;
}

// exifr (76 Ko) n'est chargé qu'à la première photo importée
let exifrLoad = null;
function loadExifr() {
  if (typeof exifr !== "undefined") return Promise.resolve(true);
  exifrLoad ||= new Promise((res) => {
    const sc = document.createElement("script");
    sc.src = "./vendor/exifr.full.umd.js";
    sc.onload = () => res(true);
    sc.onerror = () => {
      exifrLoad = null;
      res(false);
    };
    document.head.appendChild(sc);
  });
  return exifrLoad;
}

async function readExif(file) {
  if (!(await loadExifr())) return null;
  try {
    return formatExif(await exifr.parse(file, { gps: true }));
  } catch (e) {
    return null;
  }
}

// Lieu lisible (ville, pays) via OpenStreetMap Nominatim, uniquement si l'utilisateur coche « Lieu »
const placeCache = new Map();
async function lookupPlace(lat, lon) {
  // coordonnées arrondies (~1 km) avant envoi
  const la = lat.toFixed(2), lo = lon.toFixed(2);
  const key = `${la},${lo}`;
  if (!placeCache.has(key)) {
    placeCache.set(
      key,
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=fr&lat=${la}&lon=${lo}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
        .then((j) => {
          const a = j.address || {};
          const city = a.city || a.town || a.village || a.municipality || a.county || a.state;
          const label = [city, a.country].filter(Boolean).join(", ");
          if (!label) throw new Error("empty");
          return label;
        })
    );
    placeCache.get(key).catch(() => placeCache.delete(key));
  }
  return placeCache.get(key);
}

function ensurePlace(s) {
  if (!s || !s.exif || s.exif.lat == null || s.exif.placeState) return;
  s.exif.placeState = "loading";
  lookupPlace(s.exif.lat, s.exif.lon)
    .then((label) => {
      s.exif.place = label;
      s.exif.placeState = "ok";
    })
    .catch(() => {
      s.exif.placeState = "error";
    })
    .then(() => render());
}
const exifAvailable = (s, k) => !!(s && s.exif && (k === "place" ? s.exif.lat != null : s.exif[k]));

// lignes EXIF actives pour une photo
function exifLines(s) {
  if (!s || !s.exif) return [];
  if (exifModeOf(s) === "none") return [];
  const f = exifFieldsOf(s);
  if (f.place) ensurePlace(s);
  return Object.keys(EXIF_FIELD_LABELS).filter((k) => f[k] && s.exif[k]).map((k) => s.exif[k]);
}
const hasExifCaption = (s) => exifModeOf(s) === "caption" && exifLines(s).length > 0;
// texte sous la photo : légende manuelle et/ou infos EXIF
function captionTextOf(s) {
  const parts = [];
  if (s.capOn && s.caption) parts.push(s.caption);
  if (hasExifCaption(s)) parts.push(exifLines(s).join(" · "));
  return parts.join(" · ");
}
const hasBand = (s) => !!s && (!!s.capOn || hasExifCaption(s));
