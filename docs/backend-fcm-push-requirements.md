# Yêu cầu BE: Push notification cho mobile qua FCM

**Trạng thái:** Đề xuất để đội BE triển khai và phản hồi hợp đồng API  
**Phạm vi ban đầu:** Android, Firebase Cloud Messaging HTTP v1  
**Ngày:** 2026-11-07

## 1. Mục tiêu

Cho phép IELTSPath gửi thông báo tới điện thoại Android kể cả khi app đang chạy nền hoặc đã đóng. Mobile đăng ký token thiết bị với BE; BE lưu token trong database hiện có và gửi thông báo qua Firebase Cloud Messaging (FCM) khi Notification Service đã tạo notification.

Push là một kênh giao nhận mới. REST inbox và WebSocket hiện tại tiếp tục hoạt động như cũ và vẫn là nguồn dữ liệu bền vững để mobile tải danh sách, trạng thái đã đọc và số chưa đọc.

**Không dùng Expo Push Service.** App vẫn là Expo app; Expo chỉ cung cấp phần native/mobile để xin quyền, lấy FCM token và nhận notification. BE gửi trực tiếp tới FCM.

## 2. Tình trạng hiện tại đã xác minh

Notification Service hiện có:

- `GET /api/notifications`, `GET /api/notifications/unread-count`.
- `PUT /api/notifications/{id}/read`, `PUT /api/notifications/read-all`.
- `GET /api/notifications/preferences`, `PUT /api/notifications/preferences/{eventType}`.
- WebSocket STOMP `/ws/notifications`, subscription `/user/queue/notifications` cho client đang kết nối.
- Consumer lưu các notification bền vững trước khi gửi WebSocket; lỗi WebSocket không được làm mất notification.

Hiện chưa có API quản lý token thiết bị, bảng token thiết bị, FCM sender hoặc credentials FCM trong Notification Service. Vì vậy chỉ thêm bảng/API lưu token sẽ **chưa đủ** để push xuất hiện; BE cũng cần tích hợp bước gửi FCM khi notification được tạo.

Hợp đồng REST và WebSocket hiện có được mô tả tại `backend/docs/contracts/community-events-v1.md`. Tài liệu này đề xuất mở rộng hợp đồng đó, không thay thế nó.

## 3. Luồng tổng thể

1. Người dùng đăng nhập trên app và cấp quyền notification cho Android.
2. Mobile lấy native FCM registration token và một `installationId` ngẫu nhiên, ổn định cho lần cài app đó.
3. Mobile gọi API đăng ký thiết bị. BE lấy `userId` từ access token và tạo/cập nhật bản ghi trong DB.
4. Các producer hiện có tiếp tục đưa event tới Notification Service. Service lưu notification như hiện tại.
5. Sau khi lưu thành công và áp dụng preference, Notification Service gửi WebSocket như hiện tại và đồng thời xếp việc gửi push qua FCM.
6. Mobile nhận push, dùng `notificationId`/data để mở đúng màn hình; inbox REST vẫn được tải để lấy nội dung chuẩn và trạng thái đọc.
7. Khi token đổi, mobile gọi lại API upsert. Khi đăng xuất, mobile yêu cầu gỡ đăng ký thiết bị khỏi user hiện tại.

FCM gửi tới **FCM token**, không gửi tới `installationId`. `installationId` là khóa nội bộ để BE nhận diện và cập nhật đúng lần cài app; mapping cần lưu là `userId → installationId → FCM token`.

## 4. API đề xuất

Hai API dưới đây đều cần `Authorization: Bearer <access-token>`. Không nhận `userId` từ request body hoặc URL; user luôn được lấy từ principal đã xác thực.

### 4.1 Đăng ký hoặc cập nhật token

```http
PUT /api/notifications/devices/{installationId}
Authorization: Bearer <access-token>
Content-Type: application/json
```

`installationId` là UUID do mobile tạo lần đầu, lưu cục bộ và dùng lại cho lần cài hiện tại. Cùng user + installation ID gọi nhiều lần phải idempotent.

Body Android:

```json
{
  "provider": "FCM",
  "platform": "ANDROID",
  "token": "<native FCM registration token>",
  "appVersion": "1.0.0"
}
```

Phản hồi đề xuất: `204 No Content`. Có thể trả `200` với `{ "installationId": "...", "active": true }` nếu client cần xác nhận.

Quy tắc:

