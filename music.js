window.__thienJS = (window.__thienJS || 0) + 1;   // load marker (index.html checks all 5 scripts are this version or newer)
// Nhạc nền: các bản nhạc không lời thật (public domain / CC0 / CC BY) — xem audio/music/tracks.json & README.
// Two <audio> players (A/B) through Web Audio so tracks crossfade smoothly; files stream (no full decode).
(() => {
  // Two modes (Settings → Chế độ): "thien" = meditation music + bell · "classic" = relax · classical, no bell.
  const ALL = [
    { id: "ripples", mode: "thien", vi: "Gợn sóng (đàn tranh)", en: "Ripples", by: "Kevin MacLeod (incompetech.com)", lic: "CC BY 4.0" },
    { id: "yugen", mode: "thien", vi: "Yugen – nhạc dân tộc sâu lắng", en: "Yugen – Emotional Ethnic Music", by: "Keys of Moon", lic: "CC BY 4.0" },
    { id: "gymnopedie", mode: "classic", vi: "Gymnopédie số 1", en: "Satie – Gymnopédie No. 1", by: "Erik Satie · Robin Alciatore (Musopen)", lic: "Public domain" },
    { id: "bach-prelude", mode: "classic", vi: "Khúc dạo đầu Đô trưởng", en: "Bach – Prelude in C major", by: "J. S. Bach · Kimiko Ishizaka", lic: "CC0" },
    { id: "air", mode: "classic", vi: "Khúc Air (dây Sol)", en: "Bach – Air on the G String", by: "J. S. Bach · U.S. Air Force Strings", lic: "Public domain" },
    { id: "nocturne", mode: "classic", vi: "Dạ khúc Mi giáng trưởng", en: "Chopin – Nocturne Op. 9 No. 2", by: "F. Chopin · Frank Levy (Musopen)", lic: "Public domain" },
    { id: "traumerei", mode: "classic", vi: "Mơ mộng", en: "Schumann – Träumerei", by: "R. Schumann · Musopen", lic: "Public domain" },
    { id: "impromptu", mode: "classic", vi: "Ngẫu hứng thiền", en: "Meditation Impromptu 02", by: "Kevin MacLeod (incompetech.com)", lic: "CC BY 3.0" },
  ];
  const MODES = { thien: ALL.filter(t => t.mode === "thien"), classic: ALL.filter(t => t.mode === "classic") };
  const FADE = 6;   // seconds of crossfade

  window.createPlaylist = function (ctx, out, opts = {}) {
    let TRACKS = opts.tracks || MODES.thien;
    const decks = [0, 1].map(() => {
      const el = new Audio(); el.preload = "auto"; el.crossOrigin = "anonymous";
      const g = ctx.createGain(); g.gain.value = 0;
      let wired = false;
      try { ctx.createMediaElementSource(el).connect(g); g.connect(out); wired = true; } catch (e) { /* very old browsers: element volume only */ }
      return { el, g, wired, timer: null };
    });
    let cur = -1, active = 0, running = false;
    const fadeTo = (d, v, sec) => {
      const now = ctx.currentTime; d.g.gain.cancelScheduledValues(now); d.g.gain.setValueAtTime(d.g.gain.value, now); d.g.gain.linearRampToValueAtTime(v, now + sec);
      if (!d.wired) { const s = d.el.volume, t0 = performance.now(); clearInterval(d.timer); d.timer = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / (sec * 1000)); d.el.volume = s + (v - s) * k; if (k >= 1) clearInterval(d.timer); }, 100); }
    };
    function watch(d) {     // start the next track (or the same one again) a little before this one ends
      d.el.ontimeupdate = () => {
        if (d !== decks[active] || !running || !d.el.duration) return;
        if (d.el.currentTime > d.el.duration - FADE - 0.3) play(opts.auto && !opts.auto() ? cur : cur + 1);
      };
      d.el.onerror = () => { if (d === decks[active] && running) setTimeout(() => play(cur + 1), 1500); };
      // paused by something other than us (single-media-element TVs, OS) while the session runs → let the app revive it
      d.el.onpause = () => { if (d === decks[active] && running && !d.el.ended && opts.onUnexpectedPause) opts.onUnexpectedPause(); };
    }
    decks.forEach(watch);
    function play(i, { fade = FADE } = {}) {
      i = (i + TRACKS.length) % TRACKS.length;
      const old = decks[active], nd = decks[active ^ 1], wasOn = cur >= 0 && !old.el.paused;
      if (cur >= 0) { fadeTo(old, 0, fade); setTimeout(() => { if (old !== decks[active]) old.el.pause(); }, fade * 1000 + 300); }
      active ^= 1; cur = i;
      nd.el.src = `audio/music/${TRACKS[i].id}.mp3`; nd.el.currentTime = 0;
      if (!nd.wired) nd.el.volume = 0;
      fadeTo(nd, 1, wasOn ? fade : 1.5);
      if (running) nd.el.play().catch(e => console.warn("music", e));
      opts.onChange && opts.onChange(i, TRACKS[i]);
    }
    return {
      get tracks() { return TRACKS; }, get current() { return cur; }, get element() { return decks[active].el; },
      play(i) { play(i); },
      // switch to another mode's list: crossfade if sound is on, otherwise just select (no sound)
      setTracks(list, i = 0) { TRACKS = list; if (running) play(i); else { cur = -1; this.select(i); } },
      next() { play(cur + 1); }, prev() { play(cur - 1); },
      select(i) { if (running) play(i); else { cur = (i + TRACKS.length) % TRACKS.length; decks[active].el.src = `audio/music/${TRACKS[cur].id}.mp3`; opts.onChange && opts.onChange(cur, TRACKS[cur]); } },
      resume() {                       // (re)start sound for a session
        running = true; if (cur < 0) { play(0); return; }
        const d = decks[active], want = `audio/music/${TRACKS[cur].id}.mp3`;
        if (!d.el.src.endsWith(want)) { d.el.src = want; d.el.currentTime = 0; }
        fadeTo(d, 1, 1.5); d.el.play().catch(e => console.warn("music", e));
      },
      pause(sec = 1) { running = false; decks.forEach(d => { fadeTo(d, 0, sec); setTimeout(() => { if (!running) d.el.pause(); }, sec * 1000 + 300); }); },
      get running() { return running; },
      ensure() { const d = decks[active]; if (running && d.el.paused && d.el.src) { if (d.el.ended) { play(opts.auto && !opts.auto() ? cur : cur + 1); return; } d.el.play().catch(e => console.warn("music", e)); } },
    };
  };
  window.MUSIC_MODES = MODES;
  window.MUSIC_TRACKS = ALL;
})();
