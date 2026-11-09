# Đối chiếu API Thẻ từ — 06/11/2026

Phạm vi: mobile. BE/FE không được sửa. Hôm nay vẫn học theo chủ đề từ vựng.

## API và nơi sử dụng

Prefix notebook: `/api/learning-support/flashcards/notebook`.

| API | Luồng mobile |
|---|---|
| GET/POST `/api/learning-support/decks`, GET/PUT/DELETE `/decks/{id}` | Danh sách, tạo, sửa, xóa bộ thẻ |
| GET/POST `/decks/{id}/items`, DELETE `/decks/{id}/items/{flashcardId}` | Xem, thêm, bỏ thẻ khỏi bộ |
| GET/POST `/api/learning-support/flashcards`, GET/PUT/DELETE `/flashcards/{id}` | Danh sách, tạo, sửa, xóa thẻ |
| POST `/flashcards/images` | Upload ảnh thẻ/ảnh bìa; lưu key, hiển thị URL trả về |
| GET `/flashcards/due` | Số thẻ đến hạn toàn tài khoản và ôn theo bộ/toàn thư viện |
| POST `/flashcards/{id}/reviews` | Gửi correct, requestId, sessionId; BE cập nhật lịch ôn |
| GET notebook `/entries` | Sổ từ, tìm kiếm, lọc mức độ/đến hạn/chủ đề/bộ từ, sắp xếp, tải thêm |
| POST notebook `/entries` | Thêm nghĩa từ từ kho vào sổ; dùng thao tác tạo/tra lại của BE |
| GET notebook `/saved` | Hiển thị Đã lưu khi tìm từ; chia batch tối đa 100 senseId |
| PUT notebook `/entries/{flashcardId}/level` | Đổi mức độ ghi nhớ; dùng requestId để retry |
| GET notebook `/summary` | Tổng quan sổ từ |
| GET/PUT notebook `/weekly-goal` | Xem/đổi mục tiêu tuần, kiểm tra giới hạn 10–1000 từ |
| GET notebook `/vocabulary-map` | Mở mục Bản đồ trình độ từ vựng |
| GET notebook `/topics-progress` | Tiến độ theo chủ đề; có thể giới hạn trong bộ từ hệ thống |
| GET notebook `/sets/{setId}/progress` | Chọn bộ từ hệ thống trong màn Tiến độ |
| GET notebook `/recent-result` | Kết quả phiên ôn gần nhất; 204 được hiển thị là chưa có dữ liệu |
| GET notebook `/achievements` | Mở Thành tích ôn từ |
| GET `/api/content/vocabulary/search` | Tra từ khi tạo thẻ/thêm vào sổ; debounce 350 ms |
| GET `/api/content/vocabulary/sets` | Bộ từ hệ thống trong bộ lọc tiến độ; tải thêm |
| GET `/api/content/vocabulary/lookup` | Phát âm khi ôn thẻ, theo helper phát âm hiện có |

Đường dẫn mới trong app: Thẻ từ → Sổ từ / Tiến độ. Sổ từ chứa từ có nguồn từ kho từ vựng; thẻ tự tạo vẫn ở Thẻ của tôi.

## Những lỗi đã xử lý

- Danh sách thẻ/bộ thẻ và màn chọn thẻ tải được các trang tiếp theo; dùng FlatList cho các danh sách này và Sổ từ.
- Các chỗ cần danh sách bộ thẻ đầy đủ dùng helper đọc hết trang, không dừng ở 50 bộ.
- Số thẻ đến hạn lấy `total` trực tiếp từ `/flashcards/due`, không cộng số của từng bộ gây trùng hoặc thiếu thẻ ngoài bộ.
- Thêm nhiều thẻ vào bộ bị lỗi một phần: giữ những thẻ thành công, chỉ chọn lại thẻ thất bại.
- Các phiên ôn có sessionId để BE gom kết quả gần nhất. Retry giữ requestId và đáp án gốc; chặn gửi đồng thời.
- Không refetch toàn thư viện sau mỗi câu làm ảnh hưởng phiên đang ôn; đánh dấu cache cũ và tải lại khi ra khỏi phiên.
- Đổi mức ghi nhớ/ôn thẻ/lưu thẻ làm cũ cache notebook và thành tích phù hợp.
- Chặn lưu màn chỉnh sửa khi chưa tải được bản ghi cũ để tránh vô tình tạo mới hoặc ghi đè thiếu dữ liệu.
- Thống kê/mục tiêu tuần dùng timezone từ thiết lập tài khoản; nếu chưa lấy được, dùng timezone thiết bị.

## Giới hạn xác minh

- Typecheck và 45 test (8 file) đạt tại thời điểm triển khai. Có kiểm tra batch 100 senseId, phân trang vượt 50 bộ, lỗi trang sau, giữ session/request ID khi retry, recent-result rỗng, timezone mục tiêu tuần.
- Các test upload hiện có dùng mock multipart; không chứng minh việc chọn ảnh/upload trên iPhone thật thành công.
- Kiểm tra readiness: Gateway HTTP 200/UP. Không phải kiểm thử endpoint xác thực bằng tài khoản thực.
- Notebook/flashcard progress không tự cộng XP/streak cho bài từ vựng Hôm nay. Hợp đồng cần BE cho luồng đó nằm ở `vocabulary-study-backend-contract.md`.
