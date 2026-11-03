#!/usr/bin/env bash
# Tạo giọng đọc (chạy từ bất kỳ đâu). Cần: venv theo tools/requirements-voice.txt (vieneu, kokoro-onnx, faster-whisper); ffmpeg.
# Văn bản + tên file giọng nằm trong d.js (xem tools/data.py: export để sửa, import để nạp lại).
#   tools/build_audio.sh                       câu khẳng định -> audio/a/
#   tools/build_audio.sh quotes [vi|en|all]    giọng cho quote -> audio/q/ ; chạy lại được, bỏ qua câu đã có giọng
# Xong chạy: python3 tools/build_sw.py
set -e
cd "$(dirname "$0")/.."
PY=${PY:-/workspace/vnv/bin/python}
if [ "$1" = quotes ]; then
  $PY tools/build_voice.py "${2:-all}" quotes
else
  $PY tools/build_voice.py all
fi
