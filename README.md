# Thiền Sung Túc · Abundance Meditation

Trang web tĩnh (HTML/CSS/JS, không cần build).

- `affirmations.json` / `affirmations.js` — 40 câu (VI + EN). Sửa JSON rồi chạy `tools/build_audio.sh`.
- `audio/vi_XX.mp3` — VieNeu-TTS v3 Turbo, preset “Thục Đoan” (Nữ · miền Nam), tempo 0.86.
- `audio/en_XX.mp3` — Microsoft Edge neural TTS en-US-AvaNeural, rate −15%.
- `samples/` — mẫu 3 giọng nữ miền Nam.
- Nhạc nền (`music.js`): 6 bài tạo trực tiếp bằng Web Audio (không dùng file nhạc, không vướng bản quyền), tự xoay vòng mỗi ~3 phút (chỉ tính lúc đang phát), chuyển bài êm (crossfade 6s). Có ‹ › để đổi bài, menu chọn bài, và chế độ “Giữ 1 bài”.
  1. Bình yên · Calm pad (đúng bản nhạc gốc) 2. Giọt nắng · Kalimba 3. Dương cầm êm · Soft piano 4. Mưa rừng · Rain & birds 5. Ấm áp · Warm pad 6. Suối nhỏ · Little stream
- Chuông: tiếng chuông nhỏ, ngắn (~3s), tổng hợp bằng Web Audio; mặc định **mỗi 5 phút** (chỉ reo trong khoảng lặng, không đè lên giọng đọc), có thể Tắt / 3' / chỉ đầu-cuối.
- Mỗi câu Việt và mỗi câu Anh là một câu riêng (80 câu), sau mỗi câu là khoảng lặng 12s / 40s / 60s / 2' / 5' (mặc định 12s).
- Hẹn giờ mặc định 10 phút; hết giờ vẫn tự chạy tiếp (đồng hồ hiện `10:00 +m:ss`) cho đến khi bấm ■ Kết thúc. Bỏ chọn “Hết giờ vẫn chạy tiếp” để dừng đúng giờ.
- Nhật ký thiền: lưu trong localStorage của trình duyệt (khoá `thien.log.v1`), chỉ tính thời gian đang phát.
