"""Tạo audio giọng đọc thiền (chậm, mềm) cho mọi câu trong affirmations.json.
VI: VieNeu-TTS v3 Turbo, preset "Mỹ Duyên" (Nữ · miền Nam) -> kiểm tra Whisper, tạo lại nếu đọc chưa rõ.
EN: edge-tts en-US-AvaNeural, rate -30%.
Usage: /workspace/vnv/bin/python tools/build_voice.py [vi|en|all]
"""
import json, subprocess, sys, asyncio, difflib, os
import numpy as np
VI_VOICE, VI_TEMP, VI_TEMPO = "Mỹ Duyên", 0.6, 0.80
EN_VOICE, EN_RATE, EN_PITCH, EN_TEMPO = "en-US-AvaNeural", "-30%", "-4Hz", 0.95
SOFT = ("highpass=f=90,lowpass=f=6500,equalizer=f=3200:t=q:w=1.2:g=-3,deesser=i=0.5,"
        "acompressor=threshold=-26dB:ratio=2.5:attack=25:release=300:makeup=2,"
        "aecho=0.85:0.6:70|140:0.16|0.08,apad=pad_dur=0.6,loudnorm=I=-21:TP=-3:LRA=7")
A = json.load(open("affirmations.json"))
TMP = "/tmp/medvoice"; os.makedirs(TMP, exist_ok=True)

def post(src, dst, tempo):
    st = f"rubberband=tempo={tempo}:formant=preserved:transients=smooth:window=long," if tempo != 1 else ""
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", st + SOFT,
                    "-ar", "44100", "-ac", "1", "-b:a", "72k", dst], check=True)

def load16(f):
    return np.frombuffer(subprocess.run(["ffmpeg", "-loglevel", "error", "-i", f, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                                        capture_output=True).stdout, np.float32)
norm = lambda t: "".join(c for c in t.lower() if c.isalnum() or c == " ").split()

def build_en():
    import edge_tts
    async def run():
        for i, a in enumerate(A):
            raw = f"{TMP}/en_{i+1:02d}.mp3"
            await edge_tts.Communicate(a["en"], EN_VOICE, rate=EN_RATE, pitch=EN_PITCH).save(raw)
            post(raw, f"audio/en_{i+1:02d}.mp3", EN_TEMPO)
    asyncio.run(run())

def build_vi():
    from vieneu import Vieneu
    from faster_whisper import WhisperModel
    v = Vieneu(); m = WhisperModel("small", device="cpu", compute_type="int8")
    def score(f, ref):
        s, _ = m.transcribe(load16(f), language="vi"); t = " ".join(x.text for x in s)
        return difflib.SequenceMatcher(None, norm(ref), norm(t)).ratio(), t
    report = []
    for i, a in enumerate(A):
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
