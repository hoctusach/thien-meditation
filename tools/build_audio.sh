#!/usr/bin/env bash
# Tạo lại affirmations.js + toàn bộ audio từ affirmations.json (chạy từ bất kỳ đâu).
# Cần: venv theo tools/requirements-voice.txt (vieneu, kokoro-onnx, faster-whisper); ffmpeg.
#   tools/build_audio.sh                 câu khẳng định (affirmations.json -> audio/vi_NN.mp3, en_NN.mp3)
#   tools/build_audio.sh quotes [vi|en|all]   giọng cho quote (quotes.json -> audio/q/); chạy lại được, bỏ qua file đã có
set -e
cd "$(dirname "$0")/.."
PY=${PY:-/workspace/vnv/bin/python}
if [ "$1" = quotes ]; then
  $PY tools/build_voice.py "${2:-all}" quotes
else
python3 - <<'P2'
import json
d=json.load(open('affirmations.json'))
open('affirmations.js','w').write("// Danh sách câu khẳng định — sửa ở affirmations.json rồi chạy lại tools/build_audio.sh\nwindow.AFFIRMATIONS = "+json.dumps(d,ensure_ascii=False,indent=1)+";\nwindow.__thienJS = (window.__thienJS || 0) + 1;\n")
P2
$PY tools/build_voice.py all
fi
