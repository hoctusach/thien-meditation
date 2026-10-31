# Builds sw.js (offline asset list + content-hash version), version.json, and stamps index.html.
#  - every script/stylesheet URL in index.html gets its content hash (app.js?v=…), and the service worker
#    precaches exactly those URLs, so a page can never run with scripts from another version;
#  - <meta name="app-version"> in index.html and version.json carry the build version; the app compares them
#    (version.json is always fetched from the network) and reloads itself when a newer version is live.
import os, json, hashlib, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
skip_dirs = {"tools", "samples", ".github", ".git"}
META = re.compile(r'<meta name="app-version" content="[^"]*">')
html = open("index.html", encoding="utf-8").read()
stamped = {}
def stamp(m):
    f = m.group(2); v = hashlib.sha256(open(f, "rb").read()).hexdigest()[:8]
    stamped[f] = f"{f}?v={v}"
    return f'{m.group(1)}="{f}?v={v}"'
html = re.sub(r'(src|href)="((?:affirmations|quotes|music|config|app|pwa)\.js|style\.css)(?:\?v=[0-9a-f]+)?"', stamp, html)
if not META.search(html):
    html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="app-version" content="">', 1)
assets = ["./"]
h = hashlib.sha256(); hm = hashlib.sha256(); music = {}   # music is cached lazily (on first play), in its own cache
for dp, dns, fns in os.walk("."):
    dns[:] = sorted(d for d in dns if d not in skip_dirs and not d.startswith("."))
    for f in sorted(fns):
        p = os.path.join(dp, f)[2:]
        if f.startswith(".") or f in ("sw.js", "README.md") or p.endswith((".py", ".json")) and not p.endswith("manifest.webmanifest"):
            continue
        if p.startswith("audio/q/"): continue   # quote voices (hundreds): not precached; the service worker keeps each one after its first play
        data = META.sub('<meta name="app-version" content="">', html).encode() if p == "index.html" else open(p, "rb").read()
        if p.startswith("audio/music/"):
            hm.update(p.encode()); hm.update(data)
            if p.endswith(".mp3"): music[p[len("audio/music/"):]] = hashlib.sha256(data).hexdigest()
            continue
        assets.append(stamped.get(p, p)); h.update(p.encode()); h.update(data)
ver = h.hexdigest()[:10]
html = META.sub(f'<meta name="app-version" content="{ver}">', html)
open("index.html", "w", encoding="utf-8").write(html)
json.dump({"version": ver}, open("version.json", "w"))
tpl = open("tools/sw-template.js").read()
open("sw.js", "w").write(tpl.replace("__VERSION__", ver).replace("__MUSIC_VERSION__", hm.hexdigest()[:10]).replace("__ASSETS__", json.dumps(assets, indent=1)).replace("__MUSIC__", json.dumps(music, indent=1)))
print(len(assets), "assets, version", ver, "· music cache", hm.hexdigest()[:10])
