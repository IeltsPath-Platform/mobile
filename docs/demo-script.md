# Kịch bản demo IELTSPath Mobile (khoảng 12 phút)

Chỉ demo những gì đã chạy ổn trên máy Redmi 9 (dev build). Thứ tự đi từ "người dùng mới" đến "tính năng nổi bật", để câu chuyện liền mạch.

## 0. Chuẩn bị (làm trước 30 phút)

- [ ] Backend chạy đủ container, kiểm tra Speaking đã chấm được (nộp thử 1 bài).
- [ ] Điện thoại: pin > 60%, tắt chế độ tiết kiệm pin, bật "giữ màn hình sáng" khi sạc, tăng thời gian tắt màn hình lên 10 phút (nhớ trả lại sau).
- [ ] Mạng ổn định. Mở dev build, `adb reverse tcp:8080 tcp:8080` nếu chạy qua cáp/localhost.
- [ ] Chuẩn bị 2 tài khoản: **A** (tài khoản demo chính, đã có lịch sử làm bài) và **B** (đối thủ khi chơi Rocket). Đăng nhập sẵn B trên máy thứ hai hoặc dùng script `p3.cjs`.
- [ ] Một ảnh sạch (không riêng tư) trong thư viện để demo đổi ảnh đại diện.
- [ ] Chiếu màn hình điện thoại lên máy chiếu (scrcpy) hoặc quay sẵn video dự phòng.
- [ ] Đã **đăng xuất** hẳn khỏi A để demo từ màn đăng nhập (hoặc để sẵn nếu thiếu thời gian).

## 1. Mở đầu (1 phút)

Nói: "IELTSPath là ứng dụng luyện IELTS đủ 4 kỹ năng, có chấm điểm tự động, cộng đồng và trò chơi học từ vựng nhiều người."

Kiến trúc nói 20 giây: app Expo/React Native → API Gateway → các service Spring (auth, learning, community, game, notification) → Azure Speech + FCM.

## 2. Đăng nhập và Home (1 phút)

1. Mở app: màn đăng nhập. Chỉ ra đăng nhập email và Google.
2. Đăng nhập Google (hiện hộp chọn tài khoản) hoặc email tài khoản A.
3. Home: nói nhanh phần chào, tiến độ, lối vào 4 kỹ năng.

Điểm nhấn: phiên đăng nhập được giữ, đăng nhập lại không cần nhập lại.

## 3. Bốn kỹ năng (5 phút, phần chính)

Đi theo thứ tự **Listening → Reading → Writing → Speaking**, mỗi kỹ năng 1 điểm nhấn.

### Listening (~1 phút)
- Vào một đề, phát audio, chuyển giữa các section, trả lời vài câu.
- Nhấn: thanh tiến độ từng section, nút Nộp hiện số câu chưa làm.
- Bấm Back giữa chừng → hộp xác nhận "Tạm rời bài làm?" (đáp án đã lưu).
- Nộp → màn kết quả: band, đúng/sai từng câu, xem lại đáp án.

### Reading (~1 phút)
- Mở đề, cuộn passage, chọn đáp án ở một vài dạng câu.
- Nhấn: cùng cơ chế nộp, kết quả và giải thích từng câu.

### Writing (~1,5 phút)
- Mở đề Task 2, gõ một đoạn ngắn (đã soạn sẵn để dán/gõ nhanh).
- Nhấn: đếm từ, chặn rời bài khi đang làm (hộp xác nhận).
- Nộp → chờ chấm → **màn kết quả**: band 4 tiêu chí, công thức làm tròn, 3 vấn đề ưu tiên, lỗi tô màu trực tiếp trên bài.
- Nếu hệ thống chấm chậm: nói "chấm bất đồng bộ, app tự cập nhật khi xong" và chuyển sang kỹ năng khác, quay lại sau.

### Speaking (~1,5 phút)
- Mở một đề, cho phép micro, ghi âm 10–15 giây.
- Nhấn: nghe lại bản ghi, nộp, trạng thái "đang chấm", kết quả điểm theo tiêu chí (Azure Speech).
- Dự phòng: mở sẵn **kết quả Speaking đã chấm** trong Lịch sử, nếu chấm lâu thì chuyển sang đó.

## 4. Trò chơi nhiều người (2 phút)

1. Vào Rocket, tạo phòng với tài khoản A, hiện mã phòng.
2. Tài khoản B vào bằng mã (máy thứ hai hoặc script).
3. Bắt đầu: câu hỏi 15 giây/vòng, điểm cập nhật thời gian thực, mạng còn lại.
4. Kết thúc: màn kết quả có bảng xếp hạng và xem lại từng câu.

