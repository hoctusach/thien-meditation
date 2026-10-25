# Thiền

Thiền để thay đổi tần số · Meditate to shift your frequency.

Trang web tĩnh (HTML/CSS/JS, không cần build).

- `affirmations.json` / `affirmations.js` — 50 câu (VI + EN; 10 câu “Quan sát” xen đều trong danh sách). Sửa JSON rồi chạy `tools/build_audio.sh`.
- `audio/vi_XX.mp3` — VieNeu-TTS v3 Turbo, preset “Thục Đoan” (Nữ · miền Nam), tempo 0.86.
- `audio/en_XX.mp3` — Microsoft Edge neural TTS en-US-AvaNeural, rate −15%.
- `samples/` — mẫu 3 giọng nữ miền Nam.
- Nhạc nền (`music.js`): **6 bản nhạc không lời thật** (public domain / CC0 / CC BY), phát lần lượt từng bài trọn vẹn rồi chuyển bài êm (crossfade 6s); chế độ “Lặp 1 bài”. Có ‹ › và menu chọn bài; khi chưa bắt đầu thiền, đổi bài sẽ phát thử 20s. Nhạc tự giảm nhẹ (~3 dB) khi giọng đọc. Xem mục “Nhạc nền” bên dưới.
- Chuông: tiếng chuông nhỏ, ngắn (~3s), tổng hợp bằng Web Audio; mặc định **mỗi 5 phút** (chỉ reo trong khoảng lặng, không đè lên giọng đọc), có thể Tắt / 3' / chỉ đầu-cuối.
- Mỗi câu Việt và mỗi câu Anh là một câu riêng (100 câu), sau mỗi câu là khoảng lặng 12s / 40s / 60s / 2' / 5' (mặc định 12s).
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
1. **Mở app sau giờ nhắc** → hiện “Đến giờ thiền rồi” + 3 hồi “Chuông thiền” (`audio/bell5.mp3`, ~34s; bài thiền bắt đầu khi hồi cuối đang ngân). Luôn hoạt động.
2. **📅 Thêm vào lịch** → file `.ics` lặp lại mỗi ngày có báo thức — cách chắc chắn nhất, dùng âm báo của lịch.
3. **Nhắc nền Android** (Periodic Background Sync, chỉ khi đã cài app trên Chrome Android) — trình duyệt tự quyết định lúc chạy, không đúng giờ.
4. **Thông báo đẩy (Web Push) miễn phí qua GitHub Actions** — `.github/workflows/daily-reminder.yml` chạy mỗi 10 phút và gửi thông báo cho những ai đã đến giờ.
   Cài một lần:
   - Repo → Settings → Secrets and variables → Actions → **New repository secret**
     - `VAPID_PRIVATE_KEY` = khoá bí mật VAPID (cặp với khoá công khai trong `config.js`).
     - `PUSH_SUBSCRIPTIONS` = `[ mã1, mã2 ]` — mỗi mã lấy từ nút “📋 Sao chép mã thông báo” trong app (sau khi bật nhắc nhở và cho phép thông báo). Đổi giờ nhắc → sửa `"time"` trong secret (hoặc sao chép mã mới).
   - Actions tab → bật workflows nếu được hỏi → “Daily meditation reminder” → **Run workflow** để gửi thử.
   - Giới hạn: GitHub chạy lịch “cố gắng hết sức” (thường trễ 5–30 phút); repo public không có hoạt động 60 ngày sẽ bị tắt lịch — workflow có job keepalive hằng tuần tự commit mỗi 30 ngày.
   - Thông báo dùng âm thanh mặc định của hệ thống (web không thể đặt âm chuông riêng); bấm vào thông báo sẽ mở app và reo 3 hồi chuông.

## Nhạc nền
File trong `audio/music/` (MP3 112 kbps stereo, chuẩn hoá −24 LUFS, nén động nhẹ, ~17 MB tổng, ~20 phút). Tạo lại bằng `python3 tools/build_music.py` (tải từ Wikimedia Commons; `SAMPLES=1` để tạo thêm đoạn nghe thử 25s trong `samples/music/`). Service worker **không** tải trước nhạc: mỗi bài được lưu vào cache riêng (`thien-music-…`) lần đầu phát, sau đó nghe offline được.

