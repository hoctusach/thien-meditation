// Service worker — offline cache + daily reminder notifications.
const VERSION = "705c71cc73";
const CACHE = "thien-" + VERSION;
const ASSETS = [
 "./",
 "affirmations.js?v=8a6a8860",
 "app.js?v=18fc1e5d",
 "config.js?v=1a4d25de",
 "index.html",
 "manifest.webmanifest",
 "music.js?v=0f08058e",
 "pwa.js?v=895aae9e",
 "style.css?v=5168f57e",
 "audio/bell5.mp3",
 "audio/en_01.mp3",
 "audio/en_02.mp3",
 "audio/en_03.mp3",
 "audio/en_04.mp3",
 "audio/en_05.mp3",
 "audio/en_06.mp3",
 "audio/en_07.mp3",
 "audio/en_08.mp3",
 "audio/en_09.mp3",
 "audio/en_10.mp3",
 "audio/en_11.mp3",
 "audio/en_12.mp3",
 "audio/en_13.mp3",
 "audio/en_14.mp3",
 "audio/en_15.mp3",
 "audio/en_16.mp3",
 "audio/en_17.mp3",
 "audio/en_18.mp3",
 "audio/en_19.mp3",
 "audio/en_20.mp3",
 "audio/en_21.mp3",
 "audio/en_22.mp3",
 "audio/en_23.mp3",
 "audio/en_24.mp3",
 "audio/en_25.mp3",
 "audio/en_26.mp3",
 "audio/en_27.mp3",
 "audio/en_28.mp3",
 "audio/en_29.mp3",
 "audio/en_30.mp3",
 "audio/en_31.mp3",
 "audio/en_32.mp3",
 "audio/en_33.mp3",
 "audio/en_34.mp3",
 "audio/en_35.mp3",
 "audio/en_36.mp3",
 "audio/en_37.mp3",
 "audio/en_38.mp3",
 "audio/en_39.mp3",
 "audio/en_40.mp3",
 "audio/en_41.mp3",
 "audio/en_42.mp3",
 "audio/en_43.mp3",
 "audio/en_44.mp3",
 "audio/en_45.mp3",
 "audio/en_46.mp3",
 "audio/en_47.mp3",
 "audio/en_48.mp3",
 "audio/en_49.mp3",
 "audio/en_50.mp3",
 "audio/vi_01.mp3",
 "audio/vi_02.mp3",
 "audio/vi_03.mp3",
 "audio/vi_04.mp3",
 "audio/vi_05.mp3",
 "audio/vi_06.mp3",
 "audio/vi_07.mp3",
 "audio/vi_08.mp3",
 "audio/vi_09.mp3",
 "audio/vi_10.mp3",
 "audio/vi_11.mp3",
 "audio/vi_12.mp3",
 "audio/vi_13.mp3",
 "audio/vi_14.mp3",
 "audio/vi_15.mp3",
 "audio/vi_16.mp3",
 "audio/vi_17.mp3",
 "audio/vi_18.mp3",
 "audio/vi_19.mp3",
 "audio/vi_20.mp3",
 "audio/vi_21.mp3",
 "audio/vi_22.mp3",
 "audio/vi_23.mp3",
 "audio/vi_24.mp3",
 "audio/vi_25.mp3",
 "audio/vi_26.mp3",
 "audio/vi_27.mp3",
 "audio/vi_28.mp3",
 "audio/vi_29.mp3",
 "audio/vi_30.mp3",
 "audio/vi_31.mp3",
 "audio/vi_32.mp3",
 "audio/vi_33.mp3",
 "audio/vi_34.mp3",
 "audio/vi_35.mp3",
 "audio/vi_36.mp3",
 "audio/vi_37.mp3",
 "audio/vi_38.mp3",
 "audio/vi_39.mp3",
 "audio/vi_40.mp3",
 "audio/vi_41.mp3",
 "audio/vi_42.mp3",
 "audio/vi_43.mp3",
 "audio/vi_44.mp3",
 "audio/vi_45.mp3",
 "audio/vi_46.mp3",
 "audio/vi_47.mp3",
 "audio/vi_48.mp3",
 "audio/vi_49.mp3",
 "audio/vi_50.mp3",
 "audio/bells/thien.mp3",
 "icons/apple-touch-icon.png",
 "icons/badge-96.png",
 "icons/favicon-32.png",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/maskable-192.png",
 "icons/maskable-512.png"
];
const MCACHE = "thien-music-9b85ea9704";  // background music: cached on first play, kept across app updates
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
  if (url.pathname.endsWith("/version.json")) return;   // always straight from the network (update check)
  if (req.mode === "navigate") {
    // Network first (revalidated, so GitHub's 10-minute HTML cache can't hide an update); cached page when offline/slow.
    // Scripts are referenced as app.js?v=<hash>, and only an exact match is served from cache, so the page and its
    // scripts are always the same version.
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const net = fetch(req, { cache: "no-cache" }).then(r => { if (r.ok && r.status === 200 && !r.redirected) c.put("./", r.clone()); return r; });
      const slow = new Promise(res => setTimeout(res, 6000));
      try {
        const r = await Promise.race([net, slow.then(() => null)]);
        if (r) return r;
        return (await c.match("./")) || await net;
      } catch (x) { return (await c.match("./")) || (await c.match("./index.html")) || Response.error(); }
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
    const c = await caches.open(CACHE), u = req.url.split("#")[0];
    // versioned files (…?v=hash) must match exactly; other files ignore the query string
    const cached = (await c.match(u)) || (url.searchParams.has("v") ? null : await c.match(u, { ignoreSearch: true }));
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
