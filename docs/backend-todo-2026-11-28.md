# Backend: danh sách việc cần làm (tổng hợp 28/11/2026)

Gộp mọi mục còn mở từ `backend-requests-2026-11-25.md`, `-2026-11-26.md`, `-2026-11-26-full-qa.md` và `-2026-11-27.md`. Chi tiết, log và bằng chứng của từng mục nằm ở file gốc ghi trong cột **Nguồn**.

Trạng thái kiểm trên `main` tại commit `bf217e05` (28/11), stack chạy bằng Docker Compose trên máy local, test bằng app mobile trên máy Android thật.

## Tóm tắt

| # | Mức | Việc | Nguồn |
|---|---|---|---|
| 1 | **P0** | Xóa tài khoản (`DELETE /api/users/me`) luôn trả 500 | 27/11 mục 0 |
| 2 | **P0** | content-service, game-service thiếu cấu hình RabbitMQ, `main` không chạy được ở local | 27/11 mục 1 |
| 3 | **P1** | Band tổng của bài kiểm tra trình độ không tính lại khi Writing chấm xong sau | 27/11 mục 13 |
| 4 | **P1** | Speaking của bài kiểm tra trình độ đã chấm nhưng không có trong kết quả | 27/11 mục 14 |
| 5 | **P1** | Chưa có API báo cáo kết quả chấm AI (Google Play yêu cầu) | 27/11 mục 5 |
| 6 | P1 | Phiên đăng nhập không lưu thiết bị và IP | 27/11 mục 2 (A1, có patch) |
| 7 | P1 | Gọi sai method trả 500 thay vì 405 ở 5 service | 27/11 mục 3 (A2, có patch) |
| 8 | P1 | Thu hồi phiên không tắt thiết bị nhận push | 27/11 mục 6 |
| 9 | P2 | game-service trả lỗi tiếng Anh kèm UUID | 27/11 mục 4 (A3, có patch) |
| 10 | P2 | Thiếu tham số bắt buộc trả 500 (learning, content) | 27/11 mục 12 |
| 11 | P2 | Câu lỗi tiếng Anh còn sót ở learning-service | 27/11 mục 11 |
| 12 | P2 | `/auth/login` dùng chung giới hạn 1 request/giây, tối đa 5 | 27/11 mục 7 |
| 13 | P2 | Hồ sơ công khai thiếu `targetBand`, tên mặc định "Learner" | 27/11 mục 8 |
| 14 | P2 | Lịch sử Speaking thiếu tên đề và band | 27/11 mục 9 |
| 15 | P2 | Tài khoản demo không kích hoạt được key | 27/11 mục 10 |
| 16 | P2 | game-service có lúc khởi động trước khi lấy được cấu hình | 27/11 mục 15 |
| 17 | Cấu hình | Model LLM chấm Writing trong `.env` local bị Google từ chối | 27/11 cuối mục 15 |

Ba mục 1, 2 và 5 phải xong trước khi đưa app lên Google Play hoặc deploy bản mới.

---

## P0: làm ngay

### 1. Xóa tài khoản luôn trả 500

- **Lỗi:** `DeleteMyAccountUseCase.java:97` thu hồi refresh token với lý do `"ACCOUNT_DELETED"`, nhưng ràng buộc `chk_refresh_tokens_revoked_reason` (tạo ở `V17__refresh_token_sessions.sql`) không có giá trị này. Ai đang đăng nhập (tức là mọi người dùng app) đều gặp. Log: `new row for relation "refresh_tokens" violates check constraint "chk_refresh_tokens_revoked_reason"`.
- **Sửa:** migration mới (không sửa V17) bỏ rồi tạo lại ràng buộc, thêm `'ACCOUNT_DELETED'`. Rà thêm các giá trị `revoked_reason` khác đang dùng trong code.
- **Test:** thêm test Testcontainers xóa một tài khoản **đang có phiên đăng nhập** (test hiện tại giả lập repository nên không bắt được).
- **Kiểm:** đăng ký, đăng nhập, gọi `DELETE /api/users/me` với đúng mật khẩu: trả 204 và không đăng nhập lại được. Sau đó kiểm các bước dọn dữ liệu (`user.deleted.v1`), vì lỗi này chặn nên chưa ai kiểm được.
- **Mobile:** màn xóa tài khoản đã xong và đã test trên máy thật tới bước gọi API.

### 2. content-service và game-service thiếu cấu hình RabbitMQ

- **Lỗi:** commit `63852fe5` thêm consumer `user.deleted.v1` cho hai service này nhưng `content-service.yaml`, `game-service.yaml` không có khối `spring.rabbitmq`, và `docker-compose.yml` không truyền `RABBITMQ_*`. Hai service nối vào `localhost:5672`, health trả 503, kéo theo assessment, game, learning không khởi động. Log đầy đủ ở `outputs/rabbitmq-missing-config-2026-11-27/`.
- **Sửa:** thêm khối `spring.rabbitmq` (host, port, username, password đọc từ `RABBITMQ_*`) vào hai file yaml, thêm biến `RABBITMQ_*` và `depends_on: rabbitmq` cho hai service trong `docker-compose.yml`.
- **Production `[CẦN XÁC MINH]`:** kiểm `/opt/ieltspath/env/content-service.env` và `game-service.env` đã có `RABBITMQ_*` chưa, nếu không lần deploy tới sẽ lỗi y hệt.
- **Kiểm:** `docker compose up -d` trên máy sạch, mọi service `healthy`.
- **Ghi chú:** máy local của mobile đang chạy tạm bằng `docker-compose.override.yml` (không commit). Sẽ xóa khi `main` được sửa.

---

## P1: làm trước khi mở rộng người dùng

### 3. Band tổng bài kiểm tra trình độ không tính lại