| # | Bài | Phong cách | Tác giả · Trình bày | Giấy phép | Nguồn |
|---|---|---|---|---|---|
| 1 | Satie – Gymnopédie No. 1 (Gymnopédie số 1) | dương cầm chậm, thanh thoát | Erik Satie · Robin Alciatore (piano, Musopen) | [Public domain](https://commons.wikimedia.org/wiki/Template:PD-author) | [Commons](https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg) |
| 2 | Bach – Prelude in C major, BWV 846 (Khúc dạo đầu Đô trưởng) | dương cầm rải hợp âm đều, sáng và ấm | J. S. Bach · Kimiko Ishizaka (piano) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier,_Book_1_-_01_Prelude_No._1_in_C_major,_BWV_846.ogg) |
| 3 | Bach – Air on the G String (Khúc Air (dây đàn Sol)) | dàn dây êm, giai điệu dài | J. S. Bach · U.S. Air Force Strings | [Public domain (U.S. Government work)](https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force) | [Commons](https://commons.wikimedia.org/wiki/File:Air_-_Air_Force_Strings_-_United_States_Air_Force_Band.mp3) |
| 4 | Chopin – Nocturne Op. 9 No. 2 (Dạ khúc Mi giáng trưởng) | dương cầm trữ tình, du dương | F. Chopin · Frank Levy (piano, Musopen) | [Public domain](https://creativecommons.org/publicdomain/mark/1.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Nocturne_in_E_flat_major,_Op._9_no._2.mp3) |
| 5 | Schumann – Träumerei (Mơ mộng (Träumerei)) | dương cầm ấm, dịu dàng | R. Schumann · Musopen (piano) | [Public domain](https://commons.wikimedia.org/wiki/Template:PD-author) | [Commons](https://commons.wikimedia.org/wiki/File:Robert_Schumann_-_scenes_from_childhood,_op._15_-_vii._dreaming.ogg) |
| 6 | Meditation Impromptu 02 (Ngẫu hứng thiền) | dương cầm ngẫu hứng, viết riêng cho thiền/thư giãn | Kevin MacLeod (incompetech.com) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | [Commons](https://commons.wikimedia.org/wiki/File:Meditation_Impromptu_02_(ISRC_USUAN1100162).mp3) |

Ghi công (cũng hiện ở cuối trang): *“Meditation Impromptu 02” Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 3.0 — http://creativecommons.org/licenses/by/3.0/*. Các bản thu Musopen là public domain; Musopen đề nghị ghi nguồn — đã ghi.

## Tiếng chuông
3 tiếng chuông, đều do `tools/build_bells.py` tự tổng hợp bằng numpy (tổng hợp theo mode: mỗi hoạ âm có tần số, độ lớn và tốc độ tắt riêng) — **không dùng bất kỳ mẫu âm thanh nào của bên thứ ba, không có ràng buộc bản quyền** (tự tạo, dùng tự do).

“Chuông thiền” được dựng lại từ **thông số đo được** của một tiếng chuông thiền tham khảo (video hướng dẫn thiền của Gosinga): âm chính ~1316 Hz, các mode 150 / 430+439 / 825+834 / 1890 / 2530 Hz, ngân dài (âm 430 Hz tắt sau ~60s, âm chính ~15s), dùi gõ rõ nhưng không chát (~5 ms). Chỉ đo thông số; **không dùng, không phát hành âm thanh gốc**. Độ giống phổ so với bản tham khảo: ~0,97 (tương quan phổ 1/12 quãng tám), độ tắt −1,76 dB/s so với −1,85 dB/s.
| id | Tên | Độ ngân |
|---|---|---|
| thien | Chuông thiền (mặc định) | ~14s |
| thien-tram | Chuông thiền trầm (cùng chuông, thấp hơn 3 nửa cung, ngân lâu hơn) | ~16s |
| bright | Chuông sáng (ngắn) — tiếng cũ | ~4s |

Mỗi chuông có `audio/bells/<id>.mp3` (1 hồi) và `<id>-x5.mp3` (5 hồi chậm, cách 8–9s) dùng cho nhắc nhở hằng ngày. `audio/bell5.mp3` = bản 5 hồi của chuông mặc định (~46s). Ai đã chọn chuông cũ (đã bỏ) sẽ tự chuyển về “Chuông thiền”. Mẫu nghe thử: `samples/bells/` (tạo bằng `SAMPLES=1 python3 tools/build_bells.py`).
Thời gian mặc định: **Không giới hạn** (đồng hồ đếm lên từ 00:00).

> **Cập nhật 26/10/2026:** app chỉ còn 1 chuông cố định là "Chuông thiền" 3 hồi (`audio/bells/thien.mp3` = `audio/bell5.mp3`, bản `samples/bells/1-chuong-thien-3-hoi.mp3` đã duyệt), không còn phần chọn chuông. Các chuông khác và bản x5 đã bỏ.

## Cập nhật bộ nhớ đệm (service worker)
- `tools/build_sw.py` gắn mã phiên bản vào `app.js?v=…`, `style.css?v=…` trong `index.html` và tạo `sw.js`. Luôn chạy lại sau mỗi lần sửa.
- Service worker tải trước toàn bộ file **thẳng từ mạng** (`cache: "reload"`), trang và script luôn cùng một phiên bản; khi có bản mới, trang tự tải lại 1 lần (không khi đang thiền).
- Nếu một bản cũ trong bộ nhớ đệm làm app không chạy, trang tự xoá bộ nhớ đệm cũ và tải lại 1 lần (tự chữa lỗi).
- Chuông 3 hồi (~34s): khi chuông reo, câu đọc tiếp theo chờ đến sau hồi thứ 3 (~23s), không đọc đè lên chuông.
