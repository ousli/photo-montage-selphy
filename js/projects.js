// Projets nommés : plusieurs montages enregistrés sur l'appareil (IndexedDB, magasin « projects »).
// Chargé après history.js, qui expose window.MontageDoc.
(function () {
  const { getState, loadState, idb, ready } = window.MontageDoc;
  const CKEY = "montage-project";
  const remember = (id) => {
    try {
      id ? localStorage.setItem(CKEY, id) : localStorage.removeItem(CKEY);
    } catch (e) {}
  };
  const panel = $("projectsPanel");
  const list = $("projectsList");
  const nameInput = $("projectName");
  let currentId = null;
  let savedSig = null; // signature du montage au dernier enregistrement ou à la dernière ouverture

  const newId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const store = (mode, fn) => idb("projects", mode, fn);

  function thumbOf() {
    const t = document.createElement("canvas");
    const k = 200 / Math.max(canvas.width, canvas.height);
    t.width = Math.max(1, Math.round(canvas.width * k));
    t.height = Math.max(1, Math.round(canvas.height * k));
    t.getContext("2d").drawImage(canvas, 0, 0, t.width, t.height);
    return t.toDataURL("image/jpeg", 0.7);
  }

  // « Canon SELPHY CP1300 · Carte postale 148×100 mm · Paysage » lu depuis les réglages enregistrés
  function formatOf(st) {
    const orient = st.orientation === "portrait" ? "Portrait" : "Paysage";
    if (st.printer === PRINTER_FREE) return `Format libre ${st.ratio} · ${orient}`;
    if (st.printer === PRINTER_CUSTOM) return `Papier personnalisé ${st.custom.w}×${st.custom.h} mm · ${orient}`;
    const pr = printerOf(st.printer);
    const pa = pr && (pr.papers.find((x) => x.id === st.paper) || pr.papers[0]);
    return pr ? `${pr.brand} ${pr.name} · ${pa.label} ${pa.w}×${pa.h} mm · ${orient}` : `${st.ratio} · ${orient}`;
  }
  function photosOf(rec) {
    const n = Number(rec.settings.count) || rec.slots.length;
    const f = rec.slots.slice(0, n).filter(Boolean).length;
    return f < n ? `${f}/${n} photos` : `${n} photo${n > 1 ? "s" : ""}`;
  }
  const previewOf = () => {
    const t = document.createElement("canvas");
    const k = 640 / Math.max(canvas.width, canvas.height);
    t.width = Math.max(1, Math.round(canvas.width * k));
    t.height = Math.max(1, Math.round(canvas.height * k));
    t.getContext("2d").drawImage(canvas, 0, 0, t.width, t.height);
    return t.toDataURL("image/jpeg", 0.8);
  };

  // l'état sans les éléments d'image décodés : les blobs sont stockés tels quels
  function plainState() {
    const st = getState();
    return {
      settings: st.settings,
      selected: st.selected,
      slots: st.slots.map((x) => {
        if (!x || !x.blob) return null;
        const { img, ...rest } = x;
        return rest;
      }),
      stickers: st.stickers.map(({ img, ...rest }) => rest),
    };
  }

  const sigOf = () =>
    JSON.stringify(plainState(), (k, v) => (k === "img" || k === "blob" || k === "exif" || k === "selected" ? undefined : v));
  const hasWork = () => slots.some(Boolean) || stickers.length > 0;
  const isDirty = () => (currentId ? sigOf() !== savedSig : hasWork());
  const currentName = () => (currentId ? nameInput.dataset.saved || "" : "");

  // avertit avant de quitter un montage modifié et non enregistré
  const confirmLeave = () =>
    !isDirty() ||
    confirm(
      currentId
        ? `Le projet « ${currentName()} » a des modifications non enregistrées. Les abandonner ?`
        : "Le montage en cours n'est pas enregistré. L'abandonner ?"
    );

  function updateStatus() {
    const s = $("projectStatus");
    if (currentId) s.textContent = isDirty() ? `Projet « ${currentName()} » : modifications non enregistrées` : `Projet « ${currentName()} » : enregistré`;
    else s.textContent = hasWork() ? "Montage non enregistré" : "Montage vide";
    s.classList.toggle("warn", isDirty());
    $("projectFormat").textContent = `${formatOf(getState().settings)} · ${stickers.length ? stickers.length + " sticker" + (stickers.length > 1 ? "s" : "") + " · " : ""}${slots.slice(0, count()).filter(Boolean).length}/${count()} photos`;
    $("projectPreview").src = previewOf();
  }

  async function saveProject(id, name) {
    const rec = { id, name, updated: Date.now(), thumb: thumbOf(), ...plainState() };
    await store("readwrite", (o) => o.put(rec, id));
    currentId = id;
    remember(id);
    nameInput.dataset.saved = name;
    savedSig = sigOf();
    return rec;
  }

  const allProjects = async () => ((await store("readonly", (o) => o.getAll())) || []).sort((a, b) => b.updated - a.updated);

  const decode = (blob) =>
    new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = URL.createObjectURL(blob);
    });

  async function openProject(rec) {
    if (rec.id !== currentId || isDirty()) if (!confirmLeave()) return;
    const slots = await Promise.all(
      rec.slots.map(async (x) => {
        if (!x) return null;
        const img = await decode(x.blob);
        return img ? { ...x, img } : null;
      })
    );
    const stk = await Promise.all(
      (rec.stickers || []).map(async (x) => {
        if (x.kind !== "image") return x;
        const img = x.blob && (await decode(x.blob));
        return img ? { ...x, img } : null;
      })
    );
    loadState({ settings: { ...DEFAULT_SETTINGS, ...rec.settings }, slots, selected: rec.selected, stickers: stk.filter(Boolean) });
    currentId = rec.id;
    remember(rec.id);
    nameInput.value = nameInput.dataset.saved = rec.name;
    savedSig = sigOf();
    closePanel();
    setMessage(`Projet « ${rec.name} » ouvert.`);
  }

  const fmtDate = (t) => new Date(t).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  async function refresh() {
    let items = [];
    try {
      items = await allProjects();
    } catch (e) {
      list.textContent = "Le stockage du navigateur n'est pas disponible.";
      return;
    }
    list.textContent = "";
    if (!items.length) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Aucun projet enregistré pour l'instant.";
      list.appendChild(p);
      return;
    }
    for (const rec of items) {
      const row = document.createElement("div");
      row.className = "project-row" + (rec.id === currentId ? " current" : "");
      const img = document.createElement("img");
      img.src = rec.thumb;
      img.alt = "";
      const info = document.createElement("div");
      info.className = "project-info";
      const n = document.createElement("strong");
      n.textContent = rec.name;
      if (rec.id === currentId) {
        const badge = document.createElement("span");
        badge.className = "project-badge";
        badge.textContent = "Projet actif";
        n.append(" ", badge);
      }
      const d = document.createElement("small");
      d.textContent = `${fmtDate(rec.updated)} · ${photosOf(rec)}`;
      const f = document.createElement("small");
      f.textContent = formatOf(rec.settings);
      info.append(n, d, f);
      const acts = document.createElement("div");
      acts.className = "project-actions";
      const mk = (label, fn, cls) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        if (cls) b.className = cls;
        b.onclick = async () => {
          try {
            await fn();
          } catch (e) {
            setMessage("Action impossible : " + (e.message || e), true);
          }
        };
        return b;
      };
      acts.append(
        mk("Ouvrir", () => openProject(rec)),
        mk("Renommer", async () => {
          const name = (prompt("Nouveau nom :", rec.name) || "").trim();
          if (!name) return;
          await store("readwrite", (o) => o.put({ ...rec, name }, rec.id));
          if (rec.id === currentId) nameInput.value = nameInput.dataset.saved = name;
          refresh();
        }, "ghost"),
        mk("Dupliquer", async () => {
          const id = newId();
          await store("readwrite", (o) => o.put({ ...rec, id, name: rec.name + " (copie)", updated: Date.now() }, id));
          refresh();
        }, "ghost"),
        mk("Supprimer", async () => {
          if (!confirm(`Supprimer le projet « ${rec.name} » ?`)) return;
          await store("readwrite", (o) => o.delete(rec.id));
          if (rec.id === currentId) {
            currentId = null;
            remember(null);
          }
          refresh();
        }, "ghost")
      );
      row.append(img, info, acts);
      list.appendChild(row);
    }
  }

  function openPanel() {
    panel.classList.remove("closing");
    panel.hidden = false;
    if (!nameInput.value && currentId) nameInput.value = currentName();
    updateStatus();
    refresh();
  }
  function closePanel() {
    if (panel.hidden || panel.classList.contains("closing")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return void (panel.hidden = true);
    panel.classList.add("closing");
    setTimeout(() => {
      panel.hidden = true;
      panel.classList.remove("closing");
    }, 200);
  }

  $("projectsBtn").onclick = openPanel;
  $("projectsClose").onclick = closePanel;
  panel.addEventListener("click", (ev) => ev.target === panel && closePanel());
  document.addEventListener("keydown", (ev) => ev.key === "Escape" && !panel.hidden && closePanel());

  $("projectSave").onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return setMessage("Donne un nom au projet.", true);
    }
    try {
      const items = await allProjects();
      const same = items.find((p) => p.name === name);
      // même nom : on met à jour le projet existant ; sinon on en crée un
      const id = same ? same.id : newId();
      await saveProject(id, name);
      setMessage(same ? `Projet « ${name} » mis à jour.` : `Projet « ${name} » enregistré.`);
      updateStatus();
      refresh();
    } catch (e) {
      setMessage("Enregistrement impossible : " + (e.message || e), true);
    }
  };

  $("projectNew").onclick = () => {
    if (!confirmLeave()) return;
    loadState({ settings: { ...DEFAULT_SETTINGS }, slots: [], selected: 0 });
    currentId = null;
    remember(null);
    savedSig = null;
    nameInput.value = nameInput.dataset.saved = "";
    closePanel();
    setMessage("Nouveau montage.");
  };

  // après un rechargement, le montage restauré reste lié à son projet enregistré
  (ready || Promise.resolve()).then(async () => {
    let id = null;
    try {
      id = localStorage.getItem(CKEY);
    } catch (e) {}
    if (!id) return;
    const rec = await store("readonly", (o) => o.get(id));
    if (!rec) return remember(null);
    const saved = JSON.stringify(
      { settings: { ...DEFAULT_SETTINGS, ...rec.settings }, selected: rec.selected, slots: rec.slots, stickers: rec.stickers || [] },
      (k, v) => (k === "img" || k === "blob" || k === "exif" || k === "selected" ? undefined : v)
    );
    currentId = id;
    nameInput.value = nameInput.dataset.saved = rec.name;
    savedSig = saved;
    updateStatus();
  });
})();
