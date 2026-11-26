# Việc Backend cần làm để mobile lên Google Play và chịu được nhiều người dùng (25/11/2026)

Tài liệu này liệt kê các thay đổi **cần ở backend** (mobile không sửa được). Mỗi mục nêu bằng chứng trong mã/cấu hình, tác động, yêu cầu cụ thể và cách kiểm tra. Mobile chỉ **đọc** backend; mọi sửa đổi ở đây do người phụ trách backend thực hiện.

Cách đọc mức ưu tiên:
- **P0**: chặn phát hành lên Google Play, hoặc làm hỏng đăng nhập khi có nhiều người dùng.
- **P1**: làm trước khi mở rộng ra nhiều người dùng.
- **P2**: cải thiện trải nghiệm và chi phí, làm sau.

Đã xác minh trực tiếp bằng đọc mã. Chưa xác minh được trên máy chủ production (không có quyền truy cập), nên mục nào phụ thuộc cấu hình thật được đánh dấu `[CẦN XÁC MINH TRÊN SERVER]`.

## Tóm tắt

| # | Mức | Việc | Lý do ngắn |
|---|---|---|---|
| 1 | P0 | Giới hạn tốc độ đăng nhập có thể đang dùng chung **một bộ đếm cho toàn bộ người dùng** | `trusted-proxies` rỗng trong khi có Caddy phía trước |
| 2 | P0 | API xóa tài khoản + trang web yêu cầu xóa | Google Play bắt buộc |
| 3 | P0 | Chặn người dùng, quy trình xử lý báo cáo nội dung | Chính sách nội dung do người dùng tạo của Google Play |
| 4 | P1 | Nén phản hồi (gzip/zstd) | Hiện không nén, tốn dữ liệu di động |
| 5 | P1 | Số kết nối cơ sở dữ liệu | Pool mặc định và `max_connections` mặc định sát trần |
| 6 | P1 | Thông báo lỗi tiếng Việt ở assessment-service, learning-service | Quy tắc đã có nhưng chưa áp dụng |
| 7 | P1 | Tách giới hạn cho `/auth/refresh` và khóa đăng nhập theo email + IP | Người dùng chung IP (mạng di động, lớp học) bị chặn nhầm |
| 8 | P1 | Test tải và cảnh báo giám sát | Chưa có kịch bản test tải trong repo |
| 9 | P2 | Ghi âm Speaking định dạng nén | WAV lớn, tải lên chậm trên mạng yếu |
| 10 | P2 | Số thông báo chưa đọc nhẹ hơn | App hỏi mỗi 30 giây khi đang mở |
| 11 | P2 | Mở header `Date` cho CORS | Cho bản web đọc được giờ server |
| 12 | P2 | Hàng đợi cho chấm bài AI | Chịu được đợt nộp bài đồng loạt |

---

## 1. P0: Giới hạn tốc độ đăng nhập dùng chung một bộ đếm `[CẦN XÁC MINH TRÊN SERVER]`

**Bằng chứng**
- `infra/config-server/config-repo/api-gateway.yaml:368`: `trusted-proxies: []`.
- `infra/api-gateway/.../ratelimit/ClientKeyResolver.java:10,33`: request chưa đăng nhập được khóa theo `ip:{địa chỉ}`; header `X-Forwarded-For` chỉ được tin khi địa chỉ kết nối nằm trong `trusted-proxies`.
- Production dùng Caddy đứng trước gateway (`docker-compose.prod.yml`, service `caddy`; `Caddyfile` dùng `reverse_proxy api-gateway:8080`).
- Không thấy chỗ nào đặt `trusted-proxies` ngoài giá trị rỗng ở trên (chỉ có trong tài liệu và test). Kế hoạch cũ `plans/261101-0930-reliability-followups/phase-02-chinh-phase-3-auth-va-xff.md:31` đã ghi nhận: "mặc định rỗng nên chưa bị khai thác, nhưng lỗi hiện ra ngay khi bật proxy".
- Nhóm `auth` chỉ cho `replenish-rate: 1`, `burst-capacity: 5` (api-gateway.yaml:370), áp dụng cho `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/google`, `/api/users/register` (api-gateway.yaml:77-84).