- Tạo record nếu installation ID chưa tồn tại; nếu tồn tại trong phạm vi user thì cập nhật token, provider, platform, version và `lastRegisteredAt`.
- Token đổi trên cùng installation phải cập nhật record cũ, không để token cũ tiếp tục nhận push.
- `provider` chỉ nhận provider đã hỗ trợ (`FCM` trong phase Android); `platform` hiện nhận `ANDROID`.
- Validate UUID, trường bắt buộc, token không rỗng và giới hạn kích thước đầu vào hợp lý.
- Nếu một installation ID được đăng ký dưới tài khoản khác sau khi đổi tài khoản trên cùng thiết bị, record phải chuyển chủ sở hữu một cách xác định; không được để cả hai tài khoản cùng nhận push tới cùng lần cài app.

### 4.2 Gỡ hoặc vô hiệu hóa thiết bị

```http
DELETE /api/notifications/devices/{installationId}
Authorization: Bearer <access-token>
```

- Chỉ gỡ record thuộc user hiện tại; không để user xóa thiết bị của người khác.
- Trả `204 No Content` khi gỡ thành công. Gọi lặp lại nên tiếp tục trả thành công (idempotent).
- Có thể soft-delete bằng `active=false` và `disabledAt`; nếu soft-delete thì mọi truy vấn gửi FCM phải bỏ qua record đã tắt.

### 4.3 Endpoint không cần thêm

- Không cần endpoint `/send` cho mobile gọi để gửi push. Push phát sinh từ event/notification server-side.
- Không cần API đọc danh sách thiết bị nếu hiện chưa có màn hình quản lý thiết bị.
- Các API inbox, unread, read và WebSocket tiếp tục dùng hiện trạng.

## 5. Lưu trữ dữ liệu

Thêm migration Flyway cho bảng riêng trong `notification_db`, ví dụ `notification_devices`:

| Cột | Kiểu đề xuất | Ý nghĩa |
| --- | --- | --- |
| `id` | UUID, PK | ID record thiết bị do BE cấp |
| `user_id` | UUID, not null, index | Chủ tài khoản hiện tại |
| `installation_id` | UUID/string, not null | ID cài app do mobile cấp |
| `provider` | varchar/enum, not null | `FCM` ở phase Android |
| `platform` | varchar/enum, not null | `ANDROID` ở phase đầu |
| `token` | text, not null | Token đăng ký FCM; dữ liệu nhạy cảm |
| `token_hash` | varchar, optional unique/index | Hỗ trợ uniqueness/lookup nếu token được mã hóa |
| `app_version` | varchar, nullable | Hữu ích khi chẩn đoán tương thích |
| `active` | boolean, not null | Có được phép gửi push tới record này không |
| `created_at` | timestamptz, not null | Thời điểm tạo |
| `updated_at` | timestamptz, not null | Thời điểm cập nhật token/metadata |
| `last_registered_at` | timestamptz, not null | Lần cuối client đăng ký/refresh token |
| `disabled_at` | timestamptz, nullable | Thời điểm vô hiệu hóa |

Ràng buộc đề xuất: một record hoạt động cho mỗi `(user_id, installation_id, provider)`. Nếu token đã tồn tại trên record khác, xử lý chuyển/cập nhật có transaction để tránh gửi trùng hoặc gắn token cùng lúc với hai user. Có thể dùng unique token hash; không index token thô nếu không cần.

FCM token là thông tin định tuyến tới thiết bị: không trả token trong API inbox, không ghi token vào log, exception, tracing hoặc analytics. Hạn chế quyền đọc DB; cân nhắc mã hóa token at rest theo cơ chế quản lý secret hiện có.

Không cần tạo Firebase Database. Dùng database hiện có của Notification Service.

## 6. Tích hợp gửi FCM

- Tạo adapter/service riêng, ví dụ `PushSender` + `FcmPushSender`, để consumer không phụ thuộc trực tiếp SDK Firebase. Điều này giữ đường mở cho APNs/provider khác sau này.
- Dùng Firebase Admin SDK Java tương thích với phiên bản Spring Boot của repo, hoặc FCM HTTP v1 nếu BE có chuẩn HTTP client riêng. Ưu tiên Admin SDK để quản lý OAuth/service-account credentials an toàn.
- Cấu hình `firebase.project-id` và credentials qua Config/secret manager hoặc workload identity phù hợp môi trường chạy. Không commit service-account JSON, không nhúng credential vào image, không gửi credential FCM xuống mobile.
- Không gọi FCM trong transaction DB đang lưu notification và không để lỗi FCM rollback/làm mất notification đã lưu.
- Fan-out tới tất cả token active của recipient. Gửi theo lô có giới hạn, timeout, rate limit và metric. Xử lý nhiều thiết bị trên một tài khoản.
- Mọi nguồn notification đang có trong Notification Service (community, grading/subscription nếu vẫn bật) cần đi qua cùng dispatch mechanism; tránh chỉ thêm push cho một consumer rồi bỏ sót loại notification khác.

