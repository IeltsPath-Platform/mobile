# Hợp đồng API học từ vựng cho mobile

Cập nhật: 07/11/2026. Đối chiếu với code library-service trên nhánh `feat/mobile-vocabulary-study` (PR backend #155, chưa merge vào `main`) và community-service trên nhánh `feat/comment-reactions` (PR backend #154, chưa merge). Phần cảm xúc bình luận ở mục 5.12. Tên trường, kiểu dữ liệu và mã lỗi trong tài liệu này lấy trực tiếp từ các record và exception trong code. Ví dụ JSON dùng giá trị minh họa.

Nếu tài liệu và code lệch nhau, code là nguồn đúng. Báo lại cho dev backend để sửa tài liệu.

## 1. Tóm tắt

- Mobile học theo **unit** (bài nhỏ) trong một chủ đề. Server sinh các bước, chấm đáp án, mở khóa unit kế tiếp và lưu tiến độ. Mobile chỉ hiển thị và gửi đáp án.
- Mobile **không** tự tính XP, tim hay streak. Mọi số đó đến từ server.
- XP, cấp độ, streak và tim của mobile **tách biệt** với web. Làm bài trên web không đổi số trên mobile và ngược lại.
- Hồi tim và mua freeze trả bằng **Points** (ví điểm dùng chung với web).
- Gói Premium tăng số tim tối đa từ 5 lên 7.
- Ôn một flashcard cũng giữ streak mobile, nhưng không cộng XP.

## 2. Quy ước chung

**Gọi API:** tất cả qua gateway, cùng tiền tố `/api/...`.

**Xác thực:** các API học và `me/*` cần `Authorization: Bearer <access token>`. Hai API đọc nội dung unit là công khai, gọi không cần token.

**requestId:** mỗi thao tác ghi (bắt đầu attempt, nộp đáp án, complete, hồi tim, mua freeze) cần một `requestId` là UUID do mobile sinh.
- Gửi lại vì lỗi mạng: dùng **cùng** `requestId` và **cùng** body. Server trả lại kết quả đã lưu, không ghi thêm.
- Cùng `requestId` nhưng body khác: `409 IDEMPOTENCY_CONFLICT`. Không tự đổi sang `requestId` mới để thử lại.
- Đáp án mới (ví dụ sau khi trả lời sai): dùng `requestId` **mới**.

**Thời gian:** ISO-8601 UTC (ví dụ `2026-11-07T15:02:11Z`). Ngày (`lastQualifiedDate`) là `YYYY-MM-DD` theo múi giờ của người học.

**Múi giờ:** IANA, mặc định `Asia/Ho_Chi_Minh`. Đổi bằng `PUT me/settings`.

**Lỗi:** body theo `ErrorResponse`:

```json
{
  "timestamp": "2026-11-07T10:15:30",
  "status": 409,
  "error": "Conflict",
  "message": "Bạn đã hết tim. Chờ hồi tim hoặc dùng điểm để hồi đầy.",
  "path": "/api/learning-support/vocabulary-study/attempts/6f0c…/steps/c92b…/answers",
  "details": { "nextHeartAt": "2026-11-07T15:02:11Z", "refillCost": "5" },
  "code": "VOCAB_NO_HEARTS"
}
```

- `code` là mã máy đọc được, luôn có với lỗi nghiệp vụ. Mobile dựa vào `code`, không dựa vào `message`.
- `details` là map chuỗi sang chuỗi. Mọi giá trị đều là string.
- Lỗi kiểm tra đầu vào (thiếu trường, sai kiểu) trả `400` mà **không có** `code`. Mobile dựa vào HTTP status trong trường hợp này.
- Lỗi xác thực từ gateway (401/403) không đi qua `ErrorResponse` của service.

## 3. Danh sách endpoint cho mobile

| # | Method, đường dẫn | Xác thực | Thành công | Dùng khi |
|---|---|---|---|---|
| 1 | `GET /api/content/vocabulary/topics/{topicId}/units` | Không | 200 `TopicUnits` | Mở một chủ đề |
| 2 | `GET /api/content/vocabulary/units/{unitId}` | Không | 200 `UnitContent` | Xem nội dung unit trước khi học |
| 3 | `GET /api/learning-support/vocabulary-study/progress?topicIds=a,b,c` | Có | 200 `TopicProgress[]` | Màn Hôm nay (tối đa 100 chủ đề mỗi lần) |
| 4 | `POST /api/learning-support/vocabulary-study/units/{unitId}/attempts` | Có | 201 mới, 200 đã có | Bắt đầu, tiếp tục hoặc học lại một unit |
| 5 | `GET /api/learning-support/vocabulary-study/attempts/{attemptId}` | Có | 200 `Attempt` | Tải lại phiên (ví dụ sau khi đổi máy) |
| 6 | `POST /api/learning-support/vocabulary-study/attempts/{attemptId}/steps/{stepId}/answers` | Có | 200 `StepResult` | Nộp đáp án một bước |
| 7 | `POST /api/learning-support/vocabulary-study/attempts/{attemptId}/complete` | Có | 200 `Completion` | Hoàn thành attempt |
| 8 | `GET /api/learning-support/vocabulary-study/me/summary` | Có | 200 `Summary` | Header XP, streak, tim |
| 9 | `PUT /api/learning-support/vocabulary-study/me/settings` | Có | 200 `Settings` | Đổi múi giờ |
| 10 | `POST /api/learning-support/vocabulary-study/me/hearts/refill` | Có | 200 `PurchaseResult` | Hồi đầy tim bằng Points |
| 11 | `POST /api/learning-support/vocabulary-study/me/streak/freeze` | Có | 200 `PurchaseResult` | Mua freeze bằng Points |
| 12 | `POST /api/learning-support/flashcards/{id}/reviews` (đã có) | Có | 200 (không đổi) | Ôn flashcard. Streak mobile cập nhật ở server; mobile đọc lại `me/summary` |
| 13 | `PUT /api/community/comments/{commentId}/reactions/{type}` | Có | 204 | Thả hoặc đổi cảm xúc trên bình luận |
| 14 | `DELETE /api/community/comments/{commentId}/reactions/{type}` | Có | 204 | Bỏ cảm xúc trên bình luận |

Không có API GET riêng cho múi giờ. Múi giờ hiện tại nằm trong `Summary.streak.timezone`.

Mobile không gọi các API biên soạn `/api/content/admin/vocabulary/...`. Chỉ vai trò `CONTENT_AUTHOR` được dùng, và `ADMIN` cũng không có quyền.

## 4. Luồng sử dụng

### 4.1. Màn Hôm nay

1. Gọi `GET me/summary` để hiện XP, cấp độ, streak, tim.
2. Lấy danh sách chủ đề từ API có sẵn `GET /api/content/vocabulary/topics`.
3. Gọi `GET progress?topicIds=...` cho các chủ đề hiện trên màn (tối đa 100). Mỗi chủ đề có `currentUnitId` và trạng thái từng unit.
4. Mỗi unit có trạng thái `LOCKED`, `AVAILABLE`, `IN_PROGRESS` hoặc `COMPLETED`. Hiện trạng thái đó cho người học.

Nếu gọi progress không thành công, hiện lỗi và cho thử lại. Không dùng dữ liệu cũ trên máy thay cho server.

### 4.2. Mở một unit

1. Gọi `GET units/{unitId}` nếu cần xem nội dung trước (không cần đăng nhập).
2. Với unit `AVAILABLE` hoặc `IN_PROGRESS`: gọi `POST attempts` với `{"requestId": "<uuid mới>", "mode": "RESUME_OR_START"}`.
   - Trả `201`: phiên mới.
   - Trả `200`: server trả lại phiên đang làm. Không cần lưu `attemptId` trên máy: gọi lại `RESUME_OR_START` là lấy được phiên hiện tại.
3. Với unit `COMPLETED`: gọi `POST attempts` với `mode: "REPLAY"` để học lại. Mỗi lần replay là một attempt mới.
4. Với unit `LOCKED`: không gọi `attempts`. Hiện "Hoàn thành bài trước để tiếp tục" và dùng `requiredUnitId` trong lỗi nếu có.

### 4.3. Làm từng bước

Các bước phải làm **đúng thứ tự** trong `steps`. Gửi bước không phải bước hiện tại sẽ nhận `409 STEP_OUT_OF_ORDER`.

- **WORD** (xem từ): gửi `{"requestId": "...", "answer": {"type": "WORD", "acknowledged": true}}`. Kết quả `outcome` là `ACKNOWLEDGED`, không chấm đúng sai. Bước này không mất tim.
- **CHOICE**: gửi `{"type": "CHOICE", "optionId": "..."}`.
- **MATCH**: gửi `{"type": "MATCH", "pairs": [{"leftOptionId": "...", "rightOptionId": "..."}]}`. Phải có **đúng một** cặp cho mỗi `leftOptionId` trong bước. Thiếu, thừa hoặc trùng là `422 INVALID_ANSWER`.
- **FILL**: gửi `{"type": "FILL_TEXT", "text": "..."}`.

Xử lý kết quả `StepResult`:

- `outcome` là `CORRECT`: chuyển sang `nextStepId`.
- `outcome` là `INCORRECT`: giữ nguyên bước (`nextStepId` bằng `stepId` đang làm). Hiện `correctAnswer` và `explanationVi` cho người học. Khi người học trả lời lại, dùng `requestId` mới.
- `heartLost` là `true`: vừa mất 1 tim ở lần sai đầu của bước này. Cập nhật tim theo `hearts`.
- `canComplete` là `true`: mọi bước chấm điểm đã đúng. Bật nút hoàn thành.

Trường `hearts` có giá trị với bước chấm điểm của attempt `FIRST_COMPLETION`. Với WORD hoặc attempt `REPLAY`, `hearts` là `null` và `heartLost` là `false`.

Nếu nộp mà gặp `409 VOCAB_NO_HEARTS`, hiện `nextHeartAt` và `refillCost`, đề nghị hồi tim (mục 6). Sau khi hồi, người học trả lời lại bước đó với `requestId` mới.

Nếu gặp `409 ATTEMPT_EXPIRED` (phiên quá 14 ngày không hoạt động), gọi lại `POST attempts` với `RESUME_OR_START` để lấy phiên mới.

Nếu mạng lỗi khi gửi đáp án, gửi lại cùng `requestId` và cùng body. Không tự tạo `requestId` mới, vì như vậy có thể ghi hai lần.

### 4.4. Hoàn thành

1. Khi tất cả các bước đã có `completedStepIds` đầy đủ, hoặc `canComplete` là `true`, gọi `POST complete` với `requestId` mới.
2. Hiện `reward`: XP nhận được, cấp độ có tăng không, streak có tăng không.
3. Hiện `unlockedUnitIds` và `nextUnitId` nếu có.
4. Gọi lại `GET me/summary` để cập nhật header.

Gọi `complete` lần hai (cùng attempt) trả lại kết quả đã lưu, không cộng thêm XP. Sau khi attempt đã hoàn thành, mọi `requestId` đều nhận lại kết quả cũ.

### 4.5. Ôn flashcard (để giữ streak)

Gọi `POST /api/learning-support/flashcards/{id}/reviews` như hiện tại. Phản hồi không đổi. Sau đó gọi `GET me/summary` để cập nhật streak trên header. Ôn flashcard không cộng XP và không ảnh hưởng tim.

### 4.6. Thả cảm xúc bình luận

1. Mỗi bình luận hiện số đếm từ `reactionCounts` và trạng thái từ `myReaction`.
2. Người học chọn một loại: gọi `PUT` với loại đó. Nếu đang có loại khác, server thay thế; không cần gọi `DELETE` trước.
3. Chạm lại đúng loại đang có: gọi `DELETE` với loại đó để bỏ.
4. `PUT` và `DELETE` trả `204` không có body. Mobile tự cập nhật giao diện, rồi tải lại danh sách bình luận để lấy số đếm chính xác.

## 5. Các response

### 5.1. `GET /api/content/vocabulary/topics/{topicId}/units` (công khai)

```json
{
  "topicId": "7a10…",
  "curriculumVersion": 3,
  "totalUnits": 4,
  "uniqueWordCount": 24,
  "items": [
    {
      "unitId": "3d9f…",
      "topicId": "7a10…",
      "revision": 1,
      "title": "Môn học",
      "description": "Tên các môn học ở trường",
      "sortOrder": 1,
      "kind": "LEARN",
      "wordCount": 8,
      "estimatedMinutes": 6,
      "exerciseTypes": ["CHOICE", "MATCH", "FILL"]
    }
  ]
}
```

- Chỉ có unit đã phát hành và chưa lưu trữ, sắp theo `sortOrder`.
- `wordCount` là số nghĩa (sense) đang hoạt động trong bản đã phát hành.
- `uniqueWordCount` đếm số từ khác nhau trong cả chủ đề, không đếm trùng giữa các unit.
- `estimatedMinutes` = `max(1, ceil(wordCount × 0.75))`.
- `kind` là `LEARN` hoặc `REVIEW`.
- `exerciseTypes` là các dạng bước chấm điểm của unit.
- `curriculumVersion` tăng mỗi khi chủ đề đổi nội dung (phát hành, lưu trữ, sắp xếp). Mobile có thể dùng để biết cache cũ.
- Chủ đề không tồn tại hoặc không hoạt động: `404 VOCAB_TOPIC_NOT_FOUND`.

### 5.2. `GET /api/content/vocabulary/units/{unitId}` (công khai)

```json
{
  "unit": {
    "unitId": "3d9f…", "topicId": "7a10…", "revision": 1, "title": "Môn học",
    "description": "Tên các môn học ở trường", "sortOrder": 1, "kind": "LEARN",
    "wordCount": 8, "estimatedMinutes": 6, "exerciseTypes": ["CHOICE", "MATCH", "FILL"]
  },
  "introductionVi": "Bài này giúp bạn gọi tên các môn học.",
  "words": [
    {
      "vocabularyItemId": "9c1e…",
      "vocabularySenseId": "a1b2…",
      "sortOrder": 1,
      "lemma": "homework",
      "partOfSpeech": "NOUN",
      "vietnameseMeaning": "bài tập về nhà",
      "englishDefinition": "work given to students to do at home",
      "ipaUk": "/ˈhəʊmwɜːk/",
      "ipaUs": "/ˈhoʊmwɝːk/",
      "audioUkUrl": "https://…/vocabulary/pronunciation/uk/homework.mp3",
      "audioUsUrl": null,
      "imageUrl": null,
      "exampleSentence": "I finish my homework before dinner.",
      "exampleTranslationVi": "Tôi làm xong bài tập trước bữa tối."
    }
  ]
}
```

- Mọi trường media (`audioUkUrl`, `audioUsUrl`, `imageUrl`) có thể là `null`. Mobile cần dự phòng: không hiện audio, dùng TTS hoặc để trống ảnh. Thiếu media không được chặn việc học.
- Unit nháp, đã lưu trữ hoặc không tồn tại: `404 VOCAB_UNIT_NOT_FOUND`.

### 5.3. `GET /api/learning-support/vocabulary-study/progress?topicIds=a,b` (cần đăng nhập)

```json
[
  {
    "topicId": "7a10…",
    "curriculumVersion": 3,
    "totalUnits": 4,
    "completedUnits": 1,
    "currentUnitId": "5e2a…",
    "units": [
      {
        "unitId": "3d9f…", "status": "COMPLETED", "prerequisiteUnitId": null,
        "currentAttemptId": null, "completedStepCount": 0, "totalStepCount": 0,
        "firstCompletedAt": "2026-11-07T09:10:00Z", "lastCompletedAt": "2026-11-07T09:10:00Z",
        "bestAccuracyPercent": 88
      },
      {
        "unitId": "5e2a…", "status": "AVAILABLE", "prerequisiteUnitId": "3d9f…",
        "currentAttemptId": null, "completedStepCount": 0, "totalStepCount": 0,
        "firstCompletedAt": null, "lastCompletedAt": null, "bestAccuracyPercent": null
      }
    ],
    "updatedAt": "2026-11-07T09:12:00Z"
  }
]
```

- `units[].status`: `LOCKED`, `AVAILABLE`, `IN_PROGRESS`, `COMPLETED`.
- `currentUnitId`: unit đang làm, hoặc unit `AVAILABLE` đầu tiên chưa xong. Là `null` khi tất cả đã xong.
- `completedStepCount` và `totalStepCount` lấy từ attempt đang làm (0 nếu không có).
- `bestAccuracyPercent` là độ chính xác tốt nhất trong các lần hoàn thành, hoặc `null` nếu chưa hoàn thành.
- Chủ đề không có unit nào trả về với `totalUnits = 0`.

### 5.4. `POST /api/learning-support/vocabulary-study/units/{unitId}/attempts`

Body: `{"requestId": "<uuid>", "mode": "RESUME_OR_START"}` hoặc `"mode": "REPLAY"`.

Trả `201` khi tạo phiên mới, `200` khi trả lại phiên đã có.

```json
{
  "attemptId": "6f0c…",
  "topicId": "7a10…",
  "unitId": "5e2a…",
  "revision": 1,
  "status": "IN_PROGRESS",
  "mode": "FIRST_COMPLETION",
  "startedAt": "2026-11-07T10:00:00Z",
  "expiresAt": "2026-11-21T10:00:00Z",
  "currentStepId": "b81a…",
  "completedStepIds": [],
  "steps": [
    {
      "stepId": "b81a…", "order": 1, "type": "WORD",
      "instructionVi": "Học từ mới", "imageUrl": null, "audioUrl": "https://…/homework.mp3",
      "word": {
        "vocabularyItemId": "9c1e…", "vocabularySenseId": "a1b2…", "sortOrder": 1,
        "lemma": "homework", "partOfSpeech": "NOUN", "vietnameseMeaning": "bài tập về nhà",
        "englishDefinition": "…", "ipaUk": "…", "ipaUs": "…", "audioUkUrl": "…", "audioUsUrl": null,
        "imageUrl": null, "exampleSentence": "…", "exampleTranslationVi": "…"
      }
    },
    {
      "stepId": "c92b…", "order": 6, "type": "CHOICE",
      "instructionVi": "Chọn nghĩa đúng của từ", "imageUrl": null, "audioUrl": null,
      "prompt": "homework",
      "options": [
        { "optionId": "o1…", "text": "kỳ thi", "imageUrl": null },
        { "optionId": "o2…", "text": "bài tập về nhà", "imageUrl": null },
        { "optionId": "o3…", "text": "học bổng", "imageUrl": null }
      ]
    },
    {
      "stepId": "d03c…", "order": 10, "type": "MATCH",
      "instructionVi": "Ghép từ với nghĩa", "imageUrl": null, "audioUrl": null,
      "left": [ { "optionId": "l1…", "text": "homework" } ],
      "right": [ { "optionId": "r1…", "text": "bài tập về nhà" } ]
    },
    {
      "stepId": "e14d…", "order": 11, "type": "FILL",
      "instructionVi": "Điền từ vào chỗ trống", "imageUrl": null, "audioUrl": null,
      "prompt": "bài tập về nhà",
      "sentenceBefore": "I finish my ", "sentenceAfter": " before dinner.",
      "inputMode": "TEXT", "options": null
    }
  ],
  "completion": null
}
```

- `steps` có đúng thứ tự, không đổi trong suốt phiên. Thứ tự có thể đảo giữa các attempt.
- Mỗi bước có các trường chung `stepId`, `order`, `type`, `instructionVi`, `imageUrl`, `audioUrl`. Các trường riêng theo loại, như bảng dưới.
- Không có đáp án đúng trong `steps`. Đáp án chỉ trả về sau khi nộp.
- `mode`: `FIRST_COMPLETION` (lần học đầu, có tim và XP) hoặc `REPLAY` (không tim, chỉ tính streak).
- `status`: `IN_PROGRESS`, `COMPLETED` hoặc `EXPIRED`.
- `expiresAt` là 14 ngày sau lần hoạt động cuối.
- `completion` là `null` cho đến khi hoàn thành.

| `type` | Trường riêng |
|---|---|
| `WORD` | `word` (đối tượng từ, giống `Word` ở mục 5.2) |
| `CHOICE` | `prompt`, `options[{optionId, text, imageUrl}]` |
| `MATCH` | `left[{optionId, text}]`, `right[{optionId, text}]` |
| `FILL` | `prompt`, `sentenceBefore`, `sentenceAfter`, `inputMode` (hiện luôn là `TEXT`), `options` (hiện luôn là `null`) |

Bước `MATCH` luôn có ít nhất 2 cặp. Các cột `left` và `right` dùng `optionId` độc lập, không lộ cặp đúng.

### 5.5. `GET /api/learning-support/vocabulary-study/attempts/{attemptId}`

Trả cùng cấu trúc `Attempt` như mục 5.4. Chỉ người sở hữu phiên mới xem được. Phiên của người khác trả `404 ATTEMPT_NOT_FOUND`.

### 5.6. `POST .../attempts/{attemptId}/steps/{stepId}/answers`

Body: `{"requestId": "<uuid>", "answer": { ... }}`. Các dạng `answer`:

```json
{ "type": "WORD", "acknowledged": true }
{ "type": "CHOICE", "optionId": "o2…" }
{ "type": "MATCH", "pairs": [ { "leftOptionId": "l1…", "rightOptionId": "r1…" } ] }
{ "type": "FILL_TEXT", "text": "bài tập về nhà" }
```

`type` phải khớp loại bước, nếu không là `422 INVALID_ANSWER` (kèm `details.field`).

```json
{
  "attemptId": "6f0c…",
  "stepId": "c92b…",
  "submissionId": "5d77…",
  "outcome": "INCORRECT",
  "correctAnswer": { "type": "CHOICE", "optionId": "o2…" },
  "explanationVi": "'homework' nghĩa là 'bài tập về nhà'.",
  "stepCompleted": false,
  "completedStepCount": 2,
  "totalStepCount": 11,
  "nextStepId": "c92b…",
  "canComplete": false,
  "heartLost": true,
  "hearts": { "hearts": 4, "maxHearts": 5, "nextHeartAt": "2026-11-07T15:00:00Z", "refillCost": 5 }
}
```

| Trường | Ý nghĩa |
|---|---|
| `outcome` | `ACKNOWLEDGED` (WORD), `CORRECT` hoặc `INCORRECT` |
| `correctAnswer` | `null` với WORD. Với CHOICE: `{type, optionId}`. Với MATCH: `{type, pairs}`. Với FILL: `{type: "FILL_TEXT", text}` (một dạng chấp nhận được) |
| `explanationVi` | Giải thích hiện cho người học. `null` với WORD |
| `stepCompleted` | Bước này đã hoàn thành (đúng, hoặc là WORD) |
| `nextStepId` | Bước tiếp theo nếu đúng. Bằng `stepId` hiện tại nếu sai |
| `canComplete` | Tất cả bước chấm điểm đã đúng |
| `heartLost` | Vừa mất 1 tim ở lần sai đầu của bước chấm điểm trong `FIRST_COMPLETION` |
| `hearts` | Trạng thái tim sau lần nộp. `null` với WORD và với `REPLAY` |

Gửi lại cùng `requestId` và cùng body: trả lại kết quả cũ, không mất tim thêm.

### 5.7. `POST .../attempts/{attemptId}/complete`

Body: `{"requestId": "<uuid>"}`.

```json
{
  "attemptId": "6f0c…",
  "unitId": "5e2a…",
  "topicId": "7a10…",
  "completedAt": "2026-11-07T10:12:00Z",
  "studiedWordCount": 8,
  "gradedStepCount": 11,
  "firstTryCorrectCount": 10,
  "accuracyPercent": 91,
  "durationSeconds": 720,
  "firstCompletion": true,
  "topicProgress": { "…": "giống mục 5.3" },
  "unlockedUnitIds": ["8b4f…"],
  "nextUnitId": "8b4f…",
  "reward": {
    "xpEarned": 30,
    "xpBreakdown": { "firstCompletion": 20, "perfectBonus": 10 },
    "leveledUp": false,
    "streakIncreased": true,
    "summary": {
      "xp": { "totalXp": 130, "level": 1, "nextLevelAt": 500, "xpToNextLevel": 370 },
      "streak": {
        "currentDays": 4, "longestDays": 6, "lastQualifiedDate": "2026-11-07", "qualifiedToday": true,
        "freezeAvailable": false, "freezeCost": 10, "freezeBlockedReason": null,
        "lostStreakDays": 0, "timezone": "Asia/Ho_Chi_Minh"
      },
      "hearts": { "hearts": 5, "maxHearts": 5, "nextHeartAt": null, "refillCost": 5 }
    }
  }
}
```

- `accuracyPercent` = `firstTryCorrectCount / gradedStepCount`, làm tròn. Chỉ tính lần trả lời đầu của mỗi bước chấm điểm.
- `durationSeconds` là khoảng thời gian từ lúc bắt đầu đến lúc hoàn thành, không phải thời gian học thực.
- `firstCompletion` là `true` chỉ ở lần hoàn thành đầu của unit. Replay trả `false`.
- `unlockedUnitIds` có một phần tử khi lần hoàn thành này mở khóa unit kế tiếp, nếu không thì rỗng.
- `reward.xpEarned` = `xpBreakdown.firstCompletion + xpBreakdown.perfectBonus`. Replay trả `0`.
- `perfectBonus` chỉ có khi lần hoàn thành đầu không sai bước chấm điểm nào.
- `reward.summary` là trạng thái sau khi hoàn thành. Mobile hiển thị luôn, không cần gọi lại `summary` ngay (nhưng vẫn nên gọi khi quay về màn Hôm nay).

### 5.8. `GET /api/learning-support/vocabulary-study/me/summary`

```json
{
  "xp": { "totalXp": 130, "level": 1, "nextLevelAt": 500, "xpToNextLevel": 370 },
  "streak": {
    "currentDays": 4, "longestDays": 6, "lastQualifiedDate": "2026-11-07", "qualifiedToday": true,
    "freezeAvailable": false, "freezeCost": 10, "freezeBlockedReason": null,
    "lostStreakDays": 0, "timezone": "Asia/Ho_Chi_Minh"
  },
  "hearts": { "hearts": 4, "maxHearts": 5, "nextHeartAt": "2026-11-07T15:00:00Z", "refillCost": 5 }
}
```

- `xp.level` = `floor(totalXp / 500) + 1`. Mỗi cấp 500 XP.
- `streak.qualifiedToday`: hôm nay đã có hoạt động (hoàn thành unit hoặc ôn flashcard).
- `streak.freezeCost`: giá mua freeze lúc này bằng Points. `null` khi đang bị chặn.
- `streak.freezeBlockedReason`: `null`, `ALREADY_OWNED` (đã có một freeze), `NO_STREAK` (chưa có chuỗi), hoặc `LIMIT` (đã đạt giới hạn freeze liên tiếp).
- `streak.lostStreakDays`: số ngày của chuỗi vừa mất (0 nếu không mất).
- `hearts.nextHeartAt`: lúc có tim tiếp theo. `null` khi đã đầy.
- `hearts.maxHearts`: 5 với người dùng thường, 7 với Premium. Giá trị này do server quyết định, mobile không tự suy ra.

Người học mới nhận số mặc định: 0 XP, cấp 1, streak 0, tim đầy.

### 5.9. `PUT /api/learning-support/vocabulary-study/me/settings`

Body: `{"timezone": "Asia/Ho_Chi_Minh"}`. Trả `{"timezone": "Asia/Ho_Chi_Minh"}`.

Múi giờ không hợp lệ: `400 INVALID_TIMEZONE`, `details.field` là `timezone`.

### 5.10. `POST .../me/hearts/refill`

Body: `{"requestId": "<uuid>"}`.

```json
{
  "hearts": { "hearts": 5, "maxHearts": 5, "nextHeartAt": null, "refillCost": 5 },
  "pointsSpent": 5,
  "pointsBalanceAfter": 37
}
```

Tim đã đầy: `409 HEARTS_FULL`. Không đủ Points: `402 INSUFFICIENT_POINTS`, không mất gì.

### 5.11. `POST .../me/streak/freeze`

Body: `{"requestId": "<uuid>"}`.

```json
{
  "streak": {
    "currentDays": 4, "longestDays": 6, "lastQualifiedDate": "2026-11-06", "qualifiedToday": false,
    "freezeAvailable": true, "freezeCost": null, "freezeBlockedReason": "ALREADY_OWNED",
    "lostStreakDays": 0, "timezone": "Asia/Ho_Chi_Minh"
  },
  "pointsSpent": 10,
  "pointsBalanceAfter": 27
}
```

Giá freeze là `10 × số ngày freeze liên tiếp, tính cả ngày mua`, tối đa 5 ngày liên tiếp. Giống web.

Các lỗi: `409 FREEZE_ALREADY_OWNED`, `409 NO_STREAK_TO_PROTECT`, `409 FREEZE_LIMIT`, `402 INSUFFICIENT_POINTS`.

### 5.12. Cảm xúc bình luận

Bốn loại cảm xúc: `LIKE`, `LOVE`, `HELPFUL`, `ACCURATE`. Mỗi người có tối đa một cảm xúc trên một bình luận. Bình luận gốc và trả lời dùng chung cách làm này.

**Thả hoặc đổi:** `PUT /api/community/comments/{commentId}/reactions/{type}`. Chọn loại khác thì thay loại cũ. Chọn lại đúng loại đang có thì không đổi gì. Trả `204`.

**Bỏ:** `DELETE /api/community/comments/{commentId}/reactions/{type}`. Người học không có cảm xúc đó thì vẫn trả `204`, không lỗi.

Cả hai cần đăng nhập. Không ảnh hưởng XP, streak hay tim.

Mỗi bình luận trả về trong các API sau đều có hai trường mới: `GET /api/community/posts/{postId}/comments` (kể cả khi `threaded=true`), `GET /api/community/comments/{commentId}/replies`, `POST /api/community/posts/{postId}/comments`, `PUT /api/community/comments/{id}`.

```json
{
  "id": "b7e2…", "postId": "2c9a…", "authorId": "…", "parentCommentId": null,
  "body": "Cảm ơn bạn, phần này rất hữu ích.", "status": "ACTIVE",
  "createdAt": "2026-11-07T08:30:00Z", "updatedAt": "2026-11-07T08:30:00Z",
  "author": { "…": "hồ sơ công khai của người viết" },
  "replyCount": 2,
  "reactionCounts": { "LIKE": 3, "LOVE": 1, "HELPFUL": 0, "ACCURATE": 0 },
  "myReaction": "LIKE"
}
```

- `reactionCounts` luôn có đủ bốn khóa. Loại không ai thả là `0`.
- `myReaction` là loại người đang xem đã thả, hoặc `null` nếu chưa thả.
- `PUT` và `DELETE` không trả lại số đếm. Xem mục 4.6.

**Lỗi** (không có `code`, dùng HTTP status):
- `404`: bình luận không tồn tại, đã bị ẩn hoặc xóa, hoặc bài viết chứa nó không xem được.
- `400`: `type` không phải một trong bốn loại trên.
- `401`: chưa đăng nhập.

## 6. Mã lỗi

| HTTP | `code` | Khi nào | Mobile làm gì |
|---|---|---|---|
| 400 | `VOCAB_UNIT_INVALID` | Chế độ học không hợp lệ (không phải `RESUME_OR_START` hoặc `REPLAY`) | Lỗi lập trình, báo lỗi |
| 400 | `INVALID_TIMEZONE` | Múi giờ không phải IANA | Báo người học chọn lại |
| 402 | `INSUFFICIENT_POINTS` | Không đủ Points để hồi tim hoặc mua freeze | Báo thiếu điểm, không tự thử lại |
| 404 | `VOCAB_TOPIC_NOT_FOUND` | Chủ đề không tồn tại hoặc không hoạt động | Quay lại danh sách |
| 404 | `VOCAB_UNIT_NOT_FOUND` | Unit không tồn tại, nháp hoặc đã lưu trữ | Quay lại danh sách |
| 404 | `ATTEMPT_NOT_FOUND` | Phiên không tồn tại hoặc không thuộc người dùng | Gọi lại `RESUME_OR_START` của unit |
| 404 | `STEP_NOT_FOUND` | Bước không thuộc phiên | Tải lại phiên |
| 409 | `VOCAB_UNIT_LOCKED` | Unit còn khóa. `details.requiredUnitId` là unit cần hoàn thành trước | Hiện thông báo, tải lại progress |
| 409 | `VOCAB_UNIT_COMPLETED` | Gọi `RESUME_OR_START` cho unit đã hoàn thành | Gọi lại với `REPLAY` |
| 409 | `VOCAB_UNIT_NOT_COMPLETED` | Gọi `REPLAY` cho unit chưa hoàn thành | Gọi lại với `RESUME_OR_START` |
| 409 | `VOCAB_UNIT_UNAVAILABLE` | Unit có ít hơn 4 từ hợp lệ hoặc không có bước chấm điểm | Báo chưa học được, tải lại danh sách |
| 409 | `STEP_OUT_OF_ORDER` | Nộp bước không phải bước hiện tại | Tải lại phiên, tiếp tục đúng bước |
| 409 | `ATTEMPT_EXPIRED` | Phiên quá 14 ngày không hoạt động | Gọi lại `RESUME_OR_START` để có phiên mới |
| 409 | `ATTEMPT_ALREADY_COMPLETED` | Nộp đáp án cho phiên đã xong | Tải lại phiên, hiện kết quả |
| 409 | `ATTEMPT_NOT_COMPLETABLE` | Hoàn thành khi còn bước chưa xong | Tải lại phiên |
| 409 | `IDEMPOTENCY_CONFLICT` | Cùng `requestId` nhưng body khác | Không thử lại với cùng `requestId`. Tạo `requestId` mới nếu là thao tác mới |
| 409 | `VOCAB_NO_HEARTS` | Hết tim, không nộp được bước chấm điểm | Hiện `nextHeartAt` và `refillCost`, đề nghị hồi tim |
| 409 | `HEARTS_FULL` | Hồi tim khi tim đã đầy | Ẩn nút hồi tim, tải lại summary |
| 409 | `FREEZE_ALREADY_OWNED` | Đã có một freeze | Tải lại summary |
| 409 | `NO_STREAK_TO_PROTECT` | Chưa có chuỗi để bảo vệ | Tải lại summary |
| 409 | `FREEZE_LIMIT` | Đã đạt giới hạn freeze liên tiếp | Tải lại summary |
| 422 | `INVALID_ANSWER` | Dạng đáp án không khớp bước, hoặc MATCH sai số cặp. `details.field` chỉ rõ trường | Sửa đáp án, không gửi lại nguyên văn |
| 503 | `ACCESS_UNAVAILABLE` | Dịch vụ điểm đang bận | Thử lại với **cùng** `requestId`. Không đổi `requestId` |
| — | (không có code) 400 | Thiếu trường hoặc sai kiểu dữ liệu | Lỗi lập trình, báo lỗi |
| 401 / 403 | (từ gateway) | Hết phiên hoặc không đủ quyền | Đăng nhập lại |

Lỗi của community-service (bình luận và cảm xúc) không có `code`. Mobile dựa vào HTTP status: 404 là không tìm thấy hoặc không xem được, 400 là dữ liệu sai, 401 là chưa đăng nhập.

## 7. Quy tắc mobile cần biết

**XP.** Lần hoàn thành đầu của một unit: 20 XP. Nếu không sai bước chấm điểm nào, thêm 10 XP. Replay: 0 XP. Mỗi cấp 500 XP. Lên cấp thì tim đầy. Không có trần XP theo ngày.

**Tim.**
- Người thường tối đa 5 tim, Premium tối đa 7. Hồi 1 tim mỗi 5 giờ, đồng hồ dừng khi đầy.
- Sai lần đầu của một bước chấm điểm trong `FIRST_COMPLETION` mất 1 tim. Các lần sai sau của cùng bước không mất thêm.
- WORD không mất tim. `REPLAY` không có tim.
- Khi 0 tim: không bắt đầu được `FIRST_COMPLETION` mới và không nộp được bước chấm điểm. Vẫn xem được nội dung, tải lại phiên, và học lại (`REPLAY`).
- Hồi đầy bằng 5 Points.

**Streak.**
- Một ngày được tính khi hoàn thành một unit (kể cả replay) hoặc ôn một flashcard.
- Nhiều hoạt động trong một ngày chỉ tăng streak một lần.
- Chuỗi bị ngắt nếu bỏ một ngày mà không có freeze.
- Freeze bảo vệ một ngày trống. Mua bằng Points, giá tăng theo số ngày liên tiếp đã dùng freeze.

**Premium.** Server đọc gói Premium và tự cập nhật `maxHearts`. Nâng lên Premium không tự hồi tim, nên người học đang đủ 5 tim sẽ có 5/7. Hạ gói thì tim bị cắt về tối đa 5. Mobile chỉ hiển thị giá trị server trả về.

**Múi giờ.** Ngày của streak và của mọi sự kiện tính theo múi giờ đã lưu. Đổi múi giờ chỉ ảnh hưởng các sự kiện sau thời điểm đổi.

**Khách chưa đăng nhập.** Xem danh sách chủ đề và nội dung unit (mục 5.1, 5.2) không cần đăng nhập. Mọi API còn lại cần đăng nhập. Mobile quyết định cách hiển thị cho khách (hiện tại giữ cách học thử trên máy).

**Đồng thời.** Không gửi hai lần hồi tim hoặc hai lần mua freeze cùng lúc. Khóa nút đến khi có phản hồi.

**Cảm xúc bình luận.** Không ảnh hưởng XP, streak hay tim. Không có thông báo cho tác giả bình luận khi được thả cảm xúc.

## 8. Giới hạn đã biết

- Chưa có dạng FILL chọn từ (`inputMode: "WORD_BANK"`). Mọi bước FILL hiện là `TEXT`.
- Media (`audioUkUrl`, `audioUsUrl`, `imageUrl`) có thể là `null`. Trong môi trường kiểm thử, storage chưa được cấu hình nên tất cả media đều `null`. Phát được audio trên thiết bị thật chưa được kiểm chứng.
- Hai lần mua với hai `requestId` khác nhau cùng lúc có thể đều bị trừ điểm trước khi một trong hai được áp dụng. Mobile tránh gửi đồng thời, và gửi lại đúng `requestId` khi gặp lỗi mạng.
- Chưa có job đối soát. Giao dịch Points bị treo do Access lỗi cần kiểm tra thủ công.
- Nội dung unit mẫu (V42) cần content author rà soát trước khi đưa vào sản xuất.
- Thời gian phản hồi đo được trong môi trường phát triển, không phải cam kết sản xuất.

## 9. Ngoài phạm vi của tài liệu này

- Các API biên soạn unit cho content author (`/api/content/admin/vocabulary/...`). Mobile không gọi.
- Thông báo cho tác giả bình luận khi có người thả cảm xúc, danh sách người đã thả, emoji tự chọn.
- Nhập tiến độ cũ trên máy thành XP hoặc streak. Không làm.
- Màn `learn`, `practice` cũ của mobile vẫn dùng dữ liệu web và không đổi trong đợt này.
