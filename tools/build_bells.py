"""Synthesise the bell sounds (additive synthesis, numpy) -> audio/bells/*.mp3
Each bell: <id>.mp3 (one strike) and <id>-x5.mp3 (5 slow strikes for the daily reminder).
All original sounds made by this script — no third-party samples, no licence restrictions.
"""
import numpy as np, subprocess, os
SR = 44100
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def strike(f0, partials, length, attack=0.012, lp=None, mallet=0.0, seed=1):
    """partials: list of (ratio, amplitude, decay_seconds)."""
    t = np.arange(int(SR * length)) / SR
    y = np.zeros_like(t)
    rng = np.random.default_rng(seed)
    for r, a, d in partials:
        ph = rng.uniform(0, 2 * np.pi)
        y += a * np.sin(2 * np.pi * f0 * r * t + ph) * np.exp(-t / d)
    env = 1 - np.exp(-t / attack)              # soft (felt mallet) attack, no click
    y *= env
    if mallet:                                 # a little soft thump of the mallet
        n = rng.standard_normal(len(t)) * np.exp(-t / 0.025) * mallet
        k = np.exp(-np.arange(200) / 25.0); n = np.convolve(n, k / k.sum(), mode="same")
        y += n
    return y / np.abs(y).max()

BELLS = {
  # id: (Vietnamese label, English, generator)
  "temple": ("Chuông chùa trầm", "Deep temple bell", lambda: strike(196, [
      (0.5, .55, 9.0), (1.0, 1.0, 7.5), (1.19, .32, 5.0), (1.5, .22, 4.2), (2.0, .30, 3.6), (2.52, .10, 2.4), (3.0, .06, 1.8), (4.04, .03, 1.2)],
      12, attack=.02, mallet=.05)),
  "bowl": ("Chuông bát ấm", "Warm singing bowl", lambda: strike(220, [
      (1.0, 1.0, 9.5), (2.71, .22, 5.5), (5.13, .05, 2.6), (8.2, .012, 1.2)], 12, attack=.03)),
  "gong": ("Cồng êm", "Soft gong", lambda: strike(110, [
      (1.0, 1.0, 8.0), (1.47, .45, 6.0), (2.0, .35, 5.0), (2.43, .20, 3.6), (2.94, .14, 3.0), (3.5, .08, 2.2), (4.2, .04, 1.6)],
      11, attack=.06, mallet=.08)),
  "chime": ("Chuông gió ngân", "Gentle long chime", lambda: strike(392, [
      (1.0, 1.0, 7.5), (2.76, .12, 3.0), (5.40, .03, 1.2), (0.5, .08, 6.0)], 10, attack=.008)),
  "wood": ("Chuông gỗ ấm", "Warm wooden bell", lambda: strike(262, [
      (1.0, 1.0, 5.5), (2.0, .25, 3.0), (3.93, .10, 1.2), (0.5, .20, 4.5)], 8, attack=.006, mallet=.12)),
  "bright": ("Chuông sáng (ngắn)", "Bright short chime", lambda: strike(432, [
      (2, .13 / .13, 3.0 / 5.0), (5.4, .05 / .13, 1.6 / 5.0), (8.9, .025 / .13, .9 / 5.0)], 4, attack=.002)),
}
LP = {"temple": 3000, "bowl": 3500, "gong": 2500, "chime": 3800, "wood": 3200, "bright": 12000}

def encode(y, path, lp, fade_at):
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()
    af = f"lowpass=f={lp},afade=t=out:st={fade_at:.2f}:d=1.5,loudnorm=I=-24:TP=-6:LRA=11"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-af", af, "-ar", "44100", "-b:a", "64k", path], input=pcm, check=True)

if __name__ == "__main__":
    import json
    meta = []
    for bid, (vi, en, gen) in BELLS.items():
        one = gen(); L = len(one) / SR
        encode(one, f"audio/bells/{bid}.mp3", LP[bid], L - 1.5)
        gap = 3.5 if bid == "bright" else 7.5      # each strike rings out before the next
        five = np.zeros(int(SR * (gap * 4 + L)))
        for k in range(5):
            s = int(k * gap * SR); five[s:s + len(one)] += one * (0.85 if k < 4 else 1.0)
        five /= np.abs(five).max()
        encode(five, f"audio/bells/{bid}-x5.mp3", LP[bid], len(five) / SR - 1.5)
        meta.append({"id": bid, "vi": vi, "en": en})
        print(bid, round(L, 1), "s; x5", round(len(five) / SR, 1), "s")
    json.dump(meta, open("audio/bells/bells.json", "w"), ensure_ascii=False)
