# Backend: phần đã sửa và phần cần làm (26/11/2026, đợt QA toàn diện mobile)

Bổ sung cho `backend-requests-2026-11-15.md`, `-2026-11-25.md` và `-2026-11-26.md`.

Đợt QA mobile có thử sửa một số lỗi nhỏ trong backend trên máy local (phần A). Phía mobile **không push code**, nên phần sửa được gửi kèm dưới dạng file **`backend-fixes-2026-11-26.patch`**. Nhờ người phụ trách backend xem lại rồi áp:

```bash
git apply --check backend-fixes-2026-11-26.patch   # kiểm trước
git apply backend-fixes-2026-11-26.patch
```

Đã kiểm: patch áp sạch lên `origin/main` tại commit `5f9cc670`. Test ở mục E chạy trên bản code **cũ hơn** commit này, nên nhờ chạy lại test sau khi áp.

## A. Đề xuất sửa (A1–A3 có trong patch)

| # | Mức | Service | Việc | File |
|---|---|---|---|---|
| A1 | P1 | user | Đăng nhập mới không lưu thiết bị và IP | `application/usecase/AuthTokenIssuer.java` |
| A2 | P1 | content, library, game | Sai method trả 500 thay vì 405 | `api/exception/GlobalExceptionHandler.java` |
| A3 | P2 | game | Lỗi tiếng Anh kèm UUID; id sai định dạng trả 500; lỗi 500 không ghi log | `GlobalExceptionHandler.java`, `GameMatchNotFoundException.java`, `GameSessionNotFoundException.java` |
| A4 | P2 | assessment | Lỗi 400 lộ tên lớp Java | **Đã được sửa ở `origin/main`** (commit `102d4a5d`), không nằm trong patch |

### A1. Phiên đăng nhập mới không có `userAgent`/`ipAddress`

- **Bằng chứng:** `POST /auth/login` rồi `GET /api/users/me/sessions` trả phiên hiện tại `{"current":true,"userAgent":null,"ipAddress":null}`.
- **Nguyên nhân:** `LoginUseCase` và `LinkGoogleAccountUseCase` gọi `authTokenIssuer.issue(user)`, hàm này dùng `LoginContext.UNKNOWN`.
- **Ảnh hưởng mobile:** màn "Thiết bị đăng nhập" hiện "Thiết bị không xác định" nên người dùng không biết nên đăng xuất thiết bị nào.
- **Đã sửa:** `issue(user)` lấy ngữ cảnh request từ `AuthAuditContextProvider` (đã có sẵn, dùng cho audit).
- **Kiểm tra:** đăng nhập kèm header `User-Agent`, gọi lại danh sách phiên, phiên hiện tại phải có `userAgent` và `ipAddress`. Các phiên tạo trước khi sửa vẫn giữ giá trị rỗng.

### A2. Sai method trả 500

- **Bằng chứng:** `GET /api/content/practice-tests/search`, `GET /api/learning-support/flashcards/{id}/reviews`, `GET /api/games/wordly/rooms` đều trả 500.
- **Đã sửa:** thêm handler `HttpRequestMethodNotSupportedException` trả 405 tiếng Việt. Phần còn lại của mục 2 trong tài liệu 26/11.

### A3. game-service

- **Bằng chứng:** `GET /api/games/matches/{uuid-không-tồn-tại}` trả `"Game match not found: <uuid>"`; `GET /api/games/rooms/not-a-uuid` trả 500 `"An unexpected error occurred"`.
- **Đã sửa:** message tiếng Việt không kèm id; mọi message đi qua `VietnameseErrorMessages.userFacing`; thêm handler `MethodArgumentTypeMismatchException` trả 400; ghi log lỗi 500.

### A4. assessment-service

- **Bằng chứng:** `GET /api/assessments/attempts/not-a-uuid` và `GET /api/assessments/practice/progress?skill=READING&scope=FREE` trả 400 với message `"Method parameter ... required type 'java.util.UUID' ..."`.
- **Trạng thái:** `origin/main` đã cho mọi message qua `VietnameseErrorMessages.userFacing`. Không cần làm thêm, chỉ cần kiểm lại hai lời gọi trên.

### Kết quả test

`mvn -pl services/user-service,services/content-service,services/library-service,services/game-service,services/assessment-service -am test`: xem mục E. Các test còn lỗi đều có sẵn từ trước. Phần A chưa được kiểm trên API đang chạy (mục D).

## B. Cần backend làm

| # | Mức | Việc |
|---|---|---|
| B1 | P0 | Đổi tên một file migration `V148` thành `V152` (`origin/main` `5f9cc670` vẫn còn hai file `V148`) |
| B2 | P0 | API xóa tài khoản và trang web yêu cầu xóa |
| B3 | P0 | Chặn người dùng và quy trình xử lý báo cáo nội dung |
| B4 | P1 | Tắt thiết bị nhận push khi phiên bị thu hồi hoặc đổi mật khẩu |
| B5 | P1 | `learning-service` còn câu lỗi tiếng Anh ở một số mã |
| B6 | P2 | Tách giới hạn tốc độ cho `/auth/login` |
| B7 | P2 | `public-profile` thiếu `targetBand`; tên mặc định là "Learner" |
| B8 | P2 | Hai test của content-service đang lỗi |
| B9 | P2 | Ba test của game-service đang lỗi |
| B10 | P2 | Tài khoản demo không kích hoạt được key |