**Tác động**: nếu giá trị production cũng rỗng, mọi request chưa đăng nhập đều có địa chỉ kết nối là IP của container Caddy, nên **toàn bộ người dùng dùng chung một bộ đếm 1 request/giây, tối đa 5 liền**. Ước tính: khi 200 người mở app trong vài phút (giờ cao điểm, sau thông báo đẩy), phần lớn nhận lỗi 429 "thao tác quá nhanh". Token truy cập sống 1 giờ (`ACCESS_TOKEN_MAX_AGE_SECONDS` = 3600, user-service.yaml:52), nên 3.600 người đang dùng cũng đã sinh khoảng 1 lần làm mới token mỗi giây, đúng bằng trần.

**Yêu cầu**
1. Kiểm tra biến môi trường production (thư mục `/opt/ieltspath/env/`) xem `GATEWAY_RATE_LIMIT_TRUSTED_PROXIES` (hoặc dạng tương đương) có được đặt chưa.
2. Nếu chưa: đặt `trusted-proxies` bằng địa chỉ/mạng Docker của Caddy, và bảo đảm Caddy gửi `X-Forwarded-For` đúng (mặc định `reverse_proxy` của Caddy đã gửi).
3. Thêm test hoặc kiểm tra khởi động: cảnh báo nếu chạy sau proxy mà `trusted-proxies` rỗng.

**Cách kiểm tra**: từ hai địa chỉ IP khác nhau, gọi liên tục `/auth/login` với mật khẩu sai. Hai nguồn phải bị giới hạn **độc lập** (nguồn A bị 429 không làm nguồn B bị 429). Xem khóa Redis `ip:*` có địa chỉ client chứ không phải địa chỉ Caddy.

---

## 2. P0: Xóa tài khoản

**Bằng chứng**: user-service chỉ có `DELETE /{id}` dành cho quản trị (`UserManagementController.java:122`). Không có endpoint cho người dùng tự xóa. App Android hiện không có màn xóa tài khoản. Google Play bắt buộc app cho tạo tài khoản phải cho xóa **trong app và qua một đường link web**.

**Yêu cầu**
1. `DELETE /api/users/me` (xác nhận bằng mật khẩu hiện tại, hoặc ID token Google với tài khoản chỉ đăng nhập Google). Thông báo lỗi tiếng Việt, có `details.code` ổn định.
2. user-service đánh dấu tài khoản xóa, thu hồi toàn bộ refresh token, rồi phát sự kiện `user.deleted.v1` qua outbox (mẫu và quy tắc ở `AGENTS.md` §3.9; thêm tên/payload vào `common-events` và contract ở `docs/contracts/`).
3. Các service sở hữu dữ liệu nhận sự kiện (consumer idempotent) và xóa hoặc ẩn danh phần của người đó:
   - learning, assessment (bài làm, bài viết, **file ghi âm Speaking** trong storage), library (sổ từ, thẻ), access (điểm, gói), notification (hộp thư, **token thiết bị**), game, community (bài viết và bình luận: xóa hoặc ẩn danh; chọn một chính sách và ghi vào tài liệu).
   - Ảnh đại diện và mọi tệp đã tải lên xóa khỏi storage qua `common-storage`.
4. Định nghĩa dữ liệu bắt buộc giữ lại theo luật (nếu có, ví dụ lịch sử thanh toán) và nói rõ trong chính sách quyền riêng tư.
5. Trang web yêu cầu xóa tài khoản có URL công khai (khai báo trên Play Console). Phần giao diện web ở dự án frontend, ngoài phạm vi tài liệu này.

**Cách kiểm tra**: tạo tài khoản thử có đủ dữ liệu (bài viết, ghi âm, thẻ từ, thiết bị), xóa, rồi kiểm tra: đăng nhập lại thất bại, token cũ bị từ chối, không còn bản ghi/tệp gắn với `userId` ở các service và storage, bài viết cộng đồng theo đúng chính sách đã chọn.

