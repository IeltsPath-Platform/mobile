# Việc Backend cho mobile IELTSPath (cập nhật 16/11/2026)

## Đã sửa và kiểm qua gateway (16/11)

1. **notification-service chạy lại.** Đã thay thư mục rỗng `backend/secrets/firebase-service-account.json` bằng file khóa thật.
2. **Push FCM.** `.env` đã có `FIREBASE_CREDENTIALS_FILE`, `FIREBASE_PROJECT_ID`, `NOTIFICATION_PUSH_ENQUEUE_ENABLED`, `NOTIFICATION_PUSH_WORKER_ENABLED`. Đăng ký và hủy thiết bị trả 204.
3. **Xác minh email.** `/auth/verify-email` và `/auth/resend-verification` đã được thêm vào danh sách endpoint công khai của user-service.
4. **Quên mật khẩu.** Không còn lỗi 500. Email đã đăng ký hay chưa đều nhận cùng câu trả lời 200. Mail đặt lại mật khẩu đã gửi được, đặt lại xong đăng nhập được.
5. **Sai mật khẩu hiện tại** trả 400 kèm mã `CURRENT_PASSWORD_INVALID`, không còn trả 401.
6. **Thông báo lỗi tiếng Việt** cho community, game và notification, kể cả lỗi validate. Không còn chèn mã phòng hay UUID vào câu báo lỗi.
7. **Giới hạn tốc độ (429)** trả câu tiếng Việt kèm mã `RATE_LIMITED`.
8. **Mail khi chạy local.** Mailpit trước đây nằm khác mạng Docker với các service, nên notification-service không gửi được mail và bị báo unhealthy. Đã sửa `docker-compose.yml` và bật `NOTIFICATION_MAIL_ENABLED`. Mail xem ở http://localhost:8025.

Lệnh chạy stack khi có mail: `docker compose --profile dev-mail up -d`.

## Còn lại

- **Đăng nhập Google:** cần tạo OAuth Web Client và Android Client (SHA-1) trên Google Cloud, khai báo `GOOGLE_CLIENT_IDS` (backend) và `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (mobile), rồi chạy bằng bản dev build. Hiện tại server trả 503 `GOOGLE_SIGNIN_UNAVAILABLE`, không còn trả 500.
- **Mã lỗi `code` cố định** cho từng lỗi nghiệp vụ của community và game (`POST_NOT_FOUND`, `ROOM_FULL`…): chưa làm. Mobile hiện vẫn chạy được nhờ dựa vào HTTP status.
- **Phòng SOLO tự sẵn sàng:** chưa làm. Mobile đã tự gọi đủ hai bước sẵn sàng và bắt đầu.
- **Mục tiêu XP mỗi ngày:** cần nhóm sản phẩm quyết định.
- **Khóa Firebase:** khóa service account đã được gửi qua chat. Sau buổi demo nên tạo khóa mới và thu hồi khóa này.
