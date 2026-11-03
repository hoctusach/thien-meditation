// Service worker — offline cache + daily reminder notifications.
const VERSION = "d35124eb8f";
const CACHE = "thien-" + VERSION;
const ASSETS = [
 "./",
 "app.js?v=acda26ec",
 "config.js?v=1a4d25de",
 "d.js?v=93c5640f",
 "index.html",
 "manifest.webmanifest",
 "music.js?v=20dcd443",
 "pwa.js?v=50e89923",
 "style.css?v=c5188815",
 "audio/bell5.mp3",
 "audio/a/023d75e7297c.mp3",
 "audio/a/08ffa199ed41.mp3",
 "audio/a/095b2211041b.mp3",
 "audio/a/0c44fad00b9d.mp3",
 "audio/a/0da141743b16.mp3",
 "audio/a/0e240125dfff.mp3",
 "audio/a/13e8b3dbaad1.mp3",
 "audio/a/14138b049334.mp3",
 "audio/a/155a72f69253.mp3",
 "audio/a/172f403c492a.mp3",
 "audio/a/1b23af005537.mp3",
 "audio/a/2114bb38b635.mp3",
 "audio/a/2386a6323995.mp3",
 "audio/a/36626bce4cec.mp3",
 "audio/a/3696dd37e9fe.mp3",
 "audio/a/37f8d22b655d.mp3",
 "audio/a/3b1533d155a3.mp3",
 "audio/a/3b6fa6ee49b8.mp3",
 "audio/a/3fe68864534f.mp3",
 "audio/a/468a011ba22b.mp3",
 "audio/a/4721c6346806.mp3",
 "audio/a/474018d36c41.mp3",
 "audio/a/47475ddad3e1.mp3",
 "audio/a/48ffa6b87e06.mp3",
 "audio/a/4939b6a1036f.mp3",
 "audio/a/4d72afdbf151.mp3",
 "audio/a/5248413add0e.mp3",
 "audio/a/570b71b82320.mp3",
 "audio/a/57ffe35db722.mp3",
 "audio/a/5b014b636662.mp3",
 "audio/a/5c379cba9584.mp3",
 "audio/a/604d7a08b1c5.mp3",
 "audio/a/6323766883a3.mp3",
 "audio/a/64b35d47d971.mp3",
 "audio/a/64be301e5b35.mp3",
 "audio/a/65f21f91fadc.mp3",
 "audio/a/6ae975801285.mp3",
 "audio/a/6b1751d01738.mp3",
 "audio/a/6b65cc839773.mp3",
 "audio/a/6b6f1235b9c8.mp3",
 "audio/a/6e2cdf3a6559.mp3",
 "audio/a/700db939e365.mp3",
 "audio/a/70eb1f8bc24b.mp3",
 "audio/a/73e304368e3a.mp3",
 "audio/a/74ce6e900d46.mp3",
 "audio/a/74dfd36d2aa0.mp3",
 "audio/a/767194bc6a09.mp3",
 "audio/a/7b4a3b4cdcfd.mp3",
 "audio/a/7c5bf557d2fc.mp3",
 "audio/a/7fa5626ffc7c.mp3",
 "audio/a/822dfccafc7a.mp3",
 "audio/a/83beb79ab8d6.mp3",
 "audio/a/848a387758b7.mp3",
 "audio/a/8b2dc4fe1f75.mp3",
 "audio/a/8c37a72edec8.mp3",
 "audio/a/8dd8387c7dec.mp3",
 "audio/a/93c4cb9f9441.mp3",
 "audio/a/99e7d273b3b8.mp3",
 "audio/a/99f657c380b9.mp3",
 "audio/a/9a3455adce56.mp3",
 "audio/a/9b621bead56d.mp3",
 "audio/a/9bbc3472c2f2.mp3",
 "audio/a/9d07dceb5221.mp3",
 "audio/a/9d9858d26517.mp3",
 "audio/a/ab077aadc5d3.mp3",
 "audio/a/abd9d1aabbce.mp3",
 "audio/a/ac9664683315.mp3",
 "audio/a/b497671ac681.mp3",
 "audio/a/b5606ab2af6b.mp3",
 "audio/a/b79f2c89f7ba.mp3",
 "audio/a/bc7120e42c82.mp3",
 "audio/a/bc7fc26cfac1.mp3",
 "audio/a/c108022744d2.mp3",
 "audio/a/c250a3ba8458.mp3",
 "audio/a/c5567d07dcbb.mp3",
 "audio/a/c5f3948bab52.mp3",
 "audio/a/c63dfa2e22aa.mp3",
 "audio/a/ca6741d41f7a.mp3",
 "audio/a/cffcb1b95b88.mp3",
 "audio/a/d3373fb3bcce.mp3",
 "audio/a/d378d11b0402.mp3",
 "audio/a/d51b1d6490c9.mp3",
 "audio/a/d645f8df98d9.mp3",
 "audio/a/d67900813ce9.mp3",
 "audio/a/d926cd62462d.mp3",
 "audio/a/d9b5fcc70aed.mp3",
 "audio/a/da6c3593d933.mp3",
 "audio/a/dc6cf1ef1fd9.mp3",
 "audio/a/dd97782ffabe.mp3",
 "audio/a/e077ac97b969.mp3",
 "audio/a/e5951bca2039.mp3",
 "audio/a/e717246c1504.mp3",
 "audio/a/e7373d0d99a1.mp3",
 "audio/a/ebd2d312a969.mp3",
 "audio/a/ed2f216257da.mp3",
 "audio/a/f2b666781e2f.mp3",
 "audio/a/f43f0386b256.mp3",
 "audio/a/f6d63d144c6d.mp3",
 "audio/a/f8971037a65e.mp3",
 "audio/a/f9297cfa870b.mp3",
 "audio/bells/thien.mp3",
 "icons/apple-touch-icon.png",
 "icons/badge-96.png",
 "icons/favicon-32.png",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/maskable-192.png",
 "icons/maskable-512.png"
];
const MCACHE = "thien-music-0161c9565b";  // background music: cached on first play, kept across app updates
const MUSIC = {
 "air.mp3": "b9821468f0aedb9bf94cc3099759352e94bec141957f6645b4e816a6ef713379",
 "bach-prelude.mp3": "e778d63e952599eb74ad07427c252ffe4db0b93b0b1ced0d3d90ccce07f1d708",
 "gymnopedie.mp3": "6e3824ae6490507295d88f576f36c5941155c0abf7ff11f415afe0b6f1cb9b0b",
 "impromptu.mp3": "edcb8581267b6c8ce219cba82bcc166c72dfa48022a08f02395d4b77c4858ad2",
 "nocturne.mp3": "d5703ec7d0493cf994e7ce6ccd154df3dd648ffef9089aace4db2394d5602089",
 "ripples.mp3": "fbb3c09fdadc7204d2af69598e0d7b1ad1c0ef34123996a4127c921becc2cdb1",
 "traumerei.mp3": "e4ac5bb505936c87a9fdeb9bd86ff63d5671afaf355695db8510e5e94ab7f552",
 "yugen.mp3": "1ca1c4d477df9dff61504928670af1dfc0c3a8f95a2e7772ccd0b5ea15fcd124"
};   // audio/music/<file> → sha256 (lets an update keep cached tracks that did not change)
const CFG = "thien-config";                      // small cache used as a key/value store (reminder settings)

self.addEventListener("install", e => {
  // cache: "reload" — never take files from the browser's HTTP cache, or a new version could be stored with old JS
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    for (const k of keys) if (k.startsWith("thien-music-") && k !== MCACHE) {   // carry over unchanged tracks
      try {
        const old = await caches.open(k), mc = await caches.open(MCACHE);
        for (const req of await old.keys()) {
          const rel = Object.keys(MUSIC).find(f => new URL(req.url).pathname.endsWith("/" + f));
          if (!rel || await mc.match(req)) continue;
          const res = await old.match(req), buf = await res.clone().arrayBuffer();
          const hex = [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].map(b => b.toString(16).padStart(2, "0")).join("");
          if (hex === MUSIC[rel]) await mc.put(req, res);
        }
      } catch (x) {}
    }
    for (const k of keys) if (k.startsWith("thien-") && k !== CACHE && k !== CFG && k !== MCACHE) await caches.delete(k);
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
