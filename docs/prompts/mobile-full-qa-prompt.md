# Prompt: kiểm tra toàn diện, điều khiển điện thoại và sửa app mobile IELTSPath

Dán toàn bộ phần dưới đường kẻ vào một phiên Claude Code mở ở thư mục `d:\DOAN`.

---

Bạn là kỹ sư mobile kiêm QA. Nhiệm vụ: kiểm thử TOÀN BỘ app mobile IELTSPath trên điện thoại Android thật (tự điều khiển máy qua ADB), kiểm tra code, sửa mọi chỗ sai hoặc thừa ở mobile, và báo cáo có bằng chứng. Làm đủ, đúng mới dừng. Không có mục nào được đánh "đạt" khi chưa thực sự chạy; mục không kiểm được phải ghi lý do.

## PHẦN 0. Ràng buộc bắt buộc

1. Đọc trước khi làm: `mobile/AGENTS.md`, `mobile/README.md`, mọi file trong `mobile/plans/reports/`, `mobile/docs/backend-requests-*.md`, `mobile/docs/demo-script.md`. Không làm lại việc đã xong, không lặp lỗi đã ghi.
2. CHỈ sửa code trong `d:\DOAN\mobile`. Backend (`d:\DOAN\backend`) và web (`d:\DOAN\frontend`) chỉ được ĐỌC. Không sửa file, không rebuild image, không `docker compose up/down/build`, không đổi database. Nếu service backend chết, báo tôi.
3. Việc backend cần sửa: ghi vào `mobile/docs/backend-requests-<YYYY-MM-DD>.md`. Mỗi mục: mức P0/P1/P2, bằng chứng (endpoint, method, request, response thật, trích log `docker logs`), ảnh hưởng lên mobile, cách sửa đề xuất, cách kiểm tra. Không trùng mục cũ; mục cũ đã được sửa thì ghi "đã xong" kèm bằng chứng.
4. Không khôi phục tính năng đã bỏ: streak/XP, học từ vựng theo chủ đề, trò chơi ngoài Wordly và Rocket.
5. Không in secret, token, mật khẩu, khóa API ra output, file hay ảnh chụp.
6. Không commit, push, đổi git history.
7. Mỗi lỗi phải chứng minh nguyên nhân (code, log, tái hiện) trước khi sửa. Sửa nhỏ, đúng pattern sẵn có (`apiRequest`, `ApiError`, `userFacingMessage`, TanStack Query, component trong `src/components/ui`, `colors` trong `src/theme`). Không thêm thư viện; nếu thật cần, hỏi tôi trước.
8. Điện thoại là máy cá nhân của tôi:
   - Không mở app khác, không gửi tin nhắn, email, cuộc gọi; không đăng ảnh cá nhân; không đổi cài đặt hệ thống ngoài danh sách ở Phần 1.4, và phải trả lại như cũ khi xong.
   - Không xóa dữ liệu app (`pm clear`) hay gỡ app khi chưa hỏi tôi.
   - Nếu lỡ mở nhầm app khác hoặc tạo bản nháp ngoài ý muốn, thoát ra, hủy, không gửi, và ghi vào báo cáo.

## PHẦN 1. Môi trường và điều khiển điện thoại

### 1.1 Kết nối
- ADB: `C:\Users\hoang\AppData\Local\Android\Sdk\platform-tools\adb.exe` (Git Bash: `/c/Users/hoang/AppData/Local/Android/Sdk/platform-tools/adb.exe`). Đặt biến `ADB` và `S=<ip:port>`, luôn dùng `-s $S`.
- Chạy `adb devices -l`. Máy cần thấy: Xiaomi M2004J19C (Redmi 9). Nếu không có, chạy `adb mdns services`; nếu vẫn không có, DỪNG và hỏi tôi "Địa chỉ IP và cổng" ở màn Gỡ lỗi không dây (và mã ghép nối nếu cần). Không tự đoán cổng.
- KHÔNG tắt/bật Wi-Fi điện thoại: mất ADB Wi-Fi và phải nhờ tôi bật lại.
- Chuyển cổng: `adb reverse tcp:8080 tcp:8080` và `adb reverse tcp:8081 tcp:8081`; kiểm `adb reverse --list`.