**Mobile sẽ làm**: màn "Xóa tài khoản" gọi endpoint trên, rồi đăng xuất và xóa dữ liệu cục bộ.

---

## 3. P0: Chặn người dùng và xử lý báo cáo nội dung

**Bằng chứng**: community-service có báo cáo (`POST /api/community/reports`, mobile đã dùng cho bài viết và bình luận) nhưng không thấy chức năng chặn người dùng. Chính sách của Google Play cho nội dung do người dùng tạo yêu cầu có báo cáo, chặn và kiểm duyệt.

**Yêu cầu**
1. `POST /api/community/blocks/{userId}`, `DELETE /api/community/blocks/{userId}`, `GET /api/community/blocks`.
2. Bài viết, bình luận, thông báo và gợi ý nhắc tên của người bị chặn **không xuất hiện** cho người chặn, và ngược lại người bị chặn không bình luận hay theo dõi người đã chặn họ.
3. Hàng đợi kiểm duyệt: báo cáo vào danh sách cho quản trị xử lý, có mốc thời gian xử lý (nên trong 24 giờ) và tài liệu hóa quy trình.
4. Báo cáo kết quả chấm AI sai hoặc không phù hợp: một endpoint nhận `{submissionId, loại, lý do}` lưu để người phụ trách xem. Chính sách nội dung do AI tạo của Google Play yêu cầu có đường báo cáo.

**Cách kiểm tra**: A chặn B, B không thấy bài của A và ngược lại, tìm kiếm và gợi ý nhắc tên không trả B cho A; báo cáo xuất hiện trong danh sách quản trị.

---

## 4. P1: Nén phản hồi

**Bằng chứng**: không có cấu hình nén ở bất kỳ đâu (`Caddyfile` không có `encode`; config-repo không có `server.compression`). Danh sách đề, bảng tin cộng đồng, lịch sử trả JSON nguyên bản.

**Tác động**: tốn dữ liệu di động và chậm hơn trên 3G, nhất là bảng tin cộng đồng và danh mục đề.

**Yêu cầu**: thêm `encode zstd gzip` vào Caddy (một dòng). Không áp cho tải lên và WebSocket.

**Cách kiểm tra**: `curl -H "Accept-Encoding: gzip" -I https://<api>/api/community/posts` trả `Content-Encoding: gzip`; kích thước giảm rõ rệt.

---

## 5. P1: Số kết nối cơ sở dữ liệu

**Bằng chứng**: không có cấu hình Hikari trong config-repo (mặc định Spring Boot: tối đa 10 kết nối mỗi service); `docker-compose.prod.yml` không đặt `max_connections` cho PostgreSQL (mặc định 100). Có 9 service dùng DB, một máy PostgreSQL giới hạn bộ nhớ 1 GB (`docker-compose.prod.yml:136-147`).

**Tác động**: 9 service × 10 = 90 kết nối tiềm năng, sát trần 100, chưa kể Flyway, công cụ quản trị, sao lưu. Khi tải tăng, service mới khởi động hoặc quản trị có thể không kết nối được.

**Yêu cầu**: đặt `maximum-pool-size` rõ ràng theo từng service (ví dụ 5–10 tùy tải), đặt `max_connections` phù hợp hoặc dùng PgBouncer, rà bộ nhớ PostgreSQL theo số kết nối. Xuất metric `hikaricp_connections_*` lên Prometheus (đã có trong stack).

**Cách kiểm tra**: trong test tải (mục 8) theo dõi số kết nối đang dùng và thời gian chờ lấy kết nối, không chạm trần.

---

## 6. P1: Thông báo lỗi tiếng Việt ở assessment và learning

**Bằng chứng**: `AGENTS.md` §3.3 bắt buộc mọi `GlobalExceptionHandler` gọi `VietnameseErrorMessages.userFacing`, nhưng chỉ content-service dùng nó (`grep` toàn `services/*/src/main/java`). assessment-service ném các câu tiếng Anh như `AssessmentNotFoundException("Assessment attempt not found")` (`CompleteAttemptSectionUseCase.java:32`, `CreateAssessmentResultUseCase.java:26`, `CancelPlacementAttemptUseCase.java:21`), `"Grading job not found"`, `"Human review not found"`, `"Examiner not found"`. Mobile đã thấy "Assessment attempt not found", "Submission was not found", "Speaking submission not found" trên màn hình.

