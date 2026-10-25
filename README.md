# Thiền Sung Túc · Abundance Meditation

Trang web tĩnh (HTML/CSS/JS, không cần build).

- `affirmations.json` / `affirmations.js` — 40 câu (VI + EN). Sửa JSON rồi chạy `tools/build_audio.sh`.
- `audio/vi_XX.mp3` — VieNeu-TTS v3 Turbo, preset “Thục Đoan” (Nữ · miền Nam), tempo 0.86.
- `audio/en_XX.mp3` — Microsoft Edge neural TTS en-US-AvaNeural, rate −15%.
- `samples/` — mẫu 3 giọng nữ miền Nam.
- Nhạc nền: tạo trong trình duyệt bằng Web Audio (không dùng file nhạc).
- Chuông: tiếng chuông nhỏ, ngắn (~3s), tổng hợp bằng Web Audio; mặc định **Tắt**, có thể chọn mỗi 3'/5' hoặc chỉ đầu/cuối.
- Hẹn giờ mặc định 10 phút; hết giờ vẫn tự chạy tiếp (đồng hồ hiện `10:00 +m:ss`) cho đến khi bấm ■ Kết thúc. Bỏ chọn “Hết giờ vẫn chạy tiếp” để dừng đúng giờ.
- Nhật ký thiền: lưu trong localStorage của trình duyệt (khoá `thien.log.v1`), chỉ tính thời gian đang phát.
