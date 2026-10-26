// Import et réduction des fichiers image

const FORMAT_MIME = /^image\/(jpeg|png|webp|heic|heif|avif|gif)$/i;
const MAX_FILE_MB = 60;
const MAX_PX = 3600; // au-delà, la photo est réduite (la sortie fait 1800 px)
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Réduit une grande photo et la ré-encode en JPEG pour alléger la mémoire
async function shrinkIfNeeded(img, file) {
  const long = Math.max(img.width, img.height);
  if (long <= MAX_PX && file.size <= 8 * 1024 * 1024) return { img, blob: file, shrunk: false };
  const k = Math.min(1, MAX_PX / long);
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.92));
  return { img: c, blob: blob || file, shrunk: true };
}

function loadFile(file, index) {
  if (!file) return Promise.resolve();
  if (!FORMAT_MIME.test(file.type) && !FORMAT_EXT.test(file.name || "")) {
    setMessage(`Format non pris en charge : ${file.name || "fichier"}. Formats acceptés : JPEG, PNG, WebP, HEIC/HEIF, AVIF, GIF.`, true);
    return Promise.resolve();
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    setMessage(`Fichier trop lourd (${Math.round(file.size / 1048576)} Mo, maximum ${MAX_FILE_MB} Mo) : ${file.name}`, true);
    return Promise.resolve();
  }
  const img = new Image();
  const url = URL.createObjectURL(file);
  const exifP = readExif(file);
  return new Promise((done) => {
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setMessage(`Image illisible : ${file.name}. ${/hei[cf]$/i.test(file.name) ? "Ce navigateur ne lit pas le HEIC : exporte-la en JPEG." : ""}`, true);
      done();
    };
    img.onload = async () => {
      const out = await shrinkIfNeeded(img, file);
      const prev = slots[index];
      const slot = { uid: uid(), img: out.img, blob: out.blob, zoom: 1, rot: 0, ox: 0, oy: 0 };
      slots[index] = slot;
      if (prev) {
        ["caption", "capOn", "style", "exifMode", "exifFields", "exifCorner", "exifStyle"].forEach((k) => (slot[k] = prev[k]));
      }
      exifP.then((ex) => {
        slot.exif = ex;
        render();
      });
      setMessage(`Photo ${index + 1} : ${file.name}${out.shrunk ? " (réduite pour alléger la mémoire)" : ""}`);
      render();
      done();
    };
    img.src = url;
  });
}

const menuEl = $("cellMenu");
