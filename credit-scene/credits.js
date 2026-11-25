/* Cinematic End Credits v2 — credit-scene/credits.js
   Dipicu dari arcade/app.js (finalCredits) lewat window.CreditScene.run({onDone}).
   Urutan: video pembuka (opsional, Cloudinary) → judul → bab per tahun (Ken Burns)
           → credits lucu → The End → post-credit scene → kembali ke dashboard.
   Semua teks ada di config.json. Satu "sutradara" (jam internal) mengatur semua adegan,
   dan durasinya dihitung supaya pas dengan lagu. Tap = pause, tombol "Lewati" = keluar.
   Musik: memakai ulang elemen audio arcade (window.__arcadeBgAudio) dan memulihkan
   keadaannya (lagu, posisi, volume, play/pause) setelah selesai.
*/
(function () {
  "use strict";

  var SCENE_BASE = (function () {
    var el = document.currentScript;
    if (!el || !el.src) {
      var ss = document.getElementsByTagName("script");
      for (var i = 0; i < ss.length; i++) {
        if (/credit-scene\/credits\.js/.test(ss[i].src)) { el = ss[i]; break; }
      }
    }
    if (el && el.src) { try { return new URL(".", el.src).href; } catch (e) {} }
    return "/credit-scene/";
  })();
  var REPO_BASE = (function () {
    try { return new URL("../", SCENE_BASE).href; } catch (e) { return "/"; }
  })();

  // ---------- util ----------
  function fetchJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " untuk " + url);
      return r.json();
    });
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function validateManifest(man) {
    var warnings = [];
    var photos = Array.isArray(man.photos) ? man.photos : [];
    var expected = man.expectedCount || 55;
    var unique = photos.filter(function (p, i) { return photos.indexOf(p) === i; });
    if (unique.length !== photos.length) warnings.push("Ada path ganda di photos.json");
    if (unique.length < expected) {
      warnings.push("photos.json berisi " + unique.length + " dari " + expected + " foto — tetap jalan.");
    }
    return { photos: unique, expected: expected, warnings: warnings };
  }

  // ---------- fullscreen ----------
  function requestFS() {
    var d = document.documentElement;
    try {
      if (d.requestFullscreen) return d.requestFullscreen();
      if (d.webkitRequestFullscreen) return d.webkitRequestFullscreen();
    } catch (e) {}
    return Promise.reject(new Error("fullscreen tidak didukung"));
  }
  function exitFS() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) return document.exitFullscreen();
      if (document.webkitFullscreenElement && document.webkitExitFullscreen) return document.webkitExitFullscreen();
    } catch (e) {}
    return Promise.resolve();
  }

  // ---------- timeline ----------
  var PATTERN = [1, 1, 2, 1, 3, 1, 2];
  var OPEN_DUR = 9, CARD_DUR = 4.5, END_DUR = 7;

  function makeGroups(ch) {
    var idx = [], i;
    for (i = ch.from; i <= ch.to; i++) idx.push(i);
    var groups = [], k = 0, p = 0;
    while (k < idx.length) {
      var n = ch.layout === "mix" ? PATTERN[p++ % PATTERN.length] : (ch.layout === "duo" ? 2 : 1);
      n = Math.min(n, idx.length - k);
      groups.push({ photos: idx.slice(k, k + n), n: n });
      k += n;
    }
    var caps = ch.captions || [];
    for (var j = 0; j < caps.length; j++) {
      var gi = Math.floor(j * groups.length / caps.length);
      groups[gi].caption = caps[j];
    }
    return groups;
  }

  // T = waktu akhir adegan The End (detik). Mengembalikan daftar adegan berurutan.
  function buildTimeline(cfg, nPhotos, T) {
    var chapters = (cfg.chapters || []).map(function (c) {
      return Object.assign({}, c, { from: Math.max(1, c.from | 0), to: Math.min(nPhotos, c.to | 0) });
    }).filter(function (c) { return c.to >= c.from; });
    if (!chapters.length && nPhotos) {
      chapters = [{ title: cfg.title || "Our Story", date: "", place: "", from: 1, to: nPhotos, pace: 1, layout: "mix", captions: [] }];
    }
    var hasCredits = !!(cfg.credits && cfg.credits.sections && cfg.credits.sections.length);
    var creditsDur = hasCredits ? (cfg.credits.seconds || 34) : 0;

    var all = [], totalW = 0, totalPhotos = 0;
    chapters.forEach(function (ch) {
      var gs = makeGroups(ch);
      gs.forEach(function (g) { g.w = (ch.pace || 1) * (1 + 0.45 * (g.n - 1)); totalW += g.w; totalPhotos += g.n; });
      all.push({ ch: ch, groups: gs });
    });
    var fixed = OPEN_DUR + chapters.length * CARD_DUR + creditsDur + END_DUR;
    var avail = Math.max(totalPhotos * 1.3, T - fixed);
    var unit = totalW ? avail / totalW : 0;

    var scenes = [], t = 0;
    scenes.push({ kind: "title", start: 0, dur: OPEN_DUR }); t = OPEN_DUR;
    all.forEach(function (c) {
      scenes.push({ kind: "card", start: t, dur: CARD_DUR, ch: c.ch }); t += CARD_DUR;
      c.groups.forEach(function (g) {
        var d = g.w * unit;
        scenes.push({ kind: "group", start: t, dur: d, photos: g.photos, caption: g.caption, ch: c.ch });
        t += d;
      });
    });
    if (hasCredits) { scenes.push({ kind: "credits", start: t, dur: creditsDur }); t += creditsDur; }
    scenes.push({ kind: "end", start: t, dur: END_DUR }); t += END_DUR;
    return { scenes: scenes, end: t, photoOrder: [].concat.apply([], all.map(function (c) { return [].concat.apply([], c.groups.map(function (g) { return g.photos; })); })) };
  }

  // ---------- musik ----------
  function arcadeBg() { return window.__arcadeBgAudio || null; }

  function fadeVolume(a, to, ms) {
    var from = a.volume, t0 = performance.now();
    return new Promise(function (res) {
      (function step() {
        var p = Math.min(1, (performance.now() - t0) / ms);
        try { a.volume = clamp(from + (to - from) * ease(p), 0, 1); } catch (e) {}
        if (p < 1) requestAnimationFrame(step); else res();
      })();
    });
  }

  // ---------- preload ----------
  function preloadPhoto(src, timeoutMs) {
    return new Promise(function (resolve) {
      var img = new Image();
      var timer = setTimeout(function () { resolve(false); }, timeoutMs || 12000);
      img.onload = function () { clearTimeout(timer); resolve(true); };
      img.onerror = function () { clearTimeout(timer); resolve(false); };
      img.src = src;
    });
  }

  // ---------- overlay ----------
  function ensureFont() {
    if (document.getElementById("cs-font")) return;
    var l = document.createElement("link");
    l.id = "cs-font"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap";
    document.head.appendChild(l);
  }

  function buildOverlay() {
    ensureFont();
    var ov = h("div"); ov.id = "credit-scene-overlay";
    ov.innerHTML =
      '<video id="cs-video" playsinline></video>' +
      '<div class="cs-world">' +
      '  <div class="cs-scenes" id="cs-scenes"></div>' +
      '  <div class="cs-dust" id="cs-dust" aria-hidden="true"></div>' +
      '  <div class="cs-leak" aria-hidden="true"></div>' +
      '  <div class="cs-grain" aria-hidden="true"></div>' +
      '  <div class="cs-vignette" aria-hidden="true"></div>' +
      '  <div class="cs-bar cs-bar-top" aria-hidden="true"></div>' +
      '  <div class="cs-bar cs-bar-bot" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="cs-loader" id="cs-loader"><div class="cs-loader-t">Menyiapkan kenangan…</div>' +
      '  <div class="cs-loader-bar"><i id="cs-loader-fill"></i></div></div>' +
      '<div class="cs-pause-ind" id="cs-pause-ind">❚❚</div>' +
      '<button class="cs-skip" id="cs-skip" type="button">Lewati ›</button>';
    document.body.appendChild(ov);
    var dust = ov.querySelector("#cs-dust");
    for (var i = 0; i < 22; i++) {
      var s = h("span");
      var size = 2 + Math.random() * 3.5;
      s.style.cssText = "left:" + (Math.random() * 100).toFixed(1) + "%;width:" + size.toFixed(1) +
        "px;height:" + size.toFixed(1) + "px;animation-duration:" + (14 + Math.random() * 16).toFixed(1) +
        "s;animation-delay:-" + (Math.random() * 30).toFixed(1) + "s;opacity:" + (0.25 + Math.random() * 0.5).toFixed(2);
      dust.appendChild(s);
    }
    return ov;
  }

  // gambar blur murah: foto dilukis ke kanvas 24px, lalu dibesarkan lewat CSS
  function paintBlur(canvas, img) {
    try {
      var w = 24, hgt = Math.max(8, Math.round(24 * (img.naturalHeight / img.naturalWidth)));
      canvas.width = w; canvas.height = hgt;
      canvas.getContext("2d").drawImage(img, 0, 0, w, hgt);
      canvas.classList.add("ready");
    } catch (e) {}
  }

  var KB = [
    { s0: 1.0, s1: 1.09, x: "-2.5%", y: "-1.5%" },
    { s0: 1.09, s1: 1.0, x: "2%", y: "1.5%" },
    { s0: 1.02, s1: 1.1, x: "2.5%", y: "-1%" },
    { s0: 1.1, s1: 1.02, x: "-2%", y: "1%" }
  ];
  var kbCounter = 0;

  function makePhoto(src, durSec, blurCanvas) {
    var fig = h("figure", "cs-frame");
    var img = new Image();
    img.className = "cs-kb";
    img.alt = "";
    img.decoding = "async";
    var k = KB[kbCounter++ % KB.length];
    img.style.setProperty("--s0", k.s0); img.style.setProperty("--s1", k.s1);
    img.style.setProperty("--x1", k.x); img.style.setProperty("--y1", k.y);
    img.style.animationDuration = (durSec + 1.4).toFixed(2) + "s";
    img.onload = function () { img.classList.add("ready"); if (blurCanvas && !blurCanvas.__done) { blurCanvas.__done = 1; paintBlur(blurCanvas, img); } };
    img.src = src;
    fig.appendChild(img);
    return fig;
  }

  // ---------- adegan ----------
  function sceneTitle(cfg) {
    var el = h("div", "cs-scene cs-s-title");
    el.appendChild(h("div", "cs-presents", cfg.presents || ""));
    el.appendChild(h("h1", "cs-main-title", cfg.title || "Our Story"));
    el.appendChild(h("div", "cs-rule"));
    el.appendChild(h("div", "cs-sub-title", cfg.subtitle || ""));
    return el;
  }

  function sceneCard(ch) {
    var el = h("div", "cs-scene cs-s-card");
    el.appendChild(h("div", "cs-card-date", ch.date || ""));
    el.appendChild(h("h2", "cs-card-title", ch.title || ""));
    el.appendChild(h("div", "cs-rule"));
    el.appendChild(h("div", "cs-card-place", ch.place || ""));
    return el;
  }

  function sceneGroup(sc, urls) {
    var el = h("div", "cs-scene cs-s-group cs-n" + sc.photos.length);
    var bg = h("canvas", "cs-bgblur");
    el.appendChild(bg);
    var row = h("div", "cs-photos");
    sc.photos.forEach(function (n, i) {
      var f = makePhoto(urls[n - 1], sc.dur, i === 0 ? bg : null);
      f.style.animationDelay = (i * 0.12) + "s";
      row.appendChild(f);
    });
    el.appendChild(row);
    if (sc.caption) {
      var cap = h("div", "cs-sub", sc.caption);
      var show = clamp(sc.dur - 1.4, 1.6, 3.6);
      cap.style.animationDuration = show.toFixed(2) + "s";
      el.appendChild(cap);
    }
    return el;
  }

  function sceneCredits(cfg, sc, urls) {
    var el = h("div", "cs-scene cs-s-credits");
    var bg = h("div", "cs-credits-bg");
    var side = (cfg.credits.sidePhotos || []).filter(function (n) { return urls[n - 1]; });
    if (side.length) {
      var step = sc.dur / side.length;
      var wrap = h("div", "cs-side");
      side.forEach(function (n, i) {
        var fig = h("figure", "cs-side-frame");
        var img = new Image(); img.className = "cs-side-img"; img.alt = ""; img.decoding = "async";
        img.src = urls[n - 1];
        fig.style.animationDuration = (step * 1.25).toFixed(2) + "s";
        fig.style.animationDelay = (i * step - step * 0.12).toFixed(2) + "s";
        fig.appendChild(img);
        wrap.appendChild(fig);
      });
      bg.appendChild(wrap);
    }
    el.appendChild(bg);
    var mask = h("div", "cs-roll-mask");
    var roll = h("div", "cs-roll");
    cfg.credits.sections.forEach(function (s) {
      var b = h("div", "cs-block");
      if (s.role) b.appendChild(h("div", "cs-role", s.role));
      (s.names || []).forEach(function (nm) { b.appendChild(h("div", "cs-name", nm)); });
      if (s.note) b.appendChild(h("div", "cs-note", s.note));
      roll.appendChild(b);
    });
    mask.appendChild(roll);
    el.appendChild(mask);
    el.__roll = roll;
    return el;
  }

  function sceneEnd(cfg) {
    var el = h("div", "cs-scene cs-s-end");
    el.appendChild(h("div", "cs-the-end", cfg.theEnd || "The End"));
    if (cfg.theEndNote) el.appendChild(h("div", "cs-end-note", cfg.theEndNote));
    return el;
  }

  function scenePost(cfg, urls, sc) {
    var pc = cfg.postCredit || {};
    var el = h("div", "cs-scene cs-s-post");
    var n = pc.photo || 1;
    if (urls[n - 1]) {
      var img = new Image(); img.className = "cs-post-img"; img.alt = ""; img.decoding = "async";
      img.style.animationDuration = (sc.dur + 3).toFixed(2) + "s";
      img.style.objectPosition = "50% " + (pc.focusY != null ? pc.focusY : 50) + "%";
      img.onload = function () { img.classList.add("ready"); };
      img.src = urls[n - 1];
      el.appendChild(img);
    }
    el.appendChild(h("div", "cs-post-shade"));
    var box = h("div", "cs-post-box");
    var msg = h("div", "cs-post-msg", "");
    var hint = h("div", "cs-post-hint", pc.hint || "");
    box.appendChild(msg); box.appendChild(hint);
    el.appendChild(box);
    el.__msg = msg; el.__hint = hint;
    el.__chars = Array.from(pc.message || cfg.closingMessage || "💖");
    return el;
  }

  // ---------- run ----------
  function run(opts) {
    if (window.__csRunning) return Promise.resolve();
    window.__csRunning = true;
    return _runInner(opts || {}).then(
      function () { window.__csRunning = false; },
      function (e) { window.__csRunning = false; throw e; }
    );
  }

  async function _runInner(opts) {
    var cfg, man;
    // Jalankan sinkron di dalam gestur klik: "buka kunci" elemen audio & redam musik arcade
    var bg = arcadeBg();
    var saved = null;
    if (bg) {
      saved = { src: bg.src, time: bg.currentTime, vol: bg.__csOriginalVolume != null ? bg.__csOriginalVolume : bg.volume, paused: bg.paused };
      bg.__csOriginalVolume = saved.vol;
      if (bg.paused) { try { bg.volume = 0; bg.play().catch(function () {}); } catch (e) {} }
      else fadeVolume(bg, 0, 700);
    }
    try { cfg = await fetchJSON(SCENE_BASE + "config.json"); } catch (e) { cfg = {}; }
    try { man = await fetchJSON(SCENE_BASE + "photos.json"); } catch (e) { console.warn("[credits] photos.json gagal:", e); man = { expectedCount: 55, photos: [] }; }
    var val = validateManifest(man);
    val.warnings.forEach(function (w) { console.warn("[credits] " + w); });
    var urls = val.photos.map(function (p) { return REPO_BASE + p; });

    var ov = buildOverlay();
    var scenesEl = ov.querySelector("#cs-scenes");
    var skipBtn = ov.querySelector("#cs-skip");
    var loader = ov.querySelector("#cs-loader");
    var loaderFill = ov.querySelector("#cs-loader-fill");
    var video = ov.querySelector("#cs-video");

    var fsOK = false;
    try { await requestFS(); fsOK = !!document.fullscreenElement; } catch (e) {}
    if (!fsOK) ov.classList.add("cs-no-fs");
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ov.classList.add("cs-reduced");

    // ----- kendali pengguna -----
    var aborted = false, paused = false, abortResolve = null;
    var abortP = new Promise(function (r) { abortResolve = r; });
    function abort() { if (!aborted) { aborted = true; abortResolve(); } }
    skipBtn.addEventListener("click", function (e) { e.stopPropagation(); abort(); });
    var audio = null, audioStarted = false;
    function setPaused(p) {
      paused = p;
      ov.classList.toggle("cs-paused", p);
      if (audio && audioStarted) { try { p ? audio.pause() : audio.play().catch(function () {}); } catch (e) {} }
      if (video && video.classList.contains("show")) { try { p ? video.pause() : video.play().catch(function () {}); } catch (e) {} }
    }
    ov.addEventListener("click", function () { if (!aborted) setPaused(!paused); });
    function onVis() { if (document.hidden && !paused) setPaused(true); }
    document.addEventListener("visibilitychange", onVis);

    var raf = 0;
    try {
      // ----- preload dimulai segera (juga selama video pembuka) -----
      var order = [];
      var preloadDone = 0, gateTarget = 1, gateResolve = null;
      var gateP = new Promise(function (r) { gateResolve = r; });
      var queue = [];
      function startPreload(list) {
        queue = list.slice();
        gateTarget = Math.min(8, queue.length);
        if (!queue.length) { gateResolve(); return; }
        var workers = 3;
        for (var w = 0; w < workers; w++) (async function () {
          while (queue.length && !aborted) {
            var u = queue.shift();
            await preloadPhoto(u, 12000);
            preloadDone++;
            if (preloadDone >= gateTarget) gateResolve();
            loaderFill.style.width = Math.min(100, Math.round(preloadDone / gateTarget * 100)) + "%";
          }
        })();
      }

      // ----- video pembuka (opsional) -----
      // timeline dihitung setelah durasi lagu diketahui, tapi foto bab 1 sudah bisa dimuat
      var musicCfg = cfg.music && cfg.music.src ? cfg.music : null;
      var quickOrder = [];
      for (var qi = 0; qi < Math.min(urls.length, 12); qi++) quickOrder.push(urls[qi]);
      startPreload(quickOrder.concat(urls.slice(12)));

      var vurl = cfg.cloudinaryVideoUrl;
      if (vurl && !aborted) {
        loader.classList.add("hide");
        await Promise.race([abortP, new Promise(function (resolve) {
          var settled = false, guard = null;
          var done = function () { if (!settled) { settled = true; clearTimeout(guard); resolve(); } };
          video.src = vurl; video.classList.add("show");
          video.onended = done;
          video.onerror = function () { console.warn("[credits] video pembuka gagal — lanjut"); video.classList.remove("show"); done(); };
          video.onloadedmetadata = function () { guard = setTimeout(done, (video.duration || 0) * 1000 + 30000); };
          guard = setTimeout(done, 90000);
          video.play().catch(function () {
            video.muted = true;
            video.play().catch(function () { console.warn("[credits] autoplay ditolak — skip video"); video.classList.remove("show"); done(); });
          });
        })]);
        try { video.pause(); } catch (e) {}
        video.classList.remove("show");
        loader.classList.remove("hide");
      }

      // ----- siapkan lagu -----
      var musicDur = (musicCfg && musicCfg.durationSec) || 238;
      if (musicCfg && !aborted) {
        audio = bg || new Audio();
        try {
          audio.pause();
          audio.src = REPO_BASE + musicCfg.src;
          audio.volume = 0;
          audio.loop = false;
          await Promise.race([
            new Promise(function (r) { audio.addEventListener("loadedmetadata", r, { once: true }); audio.load(); }),
            sleep(4000)
          ]);
          if (isFinite(audio.duration) && audio.duration > 30) musicDur = audio.duration;
        } catch (e) { console.warn("[credits] lagu gagal disiapkan:", e); audio = null; }
      }
      var T = Math.max(60, musicDur - 1.0);
      var tl = buildTimeline(cfg, urls.length, T);

      // foto yang dibutuhkan pertama kali didahulukan sesuai urutan tayang
      if (!aborted) {
        await Promise.race([gateP, sleep(25000), abortP]);
      }
      loader.classList.add("hide");
      if (aborted) throw new Error("abort");

      // ----- post-credit scene dijadwalkan setelah The End -----
      var pc = cfg.postCredit || {};
      var msgChars = Array.from(pc.message || cfg.closingMessage || "💖");
      var typeStart = 2.0, typeDur = msgChars.length * 0.055;
      var postDur = typeStart + typeDur + 1.6 + (pc.holdSeconds != null ? pc.holdSeconds : 5);
      var postSc = { kind: "post", start: tl.end + 0.4, dur: postDur };
      var scenes = tl.scenes.concat([postSc]);
      var finalEnd = postSc.start + postSc.dur;

      // ----- mulai lagu + jam sutradara -----
      var clock = Math.max(0, +opts.startAt || 0);
      if (audio) {
        try { audio.currentTime = clock; } catch (e) {}
        try { await audio.play(); audioStarted = true; } catch (e) { console.warn("[credits] lagu tidak bisa diputar:", e); }
      }
      ov.classList.add("cs-open-bars");

      var active = [];
      var nextIdx = 0;
      var last = performance.now();
      var lastLabel = "";

      function startScene(sc) {
        var el;
        if (sc.kind === "title") el = sceneTitle(cfg);
        else if (sc.kind === "card") el = sceneCard(sc.ch);
        else if (sc.kind === "group") el = sceneGroup(sc, urls);
        else if (sc.kind === "credits") el = sceneCredits(cfg, sc, urls);
        else if (sc.kind === "end") el = sceneEnd(cfg);
        else el = scenePost(cfg, urls, sc);
        el.style.setProperty("--dur", sc.dur.toFixed(2) + "s");
        scenesEl.appendChild(el);
        if (sc.kind === "credits" && el.__roll) {
          var roll = el.__roll;
          var lastBlock = roll.lastElementChild;
          var yEnd = lastBlock
            ? window.innerHeight / 2 - (lastBlock.offsetTop + lastBlock.offsetHeight / 2)
            : -(window.innerHeight + roll.offsetHeight);
          roll.style.setProperty("--cs-end", yEnd + "px");
          roll.style.animationDuration = sc.dur.toFixed(2) + "s";
          roll.classList.add("go");
        }
        if (sc.kind === "post") ov.classList.add("cs-post");
        active.push({ sc: sc, el: el, removed: false, out: false });
      }

      var finished = new Promise(function (resolveFinish) {
        function frame(now) {
          if (aborted) { resolveFinish(); return; }
          var dt = Math.min(100, now - last); last = now;
          if (!paused) clock += dt / 1000;

          while (nextIdx < scenes.length && scenes[nextIdx].start <= clock) {
            var due = scenes[nextIdx++];
            if (due.start + due.dur > clock || due.kind === "post") startScene(due); // lewati adegan yang sudah lewat (startAt)
          }

          for (var i = active.length - 1; i >= 0; i--) {
            var a = active[i], s = a.sc;
            if (!a.out && clock >= s.start + s.dur && s.kind !== "post") { a.out = true; a.el.classList.add("out"); }
            if (a.out && clock >= s.start + s.dur + 1.6) { a.el.remove(); active.splice(i, 1); continue; }
            if (s.kind === "post") {
              var lt = clock - s.start;
              var n = clamp(Math.floor((lt - typeStart) / 0.055), 0, a.el.__chars.length);
              var txt = a.el.__chars.slice(0, n).join("");
              if (txt !== a.el.__msg.textContent) a.el.__msg.textContent = txt;
              if (lt > typeStart + typeDur + 0.6) a.el.__hint.classList.add("show");
              if (lt > 0.5) a.el.classList.add("in");
            }
          }

          // volume lagu mengikuti jam
          if (audio && audioStarted) {
            var m = musicCfg, v = m.volume != null ? m.volume : 0.85;
            var fi = m.fadeInSec || 3, fo = m.fadeOutSec || 6;
            if (clock < fi) v *= ease(clock / fi);
            if (clock > T - fo) v *= 1 - ease((clock - (T - fo)) / fo);
            try { audio.volume = clamp(v, 0, 1); } catch (e) {}
            if (clock >= T && !audio.paused) { try { audio.pause(); } catch (e) {} }
          }

          var label = clock >= postSc.start ? "Selesai ›" : "Lewati ›";
          if (label !== lastLabel) { skipBtn.textContent = label; lastLabel = label; }
          skipBtn.classList.toggle("show", clock > 1.5);

          if (clock >= finalEnd) { resolveFinish(); return; }
          raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
      });
      await Promise.race([finished, abortP]);
    } catch (e) {
      if (e && e.message !== "abort") console.warn("[credits] error:", e);
    } finally {
      // pembersihan SELALU dijalankan — error di tengah jalan tidak boleh menyisakan overlay
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      try { ov.classList.add("cs-fade-out"); } catch (e) {}
      await sleep(900);
      try { video.pause(); } catch (e) {}
      ov.remove();
      await exitFS();
      if (bg && saved) {
        try {
          bg.pause();
          bg.src = saved.src;
          bg.volume = saved.vol;
          var resume = function () {
            try { bg.currentTime = saved.time; } catch (e) {}
            if (!saved.paused) bg.play().catch(function () {});
          };
          bg.addEventListener("loadedmetadata", resume, { once: true });
          bg.load();
        } catch (e) { console.warn("[credits] restore musik gagal:", e); }
      } else if (audio) {
        try { audio.pause(); } catch (e) {}
      }
      if (typeof opts.onDone === "function") opts.onDone();
    }
  }

  window.CreditScene = { run: run, validateManifest: validateManifest, shuffle: shuffle, _buildTimeline: buildTimeline };
})();
