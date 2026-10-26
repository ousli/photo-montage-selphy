// Catalogue des imprimantes photo (formats de papier et marges)
// Imprimantes photo : formats de papier [grand côté w, petit côté h] en mm et marge rognée à l'impression sans bord (safe, en mm).
// Valeurs indicatives (estimations), à vérifier avec un test d'impression réel.
const P = (id, label, w, h, safe) => ({ id, label, w, h, safe });
const PRINTERS = [
  { id: "canon-cp1300", brand: "Canon", name: "SELPHY CP1300", papers: [P("postcard", "Carte postale", 148, 100, 3), P("l", "Format L", 119, 89, 3), P("card", "Carte", 86, 54, 2), P("square", "Étiquette carrée", 54, 54, 2)] },
  { id: "canon-cp1500", brand: "Canon", name: "SELPHY CP1500", papers: [P("postcard", "Carte postale", 148, 100, 3), P("l", "Format L", 119, 89, 3), P("card", "Carte", 86, 54, 2), P("square", "Étiquette carrée", 54, 54, 2)] },
  { id: "canon-qx10", brand: "Canon", name: "SELPHY SQUARE QX10", papers: [P("68", "Zone image 68×68", 68, 68, 0), P("65", "Zone image 65×65", 65, 65, 0), P("62", "Zone image 62×62", 62, 62, 0)] },
  { id: "canon-zoemini", brand: "Canon", name: "Zoemini / ZINK 2×3", papers: [P("zink", "2×3 po", 76, 51, 2)] },
  { id: "kodak-dock", brand: "Kodak", name: "Dock / Dock Plus (4×6)", papers: [P("4x6", "4×6 po", 152, 102, 3)] },
  { id: "kodak-mini2", brand: "Kodak", name: "Mini 2 Retro", papers: [P("mini", "2,1×3,4 po", 86, 54, 2)] },
  { id: "hiti-p525l", brand: "HiTi", name: "P525L", papers: [P("4x6", "4×6 po", 152, 102, 3), P("5x7", "5×7 po", 178, 127, 3), P("6x8", "6×8 po", 203, 152, 3), P("35x5", "3,5×5 po", 127, 89, 3), P("5x5", "5×5 po", 127, 127, 3), P("5x6", "5×6 po", 152, 127, 3), P("6x6", "6×6 po", 152, 152, 3), P("3x4", "3×4 po", 102, 76, 3), P("3x5", "3×5 po", 127, 76, 3), P("3x6", "3×6 po", 152, 76, 3), P("3x8", "3×8 po", 203, 76, 3), P("2x3", "2×3 po", 76, 51, 3), P("2x6", "2×6 po (bande)", 152, 51, 3)] },
  { id: "dnp-ds620", brand: "DNP", name: "DS620", papers: [P("4x6", "4×6 po", 152, 102, 2), P("5x7", "5×7 po", 178, 127, 2), P("6x8", "6×8 po", 203, 152, 2), P("6x9", "6×9 po", 229, 152, 2), P("35x5", "3,5×5 po", 127, 89, 2), P("4x4", "4×4 po", 102, 102, 2), P("45x6", "4,5×6 po", 152, 114, 2), P("5x5", "5×5 po", 127, 127, 2), P("6x6", "6×6 po", 152, 152, 2), P("2x6", "2×6 po (bande)", 152, 51, 2)] },
  { id: "epson-pm400", brand: "Epson", name: "PictureMate PM-400", papers: [P("4x6", "4×6 po", 152, 102, 3), P("5x7", "5×7 po", 178, 127, 3), P("35x5", "3,5×5 po", 127, 89, 3), P("a6", "A6", 148, 105, 3), P("169", "16:9 large", 181, 102, 3), P("a5", "A5", 210, 148, 3)] },
  { id: "instax-mini", brand: "Fujifilm", name: "Instax Link (Mini)", papers: [P("mini", "Zone image Mini", 62, 46, 0)] },
  { id: "instax-wide", brand: "Fujifilm", name: "Instax Link Wide", papers: [P("wide", "Zone image Wide", 99, 62, 0)] },
  { id: "instax-square", brand: "Fujifilm", name: "Instax Square Link", papers: [P("square", "Zone image carrée", 62, 62, 0)] },
  { id: "polaroid-hiprint", brand: "Polaroid", name: "Hi·Print (2×3)", papers: [P("2x3", "2,1×3,4 po", 86, 54, 2)] },
  { id: "polaroid-mint", brand: "Polaroid", name: "Mint / Mint Pocket (ZINK)", papers: [P("2x3", "2,1×3,4 po", 86, 54, 2)] },
  { id: "polaroid-lab", brand: "Polaroid", name: "Lab (film i-Type)", papers: [P("itype", "Zone image", 79, 77, 0)] },
  { id: "polaroid-lab-600", brand: "Polaroid", name: "Lab (film 600)", papers: [P("600", "Zone image", 79, 77, 0)] },
  { id: "canon-cp1000", brand: "Canon", name: "SELPHY CP1000", papers: [P("postcard", "Carte postale", 148, 100, 3), P("card", "Carte", 86, 54, 2)] },
  { id: "canon-cp1200", brand: "Canon", name: "SELPHY CP1200", papers: [P("postcard", "Carte postale", 148, 100, 3), P("l", "Format L", 119, 89, 3), P("card", "Carte", 86, 54, 2)] },
  { id: "canon-ivy", brand: "Canon", name: "Ivy / Ivy 2 (mini)", papers: [P("zink", "2×3 po", 76, 51, 2)] },
  { id: "hp-sprocket-studio", brand: "HP", name: "Sprocket Studio Plus (4×6)", papers: [P("4x6", "4×6 po", 152, 102, 3)] },
  { id: "hp-sprocket-select", brand: "HP", name: "Sprocket Select (2,3×3,4)", papers: [P("select", "2,3×3,4 po", 87, 58, 2)] },
  { id: "instax-share-sp3", brand: "Fujifilm", name: "Instax Share SP-3 (carré)", papers: [P("square", "Zone image carrée", 62, 62, 0)] },
  { id: "kodak-mini-shot", brand: "Kodak", name: "Mini Shot 2 Retro", papers: [P("mini", "2,1×3,4 po", 86, 54, 2)] },
  { id: "kodak-mini-shot3", brand: "Kodak", name: "Mini Shot 3 Retro (3×3)", papers: [P("3x3", "3×3 po", 76, 76, 2)] },
  { id: "kodak-dock-plus", brand: "Kodak", name: "Dock Plus (4×6)", papers: [P("4x6", "4×6 po", 152, 102, 3)] },
  { id: "liene", brand: "Liene", name: "Amber / Vibe (4×6)", papers: [P("4x6", "4×6 po", 152, 102, 3)] },
  { id: "lifeprint", brand: "Lifeprint", name: "Photo & Video Printer (2×3)", papers: [P("2x3", "2×3 po", 76, 51, 2)] },
  { id: "hp-sprocket", brand: "HP", name: "Sprocket (2×3)", papers: [P("2x3", "2×3 po", 76, 51, 2)] },
];
const PRINTER_CUSTOM = "custom";
const PRINTER_FREE = "free";
const DEFAULT_PRINTER = "canon-cp1300";
const DEFAULT_CUSTOM = { w: 148, h: 100, safe: 3 };
let printerId = DEFAULT_PRINTER;
let paperId = "postcard";
const printerSel = $("printer");
const customInputs = { w: $("customW"), h: $("customH"), safe: $("customSafe") };
const printerOf = (id) => PRINTERS.find((p) => p.id === id);

(function fillPrinterSelect() {
  const brands = [...new Set(PRINTERS.map((p) => p.brand))];
  brands.forEach((b) => {
    const g = document.createElement("optgroup");
    g.label = b;
    PRINTERS.filter((p) => p.brand === b).forEach((p) => g.appendChild(new Option(p.name, p.id)));
    printerSel.appendChild(g);
  });
  const other = document.createElement("optgroup");
  other.label = "Autre";
  other.appendChild(new Option("Imprimante personnalisée…", PRINTER_CUSTOM));
  other.appendChild(new Option("Aucune (ratio libre)", PRINTER_FREE));
  printerSel.appendChild(other);
  printerSel.value = printerId;
})();
