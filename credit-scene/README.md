# Romantic Cinematic End Credits — Panduan

Fitur credit scene sinematik untuk arcade. Dipicu **hanya** oleh tombol
**"Kembali ke Dashboard"** di bagian bawah *The Final Surprise* (setelah hadiah dibuka).

## Alur pemutaran

1. Tombol diklik → navigasi normal dicegah → minta fullscreen (jika gagal/dergan
   menolak → overlay fixed full-viewport, tetap jalan).
2. **Video pembuka** dari Cloudinary (jika URL sudah diisi di `config.json`).
   Video gagal dimuat / autoplay ditolak → langsung lanjut ke credits, tidak crash.
3. Fade ke layar hitam → **rolling credits**: foto dari GitHub diacak sekali per
   pemutaran (Fisher–Yates), setiap foto tampil tepat satu kali.
4. Pesan romantis penutup (durasi di `config.json`) → fade out → keluar fullscreen
   → kembali ke Dashboard.
5. Musik latar arcade (`__arcadeBgAudio`) di-fade down saat credits dan di-restore
   setelahnya — **tidak ada instance audio kedua**.

## Struktur

```
credit-scene/
├── photos/          # photo-001.jpg … photo-055.jpg (55 foto, disimpan di GitHub)
├── photos.json      # manifest: expectedCount + daftar path foto tersedia
├── config.json      # URL video Cloudinary + pesan penutup (TANPA kredensial!)
├── credits.js       # logika credit scene (modul, window.CreditScene)
├── credits.css      # gaya sinematik (hitam, serif ivory/gold, grain, vignette)
└── README.md
```

## 1. Upload video ke Cloudinary & ambil URL delivery

1. Login ke [cloudinary.com](https://cloudinary.com) → Console → **Media Library**.
2. Klik **Upload** → pilih video pembuka (MP4, disarankan ≤ 25 MB & ≤ 60 detik).
3. Setelah terunggah, klik video → **Copy URL** (delivery URL, bukan URL editor).
   Formatnya kira-kira:
   `https://res.cloudinary.com/<CLOUD_NAME>/video/upload/v<VERSION>/<PUBLIC_ID>.mp4`
4. URL ini **public delivery URL** — aman untuk frontend. **JANGAN PERNAH** menyimpan
   API Key / API Secret / signing token di repo. Yang dibutuhkan hanya URL delivery.

## 2. Simpan URL video di config

Buka `credit-scene/config.json`, isi:

```json
{
  "cloudinaryVideoUrl": "https://res.cloudinary.com/CLOUD_NAME/video/upload/v1234/video_pembuka.mp4",
  ...
}
```

Selama `cloudinaryVideoUrl` kosong `""`, credit scene **langsung mulai dari rolling
credits** tanpa video (perilaku default saat ini).

## 3. Menambah foto ke GitHub

1. Letakkan foto di `credit-scene/photos/` dengan nama pola `photo-001.jpg` …
   `photo-055.jpg` (3 digit, urut).
2. Commit & push ke `main`.

> Foto saat ini: **55/55 sudah diupload dan direname** ke pola ini
> (rename dari nama asli IMG_*.jpg dilakukan di commit awal fitur ini).

## 4. Memperbarui manifest (`photos.json`)

- Tambah/hapus path pada array `photos` sesuai file yang benar-benar ada.
- Naikkan/turunkan `expectedCount` jika target total berubah.
- Skrip bantu membangun ulang manifest dari isi folder (jalankan di root repo):

```bash
python3 - <<'EOF'
import json, os
d = "credit-scene/photos"
files = sorted(f for f in os.listdir(d) if f.lower().endswith((".jpg", ".jpeg", ".png")))
paths = [f"credit-scene/photos/{f}" for f in files]
json.dump({"expectedCount": 55, "photos": paths}, open("credit-scene/photos.json", "w"), indent=2)
print(f"{len(paths)} foto dalam manifest")
EOF
```

## 5. Verifikasi kelengkapan 55 foto

```bash
python3 - <<'EOF'
import json, os, urllib.request
man = json.load(open("credit-scene/photos.json"))
paths = man["photos"]
print("manifest:", len(paths), "| expected:", man["expectedCount"])
assert len(paths) == len(set(paths)), "ADA PATH DUPLIKAT"
missing = [p for p in paths if not os.path.exists(p)]
print("hilang di repo:", missing or "tidak ada")
# cek online (opsional):
base = "https://taufik-hid.github.io/birthday25/"
bad = []
for p in paths:
    try:
        urllib.request.urlopen(base + p, timeout=10)
    except Exception:
        bad.append(p)
print("gagal diakses online:", bad or "tidak ada")
EOF
```

Saat runtime, `credits.js` juga memvalidasi: jumlah vs `expectedCount`, duplikasi
path, dan foto gagal dimuat (di-skip aman dengan peringatan di console — halaman
tidak crash).

## Fallback yang ditangani

- Fullscreen ditolak / tidak didukung → overlay fixed full-viewport
- Video gagal / autoplay diblok → skip video, langsung credits
- Foto individual gagal dimuat → di-skip (preload timeout 8s), tidak crash
- Manifest hilang → credits kosong + pesan penutup tetap jalan
- ESC menutup fullscreen browser secara native; setelah credits selesai,
  `exitFullscreen()` dipanggil otomatis