### B1. P0: hai file `V148`

`git ls-tree origin/main` của `content-service/.../db/migration` vẫn có cả `V148__course_import_drafts.sql` và `V148__lesson_slide_files.sql`. Cách sửa: đổi tên file `course_import_drafts` sang `V152`, giữ nguyên nội dung (không nằm trong patch). Build từ `main` thì content-service không khởi động (`Found more than one migration with version 148`). Kiểm tra `flyway_schema_history` của môi trường đang chạy trước khi đổi (chi tiết ở tài liệu 26/11, mục 1).

### B2, B3. Xóa tài khoản và chặn người dùng

Chưa thay đổi so với mục 2 và 3 của tài liệu 25/11: không có `DELETE /api/users/me`, không có API chặn. Google Play bắt buộc cả hai nên **chặn việc phát hành**. Mobile sẽ làm màn tương ứng khi có API.

### B4. P1: thiết bị push không bị tắt khi phiên kết thúc

- **Bằng chứng:** notification-service chỉ tắt thiết bị qua `DisableNotificationDeviceUseCase`, được gọi từ `DELETE /api/notifications/devices/{installationId}`. Không có consumer nào cho sự kiện thu hồi phiên.
- **Ảnh hưởng:** thu hồi phiên từ thiết bị khác, đổi mật khẩu, hoặc phiên hết hạn thì máy đó vẫn nhận thông báo của tài khoản cũ (mobile không còn token để gọi `DELETE`).
- **Mobile đã giảm thiểu:** khi phát hiện phiên hết hạn, app tự hủy push token trên máy.
- **Đề xuất:** gắn `sessionId` vào bản ghi thiết bị; khi user-service thu hồi phiên thì phát sự kiện qua outbox, notification-service tắt thiết bị tương ứng.
- **Kiểm tra:** đăng nhập máy A, thu hồi phiên A từ máy B, gửi một thông báo, máy A không nhận.

### B5. P1: learning-service còn tiếng Anh

**Cập nhật:** `origin/main` (`102d4a5d`) đã lọc message không phải tiếng Việt thành câu chung (đọc code, chưa chạy). Nếu muốn người học biết phải làm gì, vẫn nên viết câu tiếng Việt riêng cho từng `code` dưới đây.

`GET /api/learning/writing-submissions/{không-tồn-tại}` trả `{"detail":"Submission was not found","code":"NOT_FOUND"}`. Các mã `AI_BUSY`, `CONTENT_UNAVAILABLE`, `REQUEST_CONFLICT`, `HUMAN_REVIEW_REJECTED`, `RECORDING_FORMAT_UNSUPPORTED`, `FREE_PRACTICE_EXHAUSTED` (đọc từ code) chủ yếu kèm câu tiếng Anh; mobile chỉ hiện được câu chung theo mã HTTP nên người dùng không biết phải làm gì. Đề xuất: viết message tiếng Việt tại nguồn, giữ nguyên `code`.

### B6. P2: giới hạn đăng nhập

Chưa đổi so với mục 5 của tài liệu 26/11: `/auth/login` vẫn nằm trong route dùng tier `auth` (1 request/giây, tối đa 5).

### B7. P2: hồ sơ công khai

- `GET /api/users/{id}/public-profile` chỉ trả `{id, displayName, avatarUrl, bio}`. Mobile đã bỏ chip "Mục tiêu band" vì không bao giờ có dữ liệu. Nếu muốn hiện lại, thêm `targetBand`.
- Người dùng chưa đặt tên hiển thị vẫn hiện là "Learner" trong thông báo (mục 14, tài liệu 25/11).

### B8. P2: test lỗi có sẵn ở content-service

`PracticeSetMaterializerIntegrationTest` (không nạp được ApplicationContext) và `JdbcAuthorPackageReaderTest.listFiltersByAccessLevelAndReportsSkillPartsAndCounts` (`BadSqlGrammarException`). Đợt này không sửa tầng persistence hay test của content-service.

### B9. P2: ba test lỗi có sẵn ở game-service

`RocketGameControllerTest.roundRoutesPassThroughAndMapErrors`, `RocketSoloFlowIntegrationTest.createReadyStartAnswerAndFinish` và `.multiplayerRoomCreateJoinEditAndStart` nhận 400 thay vì 200. **Đã chạy lại trên `HEAD` chưa sửa và lỗi y hệt**, message gốc là `Name for argument of type [java.util.UUID] not specified…` (thiếu cờ `-parameters` khi biên dịch, hoặc `@PathVariable` chưa đặt tên). Image đang chạy trên máy local không bị: endpoint trả lời Rocket trả 200 khi gọi thật. Trong lần chạy riêng sau cùng chỉ còn test controller fail.

## D. Cách áp dụng phần A

Đợt QA chưa build lại image, nên **phần A chưa được kiểm trên API đang chạy**, mới kiểm bằng test.

