# Builds sw.js with the full offline asset list and a content-hash version.
import os, json, hashlib
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
skip_dirs = {"tools", "samples", ".github", ".git"}
# Stamp each script/stylesheet URL in index.html with its content hash (app.js?v=…), so a fresh page can never
# pick up an older copy of a script from the browser's HTTP cache or from an old service-worker cache.
import re
html = open("index.html", encoding="utf-8").read()
def stamp(m):
    f = m.group(2); v = hashlib.sha256(open(f, "rb").read()).hexdigest()[:8]
    return f'{m.group(1)}="{f}?v={v}"'
html2 = re.sub(r'(src|href)="((?:affirmations|music|config|app|pwa)\.js|style\.css)(?:\?v=[0-9a-f]+)?"', stamp, html)
if html2 != html: open("index.html", "w", encoding="utf-8").write(html2)
assets = ["./"]
h = hashlib.sha256(); hm = hashlib.sha256()   # music is cached lazily (on first play), in its own cache
for dp, dns, fns in os.walk("."):
    dns[:] = sorted(d for d in dns if d not in skip_dirs and not d.startswith("."))
    for f in sorted(fns):
        p = os.path.join(dp, f)[2:]
        if f.startswith(".") or f in ("sw.js", "README.md") or p.endswith((".py", ".json")) and not p.endswith("manifest.webmanifest"):
            continue
        if p.startswith("audio/music/"):
            hm.update(p.encode()); hm.update(open(p, "rb").read()); continue
        assets.append(p); h.update(p.encode()); h.update(open(p, "rb").read())
tpl = open("tools/sw-template.js").read()
open("sw.js", "w").write(tpl.replace("__VERSION__", h.hexdigest()[:10]).replace("__MUSIC_VERSION__", hm.hexdigest()[:10]).replace("__ASSETS__", json.dumps(assets, indent=1)))
print(len(assets), "assets, version", h.hexdigest()[:10], "· music cache", hm.hexdigest()[:10])