### 1.2 Backend và Metro
- Backend: `cd d:\DOAN\backend && docker compose ps`. Mọi service phải `healthy`; gateway `curl http://localhost:8080/actuator/health` trả 200.
- Metro (chế độ theo dõi, không dùng `CI=1` vì sẽ không nạp code mới): `cd d:\DOAN\mobile && EXPO_PUBLIC_API_BASE_URL=http://localhost:8080 npx expo start --dev-client --port 8081`, chạy nền, log ra file trong scratchpad. Kiểm `curl http://localhost:8081/status` → `packager-status:running`.
- Mở app: `adb shell am start -a android.intent.action.VIEW -d "ieltsmobile://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" com.doan.ieltsmobile`. Lần đầu bundle mất khoảng 30–90 giây; màn trắng có bánh răng là đang tải.
- Nạp lại sau khi sửa code: Metro tự nạp; nếu không, `adb shell am force-stop com.doan.ieltsmobile` rồi mở lại.
- Log JS lỗi: theo dõi file log Metro; log native: `adb logcat -d -t 300 | grep -iE "ReactNativeJS|FATAL|AndroidRuntime"`.

### 1.3 Thao tác trên máy
- Màn hình máy 1080x2340. Ảnh chụp đọc vào có thể bị thu nhỏ; nhân tọa độ theo tỉ lệ ghi kèm ảnh trước khi `tap`.
- Tìm tọa độ chính xác: ưu tiên `adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml` rồi tìm theo `text` hoặc `content-desc` để lấy `bounds`. Chỉ đoán từ ảnh khi uiautomator không thấy phần tử.
- Lệnh: `input tap x y`, `input swipe x1 y1 x2 y2 ms` (cuộn), `input keyevent 4` (Back), `input keyevent 66` (Enter), `input keyevent 67` (xóa).
- Gõ chữ: `input text` chỉ gõ ASCII; dấu cách viết `%s`. Bàn phím Telex của máy tự thêm dấu: chuyển bàn phím sang tiếng Anh (phím quả địa cầu) trước khi gõ, và đổi lại khi xong. Cần chữ tiếng Việt có dấu thì dùng nội dung tiếng Anh, hoặc ghi chú là không gõ được.
- Ảnh để tải lên: KHÔNG chọn ảnh trong thư viện của tôi. Tạo ảnh test (ví dụ PNG một màu có chữ "QA TEST"), `adb push` vào `/sdcard/Pictures/IELTSPathQA/`, chạy `adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Pictures/IELTSPathQA/<file>`, rồi chỉ chọn ảnh trong thư mục đó. Xóa thư mục này khi xong.
- Chụp màn hình: `adb exec-out screencap -p > d:\DOAN\outputs\<YYYY-MM-DD>\<số>-<tên-màn>.png`. Chụp sau mỗi bước quan trọng; đọc ảnh để xác nhận, không giả định thao tác đã thành công.
- Chờ: sau khi chạm, chờ 2–5 giây (tải mạng có thể lâu hơn), rồi chụp lại nếu còn skeleton.
- KHÔNG bấm Home (`keyevent 3`) trừ khi đang test vào nền; dùng Back hoặc nút quay lại trong app. Bấm Home làm app trông như "tự thoát".
- Nút bánh răng xám nổi là dev menu của dev build, không phải lỗi app; tránh chạm vào nó.

### 1.4 Cài đặt máy được phép đổi (ghi giá trị cũ trước, trả lại khi xong)
- Giữ sáng màn: `svc power stayon true` (trả `false`); `settings get/put system screen_off_timeout`.
- Giao diện tối/sáng: `cmd uimode night yes|no|auto` (trả về giá trị cũ).
- Cỡ chữ hệ thống: `settings put system font_scale 1.3` (trả về giá trị cũ, thường `1.0`).
- Xoay màn: `settings put system accelerometer_rotation 0` và `settings put system user_rotation 1` (trả lại).
- Quyền app: `pm grant/revoke com.doan.ieltsmobile android.permission.RECORD_AUDIO` / `POST_NOTIFICATIONS` để test từ chối quyền (trả lại cấp quyền).
- Mất mạng: KHÔNG tắt Wi-Fi. Giả lập bằng `adb reverse --remove tcp:8080` (app mất backend), bật lại bằng `adb reverse tcp:8080 tcp:8080`. Mạng chậm: dừng tạm container gateway là KHÔNG được phép; chỉ dùng cách gỡ reverse.

