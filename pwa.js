// Themes, installable app (PWA), and the daily reminder.
(() => {
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, "0");
  const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
                  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  // ---------- themes: auto-rotate every 2 minutes with an 8 s crossfade ----------
  const STARS = "radial-gradient(1px 1px at 12% 22%,#ffffffaa 50%,transparent 51%),radial-gradient(1px 1px at 72% 12%,#ffffff99 50%,transparent 51%),radial-gradient(1.5px 1.5px at 38% 68%,#ffffff88 50%,transparent 51%),radial-gradient(1px 1px at 86% 54%,#ffffff99 50%,transparent 51%),radial-gradient(1px 1px at 22% 84%,#ffffff77 50%,transparent 51%),radial-gradient(1.5px 1.5px at 58% 36%,#ffffffaa 50%,transparent 51%),radial-gradient(1px 1px at 92% 80%,#ffffff88 50%,transparent 51%),radial-gradient(1px 1px at 6% 50%,#ffffff88 50%,transparent 51%),";
  const THEMES = [
    { id: "dawn",   vi: "Bình minh", en: "Dawn",      c: "#1b1736", g: "radial-gradient(1200px 800px at 50% -10%,#6d4f9c 0%,transparent 60%),linear-gradient(170deg,#1b1736,#3b2a5c 60%,#5a3d5e)", b: ["#e7a6c8", "#7fb6e8", "#f3d9a4"] },
    { id: "ocean",  vi: "Biển xanh", en: "Ocean",     c: "#0d2236", g: "radial-gradient(1100px 760px at 50% -10%,#2f7a8f 0%,transparent 60%),linear-gradient(170deg,#0d2236,#164160 55%,#1f5a6a)", b: ["#6fd0d6", "#5f8fe0", "#bfe6d8"] },
    { id: "forest", vi: "Rừng xanh", en: "Forest",    c: "#102119", g: "radial-gradient(1100px 760px at 50% -10%,#4f7f54 0%,transparent 60%),linear-gradient(170deg,#102119,#1d3f2e 55%,#33553a)", b: ["#9fd39a", "#5fa48a", "#e3d79a"] },
    { id: "lotus",  vi: "Hoa sen",   en: "Lotus",     c: "#2d1528", g: "radial-gradient(1100px 760px at 50% -10%,#a2577f 0%,transparent 60%),linear-gradient(170deg,#2d1528,#552a4a 55%,#6e3a55)", b: ["#f2a7c3", "#c58fe0", "#ffd9c2"] },
    { id: "night",  vi: "Trời sao",  en: "Night sky", c: "#0a0f26", g: STARS + "radial-gradient(1100px 760px at 50% -10%,#2c3a7a 0%,transparent 60%),linear-gradient(170deg,#0a0f26,#141c48 55%,#22285a)", b: ["#8fa6ff", "#b59cf0", "#f6e2a8"] },
    { id: "sand",   vi: "Hoàng hôn", en: "Sunset sand", c: "#2a1a12", g: "radial-gradient(1100px 760px at 50% -10%,#b0703f 0%,transparent 60%),linear-gradient(170deg,#2a1a12,#4f3020 55%,#6b4128)", b: ["#f2b880", "#e89a8a", "#f6dca0"] },
  ];
  const ROTATE_MS = 2 * 60 * 1000;
  let themeIdx = -1, front = $("bgA"), back = $("bgB"), rotTimer;
  const sel = $("themeSel");
  sel.innerHTML = `<option value="auto">🔄 Tự đổi mỗi 2 phút · Auto</option>` + THEMES.map((t, i) => `<option value="${i}">${t.vi} · ${t.en}</option>`).join("");
  function applyTheme(i, instant) {
    if (i === themeIdx) return;
    const t = THEMES[i]; themeIdx = i;
    back.style.background = t.g; back.style.backgroundColor = t.c;
    if (instant) { back.style.transition = "none"; front.style.transition = "none"; }
    back.classList.add("show"); front.classList.remove("show");
    [front, back] = [back, front];
    if (instant) requestAnimationFrame(() => { front.style.transition = ""; back.style.transition = ""; });
    const s = document.body.style; s.setProperty("--b1", t.b[0]); s.setProperty("--b2", t.b[1]); s.setProperty("--b3", t.b[2]);
    document.body.style.backgroundColor = t.c;
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = t.c;
  }
  function setThemeMode(v, first) {
    clearInterval(rotTimer); store.set("thien.theme", v);
    if (v === "auto") {
      applyTheme(themeIdx < 0 ? 0 : themeIdx, first);
      rotTimer = setInterval(() => applyTheme((themeIdx + 1) % THEMES.length), ROTATE_MS);
    } else applyTheme(Number(v), first);
    sel.value = v;
  }
  sel.onchange = () => setThemeMode(sel.value);
  setThemeMode(store.get("thien.theme", "auto"), true);

  // ---------- service worker (offline + notifications) ----------
  let swReg = null;
  const swReady = ("serviceWorker" in navigator)
    ? navigator.serviceWorker.register("sw.js").then(r => (swReg = r, navigator.serviceWorker.ready)).catch(e => { console.warn("SW", e); return null; })
    : Promise.resolve(null);
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.type === "reminder-click") ring(true); });

  // ---------- install ----------
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let deferred = null;
  function installUI() {
    $("iosHelp").hidden = !isIOS; $("andHelp").hidden = isIOS;
    $("installBtn").hidden = !deferred;
    $("installState").textContent = standalone() ? "✅ App đã được cài trên máy này. (Installed)" :
      isIOS ? "Trên iPhone, cài app bằng Safari theo hướng dẫn bên dưới." : deferred ? "Bấm nút để cài app lên màn hình chính." : "Mở trang bằng Chrome để cài app.";
  }
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; installUI(); });
  window.addEventListener("appinstalled", () => { deferred = null; installUI(); });
  $("installBtn").onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; installUI(); };
  installUI();

  // ---------- daily reminder ----------
  const R = Object.assign({ on: false, time: "06:30", lastRung: "" }, store.get("thien.reminder", {}));
  $("remTime").value = R.time; $("remOn").checked = R.on;
  const todayKey = () => new Date().toDateString();
  const dueToday = () => { const [h, m] = R.time.split(":").map(Number), d = new Date(); d.setHours(h, m, 0, 0); return d; };
  const save = () => { store.set("thien.reminder", R); swReady.then(reg => { const sw = navigator.serviceWorker && navigator.serviceWorker.controller || reg && reg.active; sw && sw.postMessage({ type: "reminder", value: { on: R.on, time: R.time, lastShown: R.lastRung } }); }); };

  const bellAudio = new Audio("audio/bell5.mp3"); bellAudio.preload = "auto";
  let bellPlayed = false;
  function playBell() { bellAudio.currentTime = 0; return bellAudio.play().then(() => (bellPlayed = true)).catch(() => false); }
  function ring(force) {
    if (!force && R.lastRung === todayKey()) return;
    R.lastRung = todayKey(); save();
    $("reminderBanner").hidden = false; bellPlayed = false;
    if (!(window.THIEN && THIEN.isPlaying())) playBell();         // may be blocked until the first tap; the banner button plays it then
    if (document.hidden && Notification && Notification.permission === "granted") swReady.then(reg => reg && reg.showNotification("🪷 Đến giờ thiền rồi", { body: "Dành vài phút hít thở nhé. 🔔", icon: "icons/icon-192.png", badge: "icons/badge-96.png", tag: "daily-reminder", data: { url: "./?reminder=1" } }));
  }
  $("bannerClose").onclick = () => { $("reminderBanner").hidden = true; bellAudio.pause(); };
  $("bannerStart").onclick = () => {
    $("reminderBanner").hidden = true;
    if (!bellPlayed) { playBell(); setTimeout(() => window.THIEN && THIEN.start(), 17000); }   // 5 slow strikes, then begin
    else { bellAudio.pause(); window.THIEN && THIEN.start(); }
  };
  $("remTest").onclick = () => { bellAudio.paused ? playBell() : bellAudio.pause(); };
  function check() {
    if (!R.on) return;
    const now = new Date(), due = dueToday(), late = now - due;
    if (late >= 0 && late < 6 * 3600e3) ring(false);             // opened at/after the time today → 5 bell strikes
  }
  setInterval(check, 15000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
  if (/[?&]reminder=1/.test(location.search)) { ring(true); history.replaceState(null, "", location.pathname); } else setTimeout(check, 800);

  // push subscription (needs the free GitHub Actions sender, see README)
  const b64 = s => { const p = "=".repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map(c => c.charCodeAt(0))); };
  let pushCode = "";
  async function setupBackground() {
    const notes = [];
    if (!("Notification" in window)) { notes.push(isIOS && !standalone() ? "📲 Trên iPhone: cài app vào màn hình chính trước, rồi bật lại ở đây để nhận thông báo." : "Trình duyệt này không hỗ trợ thông báo."); return notes; }
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") { notes.push("⚠️ Bạn chưa cho phép thông báo — app vẫn reo chuông khi bạn mở app sau giờ nhắc."); return notes; }
    const reg = await swReady; if (!reg) return notes;
    if ("periodicSync" in reg) {
      try { const st = await navigator.permissions.query({ name: "periodic-background-sync" });
        if (st.state === "granted") { await reg.periodicSync.register("daily-reminder", { minInterval: 12 * 3600e3 }); notes.push("✓ Nhắc nền (Android, không chính xác giờ)"); } } catch (e) {}
    }
    const key = window.PUSH_CONFIG && PUSH_CONFIG.vapidPublicKey;
    if (key && "PushManager" in window) {
      try {
        let sub = await reg.pushManager.getSubscription();
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Saigon";
        pushCode = JSON.stringify({ name: "Oanh", time: R.time, tz, sub: sub.toJSON() });
        $("remCopy").hidden = false;
        notes.push("✓ Đã đăng ký thông báo đẩy — bấm “Sao chép mã” và gửi mã cho người quản lý app để kích hoạt.");
      } catch (e) { notes.push("Không đăng ký được thông báo đẩy (" + (e.message || e) + ")."); }
    }
    return notes;
  }
  function status(extra = []) {
    $("remStatus").textContent = R.on ? [`🔔 Nhắc lúc ${R.time} mỗi ngày.`, ...extra].join(" ") : "Nhắc nhở đang tắt. (Reminder off)";
  }
  $("remOn").onchange = async () => {
    R.on = $("remOn").checked; R.time = $("remTime").value || "06:30";
    if (R.on && dueToday() <= new Date()) R.lastRung = todayKey();   // don't ring right away for a time that already passed today
    save(); status(R.on ? await setupBackground() : []);
  };
  $("remTime").onchange = async () => { R.time = $("remTime").value || "06:30"; R.lastRung = dueToday() <= new Date() ? todayKey() : ""; save(); status(R.on ? await setupBackground() : []); };
  $("remCopy").onclick = async () => {
    try { await navigator.clipboard.writeText(pushCode); $("remCopy").innerHTML = "✅ Đã sao chép <small>Copied</small>"; }
    catch (e) { prompt("Sao chép mã này / Copy this code:", pushCode); }
  };
  status();
  if (R.on) swReady.then(save);

  // calendar fallback: a daily repeating event with an alarm, works on every phone
  $("remIcs").onclick = () => {
    const [h, m] = ($("remTime").value || "06:30").split(":").map(Number), d = new Date(); d.setHours(h, m, 0, 0);
    if (d < new Date()) d.setDate(d.getDate() + 1);
    const f = x => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
    const end = new Date(d.getTime() + 15 * 60e3), now = new Date(), u = new Date(now.getTime() + now.getTimezoneOffset() * 60e3);
    const appUrl = new URL("./?reminder=1", location.href).href;
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Thien Affirmations//VI", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      `UID:thien-daily-${Date.now()}@thien-meditation`, `DTSTAMP:${f(u)}Z`, `DTSTART:${f(d)}`, `DTEND:${f(end)}`, "RRULE:FREQ=DAILY",
      "SUMMARY:🪷 Thiền · Meditation", `DESCRIPTION:Đến giờ thiền rồi. Mở app: ${appUrl}`, `URL:${appUrl}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:🪷 Đến giờ thiền rồi", "TRIGGER:PT0M", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = "thien-nhac-nho.ics";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
})();
