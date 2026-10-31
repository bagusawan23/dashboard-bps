/* Peta Ekonomi Indonesia — dashboard isometrik 3D (Three.js).
   Beranda: 38 provinsi diekstrusi menurut PDRB. Diorama: 17 lapangan usaha per provinsi. */
import * as THREE from 'three';
import { SCENES } from './scenes.js';

const CFG = window.PDRB_CONFIG || {};
const $ = (id) => document.getElementById(id);
const KEY = '2025_konstan', LALU = '2024_konstan', BERLAKU = '2025_berlaku', BERLAKU0 = '2024_berlaku';
const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nf0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => nf1.format(v) + '%';
const sgn = (v) => (v >= 0 ? '+' : '−') + nf1.format(Math.abs(v)) + '%';
const pp = (v) => (v >= 0 ? '+' : '−') + nf2.format(Math.abs(v)) + ' poin';
const tril = (miliar) => { const t = miliar / 1000; return (t >= 100 ? nf0.format(t) : nf1.format(t)) + ' T'; };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Tema / palet ---------- */
let PAL;
function readPal() {
  const cs = getComputedStyle(document.documentElement), g = (n) => cs.getPropertyValue(n).trim();
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';
  PAL = {
    dark, ramp: [0, 1, 2, 3, 4, 5].map((i) => new THREE.Color(g('--b' + i))), css: [0, 1, 2, 3, 4, 5].map((i) => g('--b' + i)),
    nodata: new THREE.Color(g('--nodata')), accent: new THREE.Color(g('--accent')), accent2: new THREE.Color(g('--accent2')),
    neg: new THREE.Color(dark ? '#f0816b' : '#c2412b'), negCss: dark ? '#f0816b' : '#c2412b',
    island: new THREE.Color(dark ? '#26394b' : '#d9e2ec'), plat: new THREE.Color(dark ? '#16202c' : '#ffffff'),
    platSide: new THREE.Color(dark ? '#0f1822' : '#cfd8e3'), tile: new THREE.Color(dark ? '#1b2a39' : '#eef2f7')
  };
}
readPal();