- **Lỗi:** attempt `9b251d57-dd82-46fc-b114-aaa5fc90cb8a` (tài khoản `qb90412@mail.vn`): `placement-result` trả `overallBand: 1`, `skills` chỉ có Listening 0.0 và Reading 1.5, trong khi `sections[].essays[0].band` của Writing là **5.5**. Bài viết chấm xong sau khi band tổng đã tính và không được cộng lại.
- **Ảnh hưởng:** band tổng và khóa học gợi ý (hiện gợi ý IELTS Foundation 4.0) thấp hơn thực tế.
- **Sửa:** khi bài viết hoặc bài nói của attempt placement được chấm xong, tính lại `overallBand`, `skills` và phát lại band sang Learning.

### 4. Speaking đã chấm nhưng không vào kết quả

- **Lỗi:** log learning-service có `SpeakingGrader: Speaking LLM calls done` cho 2 bản ghi của attempt trên, nhưng `skills` không có `SPEAKING` và `speakingFeedback` là `null`. Có thể cùng nguyên nhân với mục 3.
- **Mobile:** đã hiện `speakingFeedback` (band và nhận xét từng tiêu chí) khi backend trả về; hiện chưa kiểm được vì trường này luôn `null`.

### 5. API báo cáo kết quả chấm AI

- **Yêu cầu:** Google Play bắt app có đường báo cáo nội dung do AI tạo. Cần một endpoint nhận `{submissionId, loại, lý do}` cho bài Writing và Speaking, lưu để người phụ trách xem.
- **Mobile:** sẽ thêm nút "Báo cáo kết quả chấm" ở màn kết quả khi có API.

### 6–7. Thiết bị đăng nhập và lỗi 405 (đã có patch)

- **6:** `AuthTokenIssuer.java:31` vẫn dùng `LoginContext.UNKNOWN`, màn "Thiết bị đăng nhập" hiện "Thiết bị không xác định".
- **7:** access, content, game, library, user chưa bắt `HttpRequestMethodNotSupportedException`.
- **Cách làm:** áp `mobile/docs/backend-fixes-2026-11-26.patch` (gồm cả mục 9), các file liên quan chưa đổi trên `main` nên patch vẫn áp được.

### 8. Thu hồi phiên không tắt thiết bị nhận push

- **Lỗi:** notification-service chỉ tắt thiết bị qua `DELETE /api/notifications/devices/{id}`, không nghe sự kiện thu hồi phiên. Máy đã bị đăng xuất (thu hồi từ máy khác, đổi mật khẩu) vẫn nhận thông báo.
- **Sửa:** gắn `sessionId` vào bản ghi thiết bị; user-service phát sự kiện thu hồi phiên qua outbox, notification-service tắt thiết bị tương ứng.

---

## P2: cải thiện

| # | Việc | Sửa |
|---|---|---|
| 9 | game-service: `"Game match not found: "+id`, `"Game session not found: "+id` | Có trong patch ở mục 6–7 |
| 10 | `GET /api/learning/practice-progress`, `GET /api/content/practice-tests/formats` thiếu tham số trả 500 | Handler `MissingServletRequestParameterException` → 400 tiếng Việt |
| 11 | `CompleteSpeakingSubmissionUseCase.java:78`: `"Speaking submission not found"` | Dịch tại nguồn |
| 12 | `/auth/login` nằm trong tier `auth` (1/giây, tối đa 5, theo IP); lớp học hay mạng 4G dùng chung IP bị chặn sớm | Tier `login` riêng, burst khoảng 20, như đã làm cho `/auth/refresh` |
| 13 | `public-profile` không có `targetBand`; người chưa đặt tên cộng đồng hiện "Learner" với người khác | Thêm `targetBand`; dùng `fullName` làm mặc định hoặc bắt đặt tên |
| 14 | `submission-history?skill=SPEAKING` trả `promptPreview`, `band`, `task` đều `null` | Trả tên đề và band cho mục Speaking |
| 15 | `learner@ielts.demo` báo đã xác minh email nhưng không kích hoạt được key | Seed trạng thái xác minh cho access-service (`user_email_verification_state`) |
| 16 | game-service lên trước config-server nên nối Redis vào `localhost` | `depends_on: config-server: service_healthy` và `spring.cloud.config.fail-fast` kèm retry |

## Cấu hình local (không phải lỗi code)

- **17:** `.env` đặt `ASSESSMENT_LLM_MODEL=gemini-3.8-flash`, Google trả `400 INVALID_ARGUMENT`, nên Writing của bài kiểm tra trình độ không có nhận xét. Người giữ `.env` đổi sang model đang chạy được.
- Mail xác minh và đặt lại mật khẩu trên stack local gửi qua Gmail và thất bại (26/11 full-qa mục B11). **Chưa kiểm lại** từ 26/11.

## Chưa kiểm lại (từ tài liệu 25/11)

Các mục lớn về hạ tầng, cần người có quyền vào server: kiểm `trusted-proxies` trên production, test tải và cảnh báo giám sát, ghi âm Speaking định dạng nén, số thông báo chưa đọc nhẹ hơn, hàng đợi chấm bài AI (mục 1, 8–12 của file 25/11).

## Đã xong

- Trùng migration `V148` (nay V152–V155, có callback dời lịch sử Flyway).
- Nộp bài kiểm tra trình độ có Speaking trả 500 (`ase.snapshot`), PR #243, đã kiểm trên máy thật 28/11.
- API chặn người dùng `/api/community/blocks`, hàng đợi kiểm duyệt `/api/community/admin/reports` (mobile đã làm màn tương ứng, đã test).
- Trang web xóa tài khoản (API vẫn lỗi, xem mục 1).
- Runtime glibc cho chấm Speaking; giới hạn riêng cho `/auth/refresh`.