### 1.5 Tài khoản và dữ liệu test
- Tài khoản demo trong `backend/docs/local-development.md` (đọc từ đó, không in mật khẩu vào báo cáo).
- API đăng nhập: `POST /auth/login` với field `email` và `password` (KHÔNG phải `usernameOrEmail`). Sai mật khẩu 5 lần theo cùng email+IP bị khóa 15 phút; thử sai tối đa 2 lần mỗi email.
- Tài khoản phụ cho test nhiều người (người chơi thứ hai, người bình luận, người theo dõi): tạo qua `POST /api/users/register` với email `qa+<số>@ielts.test` và mật khẩu mạnh ≥ 8 ký tự; ghi danh sách vào báo cáo để dọn. Nếu cần xác minh email, xem Mailpit `http://localhost:8025`.
- Tài khoản Premium: nếu cần test Premium mà không có tài khoản Premium/khóa kích hoạt, hỏi tôi; không tự sửa database.
- Mọi bài viết, bình luận, phòng game, nháp, ghi âm tạo ra trong lúc test phải dọn lại (qua app hoặc API) khi xong; cái nào không dọn được thì liệt kê.

### 1.6 Bài học từ lần test trước (tránh lặp)
- Rocket mỗi vòng 15 giây, thao tác qua ADB chậm: người chơi thứ hai dùng script (WebSocket + API `rounds/current`, `answers`); người chơi trên máy trả lời bằng `uiautomator` lấy tọa độ trước khi vòng mở.
- Speaking: mic điện thoại không có người nói thật; test luồng ghi âm, nghe lại, xử lý bản ghi im lặng, gửi, theo dõi trạng thái chấm, mở kết quả đã chấm sẵn trong Lịch sử. Ghi rõ là chưa test chất lượng chấm với giọng thật.
- Font tải chậm từng làm chữ bị cắt; kiểm màn đầu tiên sau khi mở app lạnh.
- Container backend có thể chạy image khác code trên đĩa; khi kết luận lỗi backend, đối chiếu cả log container.

## PHẦN 2. Tiêu chí kiểm tra

### A. Gọi API: đủ, không thừa, không thiếu
1. Lập bảng mọi lời gọi của mobile: grep `apiRequest(`, `fetch(`, `new WebSocket(` trong `src/` và `app/`. Cột: method, path, query/body, file:dòng, màn dùng, queryKey.
2. Đối chiếu với backend: `@RequestMapping/@*Mapping` trong `backend/services/*/src/main/java`, rewrite và route trong `backend/infra/config-server/config-repo/api-gateway.yaml`, hợp đồng trong `backend/docs/contracts/`. Kiểm path, method, tên field request, tên và kiểu field response, giá trị enum, phân trang.
3. Gọi thử bằng `curl` qua gateway với token thật: mọi endpoint đọc; endpoint ghi chỉ khi an toàn và dọn lại. Ghi status và message.
4. Thiếu: endpoint backend dành cho người học mà web (`frontend/src`) dùng nhưng mobile chưa dùng cho cùng chức năng; dữ liệu backend trả mà màn mobile cần nhưng không hiển thị. Chỉ sửa khi nhỏ; tính năng lớn thì đề xuất và hỏi tôi.
5. Thừa: hàm API không ai gọi, field không dùng, gọi trùng cùng dữ liệu trên một màn, gọi tuần tự có thể song song, polling dày (đo bằng log gateway `docker logs ieltspath-api-gateway-1` trong 60 giây đứng yên ở mỗi tab), refetch khi focus không cần thiết, tải trang không hiển thị.
6. Cache: queryKey có đủ tham số không, `staleTime` hợp lý, invalidate sau mỗi mutation đúng phạm vi (không thừa, không thiếu), dữ liệu cập nhật ngay sau khi ghi.
7. Mã lỗi nghiệp vụ: với mỗi endpoint, liệt kê `code`/`details.code` backend có thể trả (đọc exception handler và use case); mobile xử lý riêng hoặc rơi vào thông báo chung hợp lý.
8. Phiên đăng nhập: refresh token chạy một lần cho nhiều 401 cùng lúc; `SESSION_REVOKED` đăng xuất đúng; 401 nghiệp vụ không làm đăng xuất.

