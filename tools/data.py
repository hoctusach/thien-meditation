"""Quote + affirmation database. It lives ONLY in encoded form, in d.js (nothing is published as plain JSON/JS text).
  db = {"affirmations": [{vi, en, group}], "quotes": [{id, vi?, en?, author, source}], "files": {key: name}}
  key  = "a|<lang>|<index>"  (affirmation line, index = position in the list)  or  "q|<lang>|<quote id>"
  name = random 12 hex -> audio/a/<name>.mp3 (affirmations, precached by the service worker) or audio/q/<name>.mp3 (quotes)
A line is voiced exactly when its key is in "files" and the mp3 exists. The app decodes d.js at start-up (see K / D in app.js).
This is obfuscation, not encryption: the decoder has to ship with the page. It stops "open the file / grep the site",
it does not stop someone who runs the app (they can read each line as it is shown, or transcribe the audio).
Usage (from the repo root):
  python3 tools/data.py export DIR     write DIR/affirmations.json + DIR/quotes.json (to edit them; keep DIR OUTSIDE the repo)
  python3 tools/data.py import DIR     read those two files back into d.js (voice names are kept for unchanged lines)
  python3 tools/data.py put KEY FILE   copy an mp3 in as the voice of KEY (e.g. put 'q|vi|q0001' my.mp3)
  python3 tools/data.py status         counts, and audio files that no line uses"""
import base64, hashlib, json, os, re, secrets, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILE = os.path.join(ROOT, "d.js")
K = 0x5A1C3E97          # must equal K in app.js
M = 0xFFFFFFFF
EMPTY = {"affirmations": [], "quotes": [], "files": {}}

def _imul(a, b): return (a * b) & M
def _stream(seed):      # mulberry32, byte by byte; identical to the decoder in app.js
    x = seed & M
    while True:
        x = (x + 0x6D2B79F5) & M
        t = _imul(x ^ (x >> 15), x | 1)
        t ^= (t + _imul(t ^ (t >> 7), t | 61)) & M
        w = (t ^ (t >> 14)) & M
        for _ in range(4):
            yield w & 255; w >>= 8

def _xor(data, salt):
    s = _stream(K ^ int.from_bytes(salt, "big"))
    return bytes(b ^ next(s) for b in data)

def encode(db):
    plain = json.dumps(db, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    salt = hashlib.sha256(plain).digest()[:4]            # deterministic: same content -> same d.js
    return base64.b64encode(salt + _xor(plain, salt)).decode()

def decode(b64):
    raw = base64.b64decode(b64)
    return json.loads(_xor(raw[4:], raw[:4]).decode("utf-8"))

def path(db, key):
    n = db["files"].get(key)
    return n and os.path.join(ROOT, "audio", "a" if key[0] == "a" else "q", n + ".mp3")

def ensure(db, key):
    """Path of the voice file for key (a random name is allocated on first use; the directory is created)."""
    if key not in db["files"]:
        used = set(db["files"].values())
        while True:
            n = secrets.token_hex(6)
            if n not in used: break
        db["files"][key] = n
    p = path(db, key); os.makedirs(os.path.dirname(p), exist_ok=True)
    return p

def load():
    if not os.path.exists(FILE): return json.loads(json.dumps(EMPTY))
    m = re.search(r'window\.__d="([^"]*)"', open(FILE, encoding="utf-8").read())
    return decode(m.group(1)) if m else json.loads(json.dumps(EMPTY))

def save(db):
    db["files"] = {k: v for k, v in db["files"].items() if os.path.exists(path(db, k))}   # only voices that exist
    open(FILE, "w", encoding="utf-8").write(f'window.__d="{encode(db)}";window.__thienJS=(window.__thienJS||0)+1;\n')

def orphans(db):
    used = {path(db, k) for k in db["files"]}
    return sorted(p for d in ("a", "q") for p in (os.path.join(ROOT, "audio", d, f) for f in os.listdir(os.path.join(ROOT, "audio", d)) if f.endswith(".mp3"))
                  if os.path.isdir(os.path.join(ROOT, "audio", d)) and p not in used) if all(os.path.isdir(os.path.join(ROOT, "audio", d)) for d in ("a", "q")) else []

if __name__ == "__main__":
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else "status"), sys.argv[2:]
    db = load()
    if cmd == "export":
        os.makedirs(args[0], exist_ok=True)
        json.dump(db["affirmations"], open(os.path.join(args[0], "affirmations.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        json.dump(db["quotes"], open(os.path.join(args[0], "quotes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("exported to", args[0])
    elif cmd == "import":
        db["affirmations"] = json.load(open(os.path.join(args[0], "affirmations.json"), encoding="utf-8"))
        db["quotes"] = json.load(open(os.path.join(args[0], "quotes.json"), encoding="utf-8"))
        ids = [q["id"] for q in db["quotes"]]; assert len(ids) == len(set(ids)), "duplicate quote ids"
        for q in db["quotes"]: assert q.get("vi") or q.get("en"), q["id"] + ": no text"
        valid = {f"a|{l}|{i}" for i in range(len(db["affirmations"])) for l in ("vi", "en")} | {f"q|{l}|{q['id']}" for q in db["quotes"] for l in ("vi", "en") if q.get(l)}
        db["files"] = {k: v for k, v in db["files"].items() if k in valid}
        save(db); print("imported")
    elif cmd == "put":
        shutil.copyfile(args[1], ensure(db, args[0])); save(db); print("ok", args[0])
    elif cmd != "status":
        sys.exit(__doc__)
    if cmd in ("status", "import", "put"):
        n = {"vi": sum(1 for q in db["quotes"] if q.get("vi")), "en": sum(1 for q in db["quotes"] if q.get("en"))}
        have = lambda p: sum(1 for k in db["files"] if k.startswith(p))
        print(f"affirmations {len(db['affirmations'])} (voiced vi {have('a|vi')} en {have('a|en')}) · quotes {len(db['quotes'])} "
              f"(voiced vi {have('q|vi')}/{n['vi']} en {have('q|en')}/{n['en']}) · unused audio files: {len(orphans(db))}")
