# Builds sw.js with the full offline asset list and a content-hash version.
import os, json, hashlib
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
skip_dirs = {"tools", "samples", ".github", ".git"}
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
