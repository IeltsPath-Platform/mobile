# Hạng mục đội BE cần xử lý

Phạm vi thực hiện: chỉ mobile. Không sửa BE/FE, database, volume hay `.env` người dùng.
File `backend/infra/postgres/ensure-databases.sql` từng được tạo đã hoàn tác; chưa chạy SQL đó.

## Bằng chứng quan sát ngày 21/10/2026

- Gateway healthy nhưng community-service và notification-service đang restarting.
- Community: `AllowedMediaPolicy` lỗi URL mẫu `https://<project-ref>.supabase.co`.
  Đội BE cần cấu hình URL/key thật cùng nhau, hoặc để cả hai unset hợp lệ để text community hoạt động.
  Giữ nguyên media allowlist và kiểm tra quyền sở hữu ảnh. Không đưa secret vào biến EXPO_PUBLIC.
- Notification: PostgreSQL báo `database "notification_db" does not exist`.
  Đội BE cần bổ sung database idempotent trên volume hiện tại, kiểm tra owner/quyền của role service,
  rồi xác minh Flyway thành công. Không xóa volume để chạy lại init script.
- Gateway chỉ bind loopback. Mobile cung cấp TCP proxy LAN theo vòng đời Expo, hỗ trợ WebSocket.
- Deep link hiện mở được post và tìm comment gốc qua offset pagination. Notification chỉ gửi `commentId`; nếu đó là reply, app không có `parentCommentId` để chọn thread đúng. BE nên bổ sung `parentCommentId` (hoặc endpoint comment context) vào notification DTO để app mở chính xác reply mà không quét mọi thread.
- Feed/upload/inbox live bị chặn cho đến khi các service trên sẵn sàng.

`npm run backend:check` chỉ đọc health/Compose status. Nó không khởi tạo DB, rebuild hay sửa backend.
Gateway HTTP 200 và health của container chưa chứng minh đăng nhập/feed/upload từ điện thoại thành công.
