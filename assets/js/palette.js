/* Palet kustom: dari dua warna pilihan pengguna (utama + aksen) dibangkitkan seluruh variabel tema. */
(function () {
  var root = document.documentElement, KEY = 'palette-custom';
  var VARS = ['bg', 'surface', 'surface2', 'line', 'ink', 'ink2', 'muted', 'accent', 'accent-ink', 'accent2',
    'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'on2', 'on3', 'on4', 'on5', 'nodata', 'dim', 'stroke'];
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  function toHsl(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) {
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return [h, s * 100, l * 100];
  }
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    var a = s * Math.min(l, 1 - l);
    var f = function (n) { var k = (n + h / 30) % 12, c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
    return '#' + f(0) + f(8) + f(4);
  }
  function lum(x) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(x.slice(i, i + 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  function on(bg) {
    var D = '#0f1722', L = '#ffffff', cr = function (a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    return cr(bg, L) >= cr(bg, D) ? L : D;
  }

  function build(c1, c2, dark) {
    var p = toHsl(c1), h = p[0], k = clamp(p[1] / 70, .35, 1.2), h2 = toHsl(c2)[0];
    var S = function (v) { return Math.min(100, v * k); };
    var ls = dark ? [21, 29, 39, 51, 63, 78] : [93, 82, 68, 52, 38, 26];
    var ramp = ls.map(function (l) { return hsl(h, S(dark ? 48 : 55), l); });
    var acc = dark ? hsl(h, S(70), 62) : hsl(h, S(72), 36), acc2 = dark ? hsl(h2, 85, 62) : hsl(h2, 85, 38);
    var o = dark ? {
      bg: hsl(h, S(28), 6), surface: hsl(h, S(24), 10), surface2: hsl(h, S(24), 13), line: hsl(h, S(20), 20),
      ink: hsl(h, 25, 94), ink2: hsl(h, 14, 76), muted: hsl(h, 10, 60), nodata: hsl(h, S(20), 15), dim: hsl(h, S(22), 12), stroke: hsl(h, S(28), 6)
    } : {
      bg: hsl(h, S(30), 96), surface: '#ffffff', surface2: hsl(h, S(28), 94), line: hsl(h, S(22), 89),
      ink: hsl(h, 30, 10), ink2: hsl(h, 14, 28), muted: hsl(h, 10, 42), nodata: hsl(h, S(22), 91), dim: hsl(h, S(24), 94), stroke: '#ffffff'
    };
    o.accent = acc; o['accent-ink'] = on(acc); o.accent2 = acc2;
    ramp.forEach(function (c, i) { o['b' + i] = c; });
    [2, 3, 4, 5].forEach(function (i) { o['on' + i] = on(ramp[i]); });
    return o;
  }

  function get() {
    try { var v = JSON.parse(localStorage.getItem(KEY)); if (v && /^#[0-9a-f]{6}$/i.test(v.c1) && /^#[0-9a-f]{6}$/i.test(v.c2)) return v; } catch (e) {}
    return null;
  }
  function set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function clear() { VARS.forEach(function (n) { root.style.removeProperty('--' + n); }); }
  function apply() {
    if (root.getAttribute('data-palette') !== 'kustom') { clear(); return; }
    var v = get(); if (!v) return;
    var o = build(v.c1, v.c2, root.getAttribute('data-theme') !== 'light');
    Object.keys(o).forEach(function (n) { root.style.setProperty('--' + n, o[n]); });
  }
  window.PaletteCustom = { get: get, set: set, apply: apply, clear: clear };
  apply();
})();
