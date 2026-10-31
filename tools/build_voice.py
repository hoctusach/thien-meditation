"""Tạo audio giọng đọc thiền (cài đặt bản đầu tiên) cho mọi câu trong affirmations.json.
VI: VieNeu-TTS v3 Turbo, preset "Thục Đoan" (Nữ · miền Nam) -> kiểm tra Whisper, tạo lại nếu đọc chưa rõ.
EN: Kokoro-82M v1.0 (hexgrad, Apache-2.0) voice "af_heart" via kokoro-onnx, speed 0.75 (calm pace).
    Model files: kokoro-v1.0.onnx + voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx release model-files-v1.0),
    looked up in $KOKORO_DIR (default /workspace/ttsmodels), downloaded and sha256-checked if missing.
Pinned versions: tools/requirements-voice.txt
Usage: /workspace/vnv/bin/python tools/build_voice.py [vi|en|all] [quotes]
       (no 2nd argument) affirmations.json -> audio/<lang>_NN.mp3
       quotes           quotes.json       -> audio/q/<lang>_<id>.mp3, same voices/settings; then runs tools/build_quotes.py
                        (run tools/build_sw.py afterwards). Files that already exist are skipped, so a long run can be resumed.
       ONLY=9,13        only (re)make those line numbers (1-based); quotes: ONLY=q0001,q0005 or ONLY=1,5; all other files untouched.
       FORCE=1          quotes: also redo files that already exist.   LIMIT=50  quotes: make at most 50 files this run.
       DRY=1            list what would be made, load no model.
       NOCHECK=1        EN only: skip the Whisper read-back check (when Hugging Face is unreachable); listen to the files instead.
"""
import json, subprocess, sys, difflib, os, re
import numpy as np
VI_VOICE, VI_TEMP, VI_TEMPO = "Thục Đoan", 0.8, 0.86
EN_VOICE, EN_LANG, EN_SPEED = "af_heart", "en-us", 0.75
EN_TRIM = {24: 0.10}   # line -> seconds cut after speech onset (Kokoro adds a short "uh" before "Life loves me")
KOKORO_DIR = os.environ.get("KOKORO_DIR", "/workspace/ttsmodels")
KOKORO_FILES = {   # file -> sha256 (Kokoro-82M v1.0, ONNX export)
    "kokoro-v1.0.onnx": "7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5",
    "voices-v1.0.bin": "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d",
}
KOKORO_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
SOFT = "apad=pad_dur=0.3,loudnorm=I=-18:TP=-2"   # v1 settings (giọng gốc, không xử lý thêm)
A = json.load(open("affirmations.json"))
TMP = "/tmp/medvoice"; os.makedirs(TMP, exist_ok=True)
ONLY = {x.strip().lower() for x in os.environ.get("ONLY", "").split(",") if x.strip()}
SCOPE = sys.argv[2] if len(sys.argv) > 2 else "affirmations"
FORCE, DRY = os.environ.get("FORCE") == "1", os.environ.get("DRY") == "1"
LIMIT = int(os.environ.get("LIMIT") or 0)
NOCHECK = os.environ.get("NOCHECK") == "1"

def spoken(text):
    """What the TTS reads: line breaks inside a quote become spaces; curly apostrophes -> straight."""
    return re.sub(r"\s*\n\s*", " ", text).replace("\u2019", "'").strip()

def jobs(lang):
    """[(tag, text, out_path, trim_seconds)] for this lang in the chosen scope."""
    out = []
    if SCOPE == "quotes":
        os.makedirs("audio/q", exist_ok=True)
        for n, q in enumerate(json.load(open("quotes.json", encoding="utf-8")), 1):
            if not q.get(lang) or (ONLY and q["id"] not in ONLY and str(n) not in ONLY): continue
            path = f"audio/q/{lang}_{q['id']}.mp3"
            if os.path.exists(path) and not FORCE and not ONLY: continue
            out.append((f"{lang}_{q['id']}", spoken(q[lang]), path, 0))
    else:
        for i, a in enumerate(A):
            if ONLY and str(i + 1) not in ONLY: continue
            out.append((f"{lang}_{i+1:02d}", a[lang], f"audio/{lang}_{i+1:02d}.mp3", EN_TRIM.get(i + 1, 0) if lang == "en" else 0))
    return out[:LIMIT] if LIMIT else out

def post(src, dst, tempo):
    st = f"atempo={tempo}," if tempo != 1 else ""
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", st + SOFT,
                    "-ar", "44100", "-ac", "1", "-b:a", "64k", dst], check=True)

