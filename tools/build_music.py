"""Download + normalise the background music -> audio/music/*.mp3 (+ samples/music previews with SAMPLES=1).
All tracks are public domain / CC0 / CC BY (attribution shown in the app and README). Sources: Wikimedia Commons.
Processing: trim silence, gentle compression (so quiet bars are not lost under the voice), linear gain to -24 LUFS,
true peak <= -2 dBTP, soft fade in/out, MP3 112 kbps stereo.
"""
import os, json, subprocess, urllib.request
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.environ.get("MUSIC_SRC", "/workspace/music-cand")
UA = {"User-Agent": "thien-meditation/1.0 (static site build)"}
C = "https://upload.wikimedia.org/wikipedia/commons/"
TRACKS = [  # id, vi, en (title), artist/performer, licence, licence url, commons page, file url, style
  dict(id="gymnopedie", vi="Gymnopédie số 1", en="Satie – Gymnopédie No. 1", by="Erik Satie · Robin Alciatore (piano, Musopen)",
       lic="Public domain", licurl="https://commons.wikimedia.org/wiki/Template:PD-author",
       page="https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg",
       url=C + "9/90/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg", src="gymno-alciatore.ogg"),
  dict(id="bach-prelude", vi="Khúc dạo đầu Đô trưởng", en="Bach – Prelude in C major, BWV 846", by="J. S. Bach · Kimiko Ishizaka (piano)",
       lic="CC0 1.0", licurl="https://creativecommons.org/publicdomain/zero/1.0/",
       page="https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier,_Book_1_-_01_Prelude_No._1_in_C_major,_BWV_846.ogg",
       url=C + "b/b6/Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier%2C_Book_1_-_01_Prelude_No._1_in_C_major%2C_BWV_846.ogg", src="bach-prelude-c.ogg"),
  dict(id="air", vi="Khúc Air (dây đàn Sol)", en="Bach – Air on the G String", by="J. S. Bach · U.S. Air Force Strings",
       lic="Public domain (U.S. Government work)", licurl="https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force",
       page="https://commons.wikimedia.org/wiki/File:Air_-_Air_Force_Strings_-_United_States_Air_Force_Band.mp3",
       url=C + "e/ec/Air_-_Air_Force_Strings_-_United_States_Air_Force_Band.mp3", src="air-g-string.mp3"),
  dict(id="nocturne", vi="Dạ khúc Mi giáng trưởng", en="Chopin – Nocturne Op. 9 No. 2", by="F. Chopin · Frank Levy (piano, Musopen)",
       lic="Public domain", licurl="https://creativecommons.org/publicdomain/mark/1.0/",
       page="https://commons.wikimedia.org/wiki/File:Nocturne_in_E_flat_major,_Op._9_no._2.mp3",
       url=C + "8/82/Nocturne_in_E_flat_major%2C_Op._9_no._2.mp3", src="nocturne-op9-2.mp3"),
  dict(id="traumerei", vi="Mơ mộng (Träumerei)", en="Schumann – Träumerei", by="R. Schumann · Musopen (piano)",
       lic="Public domain", licurl="https://commons.wikimedia.org/wiki/Template:PD-author",
       page="https://commons.wikimedia.org/wiki/File:Robert_Schumann_-_scenes_from_childhood,_op._15_-_vii._dreaming.ogg",
       url=C + "0/06/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_vii._dreaming.ogg", src="traumerei.ogg"),
  dict(id="impromptu", vi="Ngẫu hứng thiền", en="Meditation Impromptu 02", by="Kevin MacLeod (incompetech.com)",
       lic="CC BY 3.0", licurl="https://creativecommons.org/licenses/by/3.0/",
       page="https://commons.wikimedia.org/wiki/File:Meditation_Impromptu_02_(ISRC_USUAN1100162).mp3",
       url=C + "0/09/Meditation_Impromptu_02_%28ISRC_USUAN1100162%29.mp3", src="meditation-impromptu-02.mp3"),
]

def run(cmd, **kw): return subprocess.run(cmd, check=True, capture_output=True, **kw)

def source(t):
    p = os.path.join(SRC, t["src"])
    if not os.path.exists(p):
        os.makedirs(SRC, exist_ok=True)
        open(p, "wb").write(urllib.request.urlopen(urllib.request.Request(t["url"], headers=UA), timeout=300).read())
    return p

PRE = ("silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.2,areverse,"
       "silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.5,areverse,"
       "acompressor=threshold=-30dB:ratio=2.2:attack=60:release=900:makeup=1")

def build(t, out, extra_pre="", fade_out=5.0, br="112k"):
    src = source(t)
    pre = PRE + extra_pre
    m = run(["ffmpeg", "-hide_banner", "-i", src, "-af", pre + ",loudnorm=I=-24:TP=-2:LRA=11:print_format=json", "-f", "null", "-"]).stderr.decode()
    j = json.loads(m[m.rindex("{"):m.rindex("}") + 1])
    dur = float(json.loads(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", "-i", src]).stdout)["format"]["duration"])
    if "atrim" in extra_pre: dur = float(extra_pre.split("duration=")[1].split(",")[0])
    gain = min(-24.0 - float(j["input_i"]), -2.0 - float(j["input_tp"]))
    af = pre + f",volume={gain:.2f}dB,afade=t=in:d=2,areverse,afade=t=in:d={fade_out},areverse"
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", src, "-af", af, "-vn", "-ar", "44100", "-ac", "2", "-b:a", br, "-map_metadata", "-1", out])

if __name__ == "__main__":
    os.makedirs("audio/music", exist_ok=True)
    keep = {f"{t['id']}.mp3" for t in TRACKS}
    for f in os.listdir("audio/music"):
        if f not in keep: os.remove(os.path.join("audio/music", f))
    for t in TRACKS:
        build(t, f"audio/music/{t['id']}.mp3"); print("built", t["id"])
    json.dump([{k: t[k] for k in ("id", "vi", "en", "by", "lic", "licurl", "page")} for t in TRACKS],
              open("audio/music/tracks.json", "w"), ensure_ascii=False, indent=1)
    if os.environ.get("SAMPLES"):    # 25 s preview clips to send around (not part of the app)
        os.makedirs("samples/music", exist_ok=True)
        for f in os.listdir("samples/music"): os.remove(os.path.join("samples/music", f))
        for i, t in enumerate(TRACKS, 1):
            build(t, f"samples/music/{i}-{t['id']}-25s.mp3", extra_pre=",atrim=start=8:duration=25,asetpts=PTS-STARTPTS", fade_out=3, br="128k")