**Yêu cầu**: nối `VietnameseErrorMessages` vào `buildResponse` của handler ở assessment-service và learning-service; dịch tại nguồn các câu đang ném (nói rõ nội dung nào không tìm thấy, bằng tiếng Việt có dấu, không chèn mã kỹ thuật); cập nhật test dùng `hasMessageContaining`.

**Cách kiểm tra**: gọi `GET /api/assessments/attempts/<uuid-không-tồn-tại>`, message phải là tiếng Việt.

**Ghi chú**: mobile đã thêm lớp thay thế tạm (câu chung theo mã trạng thái) nên người dùng không thấy tiếng Anh, nhưng câu chung mất thông tin cụ thể.

---

## 7. P1: Giới hạn theo người dùng thật, không chỉ theo IP

**Bằng chứng**: `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/register` đều ẩn danh nên bị khóa theo IP (`ClientKeyResolver`). Mạng di động nhà mạng và lớp học dùng chung IP công cộng.

**Yêu cầu** (sau khi xong mục 1)
1. `/auth/login`: khóa theo cặp **email + IP**, và thêm một giới hạn rộng hơn theo IP riêng (ví dụ 20/phút) để chặn dò mật khẩu hàng loạt mà không chặn cả lớp học.
2. `/auth/refresh`: không dùng chung nhóm `auth` 1 request/giây. Khóa theo **băm của refresh token** (mỗi thiết bị một bộ đếm), hoặc tách một nhóm riêng có `burst-capacity` lớn.
3. Giữ phản hồi 429 hiện tại (tiếng Việt, có `Retry-After`) để mobile hiển thị đúng.

**Cách kiểm tra**: 30 tài khoản khác nhau đăng nhập đồng thời từ cùng một IP, phần lớn phải thành công; thử sai mật khẩu liên tục với một email thì email đó bị khóa còn email khác không bị ảnh hưởng.

---

## 8. P1: Test tải và giám sát

**Bằng chứng**: không thấy kịch bản test tải (k6, Gatling, JMeter) trong repo. Stack Prometheus, Grafana có sẵn nhưng là tùy chọn (`docker-compose.observability.yml`, profile `observability`).

**Yêu cầu**
1. Chạy test tải trên môi trường **giống production** (cùng cấu hình máy, Caddy, gateway, Redis). Cần nhiều tài khoản thật vì giới hạn tính theo người dùng (một tài khoản sẽ bị chặn trước khi chạm tải).
2. Kịch bản gợi ý (mỗi người dùng ảo): đăng nhập, mở danh sách đề, mở bài Reading, lưu đáp án (mỗi vài giây), nộp bài, xem kết quả, mở bảng tin cộng đồng, hỏi số thông báo chưa đọc mỗi 30 giây, 10% người nộp bài Writing để chấm AI, 5% tải lên ghi âm Speaking.
3. Mức mục tiêu đề xuất (điều chỉnh theo kế hoạch người dùng): 500 người dùng đồng thời giữ ổn định 30 phút; p95 < 500 ms cho các lời gọi đọc; lỗi 5xx < 0,5%; không có 429 với người dùng bình thường; chấm AI ghi nhận tỉ lệ thành công và thời gian chờ.
4. Cảnh báo cần có trên Grafana/Prometheus: tỉ lệ 5xx, p95 theo route, số kết nối DB, độ trễ và tỉ lệ lỗi của lời gọi LLM, kích thước hàng đợi RabbitMQ và DLQ, bộ nhớ từng container.

**Cách kiểm tra**: báo cáo kết quả test (biểu đồ + điểm nghẽn tìm được) đính kèm kế hoạch mở rộng.

---

## 9. P2: Ghi âm Speaking định dạng nén

