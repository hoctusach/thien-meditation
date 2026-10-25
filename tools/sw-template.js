// Service worker — offline cache + daily reminder notifications.
const VERSION = "__VERSION__";
const CACHE = "thien-" + VERSION;
const ASSETS = __ASSETS__;
const MCACHE = "thien-music-__MUSIC_VERSION__";  // background music: cached on first play, kept across app updates
const CFG = "thien-config";                      // small cache used as a key/value store (reminder settings)

self.addEventListener("install", e => {
  // cache: "reload" — never take files from the browser's HTTP cache, or a new version could be stored with old JS
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("thien-") && k !== CACHE && k !== CFG && k !== MCACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Media elements send Range requests; Safari needs a 206 answer, so slice the cached file.
async function rangeResponse(req, res) {
  const buf = await res.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
  let start = 0, end = size - 1;
  if (m && m[1]) { start = Number(m[1]); if (m[2]) end = Math.min(Number(m[2]), size - 1); }
  else if (m && m[2]) start = Math.max(0, size - Number(m[2]));
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    "Content-Type": res.headers.get("Content-Type") || "audio/mpeg", "Content-Range": `bytes ${start}-${end}/${size}`,
    "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
}
const saving = new Set();
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.mode === "navigate") {
    // The page always comes from this version's own cache, so HTML and JS are always the same version
    // (a fresh page with old cached JS broke the Play button). Updates arrive via a new sw.js, then the page reloads once.
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      return (await c.match("./")) || (await c.match("./index.html")) || fetch(req);
    })());
    return;
  }
  if (url.pathname.includes("/audio/music/")) {   // stream from network the first time, save the whole file for next time
    const key = url.origin + url.pathname;
    e.respondWith((async () => {
      const c = await caches.open(MCACHE), hit = await c.match(key);
      if (hit) return req.headers.has("range") ? rangeResponse(req, hit) : hit;
      if (!saving.has(key)) { saving.add(key); e.waitUntil(fetch(key).then(r => r.ok && r.status === 200 ? c.put(key, r) : null).catch(() => {}).finally(() => saving.delete(key))); }
      return fetch(req);
    })());
    return;
  }
  e.respondWith((async () => {
    const cached = await (await caches.open(CACHE)).match(req.url.split("#")[0], { ignoreSearch: true });
    if (cached) return req.headers.has("range") ? rangeResponse(req, cached) : cached;
    const r = await fetch(req);
    if (r.ok && r.status === 200) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req.url, c)); }
    return r;
  })());
});

// ---------- reminders ----------
const readCfg = async () => { const r = await (await caches.open(CFG)).match("/__reminder"); return r ? r.json() : null; };
const writeCfg = async v => (await caches.open(CFG)).put("/__reminder", new Response(JSON.stringify(v), { headers: { "Content-Type": "application/json" } }));
self.addEventListener("message", e => { if (e.data && e.data.type === "reminder") e.waitUntil(writeCfg(e.data.value)); });

function showReminder(extra = {}) {
  return self.registration.showNotification(extra.title || "🪷 Đến giờ thiền rồi", {
    body: extra.body || "Dành vài phút hít thở và lắng nghe những lời khẳng định nhé. 🔔",
    icon: "icons/icon-192.png", badge: "icons/badge-96.png", tag: "daily-reminder", renotify: true,
    requireInteraction: false, vibrate: [400, 1200, 400, 1200, 400, 1200, 400, 1200, 400],
    data: { url: "./?reminder=1" }, actions: [{ action: "open", title: "Thiền ngay" }],
  });
}
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil((async () => { await showReminder(d); const c = (await readCfg()) || {}; c.lastShown = new Date().toDateString(); await writeCfg(c); })());
});
// Chrome (installed app only): roughly-daily background wake-up. Not time-precise.
self.addEventListener("periodicsync", e => {
  if (e.tag !== "daily-reminder") return;
  e.waitUntil((async () => {
    const c = await readCfg(); if (!c || !c.on || !c.time) return;
    const now = new Date(), [h, m] = c.time.split(":").map(Number), due = new Date(now); due.setHours(h, m, 0, 0);
    if (now >= due && c.lastShown !== now.toDateString()) { await showReminder(); c.lastShown = now.toDateString(); await writeCfg(c); }
  })());
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./?reminder=1", self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) if (c.url.startsWith(self.registration.scope)) { await c.focus(); c.postMessage({ type: "reminder-click" }); return; }
    await self.clients.openWindow(url);
  })());
});
