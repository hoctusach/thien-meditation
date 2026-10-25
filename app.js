(() => {
  const A = window.AFFIRMATIONS || [];
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, "0");
  const state = { lang: "both", dur: 10, tone: 432, playing: false, idx: 0, order: [], remaining: 600, token: 0 };

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
  seg("durSeg", "dur", () => { state.remaining = state.dur * 60; showTime(); });
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
      bell() {
        [1, 2.76, 5.4].forEach((m, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = state.tone * m; o.type = "sine";
          g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(.18 / (i + 1), ctx.currentTime + .02); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + 7 / (i + 1));
          o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 8); });
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
  const showTime = () => { $("timeLeft").textContent = state.dur === 0 ? "∞" : `${pad(Math.floor(state.remaining / 60))}:${pad(Math.floor(state.remaining % 60))}`; };
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
    await wait(1200, tok);
    while (state.playing && tok === state.token) {
      if (state.idx >= state.order.length) { if (!$("loop").checked) { stop(true); return; } makeOrder(); state.idx = 0; }
      const n = state.order[state.idx], a = A[n], id = pad(n + 1);
      $("counter").textContent = `· ${state.idx + 1}/${A.length}`;
      show(a);
      await wait(700, tok);
      if (state.lang !== "en") { if (!await playFile(`audio/vi_${id}.mp3`, tok)) return; }
      if (state.lang === "both") { if (!await wait(1400, tok)) return; }
      if (state.lang !== "vi") { if (!await playFile(`audio/en_${id}.mp3`, tok)) return; }
      state.idx++;
      if (!await wait($("gap").value * 1000, tok)) return;
      if (state.dur && state.remaining <= 0) { stop(true); return; }
    }
  }
  function start() {
    initAudio(); ctx.resume();
    state.playing = true; $("playBtn").textContent = "❚❚";
    if (state.dur && state.remaining <= 0) state.remaining = state.dur * 60;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(mv(), ctx.currentTime, 1.5);
    clearInterval(tick);
    tick = setInterval(() => { if (state.dur) { state.remaining = Math.max(0, state.remaining - 1); showTime(); } }, 1000);
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
      music.bell();
      $("lineVi").textContent = "Cảm ơn bạn. Mọi điều tốt đẹp đang đến.";
      $("lineEn").textContent = "Thank you. All good things are on their way.";
      state.remaining = state.dur * 60; state.idx = 0; showTime(); $("counter").textContent = "";
    }
  }
  $("playBtn").onclick = () => state.playing ? stop(false) : start();
  document.addEventListener("keydown", e => { if (e.code === "Space" && e.target.tagName !== "INPUT") { e.preventDefault(); $("playBtn").click(); } });
})();
