# Thay đổi backend để gửi push FCM

Các thay đổi trên máy local (chưa commit), phục vụ gửi push cho mobile Android qua `notification-service`.

## `docker-compose.yml`, mục `notification-service`

Thêm hai biến môi trường và một volume chỉ-đọc:

```yaml
environment:
  NOTIFICATION_PUSH_ENQUEUE_ENABLED: "true"
  NOTIFICATION_PUSH_WORKER_ENABLED: "true"
  GOOGLE_APPLICATION_CREDENTIALS: /run/secrets/firebase-service-account.json
volumes:
  - ./secrets/firebase-service-account.json:/run/secrets/firebase-service-account.json:ro
```

- `NOTIFICATION_PUSH_ENQUEUE_ENABLED=true` cho phép tạo việc gửi push khi có thông báo mới. Mặc định trong code là `false`, nếu thiếu thì bảng `notification_push_deliveries` luôn trống.
- `NOTIFICATION_PUSH_WORKER_ENABLED=true` bật worker gửi push.
- `GOOGLE_APPLICATION_CREDENTIALS` trỏ tới file khóa; `FcmPushSender` đọc qua `GoogleCredentials.getApplicationDefault()`.

## `docker-compose.yml`, mục `game-service`

- Thêm `USER_SERVICE_URL: http://user-service:8085` để game-service gọi được user-service.
- `GAME_WEBSOCKET_ALLOWED_ORIGINS` có giá trị mặc định mở rộng, thêm `http://localhost:8081` và `http://192.168.0.119:8081` bên cạnh `http://localhost:5173`:

```yaml
GAME_WEBSOCKET_ALLOWED_ORIGINS: "${GAME_WEBSOCKET_ALLOWED_ORIGINS:-http://localhost:5173,http://localhost:8081,http://192.168.0.119:8081}"
```

## `.gitignore`

Thêm `secrets/` để file khóa không bị đưa vào git.

## File khóa (không nằm trong git)

Service account của dự án Firebase `ieltspathh`, đặt tại `backend/secrets/firebase-service-account.json`.
