#!/usr/bin/env bash
# Tạo lại toàn bộ audio từ affirmations.json (chạy từ thư mục gốc của site).
# Cần: python venv có `vieneu` (onnxruntime<1.23), `edge-tts`, và ffmpeg.
set -e
cd "$(dirname "$0")/.."
PY=${PY:-/workspace/vnv/bin/python}
python3 - <<'P'
import json
d=json.load(open('affirmations.json'))
open('affirmations.js','w').write("// Danh sách câu khẳng định — sửa ở affirmations.json rồi chạy lại tools/build_audio.sh\nwindow.AFFIRMATIONS = "+json.dumps(d,ensure_ascii=False,indent=1)+";\n")
P
$PY tools/gen_en.py
for f in audio/en_*.mp3; do ffmpeg -y -loglevel error -i $f -af loudnorm=I=-18:TP=-2 -ar 44100 -ac 1 -b:a 64k /tmp/x.mp3 && mv /tmp/x.mp3 $f; done
$PY tools/gen_vi.py
for f in /tmp/vi_[0-9][0-9].wav; do n=$(basename $f .wav); ffmpeg -y -loglevel error -i $f -af "atempo=0.86,apad=pad_dur=0.3,loudnorm=I=-18:TP=-2" -ar 44100 -ac 1 -b:a 64k audio/$n.mp3; done
$PY tools/qa_regen_vi.py   # tự kiểm tra bằng Whisper, tạo lại câu đọc sai
