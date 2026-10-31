"""Hasilkan assets/css/palettes.css (palet warna tema). Jalankan: python3 scripts/make_palettes.py"""
import colorsys, json, pathlib

# nama: (label, hue utama, hue aksen kedua). 'laut' = bawaan (site.css), tidak digenerate.
PAL = {
    'ungu':   ('Ungu',    265, 42),
    'senja':  ('Senja',    22, 190),
    'samudra':('Samudra', 215, 38),
    'mawar':  ('Mawar',   343, 165),
    'rimba':  ('Rimba',   142, 40),
}

def hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, l / 100, s / 100)
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))

def lum(hexc):
    c = [int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= .03928 else ((x + .055) / 1.055) ** 2.4 for x in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]

def on(bg, dark='#0f1722', light='#ffffff'):
    cr = lambda a, b: (max(lum(a), lum(b)) + .05) / (min(lum(a), lum(b)) + .05)
    return light if cr(bg, light) >= cr(bg, dark) else dark

out = ['/* Dibuat oleh scripts/make_palettes.py — jangan sunting manual. */']
meta = [{'id': 'laut', 'label': 'Laut', 'sw': '#4fd1c5'}]
for pid, (label, h, h2) in PAL.items():
    # gelap
    ramp = [hsl(h, 48, l) for l in (21, 29, 39, 51, 63, 78)]
    acc, acc2 = hsl(h, 70, 62), hsl(h2, 85, 62)
    d = [f'--bg: {hsl(h, 28, 6)}; --surface: {hsl(h, 24, 10)}; --surface2: {hsl(h, 24, 13)}; --line: {hsl(h, 20, 20)};',
         f'--ink: {hsl(h, 25, 94)}; --ink2: {hsl(h, 14, 76)}; --muted: {hsl(h, 10, 60)};',
         f'--accent: {acc}; --accent-ink: {on(acc)}; --accent2: {acc2};',
         '--b0: %s; --b1: %s; --b2: %s; --b3: %s; --b4: %s; --b5: %s;' % tuple(ramp),
         '--on2: %s; --on3: %s; --on4: %s; --on5: %s;' % tuple(on(c) for c in ramp[2:]),
         f'--nodata: {hsl(h, 20, 15)}; --dim: {hsl(h, 22, 12)}; --stroke: {hsl(h, 28, 6)};']
    out.append(f':root[data-palette="{pid}"][data-theme="dark"] {{ ' + ' '.join(d) + ' }')
    # terang
    ramp = [hsl(h, 55, l) for l in (93, 82, 68, 52, 38, 26)]
    acc, acc2 = hsl(h, 72, 36), hsl(h2, 85, 38)
    l = [f'--bg: {hsl(h, 30, 96)}; --surface: #ffffff; --surface2: {hsl(h, 28, 94)}; --line: {hsl(h, 22, 89)};',
         f'--ink: {hsl(h, 30, 10)}; --ink2: {hsl(h, 14, 28)}; --muted: {hsl(h, 10, 42)};',
         f'--accent: {acc}; --accent-ink: {on(acc)}; --accent2: {acc2};',
         '--b0: %s; --b1: %s; --b2: %s; --b3: %s; --b4: %s; --b5: %s;' % tuple(ramp),
         '--on2: %s; --on3: %s; --on4: %s; --on5: %s;' % tuple(on(c) for c in ramp[2:]),
         f'--nodata: {hsl(h, 22, 91)}; --dim: {hsl(h, 24, 94)}; --stroke: #ffffff;']
    out.append(f':root[data-palette="{pid}"][data-theme="light"] {{ ' + ' '.join(l) + ' }')
    meta.append({'id': pid, 'label': label, 'sw': hsl(h, 70, 58)})
root = pathlib.Path(__file__).resolve().parent.parent
(root / 'assets/css/palettes.css').write_text('\n'.join(out) + '\n')
(root / '_data/palettes.yml').write_text(''.join(f"- id: {m['id']}\n  label: {m['label']}\n  sw: \"{m['sw']}\"\n" for m in meta))
print('ok', len(meta))
