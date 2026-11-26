# Việc Backend cần sửa sau khi kiểm thử mobile (26/11/2026)

Tài liệu này bổ sung cho `backend-requests-2026-11-25.md`. Mọi mục đã kiểm chứng bằng cách gọi API thật qua gateway trên stack local, hoặc đọc log. Mobile không sửa được các mục này. Không có thay đổi code backend nào trong tài liệu này được áp dụng; người phụ trách backend tự quyết định sửa.

## Tóm tắt

| # | Mức | Việc | Ảnh hưởng |
|---|---|---|---|
| 1 | P0 | Hai file migration `V148` trùng số ở content-service | Content-service không khởi động khi build từ `main` |
| 2 | P1 | Gọi sai method trả 500 thay vì 405 ở 5 service | Lỗi sai hiển thị "Lỗi hệ thống" cho lỗi do client |
| 3 | P1 | Thiếu tham số bắt buộc trả 500 tiếng Anh ở learning-service | Có thể lộ câu tiếng Anh; sai phải là 400 |
| 4 | P2 | Một số lỗi 404/400 còn tiếng Anh hoặc kèm UUID | Vi phạm quy tắc tiếng Việt trong AGENTS §3.3 |
| 5 | P2 | `/auth/login` dùng chung giới hạn IP với nhóm auth (1 request/giây, tối đa 5) | Mạng chung (lớp học, 4G) bị chặn sớm khi nhiều người đăng nhập |

## 1. P0: hai file migration `V148` trùng số (content-service)

**Bằng chứng**
- `services/content-service/src/main/resources/db/migration/V148__course_import_drafts.sql` (commit `f09f8915`, 24/11 21:44)
- `services/content-service/src/main/resources/db/migration/V148__lesson_slide_files.sql` (commit `5bed28c2`, 24/11 01:33)
- Log khi khởi động: `FlywayException: Found more than one migration with version 148`. Container không lên, các service phụ thuộc (game, learning, assessment) không khởi động được.

**Cách sửa đề xuất**: đổi số file `V148__course_import_drafts.sql` thành `V152__course_import_drafts.sql` (giữ nguyên nội dung, vì checksum sẽ không đổi). Đây là cách sửa đã thử trên máy local. Trước khi đổi, kiểm tra `flyway_schema_history` của môi trường đang chạy: nếu đã có dòng `V148` với script `course_import_drafts`, phải cập nhật thành `V152`, hoặc chạy `flyway repair`.

**Lưu ý cho mọi môi trường đang chạy**: database local của tôi đã ghi một dòng `152 | V152__course_import_drafts.sql` từ lần thử; file code đã được hoàn tác về `V148`, nên trạng thái local hiện không khớp với code. Cần xử lý khi rebuild.

## 2. P1: gọi sai method trả 500 thay vì 405

**Bằng chứng**: gọi `GET` vào endpoint chỉ nhận `POST` trả `500`:
- `GET /api/games/wordly/rooms` → `500`, `"An unexpected error occurred"`
- `GET /api/users/me/password/initial` → `500`, `"Lỗi hệ thống không xác định"`

Nguyên nhân: `GlobalExceptionHandler` có `@ExceptionHandler(Exception.class)` nhưng không bắt `HttpRequestMethodNotSupportedException`, nên rơi xuống handler chung trả 500. Learning-service và assessment-service, notification-service, community-service đã bắt đúng loại này và trả 405.

**Cách sửa đề xuất**: ở 5 service `access`, `content`, `game`, `library`, `user`, thêm handler:

```java
@ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
ResponseEntity<ErrorResponse> methodNotAllowed(HttpRequestMethodNotSupportedException e, HttpServletRequest r) {
    return <builder có sẵn>(HttpStatus.METHOD_NOT_ALLOWED, "Phương thức này không được hỗ trợ.", r, null);
}
```

Mobile không gọi sai method nên đây chỉ là lỗi đúng kiểu contract, không chặn app.

## 3. P1: thiếu tham số bắt buộc trả 500 tiếng Anh (learning-service)