/* ---------- Three: panggung ---------- */
const canvas = $('kanvas'), stage = $('panggung');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
const hemi = new THREE.HemisphereLight(0xffffff, 0x5a6a7a, .85), sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(-300, 700, 350); scene.add(hemi, sun);
const FH0 = 700; let SW = 1440, SH = 900;
function resize() {
  SW = stage.clientWidth || 1440; SH = stage.clientHeight || 900;
  renderer.setSize(SW, SH, false);
  const a = SW / SH; cam.left = -FH0 * a / 2; cam.right = FH0 * a / 2; cam.top = FH0 / 2; cam.bottom = -FH0 / 2; cam.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

/* ---------- Data & ukuran ---------- */
const S = { data: null, fase: 'intro', hover: null, pilih: null, warna: 'tumbuh', lensa: 'porsi', sektor: null, hsek: null, e: 0, dir: 0, t0: 0, uYaw: 0, uPitch: 0 };
let PR = [], DIO = null, NAS = null, RANK = {};

function ukur(p) {
  const d = S.data, nas = d.nasional.sektor[KEY], ntb = nas.reduce((a, b) => a + b, 0);
  const t25 = p.pdrb[KEY], t24 = p.pdrb[LALU], tb = p.pdrb[BERLAKU], tb0 = p.pdrb[BERLAKU0];
  const defl = (b1, k1, b0, k0) => ((b1 / k1) / (b0 / k0) - 1) * 100;
  return {
    t25, t24, tb, g: (t25 / t24 - 1) * 100, infl: defl(tb, t25, tb0, t24),
    sek: d.sektor.map((s, i) => {
      const v = p.sektor[KEY][i], v0 = p.sektor[LALU][i], vb = p.sektor[BERLAKU][i], vb0 = p.sektor[BERLAKU0][i];
      return Object.assign({ i, v, v0, porsi: v / t25 * 100, g: v0 ? (v / v0 - 1) * 100 : 0, sumb: (v - v0) / t24 * 100, lq: (v / t25) / (nas[i] / ntb), infl: v0 && vb0 ? defl(vb, v, vb0, v0) : 0 }, s);
    })
  };
}

/* ---------- Lensa diorama ---------- */
const LENSA = {
  porsi: { label: 'Porsi', kolom: 'nilai · porsi PDRB', m: (s) => s.porsi, teks: (s) => tril(s.v) + ' · ' + pct(s.porsi),
    jelas: 'Luas petak = porsi PDRB (sektor yang sangat kecil diperbesar sedikit agar tetap terlihat). Warna = besar porsi.',
    kelas: (s) => (s.porsi < 1.5 ? 0 : s.porsi < 4 ? 1 : s.porsi < 10 ? 2 : s.porsi < 22 ? 3 : 4),
    leg: [['< 1,5%', 0], ['1,5–4%', 1], ['4–10%', 2], ['10–22%', 3], ['≥ 22%', 4]] },
  tumbuh: { label: 'Tumbuh', kolom: 'tumbuh riil 2024→2025', m: (s) => s.g, teks: (s) => sgn(s.g), lesu: true,
    jelas: 'Laju riil tiap sektor (harga konstan 2010). Sektor yang menyusut: adegannya melambat.',
    kelas: (s) => (s.g < 0 ? -1 : s.g < 3 ? 0 : s.g < 6 ? 1 : s.g < 10 ? 2 : 3),
    leg: [['menyusut', -1], ['0–3%', 0], ['3–6%', 1], ['6–10%', 2], ['≥ 10%', 3]] },
  sumber: { label: 'Sumber tumbuh', kolom: 'sumbangan ke pertumbuhan', m: (s) => s.sumb, teks: (s) => pp(s.sumb), lesu: true,
    jelas: 'Sumbangan tiap sektor ke pertumbuhan provinsi, dalam poin persen. Jumlah semua sektor = laju provinsi.',
    kelas: (s) => (s.sumb < 0 ? -1 : s.sumb < .1 ? 0 : s.sumb < .5 ? 1 : s.sumb < 1 ? 2 : 3),
    leg: [['menekan', -1], ['< 0,1', 0], ['0,1–0,5', 1], ['0,5–1', 2], ['≥ 1 poin', 3]] },
  spesial: { label: 'Spesialisasi', kolom: 'LQ vs nasional', m: (s) => s.lq, teks: (s) => 'LQ ' + nf2.format(s.lq),
    jelas: 'Location quotient: porsi sektor di provinsi dibanding porsinya di PDB nasional. LQ > 1 = lebih menonjol dari rata-rata nasional.',
    kelas: (s) => (s.lq < .5 ? 0 : s.lq < 1 ? 1 : s.lq < 2 ? 2 : 3),
    leg: [['< 0,5', 0], ['0,5–1', 1], ['1–2', 2], ['≥ 2', 3]] },
  harga: { label: 'Harga', kolom: 'kenaikan harga 2025 vs 2024', m: (s) => s.infl, teks: (s) => sgn(s.infl), lesu: true,
    jelas: 'Kenaikan harga hasil produksi tiap sektor (deflator implisit). Bukan inflasi belanja rumah tangga (IHK).',
    kelas: (s) => (s.infl < 0 ? -1 : s.infl < 1.5 ? 0 : s.infl < 3 ? 1 : s.infl < 5 ? 2 : 3),
    leg: [['turun', -1], ['0–1,5%', 0], ['1,5–3%', 1], ['3–5%', 2], ['≥ 5%', 3]] }
};
const RAMP_IDX = [1, 2, 3, 4, 5];
const clsColor = (c) => (c < 0 ? PAL.neg : PAL.ramp[RAMP_IDX[c]]);
const clsCss = (c) => (c < 0 ? PAL.negCss : PAL.css[RAMP_IDX[c]]);

/* ---------- Beranda: provinsi 3D ---------- */
const world = new THREE.Group(); scene.add(world);
const HMAX = 78, PW = 560, PD = 330, TILE_H = 2;
const DOMPAL = ['#4fd1c5', '#f6b73c', '#e4572e', '#3b9dde', '#b04a8f', '#8bc34a', '#9c8cff', '#ff8fab'];
function bangunPeta() {
  const d = S.data, vmax = Math.max.apply(null, d.provinsi.map((p) => p.pdrb[KEY]));
  const gs = d.provinsi.map((p) => (p.pdrb[KEY] / p.pdrb[LALU] - 1) * 100);
  const sorted = gs.slice().sort((a, b) => a - b);
  S.gBins = [0, 1, 2, 3, 4, 5].map((b) => { const lo = sorted[Math.floor(b * sorted.length / 6)], hi = sorted[Math.min(sorted.length - 1, Math.floor((b + 1) * sorted.length / 6) - 1)]; return [lo, hi]; });
  const rank = d.provinsi.map((p, i) => i).sort((a, b) => d.provinsi[b].pdrb[KEY] - d.provinsi[a].pdrb[KEY]);
  rank.forEach((i, r) => { RANK[d.provinsi[i].nama] = r + 1; });
  const domCount = {};
  PR = d.provinsi.map((p, i) => {
    const u = ukur(p), dom = u.sek.slice().sort((a, b) => b.v - a.v)[0];
    domCount[dom.i] = (domCount[dom.i] || 0) + 1;
    const shapes = p.rings.map((r) => new THREE.Shape(r.split(' ').map((pt) => { const q = pt.split(','); return new THREE.Vector2(+q[0], -(+q[1])); })));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    const top = new THREE.MeshLambertMaterial({ transparent: true }), side = new THREE.MeshLambertMaterial({ transparent: true });
    const mesh = new THREE.Mesh(geo, [top, side]); mesh.userData.i = i; world.add(mesh);
    const bin = gs[i] <= S.gBins[0][1] ? 0 : S.gBins.findIndex((b) => gs[i] >= b[0] && gs[i] <= b[1]);
    const pts = p.rings.map((r) => r.split(' ').map((q) => q.split(',').map(Number))), fl = [].concat.apply([], pts);
    const x0 = Math.min.apply(null, fl.map((q) => q[0])), x1 = Math.max.apply(null, fl.map((q) => q[0])), y0 = Math.min.apply(null, fl.map((q) => q[1])), y1 = Math.max.apply(null, fl.map((q) => q[1]));
    const bc = [(x0 + x1) / 2, (y0 + y1) / 2], fit = clamp(Math.min(PW * 1.25 / Math.max(x1 - x0, 1), PD * 1.4 / Math.max(y1 - y0, 1)), .8, 40);
    return { p, i, mesh, top, side, u, bc, fit, pts, g: gs[i], bin: Math.max(0, bin), dom: dom.i, h: 5 + HMAX * Math.pow(p.pdrb[KEY] / vmax, .6), hov: 0, rank: RANK[p.nama] };
  });
  const doms = Object.keys(domCount).sort((a, b) => domCount[b] - domCount[a]);
  S.domMap = {}; doms.forEach((k, n) => { S.domMap[k] = DOMPAL[Math.min(n, DOMPAL.length - 1)]; });
  warnaPeta();
}
function warnaPeta() {
  PR.forEach((P) => {
    let c = S.warna === 'tumbuh' ? PAL.ramp[P.bin] : new THREE.Color(S.domMap[P.dom]);
    if (S.warna === 'tumbuh' && P.bin === 0) c = PAL.ramp[1].clone().lerp(PAL.ramp[0], .5);
    P.cTop = c.clone(); P.cSide = c.clone().multiplyScalar(PAL.dark ? .55 : .78);
    P.top.color.copy(P.cTop); P.side.color.copy(P.cSide);
  });
}

/* ---------- UI beranda ---------- */
function renderBeranda() {
  const d = S.data, n = d.nasional.pdb;
  NAS = (n[KEY] / n[LALU] - 1) * 100;
  $('nas-teks').textContent = sgn(NAS);
  const top = PR.slice().sort((a, b) => a.rank - b.rank).slice(0, 5), mx = top[0].p.pdrb[KEY];
  $('top5').innerHTML = top.map((P) => '<button class="t5" type="button" data-prov="' + esc(P.p.nama) + '"><span class="no">' + P.rank + '</span><span class="nm">' + esc(P.p.nama) +
    '</span><span class="vl num">' + tril(P.p.pdrb[KEY]) + '</span><span class="gr num ' + (P.g >= NAS ? 'up' : 'dn') + '">' + sgn(P.g) + '</span><span class="br"><i style="width:' + (P.p.pdrb[KEY] / mx * 100).toFixed(1) + '%"></i></span></button>').join('');
  renderLegendaPeta(); renderTerpilih();
}
function renderLegendaPeta() {
  $('warna').innerHTML = [['tumbuh', 'Pertumbuhan'], ['dominan', 'Sektor dominan']].map((a) => '<button type="button" data-warna="' + a[0] + '" aria-pressed="' + (S.warna === a[0]) + '">' + a[1] + '</button>').join('');
  if (S.warna === 'tumbuh') {
    $('legenda-peta').innerHTML = S.gBins.map((b, i) => '<span><i style="background:' + (i === 0 ? '#' + PAL.ramp[1].clone().lerp(PAL.ramp[0], .5).getHexString() : PAL.css[i]) + '"></i>' + nf1.format(b[0]) + '–' + nf1.format(b[1]) + '%</span>').join('') + '<span class="kecil">tumbuh riil 2025 vs 2024 · 6 kelompok kuantil</span>';
  } else {
    const used = {}; PR.forEach((P) => { used[P.dom] = true; });
    $('legenda-peta').innerHTML = Object.keys(used).map((k) => '<span><i style="background:' + S.domMap[k] + '"></i>' + esc(S.data.sektor[k].nama) + '</span>').join('');
  }
}
function renderTerpilih() {
  const P = PR.filter((x) => x.p.nama === (S.hover || S.pilih))[0], el = $('terpilih');
  if (!P) { el.innerHTML = '<p class="kecil">Arahkan kursor ke sebuah provinsi, lalu klik untuk membuka dioramanya.</p>'; return; }
  const dom = P.u.sek.slice().sort((a, b) => b.v - a.v).slice(0, 3);
  el.innerHTML = '<div class="kepala"><h2>' + esc(P.p.nama) + '</h2><span class="kecil">peringkat ' + P.rank + ' dari ' + PR.length + '</span></div>' +
    '<div class="stat3"><div><span class="kecil">PDRB 2025</span><b class="num">' + tril(P.p.pdrb[KEY]) + '</b></div><div><span class="kecil">Tumbuh riil</span><b class="num ' + (P.g >= NAS ? 'up' : 'dn') + '">' + sgn(P.g) + '</b></div><div><span class="kecil">Porsi PDB</span><b class="num">' + pct(P.p.pdrb[KEY] / S.data.nasional.pdb[KEY] * 100) + '</b></div></div>' +
    '<p class="kecil" style="margin:8px 0 6px">Sektor terbesar</p>' + dom.map((s) => '<div class="mini"><span>' + esc(s.nama) + '</span><b class="num">' + pct(s.porsi) + '</b></div>').join('') +
    '<button class="btn primary" type="button" data-prov="' + esc(P.p.nama) + '">Buka diorama →</button>';
}

/* ---------- Diorama ---------- */
function squarify(items, x, y, w, h) {
  const out = []; let rest = items.slice();
  const worst = (row, side) => { let s = 0, mx = 0, mn = 1e18; row.forEach((r) => { s += r.a; mx = Math.max(mx, r.a); mn = Math.min(mn, r.a); }); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); };
  while (rest.length) {
    const side = Math.min(w, h); let row = [], best = 1e18;
    while (rest.length) { const c = row.concat([rest[0]]), wr = worst(c, side); if (row.length && wr > best) break; row = c; best = wr; rest.shift(); }
    const s = row.reduce((t, r) => t + r.a, 0);
    if (w >= h) { const cw = s / h; let cy = y; row.forEach((r) => { const ih = r.a / cw; out.push({ it: r, x, y: cy, w: cw, h: ih }); cy += ih; }); x += cw; w -= cw; }
    else { const rh = s / w; let cx = x; row.forEach((r) => { const iw = r.a / rh; out.push({ it: r, x: cx, y, w: iw, h: rh }); cx += iw; }); y += rh; h -= rh; }
  }
  return out;
}
function buangDio() {
  if (!DIO) return;
  world.remove(DIO.group); DIO.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  $('label').innerHTML = ''; DIO = null;
}
function inPoly(rings, x, z) {
  let c = false;
  for (let r = 0; r < rings.length; r++) {
    const q = rings[r];
    for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
      if ((q[i][1] > z) !== (q[j][1] > z) && x < (q[j][0] - q[i][0]) * (z - q[i][1]) / (q[j][1] - q[i][1]) + q[i][0]) c = !c;
    }
  }
  return c;
}
/* Bagi himpunan sel kisi menjadi wilayah per sektor (bisect rekursif, luas sebanding bobot). */
function bagi(idx, items, cells, out) {
  if (items.length === 1) { out[items[0].n] = idx; return; }
  const tot = items.reduce((t, r) => t + r.a, 0); let acc = 0, cut = 1, best = 1e18;
  for (let i = 0; i < items.length - 1; i++) { acc += items[i].a; const d = Math.abs(acc - tot / 2); if (d < best) { best = d; cut = i + 1; } }
  const A = items.slice(0, cut), B = items.slice(cut), sa = A.reduce((t, r) => t + r.a, 0);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  idx.forEach((i) => { const c = cells[i]; x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); z0 = Math.min(z0, c.z); z1 = Math.max(z1, c.z); });
  const ax = x1 - x0 >= z1 - z0 ? 'x' : 'z', sorted = idx.slice().sort((p, q) => cells[p][ax] - cells[q][ax] || cells[p][ax === 'x' ? 'z' : 'x'] - cells[q][ax === 'x' ? 'z' : 'x']);
  const nA = clamp(Math.round(sorted.length * sa / tot), A.length, sorted.length - B.length);
  bagi(sorted.slice(0, nA), A, cells, out); bagi(sorted.slice(nA), B, cells, out);
}
function bangunDio(P) {
  buangDio();
  const u = P.u, group = new THREE.Group(), f = P.fit; group.position.set(P.bc[0], 0, P.bc[1]);
  // kontur provinsi, diperbesar sekitar pusatnya
  const rings = P.pts.map((r) => r.map((q) => [(q[0] - P.bc[0]) * f, (q[1] - P.bc[1]) * f]));
  const shapes = rings.map((r) => new THREE.Shape(r.map((q) => new THREE.Vector2(q[0], -q[1]))));
  const mk = (depth, y, mat, grow) => { const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mat); m.position.y = y; if (grow) m.scale.set(grow, 1, grow); return m; };
  const base = mk(14, -16, new THREE.MeshLambertMaterial({ color: PAL.platSide })), plat = mk(2, -2, new THREE.MeshLambertMaterial({ color: PAL.plat }));
  group.add(base, plat);
  // kisi sel di dalam kontur
  let xa = 1e9, xb = -1e9, za = 1e9, zb = -1e9;
  rings.forEach((r) => r.forEach((q) => { xa = Math.min(xa, q[0]); xb = Math.max(xb, q[0]); za = Math.min(za, q[1]); zb = Math.max(zb, q[1]); }));
  const build = (c) => { const out = []; for (let x = xa + c / 2; x < xb; x += c) for (let z = za + c / 2; z < zb; z += c) if (inPoly(rings, x, z)) out.push({ x, z }); return out; };
  let c = Math.sqrt((xb - xa) * (zb - za) / 2600), cells = build(c);
  c *= Math.sqrt(Math.max(cells.length, 1) / 1500); cells = build(c);
  const rows = u.sek.slice().sort((a, b) => b.v - a.v).map((s, n) => ({ s, n, a: Math.pow(Math.max(s.v, u.t25 * .004), .78) }));
  const assign = []; bagi(cells.map((_, i) => i), rows, cells, assign);
  const owner = new Array(cells.length).fill(-1); assign.forEach((arr, n) => arr.forEach((i) => { owner[i] = n; }));
  const key = (x, z) => Math.round((x - xa) / c) + ',' + Math.round((z - za) / c), map = {}; cells.forEach((q, i) => { map[key(q.x, q.z)] = owner[i]; });
  const plots = [], pick = [], dum = new THREE.Object3D(), geo = new THREE.BoxGeometry(1, TILE_H, 1);
  rows.forEach((r, n) => {
    const idx = assign[n] || [], s = r.s; if (!idx.length) return;
    const tile = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: PAL.tile, emissive: 0x000000 }), idx.length);
    let sx = 0, sz = 0, mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
    idx.forEach((i, m) => {
      const q = cells[i], nb = [[c, 0], [-c, 0], [0, c], [0, -c]].some((d) => map[key(q.x + d[0], q.z + d[1])] !== n), sc = c * (nb ? .8 : 1.02);
      dum.position.set(q.x, TILE_H / 2, q.z); dum.scale.set(sc, 1, sc); dum.updateMatrix(); tile.setMatrixAt(m, dum.matrix);
      sx += q.x; sz += q.z; mnx = Math.min(mnx, q.x); mxx = Math.max(mxx, q.x); mnz = Math.min(mnz, q.z); mxz = Math.max(mxz, q.z);
    });
    tile.userData.kode = s.kode; group.add(tile); pick.push(tile);
    const mx = sx / idx.length, mz = sz / idx.length; let bi = idx[0], bd = 1e18;
    idx.forEach((i) => { const d = (cells[i].x - mx) ** 2 + (cells[i].z - mz) ** 2; if (d < bd) { bd = d; bi = i; } });
    const cx = cells[bi].x, cz = cells[bi].z, w = mxx - mnx + c, dd = mxz - mnz + c;
    const k = Math.max(c * 1.5, Math.min(Math.sqrt(idx.length) * c * .8, Math.min(w, dd) * .95));
    const sc = new THREE.Group(); sc.position.set(cx, TILE_H, cz); sc.userData.kode = s.kode; group.add(sc); pick.push(sc);
    const inner = new THREE.Group(); inner.scale.setScalar(k); sc.add(inner);
    const upd = (SCENES[s.ikon] || SCENES.taman)(inner);
    const lab = document.createElement('div'); lab.className = 'lab'; lab.innerHTML = '<b>' + esc(s.kode.replace(/,/g, '')) + '</b><span>' + esc(s.nama) + '</span>'; $('label').appendChild(lab);
    plots.push({ s, tile, sc, inner, upd, w: Math.min(w, Math.sqrt(idx.length) * c * 1.6), d: dd, cx, cz, lab, k, delay: n * .014, hl: 0, vig: 1 });
  });
  world.add(group); DIO = { group, plots, pick, plat, base, P, u, fit: f };
  warnaiDio();
}
function warnaiDio() {
  if (!DIO) return;
  const L = LENSA[S.lensa];
  DIO.plat.material.color.copy(PAL.plat); DIO.base.material.color.copy(PAL.platSide);
  DIO.plots.forEach((p) => { const c = L.kelas(p.s); p.tile.material.color.copy(clsColor(c)); p.cls = c; p.vigT = L.lesu && p.s.m !== undefined ? 1 : 1; p.vigT = L.lesu ? (L.m(p.s) < 0 ? .22 : 1) : 1; });
}
function kodeDari(obj) { while (obj) { if (obj.userData && obj.userData.kode) return obj.userData.kode; obj = obj.parent; } return null; }

