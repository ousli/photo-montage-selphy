// Détourage automatique d'un fond non uni (méthode GrabCut simplifiée, 100 % dans le navigateur, sans modèle ni réseau).
// Le bord de l'image est du fond sûr ; l'intérieur du cadre (réduit de `inset`) est le sujet probable. Des modèles de couleur
// (k-moyennes) du sujet et du fond + un lissage qui respecte les contours sont résolus par coupe minimale (Dinic) sur une
// version réduite, puis le contour est affiné en pleine résolution.

const GC_SIZE = 140; // plus grand côté du calcul
const GC_K = 5;
const GC_GAMMA = 25;

function gcFit(px, idx) {
  const step = Math.max(1, Math.floor(idx.length / 5000));
  const pts = [];
  for (let i = 0; i < idx.length; i += step) pts.push(idx[i]);
  const n = pts.length;
  const col = (p, c) => px[p * 3 + c];
  let centers = [];
  let first = pts[0];
  centers.push([col(first, 0), col(first, 1), col(first, 2)]);
  const dmin = new Float32Array(n).fill(Infinity);
  while (centers.length < Math.min(GC_K, n)) {
    const c = centers[centers.length - 1];
    let best = 0, bd = -1;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const d = (col(p, 0) - c[0]) ** 2 + (col(p, 1) - c[1]) ** 2 + (col(p, 2) - c[2]) ** 2;
      if (d < dmin[i]) dmin[i] = d;
      if (dmin[i] > bd) (bd = dmin[i]), (best = i);
    }
    if (bd < 1) break;
    const p = pts[best];
    centers.push([col(p, 0), col(p, 1), col(p, 2)]);
  }
  const K = centers.length;
  const as = new Int32Array(n);
  for (let it = 0; it < 7; it++) {
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      let b = 0, bd = Infinity;
      for (let k = 0; k < K; k++) {
        const c = centers[k];
        const d = (col(p, 0) - c[0]) ** 2 + (col(p, 1) - c[1]) ** 2 + (col(p, 2) - c[2]) ** 2;
        if (d < bd) (bd = d), (b = k);
      }
      as[i] = b;
    }
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const s = sum[as[i]], p = pts[i];
      s[0] += col(p, 0); s[1] += col(p, 1); s[2] += col(p, 2); s[3]++;
    }
    centers = centers.map((c, k) => (sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c));
  }
  const vs = centers.map(() => [0, 0]);
  for (let i = 0; i < n; i++) {
    const c = centers[as[i]], p = pts[i];
    vs[as[i]][0] += (col(p, 0) - c[0]) ** 2 + (col(p, 1) - c[1]) ** 2 + (col(p, 2) - c[2]) ** 2;
    vs[as[i]][1]++;
  }
  return centers.map((c, k) => {
    const cnt = vs[k][1] || 1;
    const v = Math.max(60, vs[k][0] / (3 * cnt));
    return { m: c, v, lw: Math.log(cnt / n + 1e-6), c15: 1.5 * Math.log(v) };
  });
}

// −log de la vraisemblance d'une couleur sous le modèle (mélange isotrope, meilleur composant)
function gcCost(models, r, g, b) {
  let m = Infinity;
  for (const q of models) {
    const d = ((r - q.m[0]) ** 2 + (g - q.m[1]) ** 2 + (b - q.m[2]) ** 2) / (2 * q.v) + q.c15 - q.lw;
    if (d < m) m = d;
  }
  return m;
}

// Flot maximal (Dinic) ; renvoie le côté source (sujet) du plus petit coupe
function gcMinCut(N, S, T, edges) {
  const nodes = N + 2;
  const head = new Int32Array(nodes).fill(-1);
  const cap = new Float32Array(edges.count * 2);
  const to = new Int32Array(edges.count * 2);
  const next = new Int32Array(edges.count * 2);
  for (let e = 0; e < edges.count; e++) {
    const u = edges.u[e], v = edges.v[e];
    to[2 * e] = v; cap[2 * e] = edges.c1[e]; next[2 * e] = head[u]; head[u] = 2 * e;
    to[2 * e + 1] = u; cap[2 * e + 1] = edges.c2[e]; next[2 * e + 1] = head[v]; head[v] = 2 * e + 1;
  }
  const level = new Int32Array(nodes);
  const it = new Int32Array(nodes);
  const queue = new Int32Array(nodes);
  const path = new Int32Array(nodes);
  const bfs = () => {
    level.fill(-1);
    level[S] = 0;
    let qh = 0, qt = 0;
    queue[qt++] = S;
    while (qh < qt) {
      const u = queue[qh++];
      for (let e = head[u]; e !== -1; e = next[e])
        if (cap[e] > 1e-6 && level[to[e]] < 0) (level[to[e]] = level[u] + 1), (queue[qt++] = to[e]);
    }
    return level[T] >= 0;
  };
  while (bfs()) {
    it.set(head);
    for (;;) {
      let u = S, len = 0;
      while (u !== T) {
        let e = it[u];
        while (e !== -1 && (cap[e] <= 1e-6 || level[to[e]] !== level[u] + 1)) e = next[e];
        it[u] = e;
        if (e === -1) {
          if (len === 0) {
            u = -1;
            break;
          }
          level[u] = -1;
          len--;
          u = to[path[len] ^ 1];
          continue;
        }
        path[len++] = e;
        u = to[e];
      }
      if (u === -1) break;
      let f = Infinity;
      for (let i = 0; i < len; i++) f = Math.min(f, cap[path[i]]);
      for (let i = 0; i < len; i++) (cap[path[i]] -= f), (cap[path[i] ^ 1] += f);
    }
  }
  // sujet = atteignable depuis la source dans le graphe résiduel
  level.fill(-1);
  level[S] = 0;
  let qh = 0, qt = 0;
  queue[qt++] = S;
  while (qh < qt) {
    const u = queue[qh++];
    for (let e = head[u]; e !== -1; e = next[e]) if (cap[e] > 1e-6 && level[to[e]] < 0) (level[to[e]] = 1), (queue[qt++] = to[e]);
  }
  return level;
}

