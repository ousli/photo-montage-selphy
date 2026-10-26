// Projets nommés : plusieurs montages enregistrés sur l'appareil (IndexedDB, magasin « projects »).
// Chargé après history.js, qui expose window.MontageDoc.
(function () {
  const { getState, loadState, idb } = window.MontageDoc;
  const panel = $("projectsPanel");
  const list = $("projectsList");
  const nameInput = $("projectName");
  let currentId = null;

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
    };
  }

  async function saveProject(id, name) {
    const rec = { id, name, updated: Date.now(), thumb: thumbOf(), ...plainState() };
    await store("readwrite", (o) => o.put(rec, id));
    currentId = id;
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
    const slots = await Promise.all(
      rec.slots.map(async (x) => {
        if (!x) return null;
        const img = await decode(x.blob);
        return img ? { ...x, img } : null;
      })
    );
    loadState({ settings: { ...DEFAULT_SETTINGS, ...rec.settings }, slots, selected: rec.selected });
    currentId = rec.id;
    nameInput.value = rec.name;
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
      const d = document.createElement("small");
      const photos = rec.slots.filter(Boolean).length;
      d.textContent = `${fmtDate(rec.updated)} · ${photos} photo${photos > 1 ? "s" : ""}`;
      info.append(n, d);
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
          if (rec.id === currentId) nameInput.value = name;
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
          if (rec.id === currentId) currentId = null;
          refresh();
        }, "ghost")
      );
      row.append(img, info, acts);
      list.appendChild(row);
    }
  }

  function openPanel() {
    panel.hidden = false;
    refresh();
  }
  function closePanel() {
    panel.hidden = true;
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
      refresh();
    } catch (e) {
      setMessage("Enregistrement impossible : " + (e.message || e), true);
    }
  };

  $("projectNew").onclick = () => {
    if (slots.some(Boolean) && !confirm("Commencer un nouveau montage ? Le montage actuel n'est conservé que s'il est enregistré comme projet.")) return;
    loadState({ settings: { ...DEFAULT_SETTINGS }, slots: [], selected: 0 });
    currentId = null;
    nameInput.value = "";
    closePanel();
    setMessage("Nouveau montage.");
  };
})();
