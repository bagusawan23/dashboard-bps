# Portofolio Bagus — dashboard data viz

Situs Jekyll (GitHub Pages) dengan tema gelap/terang dan kartu proyek. Saat ini berisi satu dashboard: **Peta Belanja APBD**.

## Jalankan lokal
    bundle install
    bundle exec jekyll serve      # http://localhost:4000

## Data
- `apbd_data_url` di `_config.yml` kosong → dashboard memakai **data demo sintetis** (`assets/data/apbd-demo.json`) dan menampilkan label *Data demo*.
- Untuk data asli, isi `apbd_data_url` dengan URL JSON milikmu (host harus mengizinkan CORS).
  Skema: lihat field di `scripts/make_demo_data.py` (`years`, `fungsiList`, `jenisList`, `scopes`, `provinsi`, `kabkota`, `nasional`, dst.).
- Peta batas wilayah: `assets/data/geo-provinsi.json` dan `geo-kabkota.json` (nama harus cocok dengan field `namaPeta` / `nama` di data).
- Buat ulang data demo: `python3 scripts/make_demo_data.py`.

## Tambah dashboard
Tambahkan entri di `_data/projects.yml` dan halaman di `dashboards/` dengan `layout: dashboard`.

## Catatan
Atribusikan sumber data (BPS/DJPK, dst.) di halaman dashboard sebelum dipublikasikan.

## Peta Ekonomi 3D (`/dashboards/pdrb/`)
Three.js (disimpan lokal di `assets/vendor/three`, lisensi MIT). Data: `assets/data/pdrb.json` (BPS: PDRB 38 provinsi × 17 lapangan usaha, 2024–2025; batas provinsi denyherianto/indonesia-geojson-topojson-maps-with-38-provinces, CC BY 4.0).
Kode di `assets/js/pdrb/` (`main.js` = peta, diorama, lensa; `scenes.js` = 17 adegan animasi). Tautan langsung: `/dashboards/pdrb/#Jawa%20Timur`.
