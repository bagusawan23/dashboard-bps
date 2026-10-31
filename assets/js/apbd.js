/* Peta Belanja APBD — dashboard drill-down (nasional > provinsi > kab/kota).
   Skema data: lihat README.md. Tanpa dependensi, tanpa build step. */
(function () {
  'use strict';
  var CFG = window.APBD_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var D, GP, GK, usingDemo = false;

  /* ---------- Util ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(x, d) { return x.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function rp(v) {
    if (v == null || isNaN(v)) return '–';
    var m = v / 1e9, a = Math.abs(m);
    if (a >= 1000) { var t = m / 1000, at = Math.abs(t); return 'Rp ' + num(t, at >= 100 ? 0 : at >= 10 ? 1 : 2) + ' T'; }
    return 'Rp ' + num(m, a >= 100 ? 0 : 1) + ' M';
  }
  function pct(x) { return x == null || isNaN(x) ? '–' : num(x * 100, 1) + '%'; }
  function spct(x) { return x == null || isNaN(x) ? '–' : (x >= 0 ? '+' : '−') + num(Math.abs(x) * 100, 1) + '%'; }
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  function tipAttr(h) { return ' data-tip="' + esc(h) + '"'; }
  function kodeOf(l) { return String(l).split('.')[0].trim(); }
  function norm(s) { return String(s).toUpperCase().replace(/^KAB\.?\s+/, 'KABUPATEN ').replace(/[^A-Z0-9]/g, ''); }
  function shortKk(n) { return String(n).replace(/^Kabupaten /, 'Kab. '); }

  var JAWA = { 'DKI JAKARTA': 1, 'JAWA BARAT': 1, 'JAWA TENGAH': 1, 'DAERAH ISTIMEWA YOGYAKARTA': 1, 'JAWA TIMUR': 1, 'BANTEN': 1 };
  var PAPUA = { 'PAPUA': 1, 'PAPUA BARAT': 1, 'PAPUA TENGAH': 1, 'PAPUA PEGUNUNGAN': 1, 'PAPUA SELATAN': 1, 'PAPUA BARAT DAYA': 1 };
  var JENIS_SHORT = ['Pegawai', 'Barang & Jasa', 'Modal', 'Lainnya'];
  var F6 = ['01', '10', '07', '04', '06', '05'];

  /* ---------- State ---------- */
  var S = { p: null, k: null, scope: 'semua', lens: 'total', tab: 'rank', cmp: '', q: '' };
  var X = {}; // turunan data (indeks, label, dsb.)
  var cur;

  /* ---------- Lensa warna ---------- */
  function share(obj, label, T) { return T > 0 ? (obj[label] || 0) / T : null; }
  function yoyOf(o) {
    var a = o.tren[X.iY], b = o.tren[X.iP];
    return a > 0 && b > 0 ? a / b - 1 : null;
  }
  function buildLenses() {
    X.LENSES = [
      { key: 'total', label: 'Total belanja', fmt: rp, get: function (o) { return o.total > 0 ? o.total : null; } },
      { key: 'pend', label: 'Porsi pendidikan', fmt: pct, get: function (o) { return share(o.fungsi, X.L_PEND, o.total); } },
      { key: 'kes', label: 'Porsi kesehatan', fmt: pct, get: function (o) { return share(o.fungsi, X.L_KES, o.total); } },
      { key: 'peg', label: 'Porsi pegawai', fmt: pct, get: function (o) { return share(o.jenis, X.L_PEG, o.total); } },
      { key: 'mod', label: 'Porsi modal', fmt: pct, get: function (o) { return share(o.jenis, X.L_MOD, o.total); } },
      { key: 'yoy', label: 'Pertumbuhan', fmt: spct, get: function (o) { return o.total > 0 ? yoyOf(o) : null; } }
    ];
  }
  function lens() { return X.LENSES.filter(function (l) { return l.key === S.lens; })[0] || X.LENSES[0]; }

  /** Kuantil 6 kelompok atas nilai non-null → {bin:{key:i}, legend:[{c,lab}]}. */
  function quantile(entries, fmt) {
    var pos = entries.filter(function (e) { return e.v != null; }).sort(function (a, b) { return a.v - b.v; });
    var bin = {}, groups = [];
    pos.forEach(function (e, i) { var b = Math.floor(i * 6 / pos.length); bin[e.k] = b; (groups[b] = groups[b] || []).push(e.v); });
    var legend = [];
    groups.forEach(function (g, b) {
      if (!g) return;
      var lo = fmt(g[0]), hi = fmt(g[g.length - 1]);
      legend.push({ c: 'var(--b' + b + ')', lab: g.length > 1 && lo !== hi ? lo + ' – ' + hi : lo });
    });
    return { bin: bin, legend: legend };
  }

  /* ---------- Data & geometri ---------- */
  function validate(d) {
    ['years', 'fungsiList', 'jenisList', 'scopes', 'provinsi', 'kabkota', 'nasional', 'tahunTerbaru', 'tahunSebelumnya'].forEach(function (k) {
      if (d[k] == null) throw new Error('Skema data tidak sesuai: field "' + k + '" tidak ada.');
    });
  }
  function labelFor(list, kode) { return list.filter(function (l) { return kodeOf(l) === kode; })[0] || null; }

  var K = 100, X0 = 94, Y0 = 7;
  function geomPath(g) {
    var polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates, d = '', bb = [1e9, 1e9, -1e9, -1e9];
    polys.forEach(function (poly) {
      poly.forEach(function (ring) {
        var prev = '';
        ring.forEach(function (c) {
          var x = (c[0] - X0) * K, y = (Y0 - c[1]) * K, s = x.toFixed(1) + ' ' + y.toFixed(1);
          if (s === prev) return;
          d += (prev ? 'L' : 'M') + s; prev = s;
          if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (x > bb[2]) bb[2] = x; if (y > bb[3]) bb[3] = y;
        });
        d += 'Z';
      });
    });
    return { d: d, bb: bb };
  }
  function union(a, b) { return a ? [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])] : b.slice(); }

  function prepare() {
    var FL = D.fungsiList, JL = D.jenisList;
    X.YEARS = D.years; X.YEAR = D.tahunTerbaru; X.PREV = D.tahunSebelumnya;
    X.iY = X.YEARS.indexOf(X.YEAR); X.iP = X.YEARS.indexOf(X.PREV);
    X.L_PEND = labelFor(FL, '10'); X.L_KES = labelFor(FL, '07');
    X.L_PEG = labelFor(JL, '51'); X.L_MOD = labelFor(JL, '53');
    X.PK = Object.keys(D.provinsi).sort();
    X.KAB_BY_PROV = {}; X.PK.forEach(function (p) { X.KAB_BY_PROV[p] = []; });
    Object.keys(D.kabkota).sort().forEach(function (k) { (X.KAB_BY_PROV[D.kabkota[k].provinsi] || []).push(k); });
    X.N_KK = Object.keys(D.kabkota).length;
    buildLenses();

    // Provinsi: namaPeta == properties.PROVINSI
    var byPeta = {}; X.PK.forEach(function (k) { byPeta[D.provinsi[k].namaPeta] = k; });
    X.PROV_GEO = {}; X.FULL = null;
    GP.features.forEach(function (f) {
      var k = byPeta[f.properties.PROVINSI];
      if (!k || !f.geometry) return;
      X.PROV_GEO[k] = geomPath(f.geometry);
      X.FULL = union(X.FULL, X.PROV_GEO[k].bb);
    });
    // Kab/kota: dikelompokkan per provinsi, path dibangun saat provinsi pertama kali dibuka.
    var provByName = {}; X.PK.forEach(function (k) { provByName[D.provinsi[k].namaPeta.toUpperCase()] = k; });
    var geoToKode = {}; Object.keys(D.kabkota).forEach(function (k) { geoToKode[norm(D.kabkota[k].nama)] = k; });
    X.KAB_FEATS = {};
    GK.features.forEach(function (f) {
      if (!f.geometry) return;
      var kk = geoToKode[norm(f.properties.alt_name)] || null;
      var pp = kk ? D.kabkota[kk].provinsi : provByName[String(f.properties.prov_name).toUpperCase()];
      if (!pp) return;
      (X.KAB_FEATS[pp] = X.KAB_FEATS[pp] || []).push({ kk: kk, f: f });
    });
    X.KAB_BUILT = {}; X.KAB_GEO = {}; X.PROV_BB = {}; X.KAB_EL = {}; X.KAB_SHAPES = {};
  }

  function buildKab(p) {
    if (X.KAB_BUILT[p]) return;
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-g', p); g.style.display = 'none';
    var shapes = [], html = '';
    (X.KAB_FEATS[p] || []).forEach(function (o, i) {
      var gp = geomPath(o.f.geometry);
      X.PROV_BB[p] = union(X.PROV_BB[p], gp.bb);
      if (o.kk) X.KAB_GEO[o.kk] = gp;
      shapes.push({ kk: o.kk, name: o.f.properties.alt_name });
      html += '<path data-i="' + i + '"' + (o.kk ? ' data-kk="' + o.kk + '"' : '') + ' data-pp="' + p + '" d="' + gp.d + '"></path>';
    });
    g.innerHTML = html;
    g.querySelectorAll('path').forEach(function (el, i) { shapes[i].el = el; if (shapes[i].kk) X.KAB_EL[shapes[i].kk] = el; });
    $('gKab').appendChild(g);
    X.KAB_BUILT[p] = g; X.KAB_SHAPES[p] = shapes;
  }

  /* ---------- Akses data ---------- */
  function provObj(k) { return D.provinsi[k][S.scope]; }
  function live() {
    if (S.k) return D.kabkota[S.k];
    if (S.p) return provObj(S.p);
    return D.nasional[S.scope];
  }
  function showKk() { return !!S.p && S.scope !== 'provinsi' && X.KAB_BY_PROV[S.p].length > 0; }
  function nameOf(p, k) { return k ? shortKk(D.kabkota[k].nama) : p ? D.provinsi[p].nama : 'Nasional'; }

  /* ---------- Peta ---------- */
  var svg, vb, anim = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setVB(a) { vb = a; svg.setAttribute('viewBox', a.map(function (v) { return v.toFixed(1); }).join(' ')); }
  function padded(bb, minSize) {
    var w = bb[2] - bb[0], h = bb[3] - bb[1], pad = Math.max(w, h) * 0.05;
    var t = [bb[0] - pad, bb[1] - pad, w + 2 * pad, h + 2 * pad];
    if (minSize) {
      if (t[2] < minSize) { t[0] -= (minSize - t[2]) / 2; t[2] = minSize; }
      if (t[3] < minSize) { t[1] -= (minSize - t[3]) / 2; t[3] = minSize; }
    }
    return t;
  }
  function zoomTo(bb, minSize) {
    var t = padded(bb, minSize);
    var from = vb.slice(), t0 = performance.now(), dur = reduce ? 0 : 450;
    cancelAnimationFrame(anim);
    (function step(now) {
      var p = dur ? Math.max(0, Math.min(1, (now - t0) / dur)) : 1, e = 1 - Math.pow(1 - p, 3);
      setVB(from.map(function (v, i) { return v + (t[i] - v) * e; }));
      if (p < 1) anim = requestAnimationFrame(step);
    })(t0);
  }

  function go(p, k) {
    S.p = p || null; S.k = k || null;
    if (S.p) buildKab(S.p);
    render();
    if (!S.p) zoomTo(X.FULL);
    else if (S.k) zoomTo((X.KAB_GEO[S.k] || {}).bb || X.PROV_BB[S.p] || X.PROV_GEO[S.p].bb, 50);
    else zoomTo(X.PROV_BB[S.p] || X.PROV_GEO[S.p].bb, 150);
  }
  function back() { if (S.k) go(S.p); else if (S.p) go(null); }

  function currentRows() {
    var L = lens(), rows = [];
    if (!S.p) {
      X.PK.forEach(function (k) {
        var o = provObj(k); rows.push({ kind: 'p', code: k, name: D.provinsi[k].nama, o: o, v: L.get(o), pick: true });
      });
    } else if (showKk()) {
      if (S.scope === 'semua') {
        var pe = D.provinsi[S.p].provinsi; rows.push({ kind: 'pemprov', code: S.p, name: 'Pemprov ' + D.provinsi[S.p].nama, o: pe, v: L.get(pe), pick: false });
      }
      X.KAB_BY_PROV[S.p].forEach(function (k) {
        var o = D.kabkota[k]; rows.push({ kind: 'k', code: k, name: shortKk(o.nama), o: o, v: L.get(o), pick: true });
      });
    }
    rows.sort(function (a, b) { return (b.v == null ? -Infinity : b.v) - (a.v == null ? -Infinity : a.v); });
    rows.forEach(function (r, i) { r.rank = r.v == null ? null : i + 1; });
    return rows;
  }

  function renderMap() {
    var L = lens(), sc = S.scope;
    var entries = X.PK.map(function (k) { return { k: k, v: L.get(provObj(k)) }; });
    var q = quantile(entries, L.fmt);
    var ranked = entries.filter(function (e) { return e.v != null; }).sort(function (a, b) { return b.v - a.v; });
    var legend = q.legend.slice();
    var hasKk = showKk();

    X.PK.forEach(function (k) {
      var el = X.PROV_EL[k]; if (!el) return;
      var v = L.get(provObj(k)), on = S.p === k;
      el.style.fill = v == null ? 'var(--nodata)' : 'var(--b' + q.bin[k] + ')';
      el.setAttribute('class', on ? (hasKk ? 'under' : 'sel') : S.p ? 'ctx' : '');
      var rk = ranked.findIndex(function (e) { return e.k === k; }) + 1;
      el.setAttribute('data-tip', '<b>' + esc(D.provinsi[k].nama) + '</b><br>' + L.label + ': ' + (v == null ? 'tanpa data' : L.fmt(v)) +
        (rk ? ' · peringkat ' + rk + '/' + ranked.length : '') + '<br><span class="m">' + (on ? 'klik lagi untuk kembali' : 'klik untuk membuka') + '</span>');
    });

    Object.keys(X.KAB_BUILT).forEach(function (p) { X.KAB_BUILT[p].style.display = hasKk && p === S.p ? '' : 'none'; });
    var nodataShape = false;
    if (hasKk) {
      var kabs = X.KAB_BY_PROV[S.p];
      var kq = quantile(kabs.map(function (k) { return { k: k, v: L.get(D.kabkota[k]) }; }), L.fmt);
      var rankedK = kabs.filter(function (k) { return L.get(D.kabkota[k]) != null; }).sort(function (a, b) { return L.get(D.kabkota[b]) - L.get(D.kabkota[a]); });
      X.KAB_SHAPES[S.p].forEach(function (o) {
        var el = o.el;
        if (!o.kk) {
          nodataShape = true; el.setAttribute('class', 'nd'); el.style.fill = S.k ? 'var(--dim)' : 'var(--nodata)';
          el.setAttribute('data-tip', '<b>' + esc(o.name.replace(/^KABUPATEN /, 'Kab. ').replace(/^KOTA /, 'Kota ')) + '</b><br>' +
            (D.provinsi[S.p].jumlahKabKota ? 'Tidak ada data APBD ' + X.YEAR : 'Wilayah administratif, tanpa APBD sendiri'));
          return;
        }
        var r = D.kabkota[o.kk], v = L.get(r), on = o.kk === S.k, rk = rankedK.indexOf(o.kk) + 1;
        el.setAttribute('class', on ? 'sel' : S.k ? 'ctx' : '');
        el.style.fill = v == null ? 'var(--nodata)' : 'var(--b' + kq.bin[o.kk] + ')';
        el.setAttribute('data-tip', '<b>' + esc(shortKk(r.nama)) + '</b><br>' + L.label + ': ' + (v == null ? 'tanpa data' : L.fmt(v)) +
          (rk ? ' · peringkat ' + rk + '/' + rankedK.length : '') + '<br><span class="m">' + rp(r.total) + ' · ' + (on ? 'klik lagi untuk kembali' : 'klik untuk membuka') + '</span>');
      });
      if (S.k && X.KAB_EL[S.k]) X.KAB_BUILT[S.p].appendChild(X.KAB_EL[S.k]);
      legend = kq.legend.slice();
      if (nodataShape) legend.push({ c: 'var(--nodata)', lab: 'Tanpa data' });
    } else {
      entries.forEach(function (e) { if (e.v == null) legend.push({ c: 'var(--nodata)', lab: D.provinsi[e.k].nama + ': tanpa data' }); });
    }
    $('legend').innerHTML = legend.map(function (l) { return '<span><i style="background:' + l.c + '"></i>' + esc(l.lab) + '</span>'; }).join('');

    var scopeName = D.scopes.filter(function (s) { return s.key === sc; })[0].label;
    $('mapTitle').textContent = L.label + ' · APBD ' + X.YEAR;
    $('mapSub').textContent = scopeName + ' · warna = 6 kelompok kuantil' +
      (S.k ? ' · ' + nameOf(S.p, S.k) + ' diperbesar' : S.p ? ' · ' + D.provinsi[S.p].nama + (hasKk ? ', kuantil di dalam provinsi' : '') : ' · klik provinsi untuk membuka');

    var dr = $('drill'); dr.hidden = !S.p;
    if (S.p) {
      var pn = D.provinsi[S.p].nama, o = live();
      dr.innerHTML = (S.k ? '<nav class="crumbs" aria-label="Tingkat wilayah"><button type="button" data-go="nat">Nasional</button><span>›</span><button type="button" data-go="prov">' + esc(pn) + '</button></nav>' : '') +
        '<div class="dn">' + esc(S.k ? shortKk(D.kabkota[S.k].nama) : pn) + '</div>' +
        '<div class="dl num">' + (o.total > 0 ? rp(o.total) : 'Rp 0') + ' · ' + (S.k ? 'APBD kab/kota sendiri' : esc(scopeName)) + '</div>' +
        '<button type="button" class="back" data-go="back">← ' + esc(S.k ? pn : 'Semua provinsi') + '</button>';
    }
    var miss = hasKk ? X.KAB_BY_PROV[S.p].filter(function (k) { return !X.KAB_GEO[k]; }).length : 0;
    $('kkNote').hidden = !miss;
    $('kkNote').textContent = miss ? miss + ' kab/kota belum punya batas wilayah di peta; tetap ada di tab Peringkat.' : '';
  }

  /* ---------- KPI ---------- */
  function spark(col, label) {
    var o = cur.o, k = o.trenKpi; if (!k || cur.empty) return '<div class="spark"></div>';
    var arr = k[col], pts = [];
    X.YEARS.forEach(function (yr, i) { if (yr >= cur.base && o.tren[i] > 0 && arr[i] > 0) pts.push({ yr: yr, v: arr[i] / o.tren[i] }); });
    if (pts.length < 2) return '<div class="spark"></div>';
    var W = 200, H = 34, vs = pts.map(function (p) { return p.v; }), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs), sp = hi - lo || 1;
    var xy = pts.map(function (p, i) { return [3 + i / (pts.length - 1) * (W - 6), H - 4 - (p.v - lo) / sp * (H - 10)]; });
    var line = xy.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var last = xy[xy.length - 1], bw = (W - 6) / (pts.length - 1);
    var hits = pts.map(function (p, i) {
      return '<rect x="' + (xy[i][0] - bw / 2).toFixed(1) + '" y="0" width="' + bw.toFixed(1) + '" height="' + H + '" fill="transparent"' + tipAttr('<b>' + label + ' ' + p.yr + '</b><br>' + pct(p.v) + ' dari total belanja') + '></rect>';
    }).join('');
    return '<div class="spark"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(label + ' per tahun') + '">' +
      '<path d="' + line + ' L' + last[0].toFixed(1) + ' ' + H + ' L' + xy[0][0].toFixed(1) + ' ' + H + ' Z" fill="var(--accent)" fill-opacity=".12"/>' +
      '<path d="' + line + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' + hits + '</svg>' +
      '<i class="dot" style="left:' + (last[0] / W * 100).toFixed(1) + '%;top:' + (last[1] / H * 100).toFixed(1) + '%"></i></div>';
  }
  function growthHtml(a, b, suffix) {
    if (!(a > 0 && b > 0)) return 'belum ada data ' + suffix;
    var g = a / b - 1;
    return '<span class="' + (g >= 0 ? 'up' : 'down') + '">' + (g >= 0 ? '▲ ' : '▼ ') + num(Math.abs(g) * 100, 1) + '%</span> dari ' + suffix;
  }
  function renderKpis() {
    var o = cur.o, T = o.total, tren = o.tren, mx = Math.max.apply(null, tren) || 1;
    var where = nameOf(S.p, S.k), scopeName = S.k ? 'APBD kab/kota' : D.scopes.filter(function (s) { return s.key === S.scope; })[0].label;
    function card(label, val, sub, viz, tip) {
      return '<div class="kpi"' + tipAttr('<b>' + esc(label) + '</b> · ' + esc(where) + '<br>' + tip + '<br><span class="m">' + esc(scopeName) + ', ' + X.YEAR + '</span>') + '>' +
        '<div class="kpi-l">' + label + '</div><div class="kpi-v num">' + val + '</div><div class="kpi-s num">' + sub + '</div>' + viz + '</div>';
    }
    var bars = tren.map(function (v, i) {
      var yr = X.YEARS[i], pale = yr < cur.base;
      return '<div' + tipAttr('<b>' + yr + '</b><br>' + (v > 0 ? rp(v) : 'tidak ada data') + (pale ? '<br><span class="m">sebagian daerah belum melapor / belum dimekarkan</span>' : '')) +
        '><i class="' + (yr === X.YEAR ? 'cur' : pale ? 'pale' : '') + '" style="height:' + (Math.max(v, 0) / mx * 100).toFixed(1) + '%"></i></div>';
    }).join('');
    var empty = cur.empty;
    var html = card('Total realisasi belanja', empty ? 'Rp 0' : rp(T), empty ? 'tidak ada kab/kota otonom' : growthHtml(tren[X.iY], tren[X.iP], X.PREV),
      '<div class="ybars" role="img" aria-label="Total belanja per tahun">' + bars + '</div>', 'Jumlah realisasi belanja');
    if (empty) {
      html += ['Porsi pendidikan', 'Porsi pegawai', 'Porsi modal'].map(function (l) { return card(l, '–', 'tidak ada data', '<div class="spark"></div>', 'Tidak ada data'); }).join('');
    } else {
      var pend = o.fungsi[X.L_PEND] || 0, peg = o.jenis[X.L_PEG] || 0, mod = o.jenis[X.L_MOD] || 0, k = o.trenKpi;
      var sub = function (val, col) {
        if (!k) return rp(val);
        return growthHtml(k[col][X.iY], k[col][X.iP], X.PREV).replace(/^(.*)$/, rp(val) + ' · $1');
      };
      html += card('Porsi pendidikan', pct(pend / T), sub(pend, 'pendidikan'), spark('pendidikan', 'Porsi pendidikan'), 'Belanja fungsi pendidikan: ' + rp(pend)) +
        card('Porsi belanja pegawai', pct(peg / T), sub(peg, 'belanjaPegawai'), spark('belanjaPegawai', 'Porsi belanja pegawai'), 'Gaji dan tunjangan: ' + rp(peg)) +
        card('Porsi belanja modal', pct(mod / T), sub(mod, 'belanjaModal'), spark('belanjaModal', 'Porsi belanja modal'), 'Belanja modal: ' + rp(mod));
    }
    $('kpis').innerHTML = html;
  }

  /* ---------- Panel samping ---------- */
  function renderRank() {
    var L = lens(), rows = currentRows(), html = '', note = '';
    if (S.p && !showKk()) {
      note = S.scope === 'provinsi' ? 'Cakupan "Provinsi" hanya menghitung APBD pemprov. Pilih "Kab/Kota" atau "Provinsi + Kab/Kota" untuk peringkat kab/kota.'
        : D.provinsi[S.p].nama + ' tidak punya kab/kota otonom: kota dan kabupaten administratifnya dibiayai APBD provinsi.';
      return '<div class="tb-head"><h3>' + esc(D.provinsi[S.p].nama) + '</h3></div><p class="empty">' + esc(note) + '</p>';
    }
    var max = Math.max.apply(null, rows.map(function (r) { return r.v == null ? 0 : Math.abs(r.v); })) || 1;
    var q = S.q.trim().toLowerCase();
    var shown = rows.filter(function (r) { return !q || r.name.toLowerCase().indexOf(q) >= 0; });
    html = shown.map(function (r) {
      var attr = r.pick ? (r.kind === 'p' ? 'data-p="' + r.code + '"' : 'data-kk="' + r.code + '"') : '';
      var on = r.kind === 'k' && r.code === S.k;
      var yo = r.v != null || r.o.total > 0 ? yoyOf(r.o) : null;
      return '<' + (r.pick ? 'button type="button"' : 'div') + ' class="row' + (r.pick ? '' : ' static') + (on ? ' on' : '') + '" ' + attr + '>' +
        '<span class="rk num">' + (r.rank || '–') + '</span><span class="rn">' + esc(r.name) + '</span><span class="rv num">' + (r.v == null ? '–' : L.fmt(r.v)) + '</span>' +
        '<span class="rb"><i style="width:' + (r.v == null ? 0 : Math.max(2, Math.abs(r.v) / max * 100)).toFixed(1) + '%"></i></span>' +
        '<span class="rt num">' + (r.o.total > 0 ? rp(r.o.total) : 'tanpa data') + (yo == null ? '' : ' · ' + spct(yo) + ' YoY') + '</span></' + (r.pick ? 'button' : 'div') + '>';
    }).join('');
    var title = S.p ? 'Kab/kota di ' + D.provinsi[S.p].nama : 'Provinsi';
    return '<div class="tb-head"><h3>' + esc(title) + ' · ' + rows.length + ' wilayah</h3><p class="sub">Diurutkan menurut ' + L.label.toLowerCase() + '. Klik baris untuk membuka di peta.</p></div>' +
      '<input class="search" id="q" type="search" placeholder="Cari wilayah…" value="' + esc(S.q) + '" aria-label="Cari wilayah">' +
      '<div class="rows" id="rows">' + (html || '<p class="empty">Tidak ada wilayah yang cocok.</p>') + '</div>';
  }

  function cmpObj() { return S.cmp && D.provinsi[S.cmp] ? D.provinsi[S.cmp][S.scope] : null; }
  function renderFungsi() {
    var o = cur.o, c = cmpObj(), FL = D.fungsiList;
    if (cur.empty) return '<p class="empty">Tidak ada belanja pada cakupan ini.</p>';
    var items = FL.map(function (f) { return { f: f, v: o.fungsi[f] || 0, s: (o.fungsi[f] || 0) / o.total, cs: c && c.total > 0 ? (c.fungsi[f] || 0) / c.total : null }; })
      .filter(function (i) { return i.v > 0; }).sort(function (a, b) { return b.v - a.v; });
    var mx = Math.max.apply(null, items.map(function (i) { return Math.max(i.s, i.cs || 0); })) || 1;
    var key = c ? '<div class="cmpkey"><u></u> Pembanding: <b>' + esc(D.provinsi[S.cmp].nama) + '</b> (porsi di fungsi yang sama)</div>' : '';
    return '<div class="tb-head"><h3>Untuk urusan apa?</h3><p class="sub">Porsi belanja per fungsi · ' + esc(nameOf(S.p, S.k)) + ', ' + X.YEAR + '</p></div>' + key +
      items.map(function (i) {
        var name = String(i.f).replace(/^\d+\.\s*/, '');
        return '<div class="fbar"' + tipAttr('<b>' + esc(name) + '</b><br>' + rp(i.v) + ' · ' + pct(i.s) + (i.cs != null ? '<br><span class="m">Pembanding: ' + pct(i.cs) + '</span>' : '')) + '>' +
          '<div class="fh"><b>' + esc(name) + '</b><span class="num">' + pct(i.s) + ' · ' + rp(i.v) + '</span></div>' +
          '<div class="ftrack"><i style="width:' + (i.s / mx * 100).toFixed(1) + '%"></i>' + (i.cs != null ? '<u style="left:' + (i.cs / mx * 100).toFixed(1) + '%"></u>' : '') + '</div></div>';
      }).join('');
  }

  function stackBar(o, label) {
    var T = o.total, JL = D.jenisList;
    if (!(T > 0)) return '';
    var segs = JL.map(function (j, i) {
      var p = (o.jenis[j] || 0) / T;
      return '<div class="s' + (i + 2) + '" style="flex:' + (p * 100).toFixed(3) + ';background:var(--b' + (i + 2) + ')"' + tipAttr('<b>' + esc(label) + ' · ' + esc(j.replace(/^\d+\.\s*/, '')) + '</b><br>' + rp(o.jenis[j] || 0) + ' · ' + pct(p)) + '>' + (p >= .08 ? Math.round(p * 100) + '%' : '') + '</div>';
    }).join('');
    return '<div class="stack-l">' + esc(label) + '</div><div class="stack">' + segs + '</div>';
  }
  function renderJenis() {
    var o = cur.o, c = cmpObj(), JL = D.jenisList;
    if (cur.empty) return '<p class="empty">Tidak ada belanja pada cakupan ini.</p>';
    var html = '<div class="tb-head"><h3>Dalam bentuk apa?</h3><p class="sub">Komposisi jenis belanja · ' + X.YEAR + '</p></div>' + stackBar(o, nameOf(S.p, S.k));
    if (c) html += stackBar(c, D.provinsi[S.cmp].nama + ' (pembanding)');
    html += '<div class="jleg">' + JL.map(function (j, i) { return '<span><i style="background:var(--b' + (i + 2) + ')"></i>' + esc(j.replace(/^\d+\.\s*(Belanja )?/, '')) + '</span>'; }).join('') + '</div>';
    if (o.fungsiJenis) {
      var FL = D.fungsiList;
      var row = function (name, vals, all) {
        var t = sum(vals);
        return '<tr><td class="rh">' + esc(name) + '</td>' + vals.map(function (v, j) {
          if (t <= 0) return '<td>–</td>';
          var p = v / t, a = Math.min(72, p * 100 * 1.25);
          return '<td' + tipAttr('<b>' + esc(name) + ' · ' + JENIS_SHORT[j] + '</b><br>' + rp(v) + ' · ' + pct(p) + ' dari ' + rp(t)) + ' style="background:color-mix(in srgb, var(--accent) ' + a.toFixed(0) + '%, transparent)">' + Math.round(p * 100) + '%</td>';
        }).join('') + '<td class="tot">' + (t > 0 ? rp(t) : '–') + '</td></tr>';
      };
      var jT = JL.map(function (j) { return o.jenis[j] || 0; });
      var body = row('Semua fungsi', jT) + F6.map(function (f) {
        var li = FL.indexOf(labelFor(FL, f)); if (li < 0 || !o.fungsiJenis[li]) return '';
        return row(String(FL[li]).replace(/^\d+\.\s*/, '').replace('Perumahan & Fasilitas Umum', 'Perumahan & Fasum'), o.fungsiJenis[li]);
      }).join('');
      html += '<h3 style="font-size:14px;margin:4px 0 6px">Fungsi × jenis belanja</h3><p class="sub" style="margin-bottom:8px">Tiap baris = 100%; makin pekat makin besar porsinya.</p>' +
        '<table class="mx num"><thead><tr><th></th>' + JENIS_SHORT.map(function (j) { return '<th>' + esc(j) + '</th>'; }).join('') + '<th>Total</th></tr></thead><tbody>' + body + '</tbody></table>';
    }
    return html;
  }

  function renderSide() {
    document.querySelectorAll('#tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === S.tab)); });
    var body = $('tabBody'), scroll = body.scrollTop, hadFocus = document.activeElement && document.activeElement.id === 'q';
    body.innerHTML = S.tab === 'fungsi' ? renderFungsi() : S.tab === 'jenis' ? renderJenis() : renderRank();
    body.scrollTop = scroll;
    var q = $('q'); if (q && hadFocus) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }

  /* ---------- Toolbar ---------- */
  function renderToolbar() {
    $('scope').innerHTML = D.scopes.map(function (sc) {
      return '<button type="button" data-scope="' + sc.key + '" aria-pressed="' + (S.scope === sc.key) + '"' +
        (S.k ? ' disabled title="Tidak berlaku di tingkat kab/kota. Kembali ke provinsi untuk memakai cakupan."' : '') + '>' + esc(sc.label) + '</button>';
    }).join('');
    $('lens').innerHTML = X.LENSES.map(function (l) { return '<button type="button" data-lens="' + l.key + '" aria-pressed="' + (S.lens === l.key) + '">' + esc(l.label) + '</button>'; }).join('');
    $('wil').value = S.p || '';
    $('cmp').value = S.cmp || '';
  }

  function render() {
    var o = live();
    cur = { o: o, empty: !(o.total > 0), base: !S.k && S.p && PAPUA[D.provinsi[S.p].namaPeta.toUpperCase()] ? 2023 : D.tahunPembanding };
    renderToolbar(); renderKpis(); renderMap(); renderSide(); writeHash();
  }

  /* ---------- Hash (tautan yang bisa dibagikan) ---------- */
  function writeHash() {
    var h = [];
    if (S.p) h.push('p=' + S.p); if (S.k) h.push('k=' + S.k);
    if (S.scope !== 'semua') h.push('s=' + S.scope); if (S.lens !== 'total') h.push('l=' + S.lens);
    if (S.tab !== 'rank') h.push('t=' + S.tab); if (S.cmp) h.push('c=' + S.cmp);
    try { history.replaceState(null, '', location.pathname + location.search + (h.length ? '#' + h.join('&') : '')); } catch (e) {}
  }
  function readHash() {
    var m = {}; location.hash.replace(/^#/, '').split('&').forEach(function (kv) { var a = kv.split('='); if (a[0]) m[a[0]] = decodeURIComponent(a[1] || ''); });
    if (m.s && D.scopes.some(function (s) { return s.key === m.s; })) S.scope = m.s;
    if (m.l && X.LENSES.some(function (l) { return l.key === m.l; })) S.lens = m.l;
    if (m.t && /^(rank|fungsi|jenis)$/.test(m.t)) S.tab = m.t;
    if (m.c && D.provinsi[m.c]) S.cmp = m.c;
    if (m.p && D.provinsi[m.p]) { S.p = m.p; if (m.k && D.kabkota[m.k] && D.kabkota[m.k].provinsi === m.p) S.k = m.k; }
  }

  /* ---------- CSV & bagikan ---------- */
  function toast(msg) {
    var b = $('btnShare'), t = b.textContent; b.textContent = msg; setTimeout(function () { b.textContent = t; }, 1600);
  }
  function exportCsv() {
    var L = lens(), rows = currentRows();
    var out = [['peringkat', 'kode', 'wilayah', 'tingkat', L.label, 'total_belanja_rp', 'pertumbuhan_yoy'].join(',')];
    rows.forEach(function (r) {
      var yo = yoyOf(r.o);
      out.push([r.rank || '', r.code, '"' + r.name.replace(/"/g, '""') + '"', r.kind === 'p' ? 'provinsi' : r.kind === 'k' ? 'kab/kota' : 'pemprov',
        r.v == null ? '' : (L.key === 'total' ? Math.round(r.v) : (r.v * 100).toFixed(2)), Math.round(r.o.total || 0), yo == null ? '' : (yo * 100).toFixed(2)].join(','));
    });
    var blob = new Blob(['﻿' + out.join('\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'apbd-' + X.YEAR + '-' + S.scope + '-' + L.key + (S.p ? '-' + S.p : '') + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
  }

  /* ---------- Events ---------- */
  var tip;
  function hideTip() { tip.style.display = 'none'; }
  function bind() {
    tip = $('tip');
    $('scope').addEventListener('click', function (e) { var b = e.target.closest('button[data-scope]'); if (!b || b.disabled) return; S.scope = b.getAttribute('data-scope'); S.q = ''; render(); });
    $('lens').addEventListener('click', function (e) { var b = e.target.closest('button[data-lens]'); if (!b) return; S.lens = b.getAttribute('data-lens'); render(); });
    $('tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-tab]'); if (!b) return; S.tab = b.getAttribute('data-tab'); render(); });
    $('wil').addEventListener('change', function (e) { S.q = ''; go(e.target.value || null); });
    $('cmp').addEventListener('change', function (e) { S.cmp = e.target.value; render(); });
    $('btnCsv').addEventListener('click', exportCsv);
    $('btnShare').addEventListener('click', function () {
      writeHash();
      var done = function () { toast('Tautan disalin ✓'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, function () { toast('Salin dari bilah alamat'); });
      else toast('Salin dari bilah alamat');
    });
    $('drill').addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]'); if (!b) return; hideTip();
      var g = b.getAttribute('data-go'); if (g === 'nat') go(null); else if (g === 'prov') go(S.p); else back();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.activeElement && document.activeElement.id !== 'q') back(); });
    function onPick(e) {
      var t = e.target.closest('[data-p],[data-kk]'); if (!t) return;
      var p = t.getAttribute('data-p'), kk = t.getAttribute('data-kk'); hideTip();
      if (kk) { if (S.k === kk) go(S.p); else go(D.kabkota[kk].provinsi, kk); return; }
      if (S.p === p) { if (S.k) go(p); else go(null); } else { S.q = ''; go(p); }
    }
    svg.addEventListener('click', onPick);
    $('tabBody').addEventListener('click', onPick);
    $('tabBody').addEventListener('input', function (e) { if (e.target.id === 'q') { S.q = e.target.value; renderSide(); } });
    function clearHl() { document.querySelectorAll('#map path.hl').forEach(function (el) { el.classList.remove('hl'); }); }
    $('tabBody').addEventListener('mouseover', function (e) {
      var r = e.target.closest('[data-p],[data-kk]'); clearHl(); if (!r) return;
      var el = r.getAttribute('data-p') ? X.PROV_EL[r.getAttribute('data-p')] : X.KAB_EL[r.getAttribute('data-kk')];
      if (el && !el.classList.contains('under')) el.classList.add('hl');
    });
    $('tabBody').addEventListener('mouseleave', clearHl);
    document.addEventListener('mousemove', function (e) {
      var t = e.target.closest ? e.target.closest('[data-tip]') : null;
      if (!t) { hideTip(); return; }
      var h = t.getAttribute('data-tip'); if (tip.innerHTML !== h) tip.innerHTML = h;
      tip.style.display = 'block';
      var w = tip.offsetWidth, hh = tip.offsetHeight, x = e.clientX + 14, y = e.clientY + 16;
      if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + hh > innerHeight - 8) y = e.clientY - hh - 16;
      tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
    });
    document.addEventListener('mouseleave', hideTip);
  }

  /* ---------- Boot ---------- */
  function fetchJson(u) {
    return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('Gagal memuat ' + u.split('?')[0] + ' (HTTP ' + r.status + ')'); return r.json(); });
  }
  var booted = false;
  function start(forceDemo) {
    var url = !forceDemo && CFG.dataUrl ? CFG.dataUrl : CFG.demoUrl;
    usingDemo = url === CFG.demoUrl;
    $('errBox').hidden = true; $('loading').style.display = '';
    Promise.all([fetchJson(url), fetchJson(CFG.geoProv), fetchJson(CFG.geoKab)]).then(function (r) {
      D = r[0]; GP = r[1]; GK = r[2];
      if (!D || typeof D !== 'object') throw new Error('Respons kosong dari sumber data.');
      if (D.error) throw new Error(D.error);
      validate(D);
      S = { p: null, k: null, scope: 'semua', lens: 'total', tab: 'rank', cmp: '', q: '' };
      prepare();
      $('demoBadge').hidden = !(usingDemo || (D.meta && D.meta.demo));

      svg = $('map');
      var gProv = $('gProv'); $('gKab').innerHTML = '';
      gProv.innerHTML = X.PK.filter(function (k) { return X.PROV_GEO[k]; }).map(function (k) { return '<path data-p="' + k + '" d="' + X.PROV_GEO[k].d + '"></path>'; }).join('');
      X.PROV_EL = {}; gProv.querySelectorAll('path').forEach(function (el) { X.PROV_EL[el.getAttribute('data-p')] = el; });
      setVB(padded(X.FULL));

      var byName = function (a, b) { return D.provinsi[a].nama.localeCompare(D.provinsi[b].nama, 'id'); };
      var opts = X.PK.slice().sort(byName).map(function (k) { return '<option value="' + k + '">' + esc(D.provinsi[k].nama) + '</option>'; }).join('');
      $('wil').innerHTML = '<option value="">Semua provinsi (nasional)</option>' + opts;
      $('cmp').innerHTML = '<option value="">Tanpa pembanding</option>' + opts;

      readHash();
      if (S.p) buildKab(S.p);
      $('loading').style.display = 'none';
      render();
      if (S.p) { var bb = S.k && X.KAB_GEO[S.k] ? X.KAB_GEO[S.k].bb : X.PROV_BB[S.p] || X.PROV_GEO[S.p].bb; zoomTo(bb, S.k ? 50 : 150); }
      if (!booted) { bind(); booted = true; }
    }).catch(function (err) {
      $('loading').style.display = 'none';
      $('errDetail').textContent = (err && err.message) || String(err);
      $('errDemo').hidden = usingDemo;
      $('errBox').hidden = false;
      if (window.console) console.error('[APBD]', err);
    });
  }
  $('errRetry').addEventListener('click', function () { location.reload(); });
  $('errDemo').addEventListener('click', function () { start(true); });
  start(false);
})();
