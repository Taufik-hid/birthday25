/* Romantic Cinematic End Credits — credit-scene/credits.js
   Dipicu TIDAK di sini: integrasi tombol ada di arcade/app.js (finalCredits()).
   Modul ini menyediakan window.CreditScene.run(opts) dan mengelola:
   video pembuka (Cloudinary) → rolling credits (foto GitHub + teks) →
   pesan penutup → kembali ke dashboard.
   Audio: MENGGUNAKAN KEMBALI elemen #bg-music yang sudah ada (tanpa instance kedua).
*/
(function () {
  "use strict";

  const SCENE_BASE = "/credit-scene/"; // absolut dari root site (arcade ada di /arcade/)
  const REPO_BASE = ""; // foto memakai path relatif repo root (dilayani dari root site)

  // ---------- util ----------
  function fetchJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " untuk " + url);
      return r.json();
    });
  }

  // Fisher-Yates shuffle — urutan acak baru setiap pemutaran
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function preloadPhoto(src, timeoutMs) {
    return new Promise(function (resolve) {
      const img = new Image();
      const timer = setTimeout(function () { resolve(null); }, timeoutMs || 8000);
      img.onload = function () { clearTimeout(timer); resolve(img); };
      img.onerror = function () { clearTimeout(timer); resolve(null); };
      img.src = src;
    });
  }

  // ---------- validasi manifest ----------
  function validateManifest(man) {
    const warnings = [];
    const photos = Array.isArray(man.photos) ? man.photos : [];
    const expected = man.expectedCount || 55;
    // duplikasi path
    const seen = Object.create(null);
    photos.forEach(function (p) { seen[p] = (seen[p] || 0) + 1; });
    const dups = Object.keys(seen).filter(function (p) { return seen[p] > 1; });
    if (dups.length) {
      warnings.push("Duplikasi path di manifest: " + dups.join(", "));
    }
    // unik, urut tetap
    const unique = photos.filter(function (p, i) { return photos.indexOf(p) === i; });
    if (unique.length < expected) {
      warnings.push("Manifest baru berisi " + unique.length + " dari " + expected +
        " foto — credit scene tetap jalan dengan foto yang tersedia.");
    }
    return { photos: unique, expected: expected, warnings: warnings };
  }

  // ---------- audio: pakai ulang bg-music yang ada ----------
  // Arcade membuat elemen <audio id="bg-music-src"> ? Tidak — arcade memakai
  // new Audio() (BG). Untuk kesinambungan tanpa musik ganda, kita FADE-DOWN
  // volume BG arcade selama video/credits, lalu RESTORE ke nilai semula.
  function arcadeBg() { return window.__arcadeBgAudio || null; }

  function duckArcadeMusic(to, ms) {
    const a = arcadeBg(); if (!a) return Promise.resolve();
    const from = a.volume, t0 = performance.now();
    return new Promise(function (res) {
      (function step() {
        const p = Math.min(1, (performance.now() - t0) / ms);
        a.volume = from + (to - from) * (p * p * (3 - 2 * p));
        if (p < 1) requestAnimationFrame(step); else res();
      })();
    });
  }

  function restoreArcadeMusic(ms) {
    const a = arcadeBg(); if (!a) return Promise.resolve();
    const target = a.__csOriginalVolume != null ? a.__csOriginalVolume : 0.45;
    const from = a.volume, t0 = performance.now();
    return new Promise(function (res) {
      (function step() {
        const p = Math.min(1, (performance.now() - t0) / ms);
        a.volume = from + (target - from) * (p * p * (3 - 2 * p));
        if (p < 1) requestAnimationFrame(step); else res();
      })();
    });
  }

  // ---------- fullscreen ----------
  function requestFS(el) {
    const docEl = document.documentElement;
    const el2 = el || docEl;
    try {
      if (el2.requestFullscreen) return el2.requestFullscreen();
      if (el2.webkitRequestFullscreen) return el2.webkitRequestFullscreen();
    } catch (e) { /* fallback overlay */ }
    return Promise.reject(new Error("fullscreen tidak didukung"));
  }
  function exitFS() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) return document.exitFullscreen();
      if (document.webkitFullscreenElement && document.webkitExitFullscreen) return document.webkitExitFullscreen();
    } catch (e) { /* ignore */ }
    return Promise.resolve();
  }

  // ---------- durasi otomatis ----------
  // total = max(scrollCreditsDur, videoDur) + closing + transisi buffer
  function computeTimings(nPhotos, videoDurMs, cfg) {
    const SCROLL_MS_PER_ITEM = 1600;   // kecepatan per foto+credit block
    const FADE_MS = 900;               // transisi antar foto
    const END_PAD_MS = 4000;           // buffer akhir sebelum credits selesai
    const scrollDur = nPhotos * SCROLL_MS_PER_ITEM + 6000; // + intro credits title
    const closing = (cfg.closingMessageSeconds || 6) * 1000;
    // video SUDAH selesai sebelum credits mulai → durasi credits murni dari jumlah foto,
    // bukan di-stretch mengikuti durasi video
    const total = scrollDur + closing + FADE_MS + END_PAD_MS;
    return { scrollDur: scrollDur, closing: closing, fade: FADE_MS, total: total };
  }

  // ---------- overlay ----------
  function buildOverlay() {
    const ov = document.createElement("div");
    ov.id = "credit-scene-overlay";
    ov.innerHTML =
      '<div class="cs-stage">' +
      '  <video id="cs-video" playsinline autoplay></video>' +
      '  <div class="cs-credits-wrap">' +
      '    <div class="cs-grain" aria-hidden="true"></div>' +
      '    <div class="cs-vignette" aria-hidden="true"></div>' +
      '    <div class="cs-roll" id="cs-roll"></div>' +
      '  </div>' +
      '  <div class="cs-closing" id="cs-closing"></div>' +
      '</div>';
    document.body.appendChild(ov);
    return ov;
  }

  function buildRoll(photos, cfg) {
    const roll = document.getElementById("cs-roll");
    let html = '<div class="cs-title-block"><h1 class="cs-main-title">Our Story</h1>' +
      '<p class="cs-sub-title">Sebuah perjalanan yang kita jalankan bersama</p></div>';
    photos.forEach(function (p, i) {
      const big = i % 3 === 0; // pola: 1 spotlight, 2 sisi teks
      html += big
        ? '<div class="cs-item cs-spotlight"><img class="cs-photo" loading="lazy" src="/' + p + '" alt="Kenangan ' + (i + 1) + '"><div class="cs-cap">Moment ' + (i + 1) + '</div></div>'
        : '<div class="cs-item cs-side"><div class="cs-role">' + (i % 2 === 1 ? 'Starring' : 'And') + '</div><div class="cs-name">' + (i % 2 === 1 ? 'Kamu 💖' : 'Aku') + '</div><img class="cs-photo cs-photo-sm" loading="lazy" src="/' + p + '" alt="Kenangan ' + (i + 1) + '"></div>';
    });
    html += '<div class="cs-end-block"><p class="cs-the-end">The End</p></div>';
    roll.innerHTML = html;
    return roll;
  }

  // ---------- run ----------
  async function run(opts) {
    // guard: hanya satu pemutaran aktif — panggilan berulang diabaikan aman
    if (window.__csRunning) return;
    window.__csRunning = true;
    try { await _runInner(opts); }
    finally { window.__csRunning = false; }
  }

  async function _runInner(opts) {
    opts = opts || {};
    let cfg, man;
    try { cfg = await fetchJSON(SCENE_BASE + "config.json"); }
    catch (e) { cfg = { cloudinaryVideoUrl: "", closingMessage: "💖" }; }
    try { man = await fetchJSON(SCENE_BASE + "photos.json"); }
    catch (e) {
      console.warn("[credits] manifest gagal dimuat:", e);
      man = { expectedCount: 55, photos: [] };
    }
    const val = validateManifest(man);
    val.warnings.forEach(function (w) { console.warn("[credits] " + w); });

    const ov = buildOverlay();
    const video = document.getElementById("cs-video");
    const closingEl = document.getElementById("cs-closing");
    closingEl.textContent = cfg.closingMessage || "💖";

    // simpan & duck musik arcade (kesinambungan, tanpa instance kedua)
    const bg = arcadeBg();
    let bgWasPlaying = false;
    if (bg) {
      bg.__csOriginalVolume = bg.__csOriginalVolume == null ? bg.volume : bg.__csOriginalVolume;
      bgWasPlaying = !bg.paused;
      await duckArcadeMusic(0.12, 800);
    }

    // fullscreen — jika gagal, overlay fixed full-viewport sudah menangani
    let fsOK = false;
    try { await requestFS(); fsOK = !!document.fullscreenElement; } catch (e) { fsOK = false; }
    if (!fsOK) ov.classList.add("cs-no-fs");

    // video pembuka (Cloudinary) — opsional
    let videoDur = 0;
    const vurl = cfg.cloudinaryVideoUrl;
    if (vurl) {
      await new Promise(function (resolve) {
        let settled = false;
        const done = function () { if (!settled) { settled = true; resolve(); } };
        video.src = vurl;
        video.classList.add("show");
        video.onloadedmetadata = function () { videoDur = (video.duration || 0) * 1000; };
        video.onended = done;
        video.onerror = function () { console.warn("[credits] video pembuka gagal — lanjut ke credits"); video.classList.remove("show"); done(); };
        // safety: durasi video + 30s margin (timeout statis 90s memotong video panjang)
        video.onloadedmetadata = function () {
          videoDur = (video.duration || 0) * 1000;
          setTimeout(done, videoDur + 30000);
        };
        video.play().catch(function () { done(); }); // autoplay ditolak → skip video
      });
      video.classList.remove("show");
    }

    // fade ke layar hitam + rolling credits
    ov.classList.add("cs-fade-black");
    await new Promise(function (r) { setTimeout(r, 700); });

    const photos = shuffle(val.photos);
    const roll = buildRoll(photos, cfg);
    const t = computeTimings(photos.length, videoDur, cfg);

    // durasi roll diikat ke total (CSS transition)
    roll.style.animationDuration = (t.total - t.closing) + "ms";
    ov.classList.add("cs-rolling");

    // preload selektif: 3 foto ke depan
    let preloaded = 0;
    (function preloadNext() {
      if (preloaded >= photos.length) return;
      preloadPhoto("/" + photos[preloaded], 8000);
      preloaded++;
      if (preloaded < photos.length) setTimeout(preloadNext, 1200);
    })();

    // tunggu roll selesai (durasi sudah dihitung otomatis)
    await new Promise(function (r) { setTimeout(r, Math.max(0, t.total - t.closing)); });

    // pesan penutup
    closingEl.classList.add("show");
    await new Promise(function (r) { setTimeout(r, t.closing); });
    ov.classList.add("cs-fade-out");

    await new Promise(function (r) { setTimeout(r, 900); });
    await exitFS();
    ov.remove();

    // restore musik arcade
    if (bg && bgWasPlaying) await restoreArcadeMusic(1500);
    else if (bg) await restoreArcadeMusic(1500);

    if (typeof opts.onDone === "function") opts.onDone();
  }

  window.CreditScene = { run: run, validateManifest: validateManifest, shuffle: shuffle };
})();