function renderDioUI() {
  const P = DIO.P, u = P.u, L = LENSA[S.lensa];
  $('dio-nama').textContent = P.p.nama;
  const dom = u.sek.slice().sort((a, b) => b.v - a.v)[0];
  $('dio-chips').innerHTML = [['PDRB', tril(P.p.pdrb[KEY])], ['Tumbuh riil', sgn(P.g)], ['Peringkat', P.rank + ' / ' + PR.length], ['Terbesar', dom.nama.split(' ')[0] + ' ' + pct(dom.porsi)]]
    .map((c) => '<span class="chip"><i>' + c[0] + '</i><b class="num">' + esc(c[1]) + '</b></span>').join('');
  $('lensa').innerHTML = Object.keys(LENSA).map((k) => '<button type="button" role="tab" data-lensa="' + k + '" aria-pressed="' + (S.lensa === k) + '">' + LENSA[k].label + '</button>').join('');
  $('jelas').textContent = L.jelas;
  $('legenda').innerHTML = L.leg.map((a) => '<span><i style="background:' + clsCss(a[1]) + '"></i>' + a[0] + '</span>').join('');
  $('kolom').textContent = L.kolom;
  const arr = u.sek.slice().sort((a, b) => L.m(b) - L.m(a)), mx = Math.max.apply(null, arr.map((s) => Math.abs(L.m(s)))) || 1;
  $('daftar').innerHTML = arr.map((s) => '<button type="button" class="srow' + (S.sektor === s.kode ? ' on' : '') + '" data-kode="' + esc(s.kode) + '"><i class="sw" style="background:' + clsCss(L.kelas(s)) + '"></i><span class="sn">' + esc(s.nama) + '</span><span class="sv num">' + L.teks(s) +
    '</span><span class="sb"><i style="width:' + (Math.abs(L.m(s)) / mx * 100).toFixed(1) + '%;background:' + clsCss(L.kelas(s)) + '"></i></span></button>').join('');
  renderSektorKartu();
}
function renderSektorKartu() {
  const el = $('sektor-kartu'), kode = S.sektor || S.hsek;
  if (!DIO || !kode) { el.hidden = true; return; }
  const s = DIO.u.sek.filter((x) => x.kode === kode)[0]; if (!s) { el.hidden = true; return; }
  const rk = DIO.u.sek.slice().sort((a, b) => b.v - a.v).findIndex((x) => x.kode === kode) + 1;
  el.hidden = false;
  el.innerHTML = '<div class="kepala"><h2>' + esc(s.nama) + '</h2><span class="kecil">sektor ' + esc(s.kode) + ' · urutan ' + rk + ' dari 17</span></div><div class="stat2">' +
    [['Nilai', tril(s.v)], ['Porsi PDRB', pct(s.porsi)], ['Tumbuh riil', sgn(s.g)], ['Sumber tumbuh', pp(s.sumb)], ['Spesialisasi', 'LQ ' + nf2.format(s.lq)], ['Kenaikan harga', sgn(s.infl)]].map((a) => '<div><span class="kecil">' + a[0] + '</span><b class="num">' + a[1] + '</b></div>').join('') + '</div>';
}

