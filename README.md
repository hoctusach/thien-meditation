# Thiền Sung Túc · Abundance Meditation

Trang web tĩnh (HTML/CSS/JS, không cần build). Mở `index.html` qua một web server bất kỳ (GitHub Pages, Netlify, Cloudflare Pages…).

- `affirmations.json` / `affirmations.js` — danh sách câu (VI + EN). Sửa JSON rồi chạy `tools/build_audio.sh` để tạo lại audio và affirmations.js.
- `audio/vi_XX.mp3` — giọng Việt AI: **VieNeu-TTS v3 Turbo** (Apache-2.0, chạy offline), preset **“Mỹ Duyên” — Nữ · miền Nam** (temperature 0.6), chậm lại bằng rubberband tempo 0.80 (giữ cao độ), xử lý mềm: EQ giảm độ chói, de-ess, nén nhẹ, reverb nhẹ, −21 LUFS. Mỗi câu được Whisper kiểm tra, câu chưa rõ được tạo lại (tối đa 6 lần).
- `audio/en_XX.mp3` — giọng Anh AI: Microsoft Edge neural TTS **en-US-AvaNeural** (rate −30%, pitch −4Hz, thêm tempo 0.95) + cùng chuỗi xử lý mềm.
- `samples/` — mẫu thử 3 giọng nữ miền Nam (Thục Đoan, Mỹ Duyên, Kim Thanh) để chọn.
- Nhạc nền: tạo trực tiếp trong trình duyệt bằng Web Audio API (pad + sóng nhẹ, tần số gốc 432/528/396 Hz) — không dùng file nhạc nào, không vướng bản quyền.
- Chuông thiền (singing bowl): cũng tổng hợp bằng Web Audio. Reo khi bắt đầu, khi kết thúc, và mỗi 2/3/5 phút (chỉ giữa các câu, không đè lên giọng đọc). Có nút tắt và thanh âm lượng riêng.
- `tools/build_voice.py` — script tạo giọng + kiểm tra Whisper; `tools/build_audio.sh` chạy toàn bộ.
