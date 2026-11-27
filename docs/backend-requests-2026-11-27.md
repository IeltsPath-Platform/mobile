# Việc Backend cần sửa (27/11/2026, sau khi pull `main` mới nhất)

Bổ sung cho `backend-requests-2026-11-25.md`, `-2026-11-26.md` và `-2026-11-26-full-qa.md`.

Đã kiểm trên `main` tại commit `beecdf57` (merge PR #235 `fix/account-deletion-purge`): đọc code, rồi build và chạy toàn bộ stack bằng Docker Compose trên máy local. Mobile không sửa file backend nào.

## Tóm tắt

| # | Mức | Việc | Trạng thái |
|---|---|---|---|
| 0 | **P0** | `DELETE /api/users/me` trả 500, không xóa được tài khoản | **Mới**, tính năng không chạy |
| 1 | **P0** | content-service và game-service không kết nối được RabbitMQ, stack local không lên | **Mới**, chặn chạy local |
| 2 | P1 | Phiên đăng nhập không lưu thiết bị và IP (A1) | Còn mở, có patch |
| 3 | P1 | Gọi sai method trả 500 thay vì 405 ở 5 service (A2) | Còn mở, có patch |
| 4 | P2 | game-service trả lỗi tiếng Anh kèm UUID (A3) | Còn mở, có patch |
| 5 | P1 | Không có đường báo cáo kết quả chấm AI (B3 mục 4) | Còn mở, Google Play yêu cầu |
| 6 | P1 | Thu hồi phiên không tắt thiết bị nhận push (B4) | Còn mở |
| 7 | P2 | `/auth/login` dùng chung giới hạn `auth` (1/giây, tối đa 5) (B6) | Còn mở |
| 8 | P2 | Hồ sơ công khai thiếu `targetBand`, tên mặc định "Learner" (B7) | Còn mở |
| 9 | P2 | Lịch sử Speaking thiếu tên đề và band (B12) | Còn mở |
| 10 | P2 | Tài khoản demo không kích hoạt được key (B10) | Còn mở |
| 11 | P2 | learning-service còn câu lỗi tiếng Anh (B5) | Còn sót một chỗ |
| 12 | P2 | Thiếu tham số bắt buộc trả 500 ở learning-service và content-service | Còn mở (tài liệu 26/11 ghi đã xong, kiểm lại vẫn lỗi) |

Đã xong kể từ đợt trước (không cần làm nữa): trùng migration `V148` (nay V152–V155, có callback dời lịch sử Flyway), trang web xóa tài khoản (API xóa tài khoản đã có nhưng còn lỗi, xem mục 0), API chặn người dùng `/api/community/blocks`, hàng đợi kiểm duyệt báo cáo `/api/community/admin/reports`, runtime glibc cho chấm Speaking, giới hạn riêng cho `/auth/refresh` (tier `auth-refresh`). Mobile đã làm màn xóa tài khoản và chặn người dùng (PR mobile #2).

---

## 0. P0: không xóa được tài khoản (`DELETE /api/users/me` trả 500)

**Phát hiện khi test trên máy Android thật** (27/11, `main` `beecdf57`). Dòng "API xóa tài khoản đã xong" ở trên là **sai**: endpoint có nhưng không chạy được.

**Hiện tượng**: nhập đúng mật khẩu, app hiện "Lỗi hệ thống không xác định"; tài khoản vẫn còn và đăng nhập được. Nhập sai mật khẩu thì trả lỗi đúng.

**Log user-service** (correlationId `218d2a89-82b5-456a-8cf1-b471198c5966`):

```
ERROR: new row for relation "refresh_tokens" violates check constraint "chk_refresh_tokens_revoked_reason"
DataIntegrityViolationException: ... update refresh_tokens set revoked_at=?,revoked_reason=? where user_id=? and revoked_at is null and expires_at>?
    at com.ieltspath.user.application.usecase.DeleteMyAccountUseCase.execute(DeleteMyAccountUseCase.java:97)
```

**Nguyên nhân**: dòng 97 gọi `refreshTokens.revokeAllActiveForUser(userId, now, "ACCOUNT_DELETED")`, nhưng ràng buộc tạo ở `V17__refresh_token_sessions.sql` chỉ cho phép `ROTATED, LOGOUT, PASSWORD_CHANGE, PASSWORD_RESET, GOOGLE_LINK, SESSION_REVOKED, REUSE_DETECTED, ADMIN`. `V23__account_deletion.sql` không cập nhật ràng buộc. Ai đang đăng nhập đều có refresh token còn hạn, nên xóa tài khoản từ app luôn lỗi.

`DeleteMyAccountUseCaseTest` giả lập repository nên vẫn xanh.

**Cách sửa đề xuất**: migration mới (không sửa V17):

```sql
ALTER TABLE refresh_tokens DROP CONSTRAINT chk_refresh_tokens_revoked_reason;
ALTER TABLE refresh_tokens ADD CONSTRAINT chk_refresh_tokens_revoked_reason CHECK (revoked_reason IS NULL OR revoked_reason IN
    ('ROTATED','LOGOUT','PASSWORD_CHANGE','PASSWORD_RESET','GOOGLE_LINK','SESSION_REVOKED','REUSE_DETECTED','ADMIN','ACCOUNT_DELETED'));
```

Rà thêm các giá trị `revoked_reason` khác được dùng trong code, và thêm một test Testcontainers xóa tài khoản **đang có phiên đăng nhập**.

**Cách kiểm tra**: đăng ký, đăng nhập, gọi `DELETE /api/users/me` với đúng mật khẩu, phải trả 204 và không đăng nhập lại được. Các bước sau đó (sự kiện `user.deleted.v1`, dọn dữ liệu ở service khác) **chưa kiểm được** vì lỗi này chặn trước.

---

## 1. P0: content-service và game-service không kết nối được RabbitMQ

**Hiện tượng**: `docker compose up -d` trên `main`: content-service luôn `unhealthy`, nên assessment, game và learning (phụ thuộc content) không được khởi động:

```
dependency failed to start: container ieltspath-content-service-1 is unhealthy
```

Log content-service lặp lại mỗi 5 giây:

```
SimpleMessageListenerContainer : Failed to check/redeclare auto-delete queue(s).
Caused by: java.net.ConnectException: Connection refused (connect failed)
RabbitHealthIndicator : Rabbit health check failed
```

**Nguyên nhân**: commit `63852fe5` (`feat(consumers): handle user.deleted.v1 across remaining services with tombstones`) thêm `UserDeletedListener` và `spring-boot-starter-amqp` cho content-service và game-service, nhưng không thêm cấu hình RabbitMQ ở đâu cả:

- `infra/config-server/config-repo/content-service.yaml` và `game-service.yaml` không có khối `spring.rabbitmq` (khác với `user-service.yaml`).
- `docker-compose.yml` không truyền `RABBITMQ_*` cho hai service này, và `depends_on` không có `rabbitmq`.

Kết quả là Spring dùng mặc định `localhost:5672` và `guest`, trong container thì không có broker ở đó. Health check gộp trạng thái Rabbit, nên service không bao giờ `UP`. Thêm biến `RABBITMQ_HOST` vào compose cũng **không đủ**, vì không có yaml nào đọc biến đó.

**Cách sửa đề xuất** (theo mẫu của user-service):

1. Thêm vào `content-service.yaml` và `game-service.yaml`:
   ```yaml
   spring:
     rabbitmq:
       host: ${RABBITMQ_HOST:localhost}
       port: ${RABBITMQ_PORT:5672}
       username: ${RABBITMQ_USERNAME:guest}
       password: ${RABBITMQ_PASSWORD}
   ```
2. Trong `docker-compose.yml`, thêm cho cả hai service `RABBITMQ_HOST: rabbitmq`, `RABBITMQ_PORT: 5672`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`, và `rabbitmq: condition: service_healthy` trong `depends_on`.
3. **Production `[CẦN XÁC MINH TRÊN SERVER]`**: `docker-compose.prod.yml` lấy biến từ `/opt/ieltspath/env/content-service.env` và `game-service.env`. Nếu hai file này chưa có `RABBITMQ_*` (vì trước đây hai service không dùng RabbitMQ), production sẽ lỗi y hệt sau lần deploy tới.
4. Nên có test hoặc bước CI khởi động stack (hoặc kiểm `docker compose config` kèm danh sách service dùng AMQP), vì `mvn verify` không bắt được lỗi này: Testcontainers tự cấu hình broker.

**Cách kiểm tra**: `docker compose up -d` trên máy sạch, mọi service `healthy`; `docker compose logs content-service` không còn `Connection refused`.

**Tình trạng local**: mobile đang chạy tạm bằng một file `docker-compose.override.yml` (không commit) truyền `SPRING_RABBITMQ_*` cho hai service. Sẽ xóa khi `main` được sửa.

---

## 2–4. Ba lỗi đã có patch (A1–A3 trong `backend-fixes-2026-11-26.patch`)

Các file liên quan không bị đổi trên `main` kể từ đợt QA, nên patch vẫn áp được. Chi tiết và bằng chứng ở `backend-requests-2026-11-26-full-qa.md`, mục A.

| Mục | Bằng chứng trên `main` hiện tại |
|---|---|
| A1: phiên đăng nhập không có `userAgent`/`ipAddress` | `AuthTokenIssuer.java:31` vẫn gọi `issue(user, familyId, startedAt, LoginContext.UNKNOWN)`. Màn "Thiết bị đăng nhập" trên mobile hiện "Thiết bị không xác định". |
| A2: sai method trả 500 | Chỉ assessment, community, learning, notification bắt `HttpRequestMethodNotSupportedException`; access, content, game, library, user chưa có. |
| A3: game-service lỗi tiếng Anh kèm UUID | `GameMatchNotFoundException`: `"Game match not found: "+id`; `GameSessionNotFoundException`: `"Game session not found: " + id`. |

```bash
git apply --check backend-fixes-2026-11-26.patch
git apply backend-fixes-2026-11-26.patch
```

---

## 5. P1: báo cáo kết quả chấm AI

Phần còn thiếu của mục 3 tài liệu 25/11. Chặn người dùng và kiểm duyệt báo cáo cộng đồng đã xong; chưa thấy endpoint nào ở learning-service hay assessment-service nhận báo cáo về kết quả chấm AI. Chính sách nội dung do AI tạo của Google Play yêu cầu người dùng báo cáo được nội dung AI sai hoặc không phù hợp.

**Đề xuất**: một endpoint nhận `{submissionId, loại, lý do}` (Writing và Speaking), lưu lại cho người phụ trách xem. Mobile sẽ thêm nút "Báo cáo kết quả chấm" ở màn kết quả khi có API.

## 6. P1: thu hồi phiên không tắt thiết bị push

Không đổi so với B4 tài liệu 26/11: notification-service vẫn không có consumer cho sự kiện thu hồi phiên. Thu hồi phiên từ máy khác hoặc đổi mật khẩu thì máy cũ vẫn nhận thông báo của tài khoản đó.

Riêng trường hợp xóa tài khoản thì đã có xử lý (notification-service dọn thiết bị khi nhận `user.deleted.v1`).

## 7. P2: giới hạn đăng nhập

`/auth/login` vẫn nằm trong route `user-auth-limited` với tier `auth` (1 request/giây, tối đa 5, tính theo IP). `/auth/refresh` đã được tách ra tier `auth-refresh` (tối đa 20); đề xuất làm tương tự cho `/auth/login` (chi tiết ở mục 5 tài liệu 26/11).

## 8. P2: hồ sơ công khai

Không đổi so với B7: `GET /api/users/{id}/public-profile` không có `targetBand`; người chưa đặt tên hiển thị vẫn hiện là "Learner" với người khác.

## 9. P2: lịch sử Speaking

Không có commit nào đụng tới lịch sử bài nộp kể từ đợt QA, nên B12 vẫn còn: `GET /api/learning/submission-history?scope=FREE&skill=SPEAKING` trả `promptPreview`, `band`, `task` đều `null` cho bài đã chấm. Mọi dòng trên mobile đều là "Bài Speaking · Đã chấm".

## 10. P2: tài khoản demo không kích hoạt được key

Không có thay đổi migration hay seed nào ở access-service cho trạng thái xác minh email (`user_email_verification_state`) kể từ đợt QA, nên B10 nhiều khả năng vẫn còn (chưa gọi lại API để xác nhận).

## 11. P2: câu lỗi tiếng Anh còn sót ở learning-service

`CompleteSpeakingSubmissionUseCase.java:78` vẫn ném `"Speaking submission not found"`. Lưới `VietnameseErrorMessages.userFacing` sẽ đổi thành câu chung, nhưng theo `AGENTS.md` §3.3 nên dịch tại nguồn (ví dụ "Không tìm thấy bài nói này.").

## 12. P2: thiếu tham số bắt buộc trả 500

Gọi thật qua gateway trên stack local (`main` `beecdf57`), đăng nhập bằng `learner@ielts.demo`:

| Request | Kết quả | Log |
|---|---|---|
| `GET /api/learning/practice-progress` (không có `skill`, `scope`) | 500 "Hệ thống gặp lỗi nội bộ, vui lòng thử lại sau." | `GlobalExceptionHandler : Unexpected request failure: type=...MissingServletRequestParameterException` |
| `GET /api/content/practice-tests/formats` (không có `skill`) | 500 "Hệ thống gặp lỗi, vui lòng thử lại sau" | `Required request parameter 'skill' for method parameter type String is not present` |

Mục "Thiếu tham số trả 500 (26/11 #3)" trong `backend-requests-2026-11-26-full-qa.md` mục C ghi là đã xong, nhưng hai endpoint này vẫn lỗi. Mobile luôn gửi đủ tham số nên app không bị ảnh hưởng; mục này để client khác nhận 400 đúng và log 500 không bị nhiễu.

**Đề xuất**: thêm handler `MissingServletRequestParameterException` → 400, câu tiếng Việt (ví dụ "Thiếu thông tin cần thiết để tải dữ liệu."), vào `GlobalExceptionHandler` của learning-service và content-service; rà các service còn lại.

---

## Thứ tự đề xuất

1. Mục 1 trước tiên: không sửa thì không ai chạy được `main` ở local, và có thể ảnh hưởng production ở lần deploy tới.
2. Áp patch A1–A3 (mục 2–4), vì đã viết và test sẵn.
3. Mục 5 trước khi nộp bản lên Google Play.
4. Các mục còn lại theo mức ưu tiên.
