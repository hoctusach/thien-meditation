# Thiền Sung Túc · Abundance Meditation

Trang web tĩnh (HTML/CSS/JS, không cần build). Mở `index.html` qua một web server bất kỳ (GitHub Pages, Netlify, Cloudflare Pages…).

- `affirmations.json` / `affirmations.js` — danh sách câu (VI + EN). Sửa JSON rồi chạy `tools/build_audio.sh` để tạo lại audio và affirmations.js.
- `audio/vi_XX.mp3` — giọng Việt AI: **VieNeu-TTS v3 Turbo** (Apache-2.0, chạy offline), preset **“Thục Đoan” — Nữ · miền Nam**.
- `audio/en_XX.mp3` — giọng Anh AI: Microsoft Edge neural TTS **en-US-AvaNeural** (rate −15%).
- `samples/` — mẫu thử 3 giọng nữ miền Nam (Thục Đoan, Mỹ Duyên, Kim Thanh) để chọn.
- Nhạc nền: tạo trực tiếp trong trình duyệt bằng Web Audio API (pad + sóng nhẹ, tần số gốc 432/528/396 Hz) — không dùng file nhạc nào, không vướng bản quyền.
