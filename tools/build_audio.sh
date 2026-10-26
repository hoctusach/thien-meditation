#!/usr/bin/env bash
# Tạo lại affirmations.js + toàn bộ audio từ affirmations.json (chạy từ bất kỳ đâu).
# Cần: venv có vieneu (onnxruntime<1.23), edge-tts, faster-whisper; ffmpeg có rubberband.
set -e
cd "$(dirname "$0")/.."
PY=${PY:-/workspace/vnv/bin/python}
python3 - <<'P'
import json
d=json.load(open('affirmations.json'))
open('affirmations.js','w').write("// Danh sách câu khẳng định — sửa ở affirmations.json rồi chạy lại tools/build_audio.sh\nwindow.AFFIRMATIONS = "+json.dumps(d,ensure_ascii=False,indent=1)+";\nwindow.__thienJS = (window.__thienJS || 0) + 1;\n")
P
$PY tools/build_voice.py all
