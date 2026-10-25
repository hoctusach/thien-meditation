// Nhạc nền tạo trực tiếp bằng Web Audio — không dùng file nhạc, không vướng bản quyền.
// Playlist of gentle generative pieces that rotate with a crossfade.
(() => {
  const SCALE = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8];          // just-intonation major scale
  const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];                          // major pentatonic
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function pinkBuffer(ctx, sec = 4, amp = .05) {
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .0990460; b1 = .96300 * b1 + w * .2965164; b2 = .57000 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * amp; }
    return buf;
  }
  function whiteBuffer(ctx, sec = 3) {
    const len = ctx.sampleRate * sec, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Base kit shared by every track: a bus, an optional soft echo, and a list of things to stop.
  function kit(ctx, out, echo) {
    const bus = ctx.createGain(); bus.connect(out);
    const nodes = [], timers = [];
    if (echo) {
      const delay = ctx.createDelay(4); delay.delayTime.value = echo.time;
      const fb = ctx.createGain(); fb.gain.value = echo.fb;
      const wet = ctx.createGain(); wet.gain.value = echo.wet;
      bus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(out);
    }
    const osc = (type, f, dest, det = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.connect(dest); o.start(); nodes.push(o); return o; };
    const loopSrc = (buf, dest) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(dest); s.start(); nodes.push(s); return s; };
    // look-ahead note scheduler
    const schedule = (fn) => { let next = ctx.currentTime + .3; const id = setInterval(() => { while (next < ctx.currentTime + 1.2) next += fn(next); }, 200); timers.push(id); };
    const stop = () => { timers.forEach(clearInterval); nodes.forEach(n => { try { n.stop(); } catch (e) {} }); bus.disconnect(); };
    return { bus, osc, loopSrc, schedule, stop, nodes };
  }

  // The original warm pad (first version of the site), optionally with another chord.
  function pad(ctx, k, dest, getTone, ratios = [0.5, 0.75, 1, 1.25, 1.5, 2], levels = [.16, .08, .10, .05, .04, .02], cutoff = 1200) {
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = cutoff; lp.Q.value = .3; lp.connect(dest);
    const lfo = k.osc("sine", .05, ctx.createGain()); const lfoAmt = lfo.context.createGain(); lfo.disconnect(); lfoAmt.gain.value = cutoff * .4; lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency);
    const voices = ratios.map((r, i) => {
      const g = ctx.createGain(); g.gain.value = levels[i]; g.connect(lp);
      const oscs = [-4, 4].map(det => k.osc(i === 0 ? "sine" : "triangle", getTone() * r, g, det));
      const sw = k.osc("sine", 0.03 + i * 0.017, ctx.createGain()); const swg = ctx.createGain(); sw.disconnect(); swg.gain.value = levels[i] * .7; sw.connect(swg); swg.connect(g.gain);
      return { r, oscs };
    });
    return { setTone: f => voices.forEach(v => v.oscs.forEach(o => o.frequency.setTargetAtTime(f * v.r, ctx.currentTime, 1.5))) };
  }
  function ocean(ctx, k, dest, level = .25, cutoff = 500) {
    const nf = ctx.createBiquadFilter(); nf.type = "lowpass"; nf.frequency.value = cutoff;
    const ng = ctx.createGain(); ng.gain.value = level;
    const nl = k.osc("sine", .08, ctx.createGain()); nl.disconnect(); const nlg = ctx.createGain(); nlg.gain.value = level * .72; nl.connect(nlg); nlg.connect(ng.gain);
    k.loopSrc(pinkBuffer(ctx), nf); nf.connect(ng); ng.connect(dest);
  }
  // soft plucked note (kalimba-like) or piano-like note
  function pluck(ctx, dest, f, t, vol, kind, pan = 0) {
    const g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = kind === "piano" ? 2400 : 3200;
    g.connect(lp); if (p) { p.pan.value = pan; lp.connect(p); p.connect(dest); } else lp.connect(dest);
    const parts = kind === "piano" ? [[1, 1, 3.2], [2, .45, 2.2], [3, .2, 1.4], [4, .1, 1], [5, .05, .7]] : [[1, 1, 1.9], [2, .12, .9], [5.9, .08, .25]];
    parts.forEach(([m, a, d]) => {
      const o = ctx.createOscillator(), e = ctx.createGain(); o.type = "sine"; o.frequency.value = f * m;
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(vol * a, t + (kind === "piano" ? .006 : .003)); e.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(e); e.connect(g); o.start(t); o.stop(t + d + .05);
    });
  }

  const TRACKS = [
    { vi: "Bình yên", en: "Calm pad", make(ctx, out, T) {
        const k = kit(ctx, out, { time: 1.7, fb: .42, wet: .35 });           // exactly the original
        const p = pad(ctx, k, k.bus, T); ocean(ctx, k, out);
        return { stop: k.stop, setTone: p.setTone, bus: k.bus };
    } },
    { vi: "Giọt nắng", en: "Kalimba sunlight", make(ctx, out, T) {
        const k = kit(ctx, out, { time: .9, fb: .25, wet: .18 });
        const padBus = ctx.createGain(); padBus.gain.value = .85; padBus.connect(k.bus);
        const p = pad(ctx, k, padBus, T);
        let deg = 0;
        k.schedule(t => {
          if (Math.random() < .15) return rnd(1.5, 3);                      // a little rest
          deg = Math.max(0, Math.min(9, deg + pick([-2, -1, 1, 1, 2, 0])));
          const f = T() * PENTA[deg % 5] * (deg >= 5 ? 2 : 1);
          pluck(ctx, k.bus, f, t, .1, "kalimba", rnd(-.4, .4));
          if (Math.random() < .25) pluck(ctx, k.bus, f * 3 / 2, t + .28, .055, "kalimba", rnd(-.4, .4));
          return rnd(.9, 1.7);
        });
        return { stop: k.stop, setTone: p.setTone, bus: k.bus };
    } },
    { vi: "Dương cầm êm", en: "Soft piano", make(ctx, out, T) {
        const k = kit(ctx, out, { time: .75, fb: .2, wet: .15 });
        const padBus = ctx.createGain(); padBus.gain.value = .8; padBus.connect(k.bus);
        const p = pad(ctx, k, padBus, T, [0.5, 1, 1.25, 1.5], [.14, .08, .05, .04], 900);
        // I – vi – IV – V (scale degrees), slow broken chords
        const prog = [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]];
        const deg = d => SCALE[d % 7] * Math.pow(2, Math.floor(d / 7));
        let bar = 0, beat = 0;
        const beatLen = 0.95;
        k.schedule(t => {
          const R = T() / 2, ch = prog[bar % 4];
          if (beat === 0) pluck(ctx, k.bus, R / 2 * deg(ch[0]), t, .12, "piano", -.15);
          const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
          if (beat !== 7 || Math.random() < .5) pluck(ctx, k.bus, R * deg(ch[pattern[beat]]) * (beat === 5 ? 2 : 1), t, .08, "piano", rnd(-.3, .3));
          beat = (beat + 1) % 8; if (!beat) bar++;
          return beatLen;
        });
        return { stop: k.stop, setTone: p.setTone, bus: k.bus };
    } },
    { vi: "Mưa rừng", en: "Forest rain & birds", make(ctx, out, T) {
        const k = kit(ctx, out, null);
        const padBus = ctx.createGain(); padBus.gain.value = .85; padBus.connect(k.bus);
        const p = pad(ctx, k, padBus, T, [0.5, 0.75, 1, 1.25], [.14, .07, .08, .04], 1000);
        // rain: white noise, band-limited, softly breathing
        const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2200; bp.Q.value = .4;
        const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 500;
        const rg = ctx.createGain(); rg.gain.value = .022;
        k.loopSrc(whiteBuffer(ctx), bp); bp.connect(hp); hp.connect(rg); rg.connect(k.bus);
        const rl = k.osc("sine", .04, ctx.createGain()); rl.disconnect(); const rlg = ctx.createGain(); rlg.gain.value = .008; rl.connect(rlg); rlg.connect(rg.gain);
        // birds: short, high, gentle chirps now and then
        k.schedule(t => {
          if (Math.random() < .55) {
            const base = rnd(2600, 3600), n = 2 + Math.floor(Math.random() * 3), pan = rnd(-.7, .7);
            for (let i = 0; i < n; i++) {
              const o = ctx.createOscillator(), g = ctx.createGain(), s = t + i * rnd(.13, .2);
              const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
              o.type = "sine"; o.frequency.setValueAtTime(base, s); o.frequency.exponentialRampToValueAtTime(base * rnd(1.15, 1.35), s + .05); o.frequency.exponentialRampToValueAtTime(base * .9, s + .11);
              g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.012, s + .015); g.gain.exponentialRampToValueAtTime(.0001, s + .12);
              o.connect(g); if (pn) { pn.pan.value = pan; g.connect(pn); pn.connect(k.bus); } else g.connect(k.bus);
              o.start(s); o.stop(s + .15);
            }
          }
          return rnd(4, 11);
        });
        return { stop: k.stop, setTone: p.setTone, bus: k.bus };
    } },
    { vi: "Ấm áp", en: "Warm major-seven pad", make(ctx, out, T) {
        const k = kit(ctx, out, { time: 1.4, fb: .3, wet: .22 });
        const p = pad(ctx, k, k.bus, T, [0.5, 1, 1.25, 1.5, 1.875, 2.5], [.15, .09, .06, .05, .025, .015], 1100);
        ocean(ctx, k, out, .15, 420);
        return { stop: k.stop, setTone: p.setTone, bus: k.bus };
    } },
    { vi: "Suối nhỏ", en: "Little stream", make(ctx, out, T) {
        const k = kit(ctx, out, { time: 1.1, fb: .2, wet: .12 });
        const padBus = ctx.createGain(); padBus.gain.value = .8; padBus.connect(k.bus);
        const p = pad(ctx, k, padBus, T, [0.5, 0.75, 1, 1.125, 1.5], [.14, .07, .08, .03, .035], 1000);
        // stream: pink noise through two wandering band-pass filters
        [700, 1400].forEach((fc, i) => {
          const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = fc; bp.Q.value = 1.2;
          const g = ctx.createGain(); g.gain.value = i ? .5 : .8;
          k.loopSrc(pinkBuffer(ctx, 5, .09), bp); bp.connect(g); g.connect(k.bus);
          const l = k.osc("sine", .13 + i * .07, ctx.createGain()); l.disconnect(); const lg = ctx.createGain(); lg.gain.value = fc * .25; l.connect(lg); lg.connect(bp.frequency);
        });
        let deg = 2;
        k.schedule(t => {                                                     // very sparse kalimba
          deg = Math.max(0, Math.min(7, deg + pick([-1, 1, 2, -2])));
          pluck(ctx, k.bus, T() * PENTA[deg % 5] * (deg >= 5 ? 2 : 1), t, .045, "kalimba", rnd(-.5, .5));
          return rnd(3, 7);
        });
        return { stop: k.stop, setTone: p.setTone, bus: k.bus };
    } },
  ];

  window.createPlaylist = function (ctx, out, getTone, onChange) {
    const FADE = 6;
    let cur = -1, live = null;
    function play(i) {
      i = (i + TRACKS.length) % TRACKS.length;
      const now = ctx.currentTime;
      if (live) { const old = live; old.gain.gain.cancelScheduledValues(now); old.gain.gain.setValueAtTime(old.gain.gain.value, now); old.gain.gain.linearRampToValueAtTime(0, now + FADE); setTimeout(() => { old.t.stop(); old.gain.disconnect(); }, (FADE + 1) * 1000); }
      const gain = ctx.createGain(); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(1, now + FADE); gain.connect(out);
      live = { t: TRACKS[i].make(ctx, gain, getTone), gain };
      cur = i; onChange && onChange(i, TRACKS[i]);
    }
    return {
      tracks: TRACKS, play, get current() { return cur; },
      next() { play(cur + 1); }, prev() { play(cur - 1); },
      setTone(f) { live && live.t.setTone(f); },
    };
  };
  window.MUSIC_TRACKS = TRACKS.map(t => ({ vi: t.vi, en: t.en }));
})();