```powershell
cd D:\DOAN\backend
docker compose build user-service content-service library-service game-service
docker compose up -d user-service content-service library-service game-service
```

## E. Kết quả test

| Module | Test | Lỗi | Ghi chú |
|---|---|---|---|
| common-* (6 module) | 167 | 0 | 3 skip |
| user-service | 399 | 0 | |
| content-service | 1508 | 2 | có sẵn, xem B8 |
| library-service | 487 | 0 | |
| assessment-service | 558 | 0 | |
| game-service | 258 | 3 | có sẵn, xem B9 |

### B10. P2: tài khoản demo không kích hoạt được key

- **Bằng chứng:** với `learner@ielts.demo`, `GET /api/users/me` trả `emailVerified: true`, nhưng `POST /api/access/me/keys/activate` trả "Vui lòng xác minh email trước khi nhập mã kích hoạt".
- **Nguyên nhân (đọc code):** access-service dùng bản sao riêng (`user_email_verification_state`) cập nhật từ sự kiện. Tài khoản demo được seed bằng SQL nên có thể không có sự kiện nào (chưa truy vấn database để xác nhận).
- **Ảnh hưởng:** không demo được luồng kích hoạt Premium; app không hiện thẻ "Xác minh email" vì user-service báo đã xác minh.
- **Đề xuất:** seed demo ghi cả trạng thái xác minh ở access-service, hoặc phát lại sự kiện cho tài khoản đã xác minh.

## C. Mục cũ đã xong

| Mục | Trạng thái | Cách kiểm |
|---|---|---|
| Nén phản hồi (25/11 #4) | Có `encode zstd gzip` trong `Caddyfile` | đọc cấu hình, chưa kiểm trên server |
| Số kết nối DB (25/11 #5) | Có `maximum-pool-size` từng service và `max_connections=80` | đọc cấu hình |
| `trusted-proxies` (25/11 #1) | Lấy từ `GATEWAY_RATE_LIMIT_TRUSTED_PROXIES` | đọc cấu hình, chưa kiểm production |
| Thiếu tham số trả 500 (26/11 #3) | Đã trả 400 tiếng Việt | gọi API thật |
| Header `Date` cho CORS (25/11 #11) | Đã expose | commit `4b83f677` |
| Azure Speech trên Alpine (25/11 #15) | **Chưa vào `main`**: bản sửa ở nhánh `fix/speaking-ai-grading-runtime` | so `origin/main` với nhánh đó |
| 429 tiếng Việt | Đúng: `code: RATE_LIMITED`, `Retry-After: 1` | bắn 150 request: 37 trả 200, 113 trả 429 |

## F. Phát hiện thêm trong đợt kiểm thứ hai (26/11, 22:00–23:50)

Không sửa file backend nào, không rebuild, không khởi động lại service.

| # | Mức | Việc |
|---|---|---|
| B11 | P1 | Stack local đang gửi mail qua Gmail và không gửi được |
| B12 | P2 | Lịch sử Speaking không có tên đề và band |

### B11. P1: mail xác minh và đặt lại mật khẩu không gửi được trên stack local

- **Bằng chứng:** biến môi trường của `notification-service` đang chạy: `NOTIFICATION_MAIL_ENABLED=true`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`. Log: `java.net.UnknownHostException: smtp.gmail.com`. `POST /auth/resend-verification` trả 200 nhưng Mailpit (`/api/v1/messages`) có 0 thư.
- **Ảnh hưởng mobile:** người dùng thấy "liên kết sẽ được gửi" nhưng không bao giờ nhận. Không kiểm và không demo được xác minh email, đặt lại mật khẩu. Tài khoản chưa xác minh cũng không đổi được mật khẩu và không mua được gói.
- **Đề xuất:** cho môi trường local, đặt lại SMTP về Mailpit trong `.env` (ghi chú 15/11 đã dùng cấu hình này), hoặc cho container ra được Internet nếu cố ý dùng Gmail.
- **Kiểm tra:** gọi `resend-verification` cho một tài khoản test, thư xuất hiện ở http://localhost:8025.

### B12. P2: lịch sử Speaking thiếu thông tin để phân biệt các bài

- **Bằng chứng:** `GET /api/learning/submission-history?scope=FREE&skill=SPEAKING&page=0&size=3` trả mỗi mục `"promptPreview": null, "band": null, "task": null` dù `status` là `GRADED`. Cùng endpoint với `skill=WRITING` có `promptPreview` và `band`.
- **Ảnh hưởng mobile:** mọi dòng trong Lịch sử Speaking đều là "Bài Speaking · Đã chấm", không biết đề nào và được bao nhiêu.
- **Đề xuất:** trả `promptPreview` (hoặc tên đề) và `band` ước lượng cho mục Speaking.
- **Kiểm tra:** gọi lại endpoint trên, hai trường có giá trị với bài đã chấm.

### Mục cũ, kiểm lại

- A1 (phiên đăng nhập không có thiết bị/IP): **chưa có hiệu lực** trên stack đang chạy, màn Thiết bị đăng nhập vẫn hiện "Thiết bị không xác định".