### 6.1 Payload

Notification payload ngắn, không chứa nội dung nhạy cảm:

```json
{
  "notification": {
    "title": "Có hoạt động mới trong cộng đồng",
    "body": "Mở IELTSPath để xem thông báo."
  },
  "data": {
    "notificationId": "<notification UUID>",
    "eventType": "community.post-commented.v1",
    "postId": "<UUID or empty>",
    "commentId": "<UUID or empty>"
  }
}
```

FCM `data` dùng giá trị chuỗi. Mobile dùng `notificationId` để mở inbox/notification; nếu deep-link trực tiếp tới post thì chỉ gửi đủ ID cần thiết và vẫn tải nội dung từ API có xác thực. Không đẩy nội dung riêng tư của bài viết hoặc bình luận vào lock screen.

## 7. Preferences và hành vi khi app foreground

- Tôn trọng preferences hiện có của Notification Service. Khi một event bị preference tắt, giữ đúng hành vi hiện tại: không lưu notification và không gửi WebSocket; đồng thời không gửi push.
- Preferences hiện là bật/tắt theo `eventType` cho notification nói chung. Chưa cần API preference mới nếu người dùng chấp nhận cùng lựa chọn áp dụng cho inbox và push.
- Nếu sản phẩm muốn giữ notification trong inbox nhưng tắt push cho một loại, mở rộng hợp đồng preferences riêng thành các kênh `inApp`/`push`; không đổi nghĩa `enabled` hiện tại một cách âm thầm.
- Mobile cần quyết định cách hiển thị khi app foreground để tránh hiện hai banner cùng lúc (WebSocket + native notification). Push không thay thế WebSocket trong app đang mở.

## 8. Retry, token lỗi và tính bền vững

- Push failure không được xóa notification, giảm unread sai hoặc làm RabbitMQ event bị mất.
- Retry lỗi tạm thời như network error, 429, 5xx với exponential backoff + jitter và giới hạn số lần; hết lượt thì DLQ/parking hoặc retry queue theo chuẩn Notification Service.
- Với FCM token invalid/unregistered (`UNREGISTERED` hoặc lỗi tương ứng được xác nhận là token không còn hợp lệ), deactivate đúng token đó. Không deactivate token chỉ vì payload lỗi (`INVALID_ARGUMENT`) trước khi xác minh payload.
- Giữ dedupe theo notification/event ID hiện có. Với push delivery retry, ghi delivery status/attempt để việc redelivery không nhân đôi notification inbox. Chấp nhận FCM không cung cấp exactly-once display: retry sau timeout có thể làm client nhận lặp; mobile nên dedupe xử lý điều hướng bằng `notificationId`.
- Dùng timeout và circuit breaker/bulkhead phù hợp để outage FCM không làm nghẽn consumer xử lý inbox/WebSocket.
- Metrics tối thiểu: số push queued/sent/failed/retried/deactivated; chỉ log notification ID, device record ID, loại lỗi và attempt. Không log token hay payload riêng tư.

## 9. Phía mobile cần phối hợp

Đây không phải phần BE tự làm, nhưng cần thống nhất API trước khi mobile tích hợp:

- Thêm `expo-notifications` đúng phiên bản Expo SDK 58, cấu hình config plugin và tạo development build riêng. Expo Go không dùng để kiểm thử remote push.
- Android tạo notification channel trước khi lấy token/xin quyền; xin quyền Android 13+ vào thời điểm có ngữ cảnh phù hợp.
- Sau khi user đăng nhập và được cấp quyền, mobile lấy native FCM token và gọi `PUT` trên; lắng nghe token refresh và gọi lại.
- Trước khi xóa session khi đăng xuất, mobile gọi `DELETE` nếu mạng còn khả dụng. Nếu API lỗi, đăng xuất vẫn phải hoàn tất và backend cần có cơ chế dọn token invalid.
- Xử lý tap trên notification để mở màn hình tương ứng; sau đó refetch inbox/unread từ REST.
- Không đăng ký token trong Expo Go để gửi vào Firebase production. Test bằng development/preview build có package ID, Firebase app và FCM credentials tương ứng.

