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

## App (PWA) — cài lên điện thoại
- `manifest.webmanifest`, `icons/`, `sw.js` (service worker: lưu toàn bộ trang + 81 file âm thanh để dùng offline). Mọi đường dẫn là tương đối nên chạy được dưới `/thien-meditation/`.
- **Sau khi sửa bất kỳ file nào, chạy `python3 tools/build_sw.py`** để cập nhật danh sách cache + phiên bản (app trên điện thoại sẽ tự cập nhật).
- Android/Chrome: nút “📲 Cài đặt app”. iPhone/Safari: Chia sẻ → “Thêm vào MH chính”.

## Giao diện & nhịp thở
- 6 giao diện (Bình minh, Biển xanh, Rừng xanh, Hoa sen, Trời sao, Hoàng hôn), mặc định tự đổi mỗi 2 phút, chuyển màu từ từ 8 giây; có thể chọn cố định.
- Nhịp thở mặc định 4-7-8 (Hít vào 4s · Giữ 7s · Thở ra 8s); tùy chọn 4-2-6.

## Nhắc nhở hằng ngày
Trong app: “⏰ Nhắc nhở hằng ngày” → chọn giờ → bật. Có 4 lớp:
1. **Mở app sau giờ nhắc** → hiện “Đến giờ thiền rồi” + 5 hồi chuông chậm (`audio/bell5.mp3`, ~22s). Luôn hoạt động.
2. **📅 Thêm vào lịch** → file `.ics` lặp lại mỗi ngày có báo thức — cách chắc chắn nhất, dùng âm báo của lịch.
3. **Nhắc nền Android** (Periodic Background Sync, chỉ khi đã cài app trên Chrome Android) — trình duyệt tự quyết định lúc chạy, không đúng giờ.
4. **Thông báo đẩy (Web Push) miễn phí qua GitHub Actions** — `.github/workflows/daily-reminder.yml` chạy mỗi 10 phút và gửi thông báo cho những ai đã đến giờ.
   Cài một lần:
   - Repo → Settings → Secrets and variables → Actions → **New repository secret**
     - `VAPID_PRIVATE_KEY` = khoá bí mật VAPID (cặp với khoá công khai trong `config.js`).
     - `PUSH_SUBSCRIPTIONS` = `[ mã1, mã2 ]` — mỗi mã lấy từ nút “📋 Sao chép mã thông báo” trong app (sau khi bật nhắc nhở và cho phép thông báo). Đổi giờ nhắc → sửa `"time"` trong secret (hoặc sao chép mã mới).
   - Actions tab → bật workflows nếu được hỏi → “Daily meditation reminder” → **Run workflow** để gửi thử.
   - Giới hạn: GitHub chạy lịch “cố gắng hết sức” (thường trễ 5–30 phút); repo public không có hoạt động 60 ngày sẽ bị tắt lịch — workflow có job keepalive hằng tuần tự commit mỗi 30 ngày.
   - Thông báo dùng âm thanh mặc định của hệ thống (web không thể đặt âm chuông riêng); bấm vào thông báo sẽ mở app và reo 5 hồi chuông.
