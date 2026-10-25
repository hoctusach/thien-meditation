import subprocess, numpy as np, json, difflib
from faster_whisper import WhisperModel
from vieneu import Vieneu
m=WhisperModel('small',device='cpu',compute_type='int8'); v=Vieneu()
A=json.load(open('affirmations.json'))
def load(f): return np.frombuffer(subprocess.run(['ffmpeg','-loglevel','error','-i',f,'-f','f32le','-ac','1','-ar','16000','-'],capture_output=True).stdout,np.float32)
norm=lambda t:''.join(c for c in t.lower() if c.isalnum() or c==' ').split()
def score(f,ref):
    s,_=m.transcribe(load(f),language='vi'); t=' '.join(x.text for x in s)
    return difflib.SequenceMatcher(None,norm(ref),norm(t)).ratio(),t
for i,a in enumerate(A):
    n=f"{i+1:02d}"; best=score(f'/tmp/vi_{n}.wav',a['vi'])+(f'/tmp/vi_{n}.wav',)
    k=0
    while best[0]<0.8 and k<5:
        w=f'/tmp/vi_{n}_t{k}.wav'; v.save(v.infer(a['vi'],voice="Thục Đoan"),w)
        sc=score(w,a['vi']); 
        if sc[0]>best[0]: best=sc+(w,)
        k+=1
    if k: 
        subprocess.run(["ffmpeg","-y","-loglevel","error","-i",best[2],"-af","atempo=0.86,apad=pad_dur=0.3,loudnorm=I=-18:TP=-2","-ar","44100","-ac","1","-b:a","64k",f"audio/vi_{n}.mp3"],check=True)
        print(n,round(best[0],2),best[1],flush=True)
print('done')