/* ---------- Kamera & transisi ---------- */
function camTarget() {
  const a = SW / SH, wide = SW > 1000;
  const zP = Math.min(a * FH0 / 1100, FH0 / 540) * .8;
  const sel = PR.filter((x) => x.p.nama === S.pilih)[0], pw = wide ? SW - 400 : SW - 30;
  const zD = Math.min(pw * FH0 / (790 * SH), (SH - (wide ? 230 : 330)) * FH0 / (540 * SH));
  const peta = { tx: 500, tz: 205, zoom: zP, yaw: 30, pitch: 50, shiftPx: 0 };
  const dio = { tx: sel ? sel.bc[0] : 500, tz: sel ? sel.bc[1] : 200, zoom: zD, yaw: 32, pitch: 46, shiftPx: wide ? 150 : 0 };
  return [peta, dio];
}
function aturKamera(E) {
  const [a, b] = camTarget(), g = (k) => lerp(a[k], b[k], E);
  const yaw = (g('yaw') + S.uYaw) * Math.PI / 180, pitch = clamp(g('pitch') + S.uPitch, 28, 72) * Math.PI / 180, z = g('zoom');
  const t = new THREE.Vector3(g('tx'), 0, g('tz')), dist = 1500;
  cam.zoom = z; cam.updateProjectionMatrix();
  cam.position.set(t.x + dist * Math.cos(pitch) * Math.sin(yaw), dist * Math.sin(pitch), t.z + dist * Math.cos(pitch) * Math.cos(yaw));
  cam.lookAt(t);
  const sh = g('shiftPx'); if (sh) cam.translateX(sh * (FH0 / SH) / z);
  cam.updateMatrixWorld();
  sun.position.set(t.x - 300, 700, t.z + 350); sun.target.position.copy(t); sun.target.updateMatrixWorld();
}
const DUR = RM ? 1 : 1500;
function masuk(nama, langsung) {
  if (S.fase === 'masuk' || S.fase === 'kembali') return;
  const P = PR.filter((x) => x.p.nama === nama)[0]; if (!P) return;
  S.pilih = nama; S.sektor = null; S.hsek = null; bangunDio(P); renderDioUI();
  S.fase = 'masuk'; S.dir = 1; S.tA = performance.now() - (langsung ? DUR : 0);
  $('balon').hidden = true;
  try { history.replaceState(null, '', '#' + encodeURIComponent(nama)); } catch (e) {}
  $('peta').classList.add('keluar'); $('dio').hidden = false; $('dio').classList.remove('masuk-ui');
}
function kembali() {
  if (S.fase !== 'dio') return;
  S.fase = 'kembali'; S.dir = -1; S.tA = performance.now(); $('dio').classList.add('keluar'); S.sektor = null;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  $('peta').classList.remove('keluar'); renderTerpilih();
}

