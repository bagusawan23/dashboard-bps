#!/usr/bin/env python3
"""Bangkitkan data DEMO (sintetis) untuk dashboard APBD + thumbnail peta.

Angka di sini TIDAK nyata: hanya mengisi skema yang sama dengan data asli supaya
dashboard bisa dijalankan dan diuji tanpa sumber data. Ganti dengan data resmi
(lihat README) sebelum dipublikasikan sebagai data sebenarnya.

Pakai:  python3 scripts/make_demo_data.py
Output: assets/data/apbd-demo.json  dan  _includes/apbd-thumb.svg
"""
import json, math, random, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
rnd = random.Random(2024)

geo_p = json.loads((ROOT / "assets/data/geo-provinsi.json").read_text())
geo_k = json.loads((ROOT / "assets/data/geo-kabkota.json").read_text())

YEARS = list(range(2015, 2025))
FL = ["01. Pelayanan Umum", "03. Ketertiban & Keamanan", "04. Ekonomi", "05. Lingkungan Hidup",
      "06. Perumahan & Fasilitas Umum", "07. Kesehatan", "08. Pariwisata", "10. Pendidikan",
      "11. Perlindungan Sosial", "99. Fungsi Lainnya"]
FBASE = [0.27, 0.03, 0.12, 0.04, 0.10, 0.13, 0.02, 0.21, 0.03, 0.05]
JL = ["51. Belanja Pegawai", "52. Belanja Barang & Jasa", "53. Belanja Modal", "54. Belanja Lainnya"]
JBASE_KAB = [0.33, 0.30, 0.17, 0.20]
JBASE_PROV = [0.22, 0.24, 0.14, 0.40]
I_PEND, I_PEG, I_MOD = FL.index("10. Pendidikan"), 0, 2

BIG = {"Jawa Barat": 3.2, "Jawa Timur": 3.0, "Jawa Tengah": 2.6, "DKI Jakarta": 5.0, "Sumatera Utara": 1.6,
       "Sulawesi Selatan": 1.3, "Banten": 1.3, "Kalimantan Timur": 1.9, "Papua": 1.4, "Aceh": 1.5}
SMALL_WORDS = {"dan", "di", "ke"}


def gamma_share(base, conc=40):
    g = [rnd.gammavariate(max(b * conc, 0.3), 1) for b in base]
    s = sum(g)
    return [x / s for x in g]


def title(s):
    return " ".join(w.lower() if w.lower() in SMALL_WORDS else w.capitalize() for w in s.split())


def ipf(row, col):
    m = [[row[i] * col[j] * rnd.uniform(.6, 1.4) for j in range(len(col))] for i in range(len(row))]
    for _ in range(25):
        for i in range(len(row)):
            s = sum(m[i]) or 1
            m[i] = [x * row[i] / s for x in m[i]]
        for j in range(len(col)):
            s = sum(m[i][j] for i in range(len(row))) or 1
            for i in range(len(row)):
                m[i][j] *= col[j] / s
    return m


def make_entity(total, jbase):
    f = gamma_share(FBASE)
    j = gamma_share(jbase, 60)
    fv = [total * x for x in f]
    jv = [total * x for x in j]
    fj = ipf(fv, jv)
    growth = rnd.uniform(1.03, 1.10)
    tren = []
    for y in YEARS:
        v = total / growth ** (YEARS[-1] - y) * rnd.uniform(.97, 1.03)
        tren.append(v)
    tren[-1] = total
    drift = [rnd.uniform(-.004, .004) for _ in range(3)]
    shares = [fv[I_PEND] / total, jv[0] / total, jv[2] / total]
    kpi = {"pendidikan": [], "belanjaPegawai": [], "belanjaModal": []}
    for i, y in enumerate(YEARS):
        back = YEARS[-1] - y
        for key, sh, d in zip(kpi, shares, drift):
            kpi[key].append(tren[i] * max(sh - d * back, .01))
    kpi["pendidikan"][-1], kpi["belanjaPegawai"][-1], kpi["belanjaModal"][-1] = fv[I_PEND], jv[0], jv[2]
    return {"total": total, "fungsi": dict(zip(FL, fv)), "jenis": dict(zip(JL, jv)),
            "fungsiJenis": fj, "tren": tren, "trenKpi": kpi}


def agg(parts):
    if not parts:
        return {"total": 0, "fungsi": {k: 0 for k in FL}, "jenis": {k: 0 for k in JL},
                "fungsiJenis": [[0] * 4 for _ in FL], "tren": [0] * len(YEARS),
                "trenKpi": {k: [0] * len(YEARS) for k in ("pendidikan", "belanjaPegawai", "belanjaModal")}}
    out = {"total": sum(p["total"] for p in parts),
           "fungsi": {k: sum(p["fungsi"][k] for p in parts) for k in FL},
           "jenis": {k: sum(p["jenis"][k] for p in parts) for k in JL},
           "fungsiJenis": [[sum(p["fungsiJenis"][i][j] for p in parts) for j in range(4)] for i in range(len(FL))],
           "tren": [sum(p["tren"][i] for p in parts) for i in range(len(YEARS))],
           "trenKpi": {k: [sum(p["trenKpi"][k][i] for p in parts) for i in range(len(YEARS))] for k in
                       ("pendidikan", "belanjaPegawai", "belanjaModal")}}
    return out