Nhấn: WebSocket với ticket, trạng thái người chơi (rớt mạng, hết giờ) được xử lý ở server.
Mẹo: trả lời nhanh vài câu rồi để hết giờ cho rút ngắn thời gian, đừng chơi hết trận.

## 5. Cộng đồng và Thông báo (1,5 phút)

1. Tab Cộng đồng: bảng tin, lọc chuyên mục, tìm kiếm.
2. Tạo bài viết có ảnh (trình soạn có thanh công cụ), đăng, thấy bài hiện ngay.
3. Thả cảm xúc, bình luận, lưu bài.
4. Từ tài khoản B tương tác với bài của A → A nhận **push notification** (FCM) trên điện thoại.
5. Mở Thông báo: nhóm Hôm nay/Trước đó; chỉnh Tuỳ chọn thông báo (lưu thật lên server).

## 6. Hồ sơ, Lịch sử, cài đặt (1 phút)

- Lịch sử: 4 kỹ năng, mở lại một bài Writing đã chấm.
- Hồ sơ: đổi ảnh đại diện (chọn ảnh → cắt → tải lên), cỡ chữ Nhỏ/Vừa/Lớn, chế độ sáng/tối.
- Đăng xuất có hộp xác nhận.

## 7. Điểm nhấn kỹ thuật để kết (1 phút)

- 264 test tự động pass, `tsc` và ESLint 0 lỗi, CI chạy lint bắt buộc.
- Xử lý lỗi: mất mạng báo rõ ràng, bài viết đã xóa không crash, ErrorBoundary theo từng route.
- Hiệu năng trên máy yếu (Redmi 9): ~12,7% frame giật, p90 36 ms.
- Giờ lấy từ server, không tin đồng hồ máy.

## Kế hoạch dự phòng

| Sự cố | Cách xử lý |
|---|---|
| Mất mạng/Wi-Fi hội trường | Dùng 4G của điện thoại thứ hai làm hotspot cho laptop; hoặc chiếu video quay sẵn |
| Speaking/Writing chấm lâu | Mở kết quả đã chấm trong Lịch sử, giải thích chấm bất đồng bộ |
| Rocket không có người thứ hai | Giải thích luồng bằng màn kết quả của trận đã chơi (Lịch sử) |
| Push không về | Mở tab Thông báo trong app (dữ liệu đã lưu), nói push phụ thuộc FCM/mạng |
| App crash/đơ | Mở lại app, phiên đăng nhập còn nguyên; nói thẳng, đừng cố sửa trên sân khấu |
| Mất kết nối ADB/scrcpy | Quay sẵn video demo từng phần làm phương án cuối |

## Câu hội đồng có thể hỏi

1. **Vì sao chọn React Native/Expo?** Một codebase cho Android/iOS, hệ sinh thái sẵn (expo-router, notifications, audio), dev build cho các module native.
2. **Chấm Writing/Speaking thế nào?** Writing: phân tích tự động + tiêu chí band, làm tròn theo quy tắc IELTS (5,25 → 5,5). Speaking: ghi âm gửi lên server, Azure Speech đánh giá, trả điểm theo tiêu chí. Cả hai chấm bất đồng bộ.
3. **Game nhiều người đồng bộ ra sao?** WebSocket có ticket ngắn hạn, server là nguồn sự thật (điểm, mạng, vòng, trạng thái người chơi), client chỉ hiển thị.
4. **Bảo mật?** Token lưu an toàn, phiên refresh, ticket WebSocket một lần, không đưa bí mật vào app.
5. **Mất mạng thì sao?** Đáp án làm bài được lưu, hiện thông báo lỗi rõ ràng, tự thử lại khi có mạng.
6. **Hạn chế còn lại?** Cần thành thật: chưa có xóa tài khoản, chính sách quyền riêng tư và chặn/báo cáo nội dung (yêu cầu của Google Play); tên người dùng khác đôi khi hiện "Learner" do backend; chưa kiểm thử TalkBack và xoay ngang; chưa có URL API HTTPS production.
7. **Kiểm thử thế nào?** Unit test (vitest, 264 test), type check, lint trong CI, kiểm thử thủ công toàn bộ trên thiết bị thật, đo hiệu năng bằng dumpsys.
8. **Mở rộng thế nào?** Dịch vụ tách riêng nên scale theo service; kế hoạch test tải bằng k6; polling đã được giảm.

## Lưu ý khi trình bày

- Đừng bấm nút Home/Back nhiều: thoát khỏi app trông như app tự thoát.
- Khi chờ chấm, nói tiếp nội dung thay vì im lặng.
- Nếu lỗi xảy ra, đọc thông báo lỗi tiếng Việt trên màn hình rồi nói "đây là cách app trả lỗi cho người dùng": đó cũng là điểm cộng.
- Sau buổi bảo vệ: trả lại thời gian tắt màn hình của điện thoại.
