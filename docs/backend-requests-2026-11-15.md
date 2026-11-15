# Việc Backend cần làm để mobile IELTSPath chạy đầy đủ (15/11/2026)

## Cần xong trước buổi demo

**1. Cho notification-service chạy lại.**
Service đang tắt hẳn, nên mọi chức năng thông báo trên mobile không dùng được: chuông, số chưa đọc, danh sách, xóa, cài đặt thông báo, đăng ký nhận push. Nguyên nhân là trong `backend/secrets/` có một thư mục rỗng tên `firebase-service-account.json` (Docker tự tạo) ở đúng chỗ đáng lẽ là file khóa Firebase, nên container không mount được. Cần xóa thư mục đó rồi khởi động lại service. Cấu hình compose cũng cần sửa để thiếu file thì Docker không tự tạo thư mục nữa, và service vẫn chạy được khi chưa có khóa Firebase (chỉ tắt phần gửi push).

**2. Cấu hình push thông báo (FCM).**
Muốn điện thoại nhận được push, BE cần đặt file khóa service account Firebase thật vào `backend/secrets/`, khai báo `FIREBASE_CREDENTIALS_FILE` và `FIREBASE_PROJECT_ID` trong `.env`, rồi khởi động lại notification-service. Không cấu hình thì thông báo vẫn hiện trong app, chỉ không có push.

**3. Mở công khai hai API xác minh email.**
`/auth/verify-email` và `/auth/resend-verification` luôn bị từ chối (401), vì user-service chưa đưa hai đường dẫn này vào danh sách endpoint công khai (`config-repo/user-service.yaml`), dù gateway đã cho qua. Hậu quả: người dùng không xác minh được email, và tài khoản chưa xác minh thì không đổi được mật khẩu.

**4. Sửa lỗi quên mật khẩu.**
`/auth/forgot-password` luôn báo lỗi hệ thống (500) với mọi email đã đăng ký. Lỗi nằm ở chỗ lưu mã đặt lại mật khẩu (`AccountActionTokenJpaEntity` bị coi là bản ghi cũ khi lưu bản ghi mới). Cùng endpoint này, khi nhập email chưa đăng ký thì trả 404 kèm chính email đó, nên ai cũng dò được email nào có tài khoản. Cần trả cùng một kết quả thành công cho mọi email.

**5. Bật đăng nhập Google.**
`/auth/google` hiện trả lỗi hệ thống (500). Cần kiểm tra bản user-service đang chạy có đúng code mới chưa, và khai báo `GOOGLE_CLIENT_IDS` trong `.env` chứa Web Client ID mà mobile dùng. Token Google sai hoặc hết hạn phải trả 401 kèm thông báo tiếng Việt, không phải 500.

## Nên làm (ảnh hưởng trải nghiệm khi demo)

**6. Thông báo lỗi bằng tiếng Việt.**
Mobile hiển thị nguyên văn thông báo lỗi của server cho người dùng. User-service và learning-service đã trả tiếng Việt. Community, game, notification và library vẫn trả tiếng Anh, ví dụ "Post not found", "must not be blank", "Request validation failed", "Word was not found in this match's dictionary", "A valid guess is required before using a hint", "Every active member must be ready before starting", "Game room not found: …", "Public profile not found". Cần dịch các câu này, kể cả thông báo validate từng ô nhập, và không chèn mã UUID hay mã phòng vào câu hiển thị.

**7. Gắn mã lỗi cố định cho từng loại lỗi nghiệp vụ.**
Mobile cần một trường `code` không đổi (ví dụ `POST_NOT_FOUND`, `ROOM_NOT_FOUND`, `ROOM_FULL`, `MATCH_NOT_FOUND`, `HINT_REQUIRES_GUESS`, `HINT_ALREADY_USED`, `NOTEBOOK_ENTRY_EXISTS`, `VALIDATION_FAILED`), đặt ở cấp cao nhất của body lỗi như learning-service đang làm. Mobile rẽ nhánh giao diện theo mã này, không theo câu chữ, nên khi dịch câu ở mục 6 phải giữ hoặc thêm mã. Hiện chỉ learning-service và lỗi `WORD_NOT_FOUND` của game là có mã.

**8. Sai mật khẩu hiện tại không được trả 401.**
Khi đổi mật khẩu mà nhập sai mật khẩu cũ, server trả 401. Client hiểu 401 là phiên đăng nhập hết hạn, nên có thể đăng xuất người dùng. Cần trả 400 kèm mã `CURRENT_PASSWORD_INVALID`.

**9. Thông báo khi bị giới hạn tốc độ.**
Gateway trả câu tiếng Anh "Request rate limit exceeded" khi người dùng thao tác quá nhanh. Cần đổi sang tiếng Việt và thêm mã `RATE_LIMITED`.

## Có thể để sau demo

**10. Phòng chơi một mình bắt đầu được ngay.**
Phòng SOLO hiện phải đánh dấu sẵn sàng rồi mới bấm bắt đầu. Mobile đã tự gọi đủ hai bước. Đề xuất cho chủ phòng SOLO ở sẵn trạng thái sẵn sàng khi tạo phòng.

**11. Mục tiêu XP mỗi ngày (cần nhóm sản phẩm chốt).**
Mobile có phần chọn mục tiêu XP/ngày nhưng backend chưa lưu và chưa trả về XP kiếm được trong ngày. Nếu giữ tính năng này, BE cần cho phần cài đặt học từ vựng lưu thêm mục tiêu XP/ngày, và phần tổng quan trả thêm số XP hôm nay cùng mục tiêu. Nếu bỏ thì BE không cần làm gì, mobile sẽ ẩn phần này.