def rounded(o):
    if isinstance(o, float):
        return int(round(o))
    if isinstance(o, list):
        return [rounded(x) for x in o]
    if isinstance(o, dict):
        return {k: rounded(v) for k, v in o.items()}
    return o


prov_names = [f["properties"]["PROVINSI"] for f in geo_p["features"]]
prov_code = {n: "%02d" % (i + 1) for i, n in enumerate(sorted(prov_names))}
by_upper = {n.upper(): n for n in prov_names}

provinsi, kabkota = {}, {}
pemprov = {}
kabs_of = {n: [] for n in prov_names}
kab_counter = {n: 0 for n in prov_names}

for f in geo_k["features"]:
    pn = by_upper[f["properties"]["prov_name"]]
    nm = f["properties"]["alt_name"]
    if pn == "DKI Jakarta":
        continue  # kota/kab. administratif: tidak punya APBD sendiri
    if rnd.random() < 0.005:
        continue  # contoh daerah tanpa data
    is_city = nm.startswith("KOTA")
    base = 1.4e12 * (0.55 if is_city else 1) * BIG.get(pn, 1) ** .35
    total = base * math.exp(rnd.gauss(0, .55))
    s = make_entity(total, JBASE_KAB)
    # tahun pertama: hanya sebagian daerah melapor
    if rnd.random() > .35:
        s["tren"][0] = 0
        for k in s["trenKpi"]:
            s["trenKpi"][k][0] = 0
    kab_counter[pn] += 1
    code = prov_code[pn] + "%02d" % kab_counter[pn]
    s.update({"nama": title(nm), "provinsi": prov_code[pn]})
    kabkota[code] = s
    kabs_of[pn].append(s)

for pn in prov_names:
    w = BIG.get(pn, 1.0)
    pe = make_entity(7e12 * w * math.exp(rnd.gauss(0, .3)), JBASE_PROV)
    pemprov[pn] = pe
    k = kabs_of[pn]
    provinsi[prov_code[pn]] = {
        "nama": pn, "namaPeta": pn, "jumlahKabKota": len(k),
        "semua": agg([pe] + k), "provinsi": pe, "kabkota": agg(k)}

nasional = {sc: agg([provinsi[c][sc] for c in provinsi]) for sc in ("semua", "provinsi", "kabkota")}

for kd, s in kabkota.items():
    s["totalSebelumnya"] = s["tren"][-2]
    s["yoy"] = (s["total"] / s["totalSebelumnya"] - 1) if s["totalSebelumnya"] else None

n_rep = [sum(1 for s in kabkota.values() if s["tren"][i] > 0) + 38 for i in range(len(YEARS))]
data = {
    "meta": {"demo": True, "sumber": "Data sintetis untuk pengembangan (bukan angka resmi)",
             "satuan": "Rupiah"},
    "years": YEARS, "tahunTerbaru": YEARS[-1], "tahunSebelumnya": YEARS[-2], "tahunPembanding": YEARS[1],
    "scopes": [{"key": "semua", "label": "Provinsi + Kab/Kota"}, {"key": "provinsi", "label": "Provinsi"},
               {"key": "kabkota", "label": "Kab/Kota"}],
    "fungsiList": FL, "jenisList": JL,
    "jumlahPemdaPerTahun": {str(y): n for y, n in zip(YEARS, n_rep)},
    "provinsi": provinsi, "kabkota": kabkota, "nasional": nasional,
}
(ROOT / "assets/data/apbd-demo.json").write_text(json.dumps(rounded(data), separators=(",", ":"), ensure_ascii=False))

# ---- thumbnail peta (SVG inline untuk kartu di beranda) ----
K, X0, Y0 = 10, 94, 7
vals = {pn: provinsi[prov_code[pn]]["semua"]["total"] for pn in prov_names}
order = sorted(vals, key=vals.get)
paths = []
for f in geo_p["features"]:
    pn = f["properties"]["PROVINSI"]
    b = min(5, order.index(pn) * 6 // len(order))
    g = f["geometry"]
    polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    d = ""
    for poly in polys:
        for ring in poly:
            step = 12 if len(ring) > 300 else 6 if len(ring) > 80 else 2 if len(ring) > 30 else 1
            pts = ring[::step]
            if len(pts) < 3:
                continue
            xs = [(c[0] - X0) * K for c in pts]
            ys = [(Y0 - c[1]) * K for c in pts]
            if (max(xs) - min(xs)) * (max(ys) - min(ys)) < 3:
                continue
            d += "M" + "L".join("%.1f %.1f" % (x, y) for x, y in zip(xs, ys)) + "Z"
    if d:
        paths.append('<path class="t%d" d="%s"/>' % (b, d))
svg = ('<svg class="thumb-map" viewBox="0 0 470 190" aria-hidden="true" focusable="false">'
       + "".join(paths) + "</svg>\n")
(ROOT / "_includes/apbd-thumb.svg").write_text(svg)
print("kab/kota:", len(kabkota), "| json KB:", round((ROOT / "assets/data/apbd-demo.json").stat().st_size / 1024),
      "| thumb KB:", round(len(svg) / 1024))