**Bằng chứng**: learning-service chỉ nhận `audio/wav` (`UploadSpeakingRecordingUseCase.java:39`), tối đa 10 MB (`learning-service.yaml:6`, tương đương khoảng 5 phút WAV 16 kHz mono). Mobile ghi WAV 16 kHz mono 16-bit, khoảng 32 KB/giây, nghĩa là câu trả lời 45 giây nặng khoảng 1,4 MB. Mỗi tệp có thời hạn tải 60 giây phía app (`MULTIPART_TIMEOUT_MS`).

**Tác động**: trên mạng 3G yếu (~0,5 Mbps), tệp 1,4 MB mất khoảng 23 giây; câu dài 2 phút (~3,8 MB) có thể vượt 60 giây và phải gửi lại. Tốn lưu trữ trong thời gian giữ (`retentionDays`).

**Yêu cầu** (nếu bộ chuyển giọng nói thành chữ của bước chấm hỗ trợ định dạng nén `[CẦN XÁC MINH]`): cho phép `audio/mp4` (AAC) hoặc `audio/ogg` (Opus) ở learning-service, giữ WAV để tương thích bản cũ. Dung lượng giảm khoảng 8–10 lần. Báo lại định dạng được chọn để mobile đổi cấu hình ghi âm.

---

## 10. P2: Số thông báo chưa đọc nhẹ hơn

**Bằng chứng**: mobile gọi `communityApi.unread` mỗi 30 giây khi đang mở app (`src/features/community/use-unread.ts:14`). Với 3.000 người đang mở app là khoảng 100 request/giây chỉ cho việc này.

**Yêu cầu**: bảo đảm endpoint chỉ đọc một số đếm đã tính sẵn (có thể trong Redis), trả `ETag`/`304`, hoặc cung cấp cách đẩy thay vì hỏi (WebSocket, hoặc dựa vào thông báo đẩy FCM để mobile làm mới).

**Mobile sẽ làm**: tăng chu kỳ hỏi, chỉ hỏi khi tab đang hiển thị, làm mới khi nhận thông báo đẩy.

---

## 11. P2: Mở header `Date` cho CORS

**Bằng chứng**: mobile nay đọc header `Date` của phản hồi để lấy giờ server cho đồng hồ thi (Android và iOS đọc được). Trình duyệt chỉ cho bản web đọc `Date` giữa hai origin khi server gửi `Access-Control-Expose-Headers: Date`.

**Yêu cầu**: thêm `Date` vào `exposed-headers` của CORS ở gateway (chỉ cần nếu có bản web). Tùy chọn: thêm trường `serverTime` vào phản hồi mở bài thi (`AssessmentAttemptResponse`) để không phụ thuộc header.

---

## 12. P2: Hàng đợi cho chấm bài AI

**Bằng chứng**: chấm bài viết gọi LLM đồng bộ với thời hạn 20 giây (`learning.writing.grading-timeout-seconds`, `AGENTS.md` §3.8), có hạn mức theo ngày, `ResilientCall` bọc lời gọi. Khi nhiều người nộp cùng lúc, số lời gọi LLM đồng thời bị giới hạn bởi bulkhead và nhà cung cấp LLM.

**Yêu cầu**: đo ở test tải xem bulkhead và hạn mức của nhà cung cấp LLM chịu được bao nhiêu bài đồng thời. Nếu không đủ, chuyển sang xử lý bất đồng bộ (nhận bài, trả `GRADING`, chấm bằng worker theo hàng đợi, mobile đã có sẵn cơ chế hỏi trạng thái cho màn kết quả Writing) và hiển thị thời gian chờ ước tính. Theo dõi tỉ lệ hết hạn mức và lỗi LLM.

---

## Thứ tự đề xuất

1. Tuần 1: mục 1 (xác minh cấu hình, thường chỉ vài dòng), mục 4, mục 5, mục 6.
2. Tuần 1–2: mục 2 và 3 (cần thiết kế, ảnh hưởng nhiều service), mục 7.
3. Sau khi các mục trên xong: mục 8 (test tải) để có số liệu thật trước khi mở rộng, rồi quyết định mục 9–12 theo kết quả.

