# Cinematic End Credits v2 — Panduan

Credit scene dipicu **hanya** oleh tombol **"Kembali ke Dashboard"** di bagian bawah
*The Final Surprise* (`arcade/app.js` → `finalCredits()` → `CreditScene.run({onDone})`).

## Alur (± 4 menit, pas dengan lagu)

| Detik | Adegan |
|---|---|
| (sebelum) | Video pembuka Cloudinary (opsional, `cloudinaryVideoUrl`) |
| 0–9 | Kartu judul "Our Story" |
| 9–196 | 6 bab: kartu bab (tanggal · judul · tempat) → foto dengan Ken Burns, tempo berubah per bab, kadang 2–3 foto sekaligus |
| 196–230 | Credits bergulir (lucu) + foto bergantian di sisi kanan |
| 230–237 | The End |
| 238–252 | Post-credit: foto favorit layar penuh, pesan diketik huruf demi huruf, "kado susulan" |

Kontrol: **tap** = pause/lanjut, **Lewati ›** (pojok kanan atas) = keluar. Tab disembunyikan = otomatis pause.

## Yang diedit lewat `config.json`

- `title`, `subtitle`, `presents` — kartu judul.
- `music` — `src` (path dari root repo), `durationSec` (cadangan; durasi asli dibaca otomatis), `volume`, `fadeInSec`, `fadeOutSec`.
  Durasi semua adegan **dihitung ulang otomatis** dari panjang lagu, jadi ganti lagu = tinggal ganti `src`.
- `chapters` — tiap bab: `title`, `date`, `place`, `from`/`to` (nomor foto, 1 = `photo-001.jpg`),
  `pace` (>1 lebih pelan, <1 lebih cepat), `layout` (`single` atau `mix`), `captions` (teks di bawah foto).
  Pastikan rentang `from`–`to` semua bab menutup seluruh foto tanpa tumpang tindih.
- `credits.sections` — daftar `role` / `names` / `note`. `credits.seconds` = lama credits bergulir.
  `credits.sidePhotos` = nomor foto yang muncul bergantian di sisi kanan.
- `theEnd`, `theEndNote` — teks penutup.
- `postCredit` — `photo` (nomor foto), `focusY` (0–100, bagian vertikal foto yang dijaga di layar lebar), `message`, `hint`, `holdSeconds`.

## Foto

`photos.json` tetap daftar urutan kronologis (`photo-001` … `photo-055`). Foto sudah diperkecil
ke sisi terpanjang 1280 px (±11 MB total, dulu 164 MB). Jika menambah foto: perkecil dulu
ke ±1280 px, tambahkan ke `photos.json`, lalu masukkan nomornya ke salah satu bab di `config.json`.

## Musik

Credits memakai ulang elemen audio arcade (`window.__arcadeBgAudio`), mengganti lagunya ke
*Young and Beautiful*, lalu **memulihkan** lagu, posisi, volume, dan status play/pause semula.
Catatan: file mp3 di `arcade/music/` adalah hasil unduhan berhak cipta. Untuk repo publik, pertimbangkan
repo privat atau musik bebas royalti.

## Uji cepat dari tengah

Di konsol browser: `CreditScene.run({ startAt: 190 })` mulai dari detik 190 (mis. langsung ke credits).

## Catatan teknis

- Animasi hanya memakai `transform` dan `opacity`. Latar blur dibuat dari kanvas 24 px yang dibesarkan CSS (murah di HP).
- Foto dimuat bertahap (8 pertama ditunggu dengan layar "Menyiapkan kenangan…", sisanya di latar belakang).
- Bila terjadi error di tengah jalan, overlay tetap dibersihkan dan pengguna kembali ke dashboard.
- Font Cormorant Garamond dimuat dari Google Fonts; jika offline, jatuh ke Georgia.
- `prefers-reduced-motion` mematikan Ken Burns, grain, dan debu.