## 10. Mở rộng iOS sau này

Phase đầu chỉ cần `ANDROID + FCM`. Giữ cột `provider` và `platform` để mở rộng sau.

Nếu chọn Firebase cả iOS, iOS app cần FCM SDK/client token mapping, Apple Push Notification key (APNs) trong Firebase và push entitlement/signing hợp lệ. Có thể dùng FCM làm sender xuyên nền tảng khi client iOS được cấu hình đúng; nếu dùng native APNs token thì BE phải route bằng APNs provider. Không coi FCM token Android và APNs token iOS là cùng loại.

## 11. Bảo mật và quyền riêng tư

- API đăng ký/gỡ thiết bị yêu cầu access token hợp lệ; kiểm tra ownership theo principal, không tin user ID từ client.
- Không cung cấp API public để gửi arbitrary message tới token.
- FCM service account chỉ ở môi trường BE, secret manager hoặc workload identity; xoay vòng được và có quyền tối thiểu.
- Token không xuất hiện trong response chung, logs, tracing, crash reports hoặc support exports.
- Payload lock screen chỉ chứa nội dung tối thiểu; notification detail lấy từ REST sau khi user đăng nhập.
- Khi người dùng logout, xóa tài khoản hoặc thu hồi push, vô hiệu hóa mapping thiết bị liên quan theo chính sách retention hiện có.

## 12. Kiểm thử và tiêu chí nghiệm thu

### Automated

- Migration tạo bảng/constraint trên DB test.
- `PUT` yêu cầu auth; user không thể tạo/xóa device cho user khác.
- Upsert lặp lại không tạo bản ghi trùng; token refresh cập nhật record; cùng installation đăng nhập tài khoản khác không để tài khoản cũ nhận push.
- `DELETE` owner-scoped, idempotent; xóa một thiết bị không ảnh hưởng thiết bị khác của user.
- Consumer vẫn lưu notification và gửi WebSocket khi FCM tắt/lỗi.
- Push chỉ xếp sau khi notification lưu thành công và preference cho phép.
- FCM lỗi tạm thời được retry; token `UNREGISTERED` bị deactivate; lỗi payload không xóa hàng loạt token.
- Mock Firebase Admin SDK/provider trong unit/integration tests; automated test không gửi thông báo thật.

### Manual trên Android thật

- Cài development/preview build, đăng nhập, cấp quyền; xác minh record thiết bị xuất hiện với user đúng.
- Gửi sự kiện test community và grading được hỗ trợ khi app foreground, background và killed; notification tới đúng thiết bị.
- Nhấn notification mở đúng luồng; inbox REST có đúng record và unread count nhất quán.
- Tắt permission ở Android Settings; app vẫn hoạt động, inbox không mất.
- Đăng xuất rồi phát event mới; thiết bị đó không còn nhận push của tài khoản cũ.
- Test hai thiết bị cho cùng user, refresh token và FCM credentials sai/thiếu.

**Chỉ nghiệm thu khi** inbox và WebSocket hiện tại không regression, push gửi tới đúng user/device, invalid token được dọn, và lỗi FCM không làm mất notification bền vững.

## 13. Thứ tự triển khai BE đề xuất

1. Chốt provider phase đầu (`FCM` Android), body/response của hai API và cách tạo/lưu `installationId`.
2. Thêm Flyway migration, entity/repository và owner-scoped device API.
3. Cấu hình Firebase project/FCM HTTP v1 credentials bằng secret manager/workload identity.
4. Thêm `FcmPushSender` adapter và push delivery path dùng sau khi Notification Service lưu notification.
5. Thêm retry, invalid-token cleanup, observability và test suite.
6. Triển khai Notification Service + Gateway (nếu route mới cần cấu hình), xác minh migrations/health.
7. Cấp API contract cho mobile; mobile tích hợp token registration và tạo development build để E2E.

## Tài liệu tham khảo

- BE contract hiện tại: `backend/docs/contracts/community-events-v1.md`.
- Notification Service hiện tại: `backend/services/notification-service/`.
- Expo SDK 58 notifications: <https://docs.expo.dev/versions/v58.0.0/sdk/notifications/>.
- Expo native FCM/APNs tokens: <https://docs.expo.dev/push-notifications/sending-notifications-custom/>.
- Firebase server environment/Admin SDK: <https://firebase.google.com/docs/cloud-messaging/server-environment>.
- Firebase Admin SDK send: <https://firebase.google.com/docs/cloud-messaging/send/admin-sdk>.