**Bằng chứng**: `GET /api/learning/submission-history?page=0&size=5` (thiếu `scope`) trả `500`, `"An unexpected internal error occurred"`. Log: `MissingServletRequestParameterException` đi vào handler chung.

**Cách sửa đề xuất**: thêm handler `MissingServletRequestParameterException` → `400`, câu tiếng Việt, ví dụ "Thiếu thông tin cần thiết để tải dữ liệu.".

Mobile luôn gửi `scope`, nên đây không phải lỗi app hiện tại. Mục này để đảm bảo mọi client khác nhận được 400 đúng.

**Thêm**: learning-service `methodNotAllowed` trả `"Method not allowed"` tiếng Anh; đổi sang tiếng Việt.

## 4. P2: lỗi 404/400 còn tiếng Anh hoặc có UUID

Đã kiểm chứng:
- `assessment-service`: `GET /api/assessments/attempts/{id}/result` không tồn tại → 404 đúng, nhưng `AssessmentNotFoundException` ở handler `notFound` trả `e.getMessage()` nguyên văn (có thể tiếng Anh như "Assessment attempt not found"). Cách sửa: bọc `VietnameseErrorMessages.userFacing(404, e.getMessage())` như các handler khác.
- `game-service`: `GET /api/games/matches/{id}` → `"Game match not found: 00000000-…"`. Vừa tiếng Anh vừa lộ UUID trong message. Cách sửa: message tiếng Việt cố định ("Không tìm thấy trận đấu."), id để trong `details`. Tương tự `GameSessionNotFoundException`, `GameRoomNotFoundException`. Đồng thời bọc `badRequest` bằng `VietnameseErrorMessages.userFacing` (game-service đã có dependency `common-security`).

## 5. P2: giới hạn đăng nhập theo IP dùng chung với nhóm auth

**Bằng chứng** (`infra/config-server/config-repo/api-gateway.yaml`): `/auth/login` nằm trong route `user-auth-limited` với tier `auth` = 1 request/giây, burst 5, tính theo IP. Gateway chỉ thấy một IP cho cả lớp học hoặc cùng một nhà mạng 4G, nên khi 6 người cùng đăng nhập trong vài giây, người thứ 6 nhận `429`.

Phần chống dò mật khẩu theo email + IP đã có ở user-service (`RedisLoginAttemptLimiter`), nên không cần giới hạn IP chặt như vậy để chống dò.

**Cách sửa đề xuất**:
1. Thêm tier `login: { replenish-rate: 1, burst-capacity: 20 }` vào `rate-limit.tiers`.
2. Tách `/auth/login` ra route riêng `user-login-limited` với `tier: login`, đặt trước `user-auth-limited`, và bỏ `/auth/login` khỏi `user-auth-limited`.
3. Cập nhật `AuthRouteConsistencyTest`: `user-auth-limited` không còn `/auth/login`; thêm test cho `user-login-limited`.

Kiểm chứng trước đây: với tier `login`, 12 request đăng nhập với email khác nhau từ cùng IP đều trả `401` (đúng là sai mật khẩu), không bị gateway chặn sớm.

## Đã kiểm chứng là đúng (không cần sửa)

- `GET /api/assessments/attempts/{id}` không tồn tại → 404 tiếng Việt "Không tìm thấy dữ liệu được yêu cầu." (sau sửa của ngày hôm qua).
- `POST /api/games/wordly/rooms` với body rỗng → 400 tiếng Việt "Dữ liệu gửi lên không hợp lệ".
- `POST /api/users/me/password/initial` → 409 tiếng Việt "Tài khoản đã có mật khẩu...".
- `POST /api/learning/speaking-practice/submissions` đúng path và method.
- `GET /api/learning/submission-history?scope=FREE&page=0&size=5&skill=WRITING` → 200.
- `POST /auth/login` với đúng field `email` (không phải `usernameOrEmail`) → 401 tiếng Việt khi sai mật khẩu.
