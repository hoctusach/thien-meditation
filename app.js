(() => {
  const A = window.AFFIRMATIONS || [];
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, "0");
  const state = { lang: "both", dur: 10, tone: 432, bell: 0, lastBell: 0, playing: false, idx: 0, order: [], elapsed: 0, token: 0, session: null, goalNoted: false };

  // ---------- list ----------
  $("total").textContent = A.length;
  A.forEach((a, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${a.vi}<span>${a.en}</span>`;
    li.onclick = () => { state.idx = state.order.indexOf(i); if (state.idx < 0) state.idx = 0; if (!state.playing) start(); else { state.token++; runLoop(); } };
    $("allLines").appendChild(li);
  });
  const makeOrder = () => {
    state.order = A.map((_, i) => i);
    if ($("shuffle").checked) {
      const own = state.order.filter(i => A[i].group === "Của bạn");
      const rest = state.order.filter(i => A[i].group !== "Của bạn");
      for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
      state.order = own.concat(rest);
    }
  };
  makeOrder();

  // ---------- segmented controls ----------
  const seg = (id, key, cb) => $(id).querySelectorAll("button").forEach(b => b.onclick = () => {
    $(id).querySelectorAll("button").forEach(x => x.classList.remove("on")); b.classList.add("on");
    state[key] = key === "lang" ? b.dataset.v : Number(b.dataset.v); cb && cb();
  });
  seg("langSeg", "lang");
  seg("durSeg", "dur", () => { state.goalNoted = state.dur > 0 && state.elapsed >= state.dur * 60; showTime(); });
  seg("bellSeg", "bell", () => { state.lastBell = Date.now(); if (state.bell !== 0 && !state.playing) { initAudio(); ctx.resume(); music.bell(); } });
  seg("toneSeg", "tone", () => music && music.setTone(state.tone));
  $("shuffle").onchange = () => { makeOrder(); state.idx = 0; };
  $("gap").oninput = () => $("gapVal").textContent = $("gap").value + "s";

  // ---------- audio graph ----------
  let ctx, master, musicGain, voiceGain, music, voiceEl;
  function initAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    voiceGain = ctx.createGain(); voiceGain.gain.value = $("voiceVol").value / 100; voiceGain.connect(master);
    voiceEl = new Audio(); voiceEl.preload = "auto";
    try { ctx.createMediaElementSource(voiceEl).connect(voiceGain); } catch (e) { /* fallback: element volume */ }
    music = createMusic(ctx, musicGain);
    music.setTone(state.tone);
  }
  $("musicVol").oninput = () => { if (musicGain && state.playing) musicGain.gain.setTargetAtTime(mv(), ctx.currentTime, .3); };
  $("voiceVol").oninput = () => { if (voiceGain) voiceGain.gain.value = $("voiceVol").value / 100; if (voiceEl) voiceEl.volume = 1; };
  const mv = () => Math.pow($("musicVol").value / 100, 1.6) * 0.5;

  // Ambient generative pad: soft detuned chord on the chosen base tone + gentle filtered noise + echo.
  function createMusic(ctx, out) {
    const bus = ctx.createGain(); bus.gain.value = 1;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1200; lp.Q.value = .3;
    const delay = ctx.createDelay(4); delay.delayTime.value = 1.7;
    const fb = ctx.createGain(); fb.gain.value = .42;
    const wet = ctx.createGain(); wet.gain.value = .35;
    bus.connect(lp); lp.connect(out); lp.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(out);
    const lfo = ctx.createOscillator(); lfo.frequency.value = .05; const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 500;
    lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency); lfo.start();
    // ratios: root(low), fifth, octave, major tenth, a high shimmer
    const ratios = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const levels = [.16, .08, .10, .05, .04, .02];
    const voices = ratios.map((r, i) => {
      const g = ctx.createGain(); g.gain.value = levels[i]; g.connect(bus);
      const oscs = [-4, 4].map(det => { const o = ctx.createOscillator(); o.type = i === 0 ? "sine" : "triangle"; o.detune.value = det; o.connect(g); o.start(); return o; });
      const sw = ctx.createOscillator(); sw.frequency.value = 0.03 + i * 0.017; const swg = ctx.createGain(); swg.gain.value = levels[i] * .7;
      sw.connect(swg); swg.connect(g.gain); sw.start();
      return { r, oscs };
    });
    // soft pink-ish noise "breath of the ocean"
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .0990460; b1 = .96300 * b1 + w * .2965164; b2 = .57000 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .05; }
    const ns = ctx.createBufferSource(); ns.buffer = buf; ns.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = "lowpass"; nf.frequency.value = 500;
    const ng = ctx.createGain(); ng.gain.value = .25; const nl = ctx.createOscillator(); nl.frequency.value = .08; const nlg = ctx.createGain(); nlg.gain.value = .18;
    nl.connect(nlg); nlg.connect(ng.gain); nl.start(); ns.connect(nf); nf.connect(ng); ng.connect(out); ns.start();
    return {
      setTone(f) { voices.forEach(v => v.oscs.forEach(o => o.frequency.setTargetAtTime(f * v.r, ctx.currentTime, 1.5))); },
      // Short, bright chime (small bell) — about 3 seconds, no drone.
      bell() {
        const t0 = ctx.currentTime + .03;
        [[2, .13, 3], [5.4, .05, 1.6], [8.9, .025, .9]].forEach(([m, a, d]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = state.tone * m; o.type = "sine";
          g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(a, t0 + .005); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
          o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + .1); });
        state.lastBell = Date.now();
      }
    };
  }

  // ---------- breathing animation (4s in · 2s hold · 6s out) ----------
  let breathTimer;
  function breathe() {
    clearTimeout(breathTimer);
    const orb = $("orb"), t = $("breathText");
    if (!state.playing || !$("breath").checked) { orb.className = "orb"; orb.style.transitionDuration = "2s"; t.innerHTML = state.playing ? "" : "Sẵn sàng<small>Ready</small>"; return; }
    const steps = [["in", 4, "Hít vào", "Breathe in"], ["hold", 2, "Giữ", "Hold"], ["out", 6, "Thở ra", "Breathe out"]];
    let k = 0;
    const step = () => { if (!state.playing || !$("breath").checked) return breathe();
      const [c, s, vi, en] = steps[k % 3]; orb.style.transitionDuration = s + "s"; orb.className = "orb " + c; t.innerHTML = `${vi}<small>${en}</small>`; k++; breathTimer = setTimeout(step, s * 1000); };
    step();
  }
  $("breath").onchange = breathe;

  // ---------- timer ----------
  let tick;
  const mmss = s => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
  const msss = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  const showTime = () => {
    const goal = state.dur * 60, e = state.elapsed;
    $("timeLeft").textContent = state.dur === 0 ? `∞ ${mmss(e)}` : e < goal ? mmss(goal - e) : `${mmss(goal)} +${msss(e - goal)}`;
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
  function show(a) {
    const box = document.querySelector(".lines");
    box.classList.add("fade");
    setTimeout(() => { $("lineVi").textContent = state.lang === "en" ? "" : a.vi; $("lineEn").textContent = state.lang === "vi" ? a.en : a.en; box.classList.remove("fade"); }, 500);
    document.querySelectorAll("#allLines li").forEach((li, i) => li.classList.toggle("cur", A[i] === a));
  }
  async function runLoop() {
    const tok = ++state.token;
    voiceEl.pause();
    if (state.bell !== 0 && state.freshStart) { state.freshStart = false; music.bell(); if (!await wait(3000, tok)) return; }
    else await wait(1200, tok);
    while (state.playing && tok === state.token) {
      if (state.idx >= state.order.length) { if (!$("loop").checked) { finish(); return; } makeOrder(); state.idx = 0; }
      const n = state.order[state.idx], a = A[n], id = pad(n + 1);
      $("counter").textContent = `· ${state.idx + 1}/${A.length}`;
      show(a);
      await wait(700, tok);
      if (state.lang !== "en") { if (!await playFile(`audio/vi_${id}.mp3`, tok)) return; }
      if (state.lang === "both") { if (!await wait(1400, tok)) return; }
      if (state.lang !== "vi") { if (!await playFile(`audio/en_${id}.mp3`, tok)) return; }
      state.idx++;
      if (!await wait($("gap").value * 1000, tok)) return;
      if (state.dur && state.elapsed >= state.dur * 60 && !state.goalNoted) {
        state.goalNoted = true;
        if (!$("keepGoing").checked) { finish(); return; }
        if (state.bell !== 0) { music.bell(); if (!await wait(3000, tok)) return; }   // gentle "goal reached" chime, then keep going
      } else if (state.bell > 0 && Date.now() - state.lastBell >= state.bell * 60000) {
        music.bell(); if (!await wait(3000, tok)) return;
      }
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
    tick = setInterval(() => { if (!state.playing) return; state.elapsed++; state.session.sec++; saveCurrent(); showTime(); }, 1000);
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
      $("lineVi").textContent = "Cảm ơn bạn. Mọi điều tốt đẹp đang đến.";
      $("lineEn").textContent = "Thank you. All good things are on their way.";
      state.idx = 0; state.elapsed = 0; state.goalNoted = false; showTime(); $("counter").textContent = "";
    }
  }
  function finish() { commitSession(); stop(true); $("stopBtn").hidden = true; }
  $("playBtn").onclick = () => state.playing ? stop(false) : start();
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
