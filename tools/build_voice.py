"""Tạo audio giọng đọc thiền (cài đặt bản đầu tiên) cho mọi câu trong affirmations.json.
VI: VieNeu-TTS v3 Turbo, preset "Thục Đoan" (Nữ · miền Nam) -> kiểm tra Whisper, tạo lại nếu đọc chưa rõ.
EN: Kokoro-82M v1.0 (hexgrad, Apache-2.0) voice "af_heart" via kokoro-onnx, speed 0.75 (calm pace).
    Model files: kokoro-v1.0.onnx + voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx release model-files-v1.0),
    looked up in $KOKORO_DIR (default /workspace/ttsmodels), downloaded and sha256-checked if missing.
Pinned versions: tools/requirements-voice.txt
Usage: /workspace/vnv/bin/python tools/build_voice.py [vi|en|all]
       ONLY=9,13 ... -> only (re)make those line numbers (1-based); all other files are left untouched.
"""
import json, subprocess, sys, difflib, os
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
ONLY = {int(x) for x in os.environ.get("ONLY", "").split(",") if x.strip()}
todo = lambda i: not ONLY or (i + 1) in ONLY

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
    import soundfile as sf
    from kokoro_onnx import Kokoro
    from faster_whisper import WhisperModel
    k = Kokoro(*kokoro_files()); m = WhisperModel("small", device="cpu", compute_type="int8")
    for i, a in enumerate(A):
        if not todo(i): continue
        n = f"{i+1:02d}"; raw = f"{TMP}/en_{n}.wav"
        samples, sr = k.create(a["en"], voice=EN_VOICE, speed=EN_SPEED, lang=EN_LANG)
        if i + 1 in EN_TRIM:
            import numpy as np
            c = int(np.argmax(np.abs(samples) > 0.02) + EN_TRIM[i + 1] * sr)
            samples = samples[c:].copy(); samples[:240] *= np.linspace(0, 1, 240)
        sf.write(raw, samples, sr)
        post_en(raw, f"audio/en_{n}.mp3")
        s, _ = m.transcribe(load16(f"audio/en_{n}.mp3"), language="en"); t = " ".join(x.text for x in s).strip()
        sc = difflib.SequenceMatcher(None, norm(a["en"]), norm(t)).ratio()
        print(n, round(sc, 2), t, "" if sc >= 0.9 else "  <-- CHECK", sep=" | ", flush=True)

def build_vi():
    from vieneu import Vieneu
    from faster_whisper import WhisperModel
    v = Vieneu(); m = WhisperModel("small", device="cpu", compute_type="int8")
    def score(f, ref):
        s, _ = m.transcribe(load16(f), language="vi"); t = " ".join(x.text for x in s)
        return difflib.SequenceMatcher(None, norm(ref), norm(t)).ratio(), t
    report = []
    for i, a in enumerate(A):
        if not todo(i): continue
        n = f"{i+1:02d}"; best = None
        for k in range(6):
            w, mp = f"{TMP}/vi_{n}_{k}.wav", f"{TMP}/vi_{n}_{k}.mp3"
            v.save(v.infer(a["vi"], voice=VI_VOICE, temperature=VI_TEMP), w)
            post(w, mp, VI_TEMPO)
            sc, t = score(mp, a["vi"])
            if best is None or sc > best[0]: best = (sc, t, mp, k + 1)
            if best[0] >= 0.85: break
        subprocess.run(["cp", best[2], f"audio/vi_{n}.mp3"], check=True)
        report.append((n, round(best[0], 2), best[3], a["vi"], best[1].strip()))
        print(*report[-1], sep=" | ", flush=True)
    json.dump(report, open(f"{TMP}/vi_report.json", "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("en", "all"): build_en()
    if what in ("vi", "all"): build_vi()