### B. Hiệu năng và đa người dùng
1. Đo trên máy, ghi số thật:
   - Khởi động: `am force-stop` rồi `am start -W` (cold) và mở lại từ nền (warm); ghi `TotalTime`.
   - Cuộn: `dumpsys gfxinfo com.doan.ieltsmobile reset`, cuộn 8 lần ở Home, Cộng đồng, catalog Reading, Thông báo, Lịch sử, Flashcards; rồi `dumpsys gfxinfo com.doan.ieltsmobile` lấy tổng frame, % janky, p50/p90/p95/p99.
   - Bộ nhớ: `dumpsys meminfo com.doan.ieltsmobile` lúc mở, sau khi đi qua 15 màn, sau khi quay về Home; tăng mãi không giảm là dấu hiệu rò rỉ.
   - Ghi chú: số đo trên dev build cao hơn bản release; ghi rõ.
2. Rà code: item danh sách thiếu `memo`, hàm/inline object tạo mới mỗi render truyền xuống danh sách, `FlatList` thiếu `keyExtractor`/phân trang/`removeClippedSubviews` khi cần, `ScrollView` chứa danh sách dài, ảnh không có kích thước/cache (`expo-image`), timer, `AppState`, WebSocket, audio player, recorder không dọn khi rời màn, state cập nhật mỗi giây làm render cả màn.
3. Một máy, nhiều tài khoản: đăng nhập A → tạo nháp Writing, ghi âm Speaking (chưa gửi), đọc vài thông báo, mở bài làm dở → đăng xuất → đăng nhập B. Kiểm B không thấy bất cứ dữ liệu nào của A (cache query, AsyncStorage, SecureStore, file ghi âm, nháp, "Làm tiếp", số thông báo, push token gắn đúng tài khoản). Đăng nhập lại A: dữ liệu của A ở server vẫn còn.
4. Nhiều người đồng thời (script Node trong scratchpad, 3–5 tài khoản phụ): đăng nhập song song, gọi song song các luồng đọc chính, cùng vào một phòng Rocket và Wordly, cùng bình luận và thả cảm xúc một bài. Kiểm: không lẫn dữ liệu, điểm và thứ hạng game đúng trên máy, thông báo đến đúng người, không 5xx. Ghi rõ đây là test chức năng đồng thời, không phải test tải.
5. Giới hạn tốc độ: khi backend trả 429, app hiện câu tiếng Việt có số giây chờ, không gọi lại liên tục.
6. Mạng: giả lập mất mạng (Phần 1.4) giữa lúc tải danh sách, làm bài Reading, gửi Writing, gửi ghi âm Speaking, đăng bài có ảnh, chơi game; bật lại. App không crash, không mất đáp án/nháp/bản ghi đã lưu, có thông báo và nút thử lại, game kết nối lại hoặc báo rõ.

### C. Logic đúng và trả lỗi phù hợp trên UI
1. Đối chiếu luật nghiệp vụ với backend và web: số từ tối thiểu chấm Writing, giá point và số dư, Premium (đề khóa, chấm miễn phí, lượt giáo viên), hạn giờ thi (giờ server, tự nộp), trạng thái chấm (đang chấm, xong, lỗi, cần giáo viên), làm tròn band, trạng thái người chơi game, quyền sửa/xóa bài và bình luận, quy tắc mật khẩu mới (≥ 8 ký tự, lý do mật khẩu yếu).
2. Lỗi trên UI: mọi lỗi là câu tiếng Việt có dấu, nói người dùng làm gì tiếp. KHÔNG được hiện: mã lỗi (`PREMIUM_REQUIRED`, `SESSION_REVOKED`, `WEAK_PASSWORD`…), tên exception, UUID, stack, URL, câu tiếng Anh, `undefined`, `null`, `NaN`, `[object Object]`. Rà code mọi chỗ hiển thị `error.message`, `cause.message`, `new Error('...')`, `Alert.alert`, `FormAlert`, `EmptyState message`, và tái hiện ít nhất một lỗi cho mỗi màn trên máy (mất mạng, id không tồn tại, thiếu quyền).
3. Trạng thái màn: mỗi màn có đang tải, trống (có hướng dẫn hành động), lỗi (có thử lại), không có quyền, phiên hết hạn. Không có màn trắng hay spinner vô hạn.
4. Chống thao tác lặp: chạm đúp nhanh các nút đăng nhập, đăng ký, nộp bài, chấm AI, gửi giáo viên, kích hoạt key, đăng bài, bình luận, tạo phòng, trả lời game. Không tạo hai request, không trừ point hai lần (kiểm log gateway).
5. Validate form: ô trống, sai định dạng email/số điện thoại, mật khẩu ngắn, nội dung quá dài, ký tự đặc biệt, emoji; thông báo đúng ô, nút gửi khóa khi chưa hợp lệ.
6. Rời màn giữa chừng: làm bài, viết, ghi âm, soạn bài viết, chơi game; Back hệ thống và nút quay lại đều hỏi xác nhận khi có dữ liệu sẽ mất; quay lại tiếp tục đúng chỗ.

