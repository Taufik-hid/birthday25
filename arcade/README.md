# AMBAR'S DAY ARCADE 💖
Mini arcade ulang tahun untuk pasangan LDR. HTML/CSS/JS vanilla — tanpa login, backend, API key, atau build.

## Jalankan lokal
Buka `index.html` di browser, atau jalankan `npx serve .` / `python3 -m http.server` lalu buka http://localhost:8000.

## Edit nama, pesan, pertanyaan
Semua konten ada di **`config.js`**: nama (`partner`, `sender`), kuis (`quiz`, `a` = nomor jawaban benar mulai 0), `tot`, teka-teki `hunt` (`a` = jawaban yang diterima), tantangan `chal`, dan surat cinta `letter`. Pakai `{nama}` dan `{pengirim}` di teks mana pun. Nama juga bisa diubah dari layar awal / tombol "Ubah nama" di dashboard. **Pertanyaan kuis & teka-teki bawaan hanya contoh — ganti dengan kenangan kalian.**

## Deploy
- **Netlify Drop:** buka https://app.netlify.com/drop, seret ZIP ini atau folder hasil ekstraknya.
- **Vercel:** `npm i -g vercel` lalu `vercel --prod` di folder ini (`vercel.json` sudah ada, tidak perlu build).

## Catatan
Progres tersimpan di localStorage browser (per perangkat). Musik & efek suara disintesis lewat Web Audio (original, tanpa file), baru bunyi setelah tombol 🎵 ditekan. Tombol layar penuh disembunyikan di browser yang tidak mendukungnya (mis. iPhone).
