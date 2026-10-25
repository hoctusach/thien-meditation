import json, subprocess, time, sys
from vieneu import Vieneu
v=Vieneu()
items=json.load(open('affirmations.json'))
t=time.time()
for name in ["Thục Đoan","Mỹ Duyên","Kim Thanh"]:
    a=v.infer(items[0]['vi'],voice=name); v.save(a,f"samples/{name}.wav")
print("samples",time.time()-t,flush=True)
for i,it in enumerate(items):
    w=f"/tmp/vi_{i+1:02d}.wav"
    a=v.infer(it['vi'],voice="Thục Đoan"); v.save(a,w)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",w,"-af","atempo=0.92,loudnorm=I=-18:TP=-2","-ar","44100","-ac","1","-b:a","64k",f"audio/vi_{i+1:02d}.mp3"],check=True)
    print(i+1,round(time.time()-t),flush=True)
