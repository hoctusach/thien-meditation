window.__thienJS = (window.__thienJS || 0) + 1;   // load marker (index.html checks all 5 scripts are this version or newer)
(() => {
  const A = window.AFFIRMATIONS || [];
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, "0");
  const state = { breathPat: "478", lang: "both", dur: 0, tone: 432, bell: 5, lastBell: 0, gap: 40, auto: true, playing: false, idx: 0, order: [], elapsed: 0, token: 0, session: null, goalNoted: false };

  // ---------- saved settings (per device, localStorage); bad/old values are ignored ----------
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
               set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
               del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
  ["loop", "shuffle", "breath", "keepGoing"].forEach(id => {          // Settings checkboxes
    const el = $(id), v = LS.get("thien.cb." + id);
    if (v === "1" || v === "0") el.checked = v === "1";
    el.addEventListener("change", () => LS.set("thien.cb." + id, el.checked ? "1" : "0"));
  });
  document.querySelectorAll("details").forEach((d, i) => {           // which sections are open
    const key = "thien.open." + (d.id || d.className.trim().replace(/\s+/g, ".") || i), v = LS.get(key);
    if (v === "1" || v === "0") d.open = v === "1";
    d.addEventListener("toggle", () => LS.set(key, d.open ? "1" : "0"));
  });

  // ---------- items: every VI line and every EN line is its own quote ----------
  const ITEMS = [];
  A.forEach((a, n) => { ITEMS.push({ n, lang: "vi", text: a.vi, own: a.group === "Của bạn" }); ITEMS.push({ n, lang: "en", text: a.en, own: a.group === "Của bạn" }); });
  const fileOf = it => `audio/${it.lang}_${pad(it.n + 1)}.mp3`;
  const allowed = it => state.lang === "both" || state.lang === it.lang;
  $("total").textContent = ITEMS.length;
  ITEMS.forEach((it, k) => {
    const li = document.createElement("li");
    li.dataset.lang = it.lang;
    li.innerHTML = `<em class="tag">${it.lang === "vi" ? "VI" : "EN"}</em> ${it.text}`;
    li.onclick = () => {
      if (!allowed(it)) return;
      state.idx = Math.max(0, state.order.indexOf(k));
      if (!state.playing) start(); else { state.token++; runLoop(); }
    };
    $("allLines").appendChild(li);
  });
  const makeOrder = () => {
    let ord = ITEMS.map((_, k) => k).filter(k => allowed(ITEMS[k]));
    if ($("shuffle").checked) {
      const own = ord.filter(k => ITEMS[k].own), rest = ord.filter(k => !ITEMS[k].own);
      for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
      ord = own.concat(rest);
    }
    state.order = ord;
    document.querySelectorAll("#allLines li").forEach((li, k) => li.classList.toggle("off", !allowed(ITEMS[k])));
  };

  // ---------- progress: which quote this device reached (by quote text, so edits to the list don't break it) ----------
  const PROG = "thien.progress.v1";
  const keyOf = k => ITEMS[k].lang + "|" + ITEMS[k].text;
  const kOfKey = new Map(ITEMS.map((it, k) => [it.lang + "|" + it.text, k]));
  function saveProgress() {
    if (state.curK == null || !ITEMS[state.curK]) return;
    LS.set(PROG, JSON.stringify({ last: keyOf(state.curK), order: $("shuffle").checked ? state.order.map(keyOf) : null }));
  }
  function restoreProgress() {
    let p = null; try { p = JSON.parse(LS.get(PROG)); } catch (e) {}
    if (!p || typeof p.last !== "string") return;
    if ($("shuffle").checked && Array.isArray(p.order)) {             // keep the same shuffled order as last time
      const seen = new Set(), ord = [];
      p.order.forEach(x => { const k = kOfKey.get(x); if (k !== undefined && allowed(ITEMS[k]) && !seen.has(k)) { seen.add(k); ord.push(k); } });
      state.order.forEach(k => { if (!seen.has(k)) ord.push(k); });  // quotes added since then
      state.order = ord;
    }
    const lastK = kOfKey.get(p.last);
    let pos = 0;
    if (lastK !== undefined && state.order.includes(lastK)) pos = state.order.indexOf(lastK) + 1;
    else if (lastK !== undefined) { const i = state.order.findIndex(k => k > lastK); pos = i < 0 ? 0 : i; }   // other language now
    state.idx = pos >= state.order.length ? 0 : pos;
    if (lastK !== undefined) state.curK = lastK;
    if (state.order.length) $("counter").textContent = `· ${state.idx + 1}/${state.order.length}`;
  }

  // ---------- segmented controls (each choice is remembered) ----------
  const segSet = (id, key, b) => {
    $(id).querySelectorAll("button").forEach(x => x.classList.remove("on")); b.classList.add("on");
    state[key] = key === "lang" || key === "breathPat" ? b.dataset.v : key === "auto" ? b.dataset.v === "1" : Number(b.dataset.v);
  };
  const seg = (id, key, cb, storeKey) => {
    const btns = [...$(id).querySelectorAll("button")];
    btns.forEach(b => b.onclick = () => { segSet(id, key, b); if (storeKey) LS.set(storeKey, b.dataset.v); cb && cb(); });
    const v = storeKey && LS.get(storeKey), b = v != null && btns.find(x => x.dataset.v === v);
    if (b) segSet(id, key, b);                                         // restore (no side effects)
  };
  seg("langSeg", "lang", () => {
    const curK = state.curK ?? -1;
    makeOrder();
    const pos = state.order.findIndex(k => k > curK);   // continue with the next allowed quote
    state.idx = pos < 0 ? 0 : pos; saveProgress();
  }, "thien.lang");
  // duration: default is unlimited; new storage key so everyone starts on "Không giới hạn" once
  seg("durSeg", "dur", () => { state.goalNoted = state.dur > 0 && state.elapsed >= state.dur * 60; showTime(); }, "thien.dur.v2");
  seg("bellSeg", "bell", () => { state.lastBell = Date.now(); if (state.bell !== 0 && !state.playing) { initAudio(); ctx.resume(); music.bell(); } }, "thien.bell");
  $("shuffle").addEventListener("change", () => {
    makeOrder();
    const p = state.curK == null ? -1 : state.order.indexOf(state.curK);
    state.idx = p < 0 ? 0 : p + 1; if (state.idx >= state.order.length) state.idx = 0; saveProgress();
  });
  seg("gapSeg", "gap", null, "thien.gap");
  seg("autoSeg", "auto", null, "thien.auto");
  makeOrder();          // with the remembered language
  restoreProgress();    // continue where this device left off

  // ---------- audio graph ----------
  let ctx, master, musicGain, duckGain, voiceGain, music, voiceEl, playlist, previewTimer;
  function initAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    voiceGain = ctx.createGain(); voiceGain.gain.value = $("voiceVol").value / 100; voiceGain.connect(master);
    // Speech normally plays as decoded Web Audio buffers (see playFile), so the music is the ONLY media element.
    // TVs (LG webOS) and some WebViews allow one playing <audio> at a time and paused the music for every quote.
    // voiceEl is only the fallback if fetching/decoding a quote fails.
    voiceEl = new Audio(); voiceEl.preload = "none";
    try { ctx.createMediaElementSource(voiceEl).connect(voiceGain); } catch (e) { /* fallback: element volume */ }
    duckGain = ctx.createGain(); duckGain.connect(musicGain);                 // music dips a little while a quote is spoken
    voiceEl.addEventListener("play", () => duck(true)); ["pause", "ended", "error"].forEach(ev => voiceEl.addEventListener(ev, () => { duck(false); ensureMusic(400); }));
    ctx.onstatechange = () => { if (state.playing && ctx.state !== "running" && ctx.state !== "closed") ctx.resume().catch(() => {}); };
    music = createMusic(ctx, musicGain);
    playlist = createPlaylist(ctx, duckGain, { auto: () => state.auto, onChange: () => { saveTrack(); showTrack(); mediaMeta(); },
      onUnexpectedPause: () => ensureMusic(voiceElBusy() ? 0 : 1200) });
    playlist.select(state.track || 0);
  }
  $("musicVol").oninput = () => { if (musicGain && (state.playing || previewTimer)) musicGain.gain.setTargetAtTime(mv(), ctx.currentTime, .3); };
  { const v = LS.get("thien.voiceVol"); if (v !== null && /^\d{1,3}$/.test(v) && +v <= 100) $("voiceVol").value = v; }
  $("voiceVol").oninput = () => { if (voiceGain) voiceGain.gain.value = $("voiceVol").value / 100; if (voiceEl) voiceEl.volume = 1; };
  ["input", "change"].forEach(t => $("voiceVol").addEventListener(t, () => LS.set("thien.voiceVol", $("voiceVol").value)));
  const mv = () => Math.pow($("musicVol").value / 100, 1.6) * 1.2;   // files are -24 LUFS; default 45 ≈ 15 dB under the voice
  { const v = LS.get("thien.musicVol"); if (v !== null && /^\d{1,3}$/.test(v) && +v <= 100) $("musicVol").value = v; }
  ["input", "change"].forEach(t => $("musicVol").addEventListener(t, () => LS.set("thien.musicVol", $("musicVol").value)));

  const duck = on => { if (duckGain) duckGain.gain.setTargetAtTime(on ? 0.7 : 1, ctx.currentTime, on ? .25 : .8); };
  const voiceElBusy = () => !!(voiceEl && !voiceEl.paused && !voiceEl.ended);
  // Safety net: if the music got paused while a session runs and the user didn't pause it (single-media-element
  // devices, OS interruptions), start it again — but never while the fallback speech element is still talking.
  let ensureTimer, revived = [];
  function ensureMusic(ms = 0) {
    clearTimeout(ensureTimer);
    ensureTimer = setTimeout(() => {
      if (!state.playing || !playlist || !playlist.running || voiceElBusy()) return;
      if (!playlist.element.paused) return;
      const now = Date.now(); revived = revived.filter(t => now - t < 60000);
      if (revived.length >= 6) return;                 // something keeps pausing it: don't fight forever
      revived.push(now); ctx.resume().catch(() => {}); playlist.ensure();
    }, ms);
  }
  // Media Session: lock-screen / remote / headset buttons control the whole session (so a pause there is a real pause)
  function mediaMeta() {
    if (!("mediaSession" in navigator) || !playlist) return;
    const t = TR[playlist.current] || {};
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.en || "Thiền", artist: "Thiền · Meditation", album: t.vi || "" }); } catch (e) {}
  }
  if ("mediaSession" in navigator) {
    const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) {} };
    h("play", () => { if (!state.playing) start(); });
    h("pause", () => { if (state.playing) stop(false); });
    h("stop", () => { if (state.session) finish(); });
    h("nexttrack", () => $("nextTrack").click());
    h("previoustrack", () => $("prevTrack").click());
  }
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}   // iOS 17+: Web Audio speech ignores the silent switch like the music

  // Bell only — background music lives in music.js (playlist).
  function createMusic(ctx) {
    return {
      // Chosen bell sound (pre-rendered, warm, long decay) — see tools/build_bells.py
      bell(id) { playBellSound(id || state.bellSound); state.lastBell = Date.now(); }
    };
  }

  // ---------- bell sounds ----------
  const BELL_SOUNDS = [
    { id: "thien", vi: "Chuông thiền", en: "Meditation bell" },
  ];
  window.BELL_SOUNDS = BELL_SOUNDS;
  const bellBufs = {};
  let bellGain = null;
  const bv = () => Math.pow($("bellVol").value / 100, 1.5) * 1.6;
  function loadBell(id) {
    if (!bellBufs[id]) bellBufs[id] = fetch(`audio/bells/${id}.mp3`).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no))).catch(e => { delete bellBufs[id]; throw e; });
    return bellBufs[id];
  }
  async function playBellSound(id) {
    initAudio();
    if (!bellGain) { bellGain = ctx.createGain(); bellGain.connect(master); }
    bellGain.gain.value = bv();
    try { const buf = await loadBell(id); const s = ctx.createBufferSource(); s.buffer = buf; s.connect(bellGain); s.start(); } catch (e) { console.warn("bell", e); }
  }
  state.bellSound = "thien";   // single fixed bell (Chuông thiền, 3 strikes) — no picker
  $("bellPreview").onclick = () => { initAudio(); ctx.resume(); playBellSound(state.bellSound); };
  { const v = LS.get("thien.bellVol"); if (v !== null && /^\d{1,3}$/.test(v) && +v <= 100) $("bellVol").value = v; }
  $("bellVol").oninput = () => { if (bellGain) bellGain.gain.value = bv(); try { localStorage.setItem("thien.bellVol", $("bellVol").value); } catch (e) {} };

  // ---------- now playing (music playlist UI) ----------
  const TR = window.MUSIC_TRACKS || [];
  TR.forEach((t, i) => { const o = document.createElement("option"); o.value = i; o.textContent = `${i + 1}. ${t.en}`; $("trackSel").appendChild(o); });
  { const t = LS.get("thien.track"), k = Number(t); state.track = t !== null && Number.isInteger(k) && k >= 0 && k < TR.length ? k : 0; }
  function saveTrack() { state.track = playlist.current; try { localStorage.setItem("thien.track", state.track); } catch (e) {} }
  function showTrack() {
    const i = playlist && playlist.current >= 0 ? playlist.current : state.track || 0, t = TR[i] || {};
    $("trackName").innerHTML = `${t.en || ""} <small>${t.vi || ""}</small>`;
    $("trackSel").value = i;
  }
  showTrack();
  // Changing track while no session is running plays a short preview, so the change is always audible.
  function preview() {
    clearTimeout(previewTimer);
    musicGain.gain.cancelScheduledValues(ctx.currentTime); musicGain.gain.setTargetAtTime(mv(), ctx.currentTime, .4);
    playlist.resume();
    previewTimer = setTimeout(() => { previewTimer = null; if (!state.playing) { musicGain.gain.setTargetAtTime(0, ctx.currentTime, .8); playlist.pause(2.5); } }, 20000);
  }
  const goTrack = i => { initAudio(); ctx.resume(); if (state.playing) playlist.play(i); else { playlist.select(i); preview(); } };
  $("prevTrack").onclick = () => goTrack((playlist ? playlist.current : state.track) - 1);
  $("nextTrack").onclick = () => goTrack((playlist ? playlist.current : state.track) + 1);
  $("trackSel").onchange = () => goTrack(Number($("trackSel").value));

  // ---------- breathing animation (4s in · 2s hold · 6s out) ----------
  let breathTimer;
  function breathe() {
    clearTimeout(breathTimer);
    const orb = $("orb"), t = $("breathText");
    if (!state.playing || !$("breath").checked) { orb.className = "orb"; orb.style.transitionDuration = "2s"; t.innerHTML = state.playing ? "" : "Sẵn sàng<small>Ready</small>"; return; }
    const [i, h, o] = state.breathPat === "426" ? [4, 2, 6] : [4, 7, 8];   // default: 4-7-8 Zen breathing
    const steps = [["in", i, "Hít vào", "Breathe in"], ["hold", h, "Giữ", "Hold"], ["out", o, "Thở ra", "Breathe out"]];
    let k = 0;
    const step = () => { if (!state.playing || !$("breath").checked) return breathe();
      const [c, s, vi, en] = steps[k % 3]; orb.style.transitionDuration = s + "s"; orb.className = "orb " + c; t.innerHTML = `${vi}<small>${en}</small>`; k++; breathTimer = setTimeout(step, s * 1000); };
    step();
  }
  $("breath").onchange = breathe;
  seg("breathSeg", "breathPat", () => { if (state.playing) breathe(); }, "thien.breath");

  // ---------- timer ----------
  let tick;
  const mmss = s => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
  const msss = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  const showTime = () => {
    const goal = state.dur * 60, e = state.elapsed;
    const up = s => s >= 3600 ? `${Math.floor(s / 3600)}:${mmss(s % 3600)}` : mmss(s);
    $("timeLeft").textContent = state.dur === 0 ? up(e) : e < goal ? mmss(goal - e) : `${mmss(goal)} +${msss(e - goal)}`;
  };
  showTime();

  // ---------- playback ----------
  const wait = (ms, tok) => new Promise(r => setTimeout(() => r(tok === state.token), ms));
  // ---------- speech: fetch + decodeAudioData + AudioBufferSourceNode (no media element) ----------
  const voiceBufs = new Map();
  let curVoice = null, waFails = 0;
  function loadVoice(src) {
    if (!ctx || waFails >= 2) return Promise.reject(new Error("webaudio off"));
    if (!voiceBufs.has(src)) {
      const p = fetch(src).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.arrayBuffer(); })
        .then(b => new Promise((ok, no) => { const q = ctx.decodeAudioData(b, ok, no); if (q && q.catch) q.catch(no); }));
      p.catch(() => voiceBufs.delete(src));
      voiceBufs.set(src, p);
      while (voiceBufs.size > 4) voiceBufs.delete(voiceBufs.keys().next().value);
    }
    return voiceBufs.get(src);
  }
  const prefetch = src => { if (ctx) loadVoice(src).catch(() => {}); };
  function stopVoice() {
    if (voiceEl) voiceEl.pause();
    if (curVoice) { const v = curVoice; curVoice = null; try { v.stop(); } catch (e) {} v.finish && v.finish(); }
  }
  async function playFile(src, tok) {
    if (tok !== state.token) return false;
    let buf = null;
    try { buf = await Promise.race([loadVoice(src), new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 10000))]); waFails = 0; }
    catch (e) { if (!/webaudio off/.test(e.message)) { waFails++; console.warn("voice: Web Audio failed, using <audio>", e.message); } }
    if (tok !== state.token) return false;
    if (buf) return new Promise(res => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.connect(voiceGain);
      let fin = false, guard;
      const done = () => { if (fin) return; fin = true; clearTimeout(guard); s.onended = null; if (curVoice === s) curVoice = null; duck(false); ensureMusic(300); res(tok === state.token); };
      const arm = () => { guard = setTimeout(() => ctx.state === "running" ? done() : arm(), buf.duration * 1000 + 3000); };   // in case onended never fires
      s.onended = done; s.finish = done; curVoice = s;
      ctx.resume().catch(() => {}); duck(true); s.start(); arm();
    });
    return playFileEl(src, tok);
  }
  function playFileEl(src, tok) {
    return new Promise(res => {
      if (tok !== state.token) return res(false);
      voiceEl.src = src; voiceEl.currentTime = 0;
      const done = () => { voiceEl.onended = voiceEl.onerror = null; res(tok === state.token); };
      voiceEl.onended = done; voiceEl.onerror = done;
      voiceEl.play().catch(done);
    });
  }
  function show(it) {
    const box = document.querySelector(".lines");
    box.classList.add("fade");
    setTimeout(() => {
      $("lineVi").textContent = it.text; $("lineVi").lang = it.lang;
      $("lineVi").className = it.lang === "vi" ? "vi" : "vi is-en";
      $("lineTag").textContent = it.lang === "vi" ? "Tiếng Việt" : "English";
      $("lineEn").textContent = "";
      box.classList.remove("fade");
    }, 500);
    const k = ITEMS.indexOf(it);
    document.querySelectorAll("#allLines li").forEach((li, i) => li.classList.toggle("cur", i === k));
  }
  // The bell has 3 strikes (0 s, 10 s, 20 s); speech waits until the last strike has rung out a little.
  const BELL_CLEAR_MS = 23000;
  // the pause after each quote; returns false if interrupted, "done" if the session should finish
  async function pauseAfter(tok) {
    let end = Date.now() + state.gap * 1000;
    while (Date.now() < end) {
      if (!await wait(Math.min(1000, end - Date.now()), tok)) return false;
      const left = end - Date.now();
      if (state.dur && state.elapsed >= state.dur * 60 && !state.goalNoted) {
        state.goalNoted = true;
        if (!$("keepGoing").checked) return "done";
        if (state.bell !== 0 && left > 6000) { music.bell(); end = Math.max(end, Date.now() + BELL_CLEAR_MS); }   // "goal reached", then keep going
      } else if (state.bell > 0 && left > 6000 && Date.now() - state.lastBell >= state.bell * 60000) {
        music.bell(); end = Math.max(end, Date.now() + BELL_CLEAR_MS);   // only inside a pause; the pause stretches so no speech is over the bell
      }
    }
    return true;
  }
  async function runLoop() {
    const tok = ++state.token;
    stopVoice();
    if (state.bell !== 0 && state.freshStart && !state.quietStart) { state.freshStart = false; music.bell(); if (!await wait(BELL_CLEAR_MS, tok)) return; }
    else await wait(1200, tok);
    while (state.playing && tok === state.token) {
      if (!state.order.length) makeOrder();
      if (state.idx >= state.order.length) {
        if (!$("loop").checked) { state.idx = 0; state.curK = undefined; LS.del(PROG); finish(); return; }   // whole list done: next time from the top
        makeOrder(); state.idx = 0;
      }
      const it = ITEMS[state.curK = state.order[state.idx]];
      $("counter").textContent = `· ${state.idx + 1}/${state.order.length}`;
      prefetch(fileOf(it)); show(it);
      if (!await wait(700, tok)) return;
      if (!await playFile(fileOf(it), tok)) return;
      const p = state.order.indexOf(state.curK);
      if (p >= 0) state.idx = p + 1;                   // (if the language filter changed mid-quote, idx is already set)
      saveProgress();                                  // remembered on this device: the next session continues after it
      { const nk = state.order[state.idx]; if (nk !== undefined) prefetch(fileOf(ITEMS[nk])); }
      const r = await pauseAfter(tok);
      if (!r) return;
      if (r === "done") { finish(); return; }
    }
  }
  function start(opts = {}) {
    initAudio(); ctx.resume();
    state.quietStart = !!opts.quietStart;            // started right after the reminder's own bell: don't ring again
    state.playing = true; $("playBtn").textContent = "❚❚";
    state.freshStart = !state.session;
    if (!state.session) { state.session = { start: Date.now(), sec: 0 }; state.elapsed = 0; state.goalNoted = false; }
    state.lastBell = Date.now(); $("stopBtn").hidden = false;
    clearTimeout(previewTimer); previewTimer = null;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(mv(), ctx.currentTime, 1.5);
    mediaMeta(); revived = [];
    playlist.resume();                                // tracks play in full, then crossfade (auto: next one · repeat: same one)
    clearInterval(tick);
    tick = setInterval(() => { if (!state.playing) return; if (state.elapsed % 3 === 2) ensureMusic(0); state.elapsed++; state.session.sec++; saveCurrent(); showTime(); }, 1000);
    breathe(); runLoop(); state.quietStart = false;
    if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then(l => state.lock = l).catch(() => {});
  }
  function stop(finished) {
    state.playing = false; state.token++; clearInterval(tick);
    $("playBtn").textContent = "▶";
    stopVoice(); clearTimeout(ensureTimer);
    if (musicGain) { clearTimeout(previewTimer); previewTimer = null; musicGain.gain.setTargetAtTime(0, ctx.currentTime, finished ? 2.5 : .6); playlist.pause(finished ? 8 : 2); }
    if (state.lock) { state.lock.release().catch(() => {}); state.lock = null; }
    breathe();
    try { window.dispatchEvent(new Event("thien:stopped")); } catch (e) {}
    if (finished) {
      if (state.bell !== 0) music.bell();
      $("lineVi").className = "vi"; $("lineTag").textContent = "";
      $("lineVi").textContent = "Cảm ơn bạn. Mọi điều tốt đẹp đang đến.";
      $("lineEn").textContent = "Thank you. All good things are on their way.";
      state.elapsed = 0; state.goalNoted = false; showTime();   // the quote position is kept: next session continues
    }
  }
  function finish() { commitSession(); stop(true); $("stopBtn").hidden = true; }
  $("playBtn").onclick = () => state.playing ? stop(false) : start();
  window.THIEN = { start: o => { if (!state.playing) start(o); }, isPlaying: () => state.playing, inSession: () => !!state.session, get playlist() { return playlist; } };
  $("stopBtn").onclick = () => { if (state.session) finish(); };

  // ---------- meditation log (localStorage) ----------
  const LOG = "thien.log.v1", CUR = "thien.current.v1", MIN_SEC = 15;
  const readLog = () => { try { const l = JSON.parse(localStorage.getItem(LOG)); return Array.isArray(l) ? l.filter(e => e && e.start > 0 && e.sec >= 0) : []; } catch (e) { return []; } };
  const writeLog = l => { try { localStorage.setItem(LOG, JSON.stringify(l)); } catch (e) {} };
  function saveCurrent() { try { if (state.session) localStorage.setItem(CUR, JSON.stringify({ ...state.session, end: Date.now() })); } catch (e) {} }
  function pushEntry(s) { if (!s || s.sec < MIN_SEC) return; const l = readLog(); l.push({ start: s.start, end: s.end || Date.now(), sec: s.sec }); writeLog(l); }
  function commitSession() {
    if (!state.session) return;
    pushEntry({ ...state.session, end: Date.now() });
    state.session = null; try { localStorage.removeItem(CUR); } catch (e) {}
    renderLog();
  }
  // a session left unfinished (tab closed / crashed) is recovered on next visit
  try { const c = JSON.parse(localStorage.getItem(CUR)); if (c) { pushEntry(c); localStorage.removeItem(CUR); } } catch (e) {}
  window.addEventListener("pagehide", () => { if (state.session) { commitSession(); if (state.playing) stop(false); $("stopBtn").hidden = true; } });

  const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const dur = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h} giờ ${m} phút` : m ? `${m} phút${x ? " " + x + " giây" : ""}` : `${x} giây`; };
  const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  function renderLog() {
    const l = readLog().sort((a, b) => b.start - a.start), now = new Date();
    const today = dayKey(now);
    const wk = new Date(now); wk.setHours(0, 0, 0, 0); wk.setDate(wk.getDate() - ((wk.getDay() + 6) % 7)); // Monday
    const sum = f => l.filter(f).reduce((a, e) => a + e.sec, 0);
    const days = new Set(l.map(e => dayKey(e.start)));
    let streak = 0; const d = new Date(now);
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
    $("statToday").textContent = dur(sum(e => dayKey(e.start) === today));
    $("statWeek").textContent = dur(sum(e => e.start >= wk.getTime()));
    $("statAll").textContent = dur(sum(() => true));
    $("statStreak").textContent = `${streak} ngày`;
    $("statCount").textContent = l.length;
    $("logList").innerHTML = l.length ? l.slice(0, 200).map(e => { const s = new Date(e.start);
      return `<li><span>${WD[s.getDay()]} ${pad(s.getDate())}/${pad(s.getMonth() + 1)}/${s.getFullYear()} · ${pad(s.getHours())}:${pad(s.getMinutes())}</span><b>${dur(e.sec)}</b></li>`; }).join("")
      : `<li class="empty">Chưa có buổi thiền nào. <small>No sessions yet.</small></li>`;
  }
  $("clearLog").onclick = () => { if (confirm("Xoá toàn bộ nhật ký thiền? / Clear the whole log?")) { writeLog([]); renderLog(); } };
  renderLog();
  // TV remotes: Play/Pause keys (webOS 415 play, 19 pause, MediaPlayPause); OK/Enter on a focused button is a normal click
  document.addEventListener("keydown", e => {
    if (e.key === "MediaPlayPause" || e.keyCode === 10252) { e.preventDefault(); $("playBtn").click(); }
    else if ((e.key === "MediaPlay" || e.keyCode === 415) && !state.playing) { e.preventDefault(); $("playBtn").click(); }
    else if ((e.key === "MediaPause" || e.keyCode === 19) && state.playing) { e.preventDefault(); $("playBtn").click(); }
  });
  document.addEventListener("keydown", e => { if (e.code === "Space" && !/^(INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY|A)$/.test(e.target.tagName)) { e.preventDefault(); $("playBtn").click(); } });
})();