/* ---------- Frame ---------- */
const clock = { t: performance.now(), getDelta() { const n = performance.now(), d = (n - this.t) / 1000; this.t = n; return d; } }; let tAnim = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05); tAnim += dt;
  // progres transisi
  if (S.fase === 'masuk' || S.fase === 'kembali') {
    const p = clamp((now - S.tA) / DUR, 0, 1); S.e = S.dir > 0 ? p : 1 - p;
    S.uYaw *= .9; S.uPitch *= .9;
    if (p >= 1) { if (S.fase === 'masuk') { S.fase = 'dio'; S.e = 1; $('dio').classList.add('masuk-ui'); } else { S.fase = 'peta'; S.e = 0; $('dio').hidden = true; buangDio(); } }
  }
  const E = ease(S.e);
  aturKamera(E);
  // provinsi
  const intro = S.fase === 'intro' ? clamp((now - S.t0) / 1800, 0, 1) : 1;
  if (S.fase === 'intro' && intro >= 1) S.fase = 'peta';
  PR.forEach((P, idx) => {
    const ip = RM ? 1 : ease(clamp(intro * 1.7 - (idx / PR.length) * .7, 0, 1));
    const isSel = P.p.nama === S.pilih;
    P.hov += ((S.hover === P.p.nama && S.fase === 'peta' ? 1 : 0) - P.hov) * Math.min(1, dt * 12);
    let h = P.h * ip + P.hov * 7, op = 1, off = 0;
    if (E > 0) {
      if (isSel) { const k = ease(clamp(E / .6, 0, 1)); h = lerp(h, 1.2, k); op = 1 - ease(clamp((E - .72) / .28, 0, 1)); P.top.color.copy(P.cTop).lerp(PAL.island, k); P.side.color.copy(P.cSide).lerp(PAL.island, k); }
      else { h = h * (1 - ease(clamp(E / .5, 0, 1))); }
    } else { P.top.color.copy(P.cTop); P.side.color.copy(P.cSide); }
    if (S.fase === 'peta' && S.hover === P.p.nama) P.top.color.copy(P.cTop).lerp(PAL.accent2, .38);
    else if (S.fase === 'peta' && S.pilih === P.p.nama) P.top.color.copy(P.cTop).lerp(PAL.accent2, .2);
    P.mesh.scale.y = Math.max(h, .001); P.mesh.visible = h > .05 && op > .01;
    P.top.opacity = P.side.opacity = op;
  });
  // diorama
  if (DIO) {
    const gs = lerp(1 / DIO.fit, 1, ease(clamp((E - .3) / .5, 0, 1)));
    DIO.group.visible = E > .3; DIO.group.scale.set(gs, ease(clamp((E - .3) / .4, 0, 1)) || .001, gs);
    const showLab = S.fase === 'dio';
    DIO.plots.forEach((p) => {
      const grow = RM ? 1 : ease(clamp((E - .6 - p.delay) / .3, 0, 1)), on = S.sektor === p.s.kode, hv = S.hsek === p.s.kode;
      p.hl += ((on || hv ? 1 : 0) - p.hl) * Math.min(1, dt * 10);
      p.sc.scale.set(1, Math.max(grow, .001), 1); p.sc.visible = grow > .01;
      p.inner.scale.setScalar(p.k * (1 + p.hl * .08));
      p.vig = lerp(p.vig, p.vigT, Math.min(1, dt * 3));
      if (p.upd && !RM) p.upd(tAnim, p.vig);
      p.tile.material.emissive.setRGB(p.hl * .16, p.hl * .16, p.hl * .1);
      if (showLab) placeLabel(p); else p.lab.style.display = 'none';
    });
  }
  renderer.render(scene, cam);
  if (S.fase === 'peta' && $('balon') && !$('balon').hidden) { /* posisi diikuti pointer */ }
}
const _v = new THREE.Vector3();
function placeLabel(p) {
  _v.set(p.cx, TILE_H + p.k * .18, p.cz); DIO.group.localToWorld(_v); _v.project(cam);
  const x = (_v.x + 1) / 2 * SW, y = (1 - _v.y) / 2 * SH, pxw = p.w * (SH * cam.zoom / FH0) * .85;
  const el = p.lab;
  if (pxw < 30) { el.style.display = 'none'; return; }
  el.style.display = ''; el.classList.toggle('kecil-lab', pxw < 96); el.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px) translate(-50%,-50%)';
  el.classList.toggle('on', S.sektor === p.s.kode || S.hsek === p.s.kode);
}