def post_en(src, dst, target=-18.5):
    """EN: same chain as the approved sample (pad 0.3 s + loudnorm), then a small linear trim so short clips also
    land on `target` LUFS (1-pass loudnorm undershoots on 2-3 s clips); a limiter keeps true peak <= -2 dBFS."""
    import re
    mid = dst + ".tmp.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", f"apad=pad_dur=0.3,loudnorm=I={target}:TP=-2",
                    "-ar", "44100", "-ac", "1", mid], check=True)
    e = subprocess.run(["ffmpeg", "-i", mid, "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    g = max(-4.0, min(4.0, target - float(re.search(r'"input_i" : "(-?[\d.]+)"', e).group(1))))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mid, "-af", f"volume={g:.2f}dB,alimiter=limit=0.79:level=false",
                    "-ar", "44100", "-ac", "1", "-b:a", "64k", dst], check=True)
    os.remove(mid)

def load16(f):
    return np.frombuffer(subprocess.run(["ffmpeg", "-loglevel", "error", "-i", f, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                                        capture_output=True).stdout, np.float32)
norm = lambda t: "".join(c for c in t.lower() if c.isalnum() or c == " ").split()

def kokoro_files():
    import hashlib, urllib.request
    os.makedirs(KOKORO_DIR, exist_ok=True)
    for f, sha in KOKORO_FILES.items():
        path = f"{KOKORO_DIR}/{f}"
        if not os.path.exists(path): urllib.request.urlretrieve(KOKORO_URL + f, path)
        h = hashlib.sha256(open(path, "rb").read()).hexdigest()
        if h != sha: sys.exit(f"{path}: sha256 {h} != {sha}")
    return [f"{KOKORO_DIR}/{f}" for f in KOKORO_FILES]

def build_en():
    todo = jobs("en")
    print(f"EN: {len(todo)} file(s) to make", flush=True)
    if DRY or not todo: return [t[2] for t in todo]
    import soundfile as sf
    from kokoro_onnx import Kokoro
    k = Kokoro(*kokoro_files())
    if not NOCHECK:
        from faster_whisper import WhisperModel
        m = WhisperModel("small", device="cpu", compute_type="int8")
    for tag, text, path, trim in todo:
        raw = f"{TMP}/{tag}.wav"
        samples, sr = k.create(text, voice=EN_VOICE, speed=EN_SPEED, lang=EN_LANG)
        if trim:
            import numpy as np
            c = int(np.argmax(np.abs(samples) > 0.02) + trim * sr)
            samples = samples[c:].copy(); samples[:240] *= np.linspace(0, 1, 240)
        sf.write(raw, samples, sr)
        post_en(raw, path)
        if NOCHECK: print(tag, text, sep=" | ", flush=True); continue
        s, _ = m.transcribe(load16(path), language="en"); t = " ".join(x.text for x in s).strip()
        sc = difflib.SequenceMatcher(None, norm(text), norm(t)).ratio()
        print(tag, round(sc, 2), t, "" if sc >= 0.9 else "  <-- CHECK", sep=" | ", flush=True)
    return [t[2] for t in todo]

def build_vi():
    todo = jobs("vi")
    print(f"VI: {len(todo)} file(s) to make", flush=True)
    if DRY or not todo: return [t[2] for t in todo]
    from vieneu import Vieneu
    from faster_whisper import WhisperModel
    v = Vieneu(); m = WhisperModel("small", device="cpu", compute_type="int8")
    def score(f, ref):
        s, _ = m.transcribe(load16(f), language="vi"); t = " ".join(x.text for x in s)
        return difflib.SequenceMatcher(None, norm(ref), norm(t)).ratio(), t
    report = []
    for tag, text, path, _ in todo:
        best = None
        for k in range(6):
            w, mp = f"{TMP}/{tag}_{k}.wav", f"{TMP}/{tag}_{k}.mp3"
            v.save(v.infer(text, voice=VI_VOICE, temperature=VI_TEMP), w)
            post(w, mp, VI_TEMPO)
            sc, t = score(mp, text)
            if best is None or sc > best[0]: best = (sc, t, mp, k + 1)
            if best[0] >= 0.85: break
        subprocess.run(["cp", best[2], path], check=True)
        report.append((tag, round(best[0], 2), best[3], text, best[1].strip()))
        print(*report[-1], sep=" | ", flush=True)
    json.dump(report, open(f"{TMP}/vi_report{'_q' if SCOPE == 'quotes' else ''}.json", "w"), ensure_ascii=False, indent=1)
    return [t[2] for t in todo]

if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("en", "all"): build_en()
    if what in ("vi", "all"): build_vi()
    if SCOPE == "quotes" and not DRY:   # let the app see the new voice files
        subprocess.run([sys.executable, "tools/build_quotes.py"], check=True)
        print("Next: python3 tools/build_sw.py")