// Retourne l'opacité (0..255) de chaque pixel de l'image w×h, ou null si le sujet n'a pas pu être isolé
function gcDims(w, h) {
  const k = Math.min(1, GC_SIZE / Math.max(w, h));
  return [Math.max(8, Math.round(w * k)), Math.max(8, Math.round(h * k))];
}

// marks (facultatif, taille gcDims) : 1 = à garder, 2 = à effacer (traits de l'utilisateur)
function grabCutAlpha(src, w, h, inset, marks) {
  const [sw, sh] = gcDims(w, h);
  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  const sg = small.getContext("2d", { willReadFrequently: true });
  sg.drawImage(src, 0, 0, sw, sh);
  const rgba = sg.getImageData(0, 0, sw, sh).data;
  const N = sw * sh;
  const px = new Float32Array(N * 3);
  const sure = new Uint8Array(N); // fond sûr
  const keep = new Uint8Array(N); // sujet sûr
  const ix = Math.max(1, Math.round(inset * sw)), iy = Math.max(1, Math.round(inset * sh));
  const cur = new Uint8Array(N);
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++) {
      const p = y * sw + x;
      px[p * 3] = rgba[p * 4]; px[p * 3 + 1] = rgba[p * 4 + 1]; px[p * 3 + 2] = rgba[p * 4 + 2];
      const inside = x >= ix && x < sw - ix && y >= iy && y < sh - iy;
      if (!inside || rgba[p * 4 + 3] < 8) sure[p] = 1;
      else cur[p] = 1;
      if (marks && marks[p] === 1) (keep[p] = 1), (sure[p] = 0), (cur[p] = 1);
      else if (marks && marks[p] === 2) (sure[p] = 1), (keep[p] = 0), (cur[p] = 0);
    }
  // pondération des voisins : exp(-β·Δ²), β d'après le contraste moyen de l'image
  const nb = [[1, 0, 1], [0, 1, 1], [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2]];
  const sq = (p, q) => (px[p * 3] - px[q * 3]) ** 2 + (px[p * 3 + 1] - px[q * 3 + 1]) ** 2 + (px[p * 3 + 2] - px[q * 3 + 2]) ** 2;
  let sum = 0, cnt = 0;
  for (let y = 0; y < sh - 1; y++)
    for (let x = 0; x < sw - 1; x++) {
      const p = y * sw + x;
      sum += sq(p, p + 1) + sq(p, p + sw);
      cnt += 2;
    }
  const beta = 1 / (2 * (sum / cnt) + 1e-6);
  const pairs = [];
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++)
      for (const [dx, dy, dist] of nb) {
        const x2 = x + dx, y2 = y + dy;
        if (x2 < 0 || x2 >= sw || y2 >= sh) continue;
        const p = y * sw + x, q = y2 * sw + x2;
        pairs.push(p, q, (GC_GAMMA * Math.exp(-beta * sq(p, q))) / dist);
      }
  const nPairs = pairs.length / 3;
  let fgM = null, bgM = null;
  for (let iter = 0; iter < 5; iter++) {
    const fg = [], bg = [];
    for (let p = 0; p < N; p++) (cur[p] ? fg : bg).push(p);
    if (fg.length < N * 0.01 || bg.length < N * 0.01) return null;
    fgM = gcFit(px, fg);
    bgM = gcFit(px, bg);
    const S = N, T = N + 1;
    const total = nPairs + N;
    const e = { count: total, u: new Int32Array(total), v: new Int32Array(total), c1: new Float32Array(total), c2: new Float32Array(total) };
    for (let i = 0; i < nPairs; i++) {
      e.u[i] = pairs[i * 3]; e.v[i] = pairs[i * 3 + 1]; e.c1[i] = e.c2[i] = pairs[i * 3 + 2];
    }
    for (let p = 0; p < N; p++) {
      const i = nPairs + p;
      if (keep[p]) {
        e.u[i] = S; e.v[i] = p; e.c1[i] = 1e6; e.c2[i] = 0;
      } else if (sure[p]) {
        // fond sûr : relié au puits (coût infini d'être sujet)
        e.u[i] = p; e.v[i] = T; e.c1[i] = 1e6; e.c2[i] = 0;
      } else {
        const r = px[p * 3], g = px[p * 3 + 1], b = px[p * 3 + 2];
        const df = gcCost(fgM, r, g, b), db = gcCost(bgM, r, g, b);
        const m = Math.min(df, db);
        // S→p (coûte db si p finit fond) et p→T (coûte df si p finit sujet) : un seul arc suffit sur la différence
        if (db - df > 0) (e.u[i] = S), (e.v[i] = p), (e.c1[i] = db - df);
        else (e.u[i] = p), (e.v[i] = T), (e.c1[i] = df - db);
        e.c2[i] = 0;
        void m;
      }
    }
    const side = gcMinCut(N, S, T, e);
    let changed = 0;
    for (let p = 0; p < N; p++) {
      const v = side[p] >= 0 ? 1 : 0;
      if (v !== cur[p]) changed++;
      cur[p] = v;
    }
    if (changed < N * 0.002) break;
  }
  // garde le plus grand bloc de sujet (et ceux qui font au moins 8 % de sa taille)
  const lab = new Int32Array(N).fill(-1);
  const sizes = [];
  const st = [];
  for (let s0 = 0; s0 < N; s0++) {
    if (!cur[s0] || lab[s0] >= 0) continue;
    const id = sizes.length;
    let n = 0;
    lab[s0] = id;
    st.push(s0);
    while (st.length) {
      const p = st.pop();
      n++;
      const x = p % sw;
      if (x > 0 && cur[p - 1] && lab[p - 1] < 0) (lab[p - 1] = id), st.push(p - 1);
      if (x < sw - 1 && cur[p + 1] && lab[p + 1] < 0) (lab[p + 1] = id), st.push(p + 1);
      if (p >= sw && cur[p - sw] && lab[p - sw] < 0) (lab[p - sw] = id), st.push(p - sw);
      if (p < N - sw && cur[p + sw] && lab[p + sw] < 0) (lab[p + sw] = id), st.push(p + sw);
    }
    sizes.push(n);
  }
  if (!sizes.length) return null;
  const big = Math.max(...sizes);
  for (let p = 0; p < N; p++) if (cur[p] && !keep[p] && sizes[lab[p]] < big * 0.08) cur[p] = 0;
  // masque réduit → pleine résolution (interpolation bilinéaire), puis affinage du contour par les modèles de couleur
  const mc = document.createElement("canvas");
  mc.width = sw;
  mc.height = sh;
  const mg = mc.getContext("2d");
  const mi = mg.createImageData(sw, sh);
  for (let p = 0; p < N; p++) (mi.data[p * 4] = mi.data[p * 4 + 1] = mi.data[p * 4 + 2] = 255), (mi.data[p * 4 + 3] = cur[p] ? 255 : 0);
  mg.putImageData(mi, 0, 0);
  const big2 = document.createElement("canvas");
  big2.width = w;
  big2.height = h;
  const bg2 = big2.getContext("2d", { willReadFrequently: true });
  bg2.imageSmoothingEnabled = true;
  bg2.imageSmoothingQuality = "high";
  bg2.drawImage(mc, 0, 0, w, h);
  const soft = bg2.getImageData(0, 0, w, h).data;
  const full = document.createElement("canvas");
  full.width = w;
  full.height = h;
  const fg2 = full.getContext("2d", { willReadFrequently: true });
  fg2.drawImage(src, 0, 0);
  const col = fg2.getImageData(0, 0, w, h).data;
  const alpha = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const m = soft[p * 4 + 3] / 255;
    let a;
    if (m < 0.03) a = 0;
    else if (m > 0.97) a = 1;
    else {
      const r = col[p * 4], g = col[p * 4 + 1], b = col[p * 4 + 2];
      const pf = 1 / (1 + Math.exp(Math.max(-30, Math.min(30, gcCost(fgM, r, g, b) - gcCost(bgM, r, g, b)))));
      const t = Math.min(1, Math.max(0, (pf - 0.25) / 0.5));
      a = 0.4 * m + 0.6 * t * t * (3 - 2 * t);
    }
    alpha[p] = Math.round(a * 255 * (col[p * 4 + 3] / 255));
  }
  return alpha;
}
