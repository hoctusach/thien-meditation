(() => {
  const A = window.AFFIRMATIONS || [];
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, "0");
  const state = { breathPat: "478", lang: "both", dur: 0, tone: 432, bell: 5, lastBell: 0, gap: 12, auto: true, trackSec: 0, playing: false, idx: 0, order: [], elapsed: 0, token: 0, session: null, goalNoted: false };

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
  makeOrder();

  // ---------- segmented controls ----------
  const seg = (id, key, cb) => $(id).querySelectorAll("button").forEach(b => b.onclick = () => {
    $(id).querySelectorAll("button").forEach(x => x.classList.remove("on")); b.classList.add("on");
    state[key] = key === "lang" ? b.dataset.v : key === "auto" ? b.dataset.v === "1" : Number(b.dataset.v); cb && cb();
  });
  seg("langSeg", "lang", () => {
    const curK = state.curK ?? -1;
    makeOrder();
    const pos = state.order.findIndex(k => k > curK);   // continue with the next allowed quote
    state.idx = pos < 0 ? 0 : pos;
  });
  seg("durSeg", "dur", () => { state.goalNoted = state.dur > 0 && state.elapsed >= state.dur * 60; showTime(); try { localStorage.setItem("thien.dur.v2", state.dur); } catch (e) {} });
  // duration: default is unlimited; new storage key so everyone starts on "Không giới hạn" once
  try { const d = localStorage.getItem("thien.dur.v2"); if (d !== null) { state.dur = Number(d); document.querySelectorAll("#durSeg button").forEach(b => b.classList.toggle("on", Number(b.dataset.v) === state.dur)); } } catch (e) {}
  seg("bellSeg", "bell", () => { state.lastBell = Date.now(); if (state.bell !== 0 && !state.playing) { initAudio(); ctx.resume(); music.bell(); } });
  seg("toneSeg", "tone", () => music && music.setTone(state.tone));
  $("shuffle").onchange = () => { makeOrder(); state.idx = 0; };
  seg("gapSeg", "gap");
  seg("autoSeg", "auto", () => { state.trackSec = 0; });

  // ---------- audio graph ----------
  let ctx, master, musicGain, voiceGain, music, voiceEl, playlist;
  function initAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    voiceGain = ctx.createGain(); voiceGain.gain.value = $("voiceVol").value / 100; voiceGain.connect(master);
    voiceEl = new Audio(); voiceEl.preload = "auto";
    try { ctx.createMediaElementSource(voiceEl).connect(voiceGain); } catch (e) { /* fallback: element volume */ }
    music = createMusic(ctx, musicGain);
    playlist = createPlaylist(ctx, musicGain, () => state.tone, (i, t) => { state.trackSec = 0; showTrack(); });
    playlist.play(0);
  }
  $("musicVol").oninput = () => { if (musicGain && state.playing) musicGain.gain.setTargetAtTime(mv(), ctx.currentTime, .3); };
  $("voiceVol").oninput = () => { if (voiceGain) voiceGain.gain.value = $("voiceVol").value / 100; if (voiceEl) voiceEl.volume = 1; };
  const mv = () => Math.pow($("musicVol").value / 100, 1.6) * 0.5;

  // Bell only — background music lives in music.js (playlist).
  function createMusic(ctx) {
    return {
      setTone(f) { playlist && playlist.setTone(f); },
      // Chosen bell sound (pre-rendered, warm, long decay) — see tools/build_bells.py
      bell(id) { playBellSound(id || state.bellSound); state.lastBell = Date.now(); }
    };
  }

  // ---------- bell sounds ----------
  const BELL_SOUNDS = [
    { id: "temple", vi: "Chuông chùa trầm", en: "Deep temple bell" },
    { id: "bowl", vi: "Chuông bát ấm", en: "Warm singing bowl" },
    { id: "gong", vi: "Cồng êm", en: "Soft gong" },
    { id: "chime", vi: "Chuông gió ngân", en: "Gentle long chime" },
    { id: "wood", vi: "Chuông gỗ ấm", en: "Warm wooden bell" },
    { id: "bright", vi: "Chuông sáng (ngắn)", en: "Bright short chime" },
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
  state.bellSound = (() => { try { return localStorage.getItem("thien.bellSound") || "temple"; } catch (e) { return "temple"; } })();
  if (!BELL_SOUNDS.some(b => b.id === state.bellSound)) state.bellSound = "temple";
  $("bellSound").innerHTML = BELL_SOUNDS.map(b => `<option value="${b.id}">${b.vi} · ${b.en}</option>`).join("");
  $("bellSound").value = state.bellSound;
  $("bellSound").onchange = () => { state.bellSound = $("bellSound").value; try { localStorage.setItem("thien.bellSound", state.bellSound); } catch (e) {} playBellSound(state.bellSound); };
  $("bellPreview").onclick = () => { initAudio(); ctx.resume(); playBellSound(state.bellSound); };
  try { const v = localStorage.getItem("thien.bellVol"); if (v !== null) $("bellVol").value = v; } catch (e) {}
  $("bellVol").oninput = () => { if (bellGain) bellGain.gain.value = bv(); try { localStorage.setItem("thien.bellVol", $("bellVol").value); } catch (e) {} };

  // ---------- now playing (music playlist UI) ----------
  const TR = window.MUSIC_TRACKS || [];
  TR.forEach((t, i) => { const o = document.createElement("option"); o.value = i; o.textContent = `${i + 1}. ${t.vi} · ${t.en}`; $("trackSel").appendChild(o); });
  function showTrack() {
    const i = playlist ? playlist.current : 0, t = TR[i] || {};
    $("trackName").innerHTML = `${t.vi || ""} <small>${t.en || ""}</small>`;
    $("trackSel").value = i;
  }
  showTrack();
  const goTrack = f => { initAudio(); ctx.resume(); f(); };
  $("prevTrack").onclick = () => goTrack(() => playlist.prev());
  $("nextTrack").onclick = () => goTrack(() => playlist.next());
  $("trackSel").onchange = () => goTrack(() => playlist.play(Number($("trackSel").value)));
  const TRACK_SEC = 180;   // each piece plays ~3 minutes, then crossfades to the next

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
  seg("breathSeg", "breathPat", () => { state.breathPat = String(state.breathPat); try { localStorage.setItem("thien.breath", state.breathPat); } catch (e) {} if (state.playing) breathe(); });
  try { const bp = localStorage.getItem("thien.breath"); if (bp) { state.breathPat = bp; document.querySelectorAll("#breathSeg button").forEach(b => b.classList.toggle("on", b.dataset.v === bp)); } } catch (e) {}

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
  function playFile(src, tok) {
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
  // the pause after each quote; returns false if interrupted, "done" if the session should finish
  async function pauseAfter(tok) {
    const end = Date.now() + state.gap * 1000;
    while (Date.now() < end) {
      if (!await wait(Math.min(1000, end - Date.now()), tok)) return false;
      const left = end - Date.now();
      if (state.dur && state.elapsed >= state.dur * 60 && !state.goalNoted) {
        state.goalNoted = true;
        if (!$("keepGoing").checked) return "done";
        if (state.bell !== 0 && left > 6000) music.bell();        // gentle "goal reached" chime, then keep going
      } else if (state.bell > 0 && left > 6000 && Date.now() - state.lastBell >= state.bell * 60000) {
        music.bell();                                              // only ever inside the pause, never over speech
      }
    }
    return true;
  }
  async function runLoop() {
    const tok = ++state.token;
    voiceEl.pause();
    if (state.bell !== 0 && state.freshStart) { state.freshStart = false; music.bell(); if (!await wait(5000, tok)) return; }
    else await wait(1200, tok);
    while (state.playing && tok === state.token) {
      if (!state.order.length) makeOrder();
      if (state.idx >= state.order.length) { if (!$("loop").checked) { finish(); return; } makeOrder(); state.idx = 0; }
      const it = ITEMS[state.curK = state.order[state.idx]];
      $("counter").textContent = `· ${state.idx + 1}/${state.order.length}`;
      show(it);
      if (!await wait(700, tok)) return;
      if (!await playFile(fileOf(it), tok)) return;
      const p = state.order.indexOf(state.curK);
      if (p >= 0) state.idx = p + 1;                   // (if the language filter changed mid-quote, idx is already set)
      const r = await pauseAfter(tok);
      if (!r) return;
      if (r === "done") { finish(); return; }
    }
  }
  function start() {
    initAudio(); ctx.resume();
    state.playing = true; $("playBtn").textContent = "❚❚";
    state.freshStart = !state.session;
    if (!state.session) { state.session = { start: Date.now(), sec: 0 }; state.elapsed = 0; state.goalNoted = false; }
    state.lastBell = Date.now(); $("stopBtn").hidden = false;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(mv(), ctx.currentTime, 1.5);
    clearInterval(tick);
    tick = setInterval(() => { if (!state.playing) return; state.elapsed++; state.session.sec++; saveCurrent(); showTime();
      if (state.auto && ++state.trackSec >= TRACK_SEC) playlist.next(); }, 1000);
    breathe(); runLoop();
    if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then(l => state.lock = l).catch(() => {});
  }
  function stop(finished) {
    state.playing = false; state.token++; clearInterval(tick);
    $("playBtn").textContent = "▶";
    if (voiceEl) voiceEl.pause();
    if (musicGain) musicGain.gain.setTargetAtTime(0, ctx.currentTime, finished ? 2.5 : .6);
    if (state.lock) { state.lock.release().catch(() => {}); state.lock = null; }
    breathe();
    if (finished) {
      if (state.bell !== 0) music.bell();
      $("lineVi").className = "vi"; $("lineTag").textContent = "";
      $("lineVi").textContent = "Cảm ơn bạn. Mọi điều tốt đẹp đang đến.";
      $("lineEn").textContent = "Thank you. All good things are on their way.";
      state.idx = 0; state.curK = undefined; state.elapsed = 0; state.goalNoted = false; showTime(); $("counter").textContent = "";
    }
  }
  function finish() { commitSession(); stop(true); $("stopBtn").hidden = true; }
  $("playBtn").onclick = () => state.playing ? stop(false) : start();
  window.THIEN = { start: () => { if (!state.playing) start(); }, isPlaying: () => state.playing };
  $("stopBtn").onclick = () => { if (state.session) finish(); };

  // ---------- meditation log (localStorage) ----------
  const LOG = "thien.log.v1", CUR = "thien.current.v1", MIN_SEC = 15;
  const readLog = () => { try { return JSON.parse(localStorage.getItem(LOG)) || []; } catch (e) { return []; } };
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
  document.addEventListener("keydown", e => { if (e.code === "Space" && e.target.tagName !== "INPUT") { e.preventDefault(); $("playBtn").click(); } });
})();
