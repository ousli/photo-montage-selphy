// Annuler / rétablir et sauvegarde automatique du montage en cours (IndexedDB).
// Chargé après script.js : il réutilise ses variables globales (slots, render, getSettings…).
(function () {
  const HIST_MAX = 60;
  let applying = false;

  // copie des réglages d'une photo ; l'image et son blob restent partagés
  function snapSlot(s) {
    if (!s) return null;
    const { img, blob, ...rest } = s;
    const c = JSON.parse(JSON.stringify(rest));
    if (c.exif && c.exif.placeState === "loading") delete c.exif.placeState;
    return { ...c, img, blob };
  }
  const getState = () => ({ settings: getSettings(), slots: slots.map(snapSlot), selected, stickers: stickers.map(snapSticker) });
  // signature des seules modifications annulables (sans images, sans données EXIF dérivées)
  const sig = (st) => JSON.stringify({ s: st.settings, l: st.slots, k: st.stickers }, (k, v) => (k === "img" || k === "blob" || k === "exif" ? undefined : v));

  function applyState(st, resetSlots = true) {
    applying = true;
    try {
      setSettings(st.settings);
      if (resetSlots) slots.fill(null);
      st.slots.forEach((x, i) => (slots[i] = snapSlot(x)));
      selected = Math.min(st.selected || 0, count() - 1);
      stickers = (st.stickers || []).map(snapSticker);
      if (!getSticker(selectedSticker)) selectedSticker = null;
      render();
    } finally {
      applying = false;
    }
  }

  // ---- historique ----
  let hist = [];
  let idx = -1;
  let timer = null;
  const undoBtn = document.getElementById("undoBtn");
  const redoBtn = document.getElementById("redoBtn");
  function updateBtns() {
    undoBtn.disabled = idx <= 0;
    redoBtn.disabled = idx >= hist.length - 1;
  }
  function checkpoint(force) {
    timer = null;
    // on attend la fin d'un geste en cours (glisser, pincer, échanger)
    if (!force && (drag || pinch || swap)) return schedule();
    const st = getState();
    if (idx >= 0 && sig(st) === sig(hist[idx])) {
      hist[idx] = st; // met à jour la sélection sans créer d'étape
      return updateBtns();
    }
    hist.length = idx + 1;
    hist.push(st);
    if (hist.length > HIST_MAX) hist.shift();
    idx = hist.length - 1;
    updateBtns();
    scheduleSave();
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(checkpoint, 400);
  }
  function flush() {
    if (timer) {
      clearTimeout(timer);
      checkpoint(true);
    }
  }
  function undo() {
    flush();
    if (idx <= 0) return;
    idx--;
    applyState(hist[idx]);
    updateBtns();
    scheduleSave();
    setMessage("Action annulée.");
  }
  function redo() {
    flush();
    if (idx >= hist.length - 1) return;
    idx++;
    applyState(hist[idx]);
    updateBtns();
    scheduleSave();
    setMessage("Action rétablie.");
  }
  undoBtn.onclick = undo;
  redoBtn.onclick = redo;
  document.addEventListener("keydown", (ev) => {
    if (!(ev.metaKey || ev.ctrlKey) || ev.altKey) return;
    const t = ev.target;
    if (t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && t.type === "text"))) return;
    const k = ev.key.toLowerCase();
    if (k === "z") {
      ev.preventDefault();
      ev.shiftKey ? redo() : undo();
    } else if (k === "y") {
      ev.preventDefault();
      redo();
    }
  });

  // chaque rendu planifie un point d'historique (sauf pendant une restauration)
  const baseRender = render;
  render = function (forExport) {
    baseRender.apply(this, arguments);
    if (!applying && !forExport) schedule();
  };

  // ---- sauvegarde automatique ----
  const dbP = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error("no idb"));
    // ouverture sans version imposée : une base déjà passée en version supérieure (autre branche) reste utilisable
    const need = (db) => ["kv", "photos", "projects"].filter((n) => !db.objectStoreNames.contains(n));
    const mk = (db) => need(db).forEach((n) => db.createObjectStore(n));
    const open = (ver) => {
      const r = ver ? indexedDB.open("montage-photo", ver) : indexedDB.open("montage-photo");
      r.onupgradeneeded = () => mk(r.result);
      r.onsuccess = () => {
        const db = r.result;
        if (!need(db).length) return res(db);
        const v = db.version + 1;
        db.close();
        open(v);
      };
      r.onerror = () => rej(r.error);
    };
    open();
  });
  dbP.catch(saveFailed);
  const idb = (store, mode, fn) =>
    dbP.then(
      (db) =>
        new Promise((res, rej) => {
          const t = db.transaction(store, mode);
          const req = fn(t.objectStore(store));
          t.oncomplete = () => res(req && req.result);
          t.onerror = t.onabort = () => rej(t.error);
        })
    );

  let warned = false;
  function saveFailed(e) {
    console.error("Sauvegarde automatique impossible", e);
    if (warned) return;
    warned = true;
    setMessage(`Sauvegarde automatique impossible (${(e && (e.name || e.message)) || "erreur inconnue"}) : télécharge ton montage pour ne rien perdre.`, true);
  }

  const stored = new Set();
  let saveTimer = null;
  let chain = Promise.resolve();
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => (chain = chain.then(save).catch(saveFailed)), 1000);
  }
  async function save() {
    const st = getState();
    const used = new Set();
    for (const x of st.slots) {
      if (!x || !x.uid || !x.blob) continue;
      used.add(x.uid);
      if (!stored.has(x.uid)) {
        await idb("photos", "readwrite", (o) => o.put(x.blob, x.uid));
        stored.add(x.uid);
      }
    }
    for (const x of st.stickers) {
      if (!x.uid || !x.blob) continue;
      used.add(x.uid);
      if (!stored.has(x.uid)) {
        await idb("photos", "readwrite", (o) => o.put(x.blob, x.uid));
        stored.add(x.uid);
      }
    }
    const keys = (await idb("photos", "readonly", (o) => o.getAllKeys())) || [];
    for (const k of keys) {
      if (!used.has(k)) {
        await idb("photos", "readwrite", (o) => o.delete(k));
        stored.delete(k);
      }
    }
    const doc = {
      v: 1,
      settings: st.settings,
      selected: st.selected,
      stickers: st.stickers.map((x) => {
        const { img, blob, ...rest } = x;
        return rest;
      }),
      slots: st.slots.map((x) => {
        if (!x || !x.uid || !x.blob) return null;
        const { img, blob, ...rest } = x;
        return rest;
      }),
    };
    await idb("kv", "readwrite", (o) => o.put(doc, "state"));
  }
  const saveNow = () => {
    flush();
    clearTimeout(saveTimer);
    chain = chain.then(save).catch(saveFailed);
  };
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && saveNow());
  window.addEventListener("pagehide", saveNow);

  async function restore() {
    const doc = await idb("kv", "readonly", (o) => o.get("state"));
    if (!doc || !doc.settings) return false;
    const loaded = await Promise.all(
      (doc.slots || []).map(async (x) => {
        if (!x) return null;
        const blob = await idb("photos", "readonly", (o) => o.get(x.uid));
        if (!blob) return null;
        const img = await new Promise((res) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = () => res(null);
          i.src = URL.createObjectURL(blob);
        });
        if (!img) return null;
        stored.add(x.uid);
        return { ...x, img, blob };
      })
    );
    const stk = (
      await Promise.all(
        (doc.stickers || []).map(async (x) => {
          if (x.kind !== "image") return x;
          const blob = await idb("photos", "readonly", (o) => o.get(x.uid));
          if (!blob) return null;
          const img = await new Promise((res) => {
            const i = new Image();
            i.onload = () => res(i);
            i.onerror = () => res(null);
            i.src = URL.createObjectURL(blob);
          });
          if (!img) return null;
          stored.add(x.uid);
          return { ...x, img, blob };
        })
      )
    ).filter(Boolean);
    if (idx > 0) return false; // l'utilisateur a déjà commencé un nouveau montage
    const hasPhotos = loaded.some(Boolean);
    const settingsChanged = sig({ settings: doc.settings, slots: [] }) !== sig({ settings: getSettings(), slots: [] });
    if (!hasPhotos && !settingsChanged && !stk.length) return false;
    applyState({ settings: { ...DEFAULT_SETTINGS, ...doc.settings }, slots: loaded, selected: doc.selected, stickers: stk }, true);
    return hasPhotos || stk.length > 0;
  }

  // ouvre un état complet (projet nommé) : repart d'un historique neuf
  function loadState(st) {
    flush();
    applyState(st, true);
    hist = [getState()];
    idx = 0;
    updateBtns();
    scheduleSave();
  }
  window.MontageDoc = { getState, loadState, idb };

  // état de départ : on ne le restaure qu'une fois, avant toute action de l'utilisateur
  hist = [getState()];
  idx = 0;
  updateBtns();
  restore()
    .then((did) => {
      hist = [getState()];
      idx = 0;
      updateBtns();
      if (did) setMessage("Ton dernier montage a été restauré.");
    })
    .catch(() => {});
})();