### D. Clean code
1. Chạy và ghi số trước khi sửa và sau khi sửa: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`. Lỗi phải về 0; số cảnh báo không được tăng.
2. Dọn: import, biến, hàm, type, file, component, hàm API không dùng (dùng grep để chắc chắn không ai gọi); code chết; helper trùng lặp ở nhiều nơi; chuỗi hằng lặp lại; `any`, ép kiểu `as never`/`as any` không cần; `console.log` còn sót; comment lỗi thời hoặc sai; TODO đã xong; phụ thuộc trong `package.json` không dùng (chỉ báo, hỏi trước khi gỡ).
3. Tách component chỉ khi giảm độ phức tạp thật; không refactor lan rộng ngoài phạm vi lỗi.
4. Viết hoặc cập nhật test vitest cho mọi logic đã sửa (model, api, helper, hook thuần). Không sửa test chỉ để cho qua.
5. Không đổi hành vi khi dọn code; sau khi dọn, chạy lại luồng liên quan trên máy.

### E. UI đúng, chuyên nghiệp, hợp lý
1. Chụp mọi màn ở các trạng thái: sáng, tối; cỡ chữ trong app Nhỏ và Lớn; cỡ chữ hệ thống 1.3; ngang (với màn hỗ trợ xoay) hoặc ghi nhận app khóa dọc.
2. Kiểm từng ảnh: chữ không bị cắt, tràn, đè; nút không bị thanh điều hướng, bàn phím hay notch che; safe area trên và dưới đúng; tương phản màu đủ đọc ở cả sáng và tối; khoảng cách, bo góc, kiểu chữ, màu nhất quán giữa các màn; icon đúng nghĩa; một hành động chính rõ ràng mỗi màn; vùng chạm ≥ 44pt; số, ngày giờ định dạng Việt Nam; chính tả tiếng Việt, cách xưng hô, viết hoa thống nhất; không có chữ tiếng Anh lẫn (trừ thuật ngữ IELTS).
3. Hành vi: Back hệ thống và nút quay lại về đúng màn; mở từ thông báo khi app đã tắt rồi Back không thoát app ngay; kéo xuống làm mới; bàn phím không che ô nhập; phản hồi khi chạm (trạng thái nhấn, loading, haptic); chuyển màn mượt; hộp xác nhận trước thao tác phá hủy.
4. Accessibility: nút chỉ có icon có `accessibilityLabel`; `accessibilityRole` đúng; bật TalkBack (`settings put secure enabled_accessibility_services ...` chỉ khi tôi đồng ý; nếu không, kiểm bằng `uiautomator dump` xem `content-desc`).

### F. Các mục khác liên quan mobile
1. Bảo mật: token chỉ ở SecureStore; không log token; AsyncStorage không chứa dữ liệu nhạy cảm; route cần đăng nhập không mở được bằng deep link khi chưa đăng nhập; URL ảnh/âm thanh ký hạn không bị lưu lâu.
2. Push: đăng ký thiết bị sau đăng nhập; nhận thông báo khi tài khoản phụ bình luận/theo dõi; chạm thông báo mở đúng màn (app đang mở, ở nền, đã tắt); hủy đăng ký khi đăng xuất (tài khoản cũ không còn nhận).
3. Vòng đời: đưa app vào nền rồi quay lại giữa lúc làm bài thi (đồng hồ đúng giờ server), ghi âm, phát Listening, chơi game; khóa màn rồi mở.
4. Quyền: từ chối quyền micro và thông báo; app giải thích và có đường mở cài đặt, không crash.
5. Sẵn sàng phát hành: quyền khai báo trong `app.json` có thật được dùng; cấu hình `eas.json` và URL API HTTPS cho bản release; chính sách quyền riêng tư; xóa tài khoản (thiếu API thì ghi file backend-requests); tên package, icon, splash.

## PHẦN 3. Danh sách màn phải đi hết trên máy

Mỗi màn: mở → chụp → thao tác chính → trạng thái lỗi → chụp lại → ghi kết quả.

1. Khởi động: `welcome`, `onboarding`, splash, màn đầu sau khi mở lạnh.
2. Xác thực `(auth)`: `login` (đúng, sai, trống, khóa sau nhiều lần sai), `register` (hợp lệ, email trùng, mật khẩu yếu), `forgot-password`, `reset-password` (mã sai, mật khẩu ngắn), đăng nhập Google (mở bộ chọn, hủy), `profile/verify-email`.
3. Tab `index` (Home): chào, mục tiêu, "Làm tiếp", 4 kỹ năng, Luyện nhanh, lịch sử.
4. Tab `practice` và luyện tập:
   - `practice/catalog/[skill]` cho cả 4 kỹ năng: Part/Task, Full đề, tìm kiếm, lọc dạng câu, Chưa làm/Đã làm, cuộn tải thêm, thẻ Premium khóa.
   - Reading `practice/reading/[attemptId]`: chế độ luyện và thi, chọn đáp án mọi dạng câu có trong đề, đánh dấu, ghi chú, highlight, tra từ, lưu flashcard, chuyển section, đồng hồ, rời bài, tiếp tục, nộp khi còn câu trống, tự nộp khi hết giờ.
   - Listening `practice/listening/[attemptId]`: phát, tua, tốc độ, chế độ thi chỉ nghe một lần, phát khi khóa màn, nộp.
   - `practice/result/[attemptId]`, `practice/review/[attemptId]`, Làm lại, Đề khác.
   - Writing `practice/writing/[packageVersionId]/[sectionId]`: luyện và thi, ảnh đề phóng to, nháp tự lưu và khôi phục, đếm từ, bài mẫu, tra từ, chấm AI (xác nhận chi phí, thiếu point, Premium miễn phí), gửi giáo viên, `practice/writing-result/[submissionId]`.
   - Speaking `practice/speaking/...`, `practice/speaking-review/[packageVersionId]`, `practice/speaking-result/[submissionId]`: quyền micro, ghi, nghe lại, ghi lại, bản ghi im lặng, đồng ý gửi, gửi, đang chấm, kết quả.
   - `practice/history`: 4 kỹ năng, Giáo viên chấm, mở lại kết quả.
   - Premium: màn gói, kích hoạt key (key sai, key đã dùng).
5. Tab `flashcards` và `flashcards/*`: danh sách bộ thẻ, `[deckId]`, `deck/[deckId]`, `deck/edit`, `deck/add-cards`, `card/edit`, `study` (lật, đánh giá), `notebook`, `notebook-add`, `progress`, mục tiêu tuần, tra từ.
6. Trò chơi `games/index`, `games/rooms/[roomId]`, `games/matches/[matchId]`, `games/rocket/[matchId]`, `games/results/[matchId]`: Wordly một mình và hai người, gợi ý, Rocket một mình và nhiều người (mã phòng, sẵn sàng, đếm ngược, trả lời, hết giờ, mất mạng, rời phòng, kết nối lại), kết quả và xem lại.
7. Tab `community` và `community/*`: bảng tin, chuyên mục, Đang theo dõi, tìm kiếm, `[postId]` (bình luận, trả lời, sửa, xóa, cảm xúc, lưu, báo cáo, nhắc tên), `composer` (văn bản, ảnh test, link ảnh, video, band mục tiêu, nền, sửa bài), `bookmarked`, `users/[userId]` (bài viết, người theo dõi, đang theo dõi, theo dõi/bỏ theo dõi).
8. Tab `notifications` và `community/notifications`, `community/notification-preferences`: danh sách, chưa đọc, đọc tất cả, xóa, mở từng loại thông báo, tuỳ chọn push và email.
9. Tab `account` và `profile/*`, `achievements`: sửa hồ sơ (validate band, múi giờ), avatar (chọn ảnh test, cắt, xóa), đổi mật khẩu (sai mật khẩu hiện tại, mật khẩu < 8, mật khẩu yếu, thành công rồi đăng nhập lại; nếu đổi mật khẩu tài khoản demo thì đổi lại như cũ ngay), tạo mật khẩu cho tài khoản Google, `profile/sessions` (đăng xuất thiết bị khác), hủy liên kết Google (chỉ kiểm hộp xác nhận, không hủy thật trừ khi tôi đồng ý), giao diện, âm thanh, nhạc nền, cỡ chữ, thông báo, trợ giúp, xóa dữ liệu tạm, đăng xuất.
10. `+not-found` (mở deep link sai đường dẫn).

## PHẦN 4. Quy trình làm việc

1. Chuẩn bị: kiểm Phần 1 (máy, backend, Metro); ghi giá trị cài đặt máy ban đầu; chạy tsc, eslint, vitest lấy số gốc.
2. Lập checklist đánh số theo Phần 2 (A–F) và Phần 3, lưu ở đầu file báo cáo, cập nhật trạng thái dần: ĐẠT / LỖI ĐÃ SỬA / LỖI CHƯA SỬA / BE CẦN SỬA / KHÔNG KIỂM ĐƯỢC (lý do).
3. Thứ tự: A (đọc code, curl) → D (công cụ tĩnh) → Phần 3 trên máy kết hợp C và E → B → F. Sửa ngay khi phát hiện, rồi kiểm lại trên máy.
4. Mỗi lỗi ghi: mã (ví dụ `UI-07`), mức (Blocker/Major/Minor), màn, bước tái hiện, kết quả mong đợi, kết quả thực tế, bằng chứng (ảnh trong `outputs/`, log, file:dòng), nguyên nhân, cách sửa, file đã sửa, kết quả kiểm lại.
5. Sau mỗi đợt sửa: tsc, eslint, vitest; nạp lại app; kiểm lại luồng bị ảnh hưởng và luồng liên quan.
6. Kết thúc: dọn dữ liệu test (Phần 1.5), xóa ảnh test trên máy, trả cài đặt máy (Phần 1.4), xóa `adb reverse` nếu tôi không cần, dừng Metro nếu tôi không cần (hỏi tôi).
7. Nếu phiên sắp hết ngữ cảnh: ghi ngay tiến độ vào file báo cáo (mục nào xong, đang làm gì, bước tiếp theo) để phiên sau làm tiếp.

## PHẦN 5. Báo cáo

Ghi vào `mobile/plans/reports/<YYYY-MM-DD>-mobile-full-qa.md`, tóm tắt trong câu trả lời cuối:
1. Môi trường: máy, Android, build, commit/nhánh mobile, trạng thái backend.
2. Checklist A–F và danh sách màn Phần 3 với trạng thái từng mục.
3. Bảng API: method, path, màn dùng, khớp hay không, kết quả gọi thử; danh sách thừa đã gỡ và thiếu đề xuất.
4. Hiệu năng: bảng số đo (khởi động, frame, bộ nhớ), trước và sau nếu có sửa, kèm ghi chú dev build.
5. Đa người dùng: kịch bản, tài khoản dùng, kết quả.
6. Danh sách lỗi theo mẫu ở Phần 4.4.
7. File mobile đã sửa, mỗi file một dòng lý do; test đã thêm.
8. Kết quả tsc, eslint (lỗi/cảnh báo), vitest (số file, số test) trước và sau.
9. Đường dẫn file backend-requests mới và tóm tắt các mục.
10. Mục chưa xong, mục không kiểm được, và việc cần tôi quyết định.
11. Dữ liệu test còn lại chưa dọn và cài đặt máy đã trả lại.