/* ---------- Interaksi ---------- */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
function cast(ev, objs, rec) {
  const r = canvas.getBoundingClientRect(); mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, cam); return ray.intersectObjects(objs, rec);
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, moved: false, yaw: S.uYaw, pitch: S.uPitch }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', (e) => {
  const was = drag; drag = null;
  if (!was || was.moved || S.fase === 'masuk' || S.fase === 'kembali') return;
  if (S.fase === 'peta') { const h = cast(e, PR.filter((P) => P.mesh.visible).map((P) => P.mesh), false); if (h.length) { const P = PR[h[0].object.userData.i]; if (S.pilih === P.p.nama && e.detail >= 1) masuk(P.p.nama); else { S.pilih = P.p.nama; renderTerpilih(); } } }
  else if (S.fase === 'dio') { const h = cast(e, DIO.pick, true); const k = h.length ? kodeDari(h[0].object) : null; pilihSektor(k && k === S.sektor ? null : k); }
});
canvas.addEventListener('pointermove', (e) => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (drag.moved && (S.fase === 'peta' || S.fase === 'dio')) { S.uYaw = clamp(drag.yaw - dx * .25, -40, 40); S.uPitch = clamp(drag.pitch + dy * .15, -16, 20); }
    return;
  }
  if (S.fase === 'peta') {
    const h = cast(e, PR.filter((P) => P.mesh.visible).map((P) => P.mesh), false), nm = h.length ? PR[h[0].object.userData.i].p.nama : null;
    if (nm !== S.hover) { S.hover = nm; renderTerpilih(); canvas.style.cursor = nm ? 'pointer' : 'grab'; }
    const b = $('balon');
    if (nm) { const P = PR[h[0].object.userData.i]; b.hidden = false; b.innerHTML = '<b>' + esc(nm) + '</b><br>' + tril(P.p.pdrb[KEY]) + ' · ' + sgn(P.g); b.style.transform = 'translate(' + (e.clientX - stage.getBoundingClientRect().left + 14) + 'px,' + (e.clientY - stage.getBoundingClientRect().top + 14) + 'px)'; } else b.hidden = true;
  } else if (S.fase === 'dio') {
    const h = cast(e, DIO.pick, true), k = h.length ? kodeDari(h[0].object) : null;
    if (k !== S.hsek) { S.hsek = k; renderSektorKartu(); canvas.style.cursor = k ? 'pointer' : 'grab'; }
  }
});
canvas.addEventListener('pointerleave', () => { if (!drag) { S.hover = null; S.hsek = null; $('balon').hidden = true; if (S.fase === 'peta') renderTerpilih(); else if (DIO) renderSektorKartu(); } });
function pilihSektor(k) { S.sektor = k; if (DIO) { document.querySelectorAll('.srow').forEach((r) => r.classList.toggle('on', r.getAttribute('data-kode') === k)); renderSektorKartu(); } }

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-prov],[data-warna],[data-lensa],[data-kode],#tbl-peta'); if (!t) return;
  if (t.id === 'tbl-peta') return kembali();
  if (t.hasAttribute('data-prov')) return masuk(t.getAttribute('data-prov'));
  if (t.hasAttribute('data-warna')) { S.warna = t.getAttribute('data-warna'); warnaPeta(); renderLegendaPeta(); return; }
  if (t.hasAttribute('data-lensa')) { S.lensa = t.getAttribute('data-lensa'); warnaiDio(); renderDioUI(); return; }
  if (t.hasAttribute('data-kode')) { const k = t.getAttribute('data-kode'); pilihSektor(S.sektor === k ? null : k); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') kembali(); });
document.addEventListener('themechange', () => { readPal(); warnaPeta(); renderLegendaPeta(); if (DIO) { warnaiDio(); renderDioUI(); } });

/* ---------- Boot ---------- */
fetch(CFG.dataUrl).then((r) => { if (!r.ok) throw new Error('Gagal memuat data (HTTP ' + r.status + ')'); return r.json(); }).then((d) => {
  S.data = d; resize(); bangunPeta(); renderBeranda();
  S.t0 = performance.now(); stage.classList.remove('memuat'); $('pesan').hidden = true;
  const h = decodeURIComponent((location.hash || '').slice(1));
  if (h && PR.some((P) => P.p.nama === h)) { S.fase = 'peta'; masuk(h, true); }
  requestAnimationFrame(frame);
}).catch((err) => { $('pesan').textContent = 'Data tidak dapat dimuat: ' + err.message; if (window.console) console.error(err); });