---

## 13. P2 (phát hiện thêm khi test): id sai định dạng trả 500 bằng tiếng Anh

**Bằng chứng**: `GET /api/games/matches/active` (đường dẫn không có route thật, "active" bị hiểu là `matchId`) trả `500 Internal Server Error` với `"message": "An unexpected error occurred"`. Mới thử một đường dẫn ở game-service, các service khác chưa kiểm tra `[CẦN XÁC MINH]`.

**Yêu cầu**: giá trị path variable không đúng định dạng UUID phải trả `400` (hoặc `404`) với thông báo tiếng Việt, không phải `500`; lỗi `500` làm nhiễu cảnh báo giám sát (mục 8).

**Cách kiểm tra**: gọi `GET /api/<service>/.../not-a-uuid` ở từng service, kết quả phải là 4xx tiếng Việt.

## 14. Tên người dùng khác luôn hiện là "Learner" (phát hiện khi kiểm thử trên máy thật)

`GET /api/users/{id}/public-profile` trả `displayName: "Learner"` khi người gọi là người dùng khác, nhưng trả đúng tên (`Tester Hai`) khi chính chủ gọi. Thông báo trả về chỉ có `actorId`, nên mobile tra tên qua endpoint này và mọi người dùng chưa đặt tên hiển thị cộng đồng đều hiện là "Learner" trong thông báo, bình luận và danh sách. Cần backend chốt rõ: dùng `fullName` làm mặc định, hoặc yêu cầu đặt tên hiển thị khi lần đầu dùng Cộng đồng. Mobile không thể tự sửa vì không có tên thật trong phản hồi.

## 15. Chấm Speaking luôn lỗi trên Docker: Azure Speech SDK không chạy trên Alpine (P0)

**Hiện tượng:** mọi bài Speaking nộp lên đều không được chấm. Trên mobile màn kết quả hiện "Hệ thống chấm đang lỗi, vui lòng thử lại sau. Bạn không bị trừ point." (trạng thái `NEEDS_EXAMINER`) hoặc kẹt ở "Đang chấm". Writing và Reading/Listening chấm bình thường.

**Nguyên nhân (đọc từ log `learning-service`):** `SpeakingGradingJob` gọi `AzureSpeechClient.recognize`, và lớp `com.microsoft.cognitiveservices.speech.SpeechConfig` không khởi tạo được:
`UnsupportedOperationException: Error with native library loader: InvocationTargetException`, sau đó mọi lần chạy đều ném `NoClassDefFoundError: Could not initialize class ...SpeechConfig`.
`Dockerfile.spring-service` dùng runtime `eclipse-temurin:21-jre-alpine` (musl libc). Thư viện native của Microsoft Speech SDK (`client-sdk` 1.53.0) được build cho glibc nên không nạp được trên Alpine. Khoá và vùng Speech đã được cấu hình (biến `LEARNING_SPEECH_KEY` và `LEARNING_SPEECH_REGION` đều có giá trị), nên đây không phải lỗi cấu hình khoá.

**Cần backend làm:** đổi runtime của `learning-service` sang image glibc (ví dụ `eclipse-temurin:21-jre` dựa trên Debian/Ubuntu, hoặc `-jammy`), hoặc cài lớp tương thích glibc cho Alpine. Nên kiểm tra các thư viện hệ thống mà Speech SDK cần (`libstdc++`, OpenSSL, ALSA) trên image mới. Sau khi đổi, nộp lại một bài Speaking để xác nhận trạng thái chuyển `GRADED`.

**Nên làm thêm:** `SpeakingGradingJob` đang để lỗi lọt ra `TaskUtils$LoggingErrorHandler` và chạy lại mỗi vài phút. Nên bắt `Throwable` ở từng bài, đặt trạng thái lỗi rõ ràng sau số lần thử tối đa, để bài không treo "Đang chấm" mãi. Cần có cảnh báo khi tỷ lệ bài `NEEDS_EXAMINER` tăng.
