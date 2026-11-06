# Bàn giao BE: học từ vựng theo chủ đề trên mobile

Ngày đối chiếu mã nguồn: 06/11/2026.

Đây là **đề xuất hợp đồng API**, chưa phải các endpoint đã được triển khai. Các URL mới bên dưới là tên đề xuất; đội BE có thể đổi tên nếu cung cấp OpenAPI và thống nhất mapping. Không có thay đổi mã BE trong tài liệu này.

## 1. Phạm vi sản phẩm đã chốt

- Màn Hôm nay là danh sách chủ đề từ vựng cuộn dọc.
- Mỗi chủ đề có ảnh bìa, tên ở giữa ảnh, số từ, nhiều nút bài học nhỏ.
- Mỗi bài nhỏ có các bước: học từ → trắc nghiệm → ghép từ/nghĩa → điền từ → kết quả.
- Hoàn thành bài hiện tại mới mở bài tiếp theo **trong cùng chủ đề**; bài đã hoàn thành được học lại.
- Đề xuất cho bản đầu: bài đầu của mọi chủ đề được mở, không bắt buộc hoàn thành chủ đề trước để học chủ đề khác.
- Gọi bài nhỏ là `vocabulary unit` trong hợp đồng này. Không dùng ID hay API của lesson IELTS/luyện đề/assessment thay cho bài từ vựng.
- Flashcard là chức năng lưu và ôn từ bên cạnh luồng này. Hoàn thành unit không tự động có nghĩa là đã lưu mọi từ vào flashcard hoặc đã ghi nhớ từ lâu dài.
- Quy tắc thưởng XP cụ thể chưa được người dùng chốt. Phần 7 là đề xuất để BE và sản phẩm thống nhất; mobile không tự gán điểm.

## 2. Hiện trạng đã kiểm tra

| Phần | Hiện tại |
|---|---|
| Chủ đề/từ | Đọc từ `/api/content/vocabulary/topics` và `/api/content/vocabulary?topicId=...` |
| Phát âm | Có dữ liệu IPA/audio trong catalog và `/api/content/vocabulary/lookup?forms=...` |
| Chia bài | Mobile tự đặt tiêu đề, chia danh sách từ theo page/size, sinh ID `${topicId}:lesson:${index}` |
| Bài tập | Mobile tự tạo quiz/ghép/điền và chấm trên thiết bị |
| Hoàn thành/mở khóa | AsyncStorage, phân theo userId/topicId; chưa đồng bộ sang máy khác |
| XP/streak | Mobile đọc số tài khoản từ Learning service; hoàn thành unit từ vựng chưa gửi sự kiện để tính thưởng |
| Lưu từ | Mobile tạo flashcard và thêm vào bộ. BE đã có API notebook có thể tái sử dụng |

Điểm cần sửa về dữ liệu: tên bài như “Môn học”, “Trong lớp học” phải gắn đúng tập từ; không chỉ lấy trang kế tiếp rồi đặt tên. Chia 12 từ thành 9 trang với size=2 như logic hiện tại có thể tạo trang rỗng ở cuối. Thêm từ vào catalog cũng có thể làm nội dung trang thay đổi trong khi ID bài cũ vẫn giữ nguyên. BE cần trả cấu trúc unit rõ ràng để loại bỏ vấn đề này.

Mã mobile liên quan: `src/features/vocab/topic-lessons.ts`, `components/topic-study-sheet.tsx`, `use-topic-lesson-progress.ts`, `api.ts`.

## 3. API BE đã có: tái sử dụng, không yêu cầu viết lại

| API hiện có | Công dụng/ghi chú |
|---|---|
| `GET /api/content/vocabulary/topics` | Chủ đề: id, slug, name, nameVi, coverKey, coverUrl, sortOrder, wordCount |
| `GET /api/content/vocabulary?topicId={id}&page=0&size=20` | Catalog từ; size hiện tối đa 50; có senses |
| `GET /api/content/vocabulary/{id}` | Chi tiết từ, IPA và audio UK/US, các nghĩa |
| `GET /api/content/vocabulary/lookup?forms=...` | Tra phát âm/từ; hiện yêu cầu quyền đăng nhập, tối đa 10 forms/request |
| `POST /api/learning-support/flashcards/notebook/entries` | Lưu nghĩa từ với body `{vocabularySenseId}`; controller trả 201 khi tạo, 200 khi đã có |
| `GET /api/learning-support/flashcards/notebook/saved?senseIds=...` | Lấy senseId đã lưu; tối đa 100 IDs |
| `GET /api/learning-support/flashcards/notebook/entries` | Sổ từ: tìm kiếm/lọc/phân trang, lọc topicId/setId |
| `GET /api/learning-support/flashcards/notebook/summary` | Tổng quan sổ từ |
| `GET, PUT /api/learning-support/flashcards/notebook/weekly-goal` | Mục tiêu tuần |
| `GET /api/learning-support/flashcards/notebook/topics-progress` | Tiến độ từ vựng/notebook theo chủ đề; KHÔNG đồng nghĩa tiến độ hoàn thành các unit mới |
| `GET /api/learning-support/flashcards/notebook/sets/{setId}/progress` | Tiến độ bộ từ |
| `GET /api/learning-support/flashcards/notebook/recent-result` | Kết quả hiện có của notebook; cần đọc đúng semantics khi tích hợp |
| `GET /api/learning-support/flashcards/notebook/achievements` | Thành tích ôn từ; không đồng nhất mặc định với streak tài khoản Learning service |
| `POST /api/learning-support/flashcards/{id}/reviews` | Gửi kết quả ôn một flashcard; không dùng giả lập hoàn thành unit |
| `GET /api/learning/me/progress` | totalXp, level, nextLevelAt, xpToNextLevel, xpToday, dailyCap |
| `GET /api/learning/me/streak` | Streak tài khoản |
| `GET, PUT /api/learning/me/settings` | Múi giờ gamification |

Các endpoint notebook đã có trong BE nhưng nhiều màn mobile chưa tích hợp. Đây là việc phía mobile cần làm thêm, không phải BE viết lại API.

## 4. API mới cần bổ sung — mức tối thiểu để học và đồng bộ

Các API public chỉ chứa nội dung. Tiến độ, phiên học và kết quả bắt buộc xác thực; userId lấy từ token, không nhận userId do mobile gửi. Không cache public response có dữ liệu cá nhân.

| # | Endpoint đề xuất | Request | Response bắt buộc |
|---|---|---|---|
| 1 | `GET /api/content/vocabulary/topics/{topicId}/units` | topicId | `TopicUnits`: danh sách unit đúng thứ tự và phiên bản |
| 2 | `GET /api/content/vocabulary/units/{unitId}` | unitId | `UnitContent`: nội dung học từ, đúng sense được chọn |
| 3 | `GET /api/learning-support/vocabulary-study/progress?topicIds=...` | Tối đa 100 topicId/lần; mobile chia batch nếu nhiều hơn | `TopicProgress[]`: trạng thái từng unit, bài tiếp theo, attempt đang học |
| 4 | `POST /api/learning-support/vocabulary-study/units/{unitId}/attempts` | `{requestId, mode: RESUME_OR_START hoặc REPLAY}` | `Attempt`: phiên mới hoặc phiên chưa hoàn thành hiện có, snapshot bài tập |
| 5 | `GET /api/learning-support/vocabulary-study/attempts/{attemptId}` | attemptId | `Attempt`: bước hiện tại, kết quả đã ghi nhận, hoặc kết quả hoàn thành |
| 6 | `POST /api/learning-support/vocabulary-study/attempts/{attemptId}/steps/{stepId}/answers` | `{requestId, answer}` theo dạng bài | `StepResult`: đúng/sai, giải thích, bước tiếp theo, tiến độ |
| 7 | `POST /api/learning-support/vocabulary-study/attempts/{attemptId}/complete` | `{requestId}` | `Completion`: kết quả BE tính, tiến độ mới, unit vừa mở, trạng thái XP/streak |

Có thể gộp API 1 và 2 hoặc trả content cùng attempt nếu cần, nhưng phải giữ đủ dữ liệu và bảo đảm không tải toàn bộ bài tập của tất cả chủ đề mỗi lần mở Hôm nay. Có thể bổ sung abandon attempt sau; bản đầu cho phép thoát màn rồi tiếp tục bằng attempt đã lưu.

## 5. Response chi tiết cho chủ đề, unit và tiến độ

Các mẫu dùng TypeScript để mô tả JSON. `Id` là string ID ổn định do BE sinh, `Instant` là ISO-8601 UTC. URL media là HTTPS dùng được từ điện thoại; trường thiếu nội dung trả null. Số đếm luôn là số không âm. Không dùng thứ tự hoặc số trang làm ID.

```ts
type Id = string;
type Instant = string;

type UnitSummary = {
  unitId: Id;
  topicId: Id;
  revision: number;
  title: string;                 // Ví dụ: Trong lớp học; phải đúng tập từ
  description: string | null;
  sortOrder: number;
  kind: 'LEARN' | 'REVIEW';
  wordCount: number;             // Số từ riêng biệt trong unit
  estimatedMinutes: number;
  exerciseTypes: ('CHOICE' | 'MATCH' | 'FILL')[];
};

type TopicUnits = {
  topicId: Id;
  curriculumVersion: number;
  totalUnits: number;
  uniqueWordCount: number;       // Không cộng trùng từ ở unit ôn tập
  items: UnitSummary[];
};

type StudyWord = {
  vocabularyItemId: Id;
  vocabularySenseId: Id;         // Bắt buộc chọn nghĩa cụ thể
  sortOrder: number;
  lemma: string;
  partOfSpeech: string | null;
  vietnameseMeaning: string;     // Bắt buộc cho bài EN–VI
  englishDefinition: string | null;
  ipaUk: string | null;
  ipaUs: string | null;
  audioUkUrl: string | null;
  audioUsUrl: string | null;
  imageUrl: string | null;
  exampleSentence: string | null;
  exampleTranslationVi: string | null;
};

type UnitContent = {
  unit: UnitSummary;
  introductionVi: string;
  words: StudyWord[];
};

type UnitProgress = {
  unitId: Id;
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
  prerequisiteUnitId: Id | null;
  currentAttemptId: Id | null;
  completedStepCount: number;
  totalStepCount: number;
  firstCompletedAt: Instant | null;
  lastCompletedAt: Instant | null;
  bestAccuracyPercent: number | null;
};

type TopicProgress = {
  topicId: Id;
  curriculumVersion: number;
  totalUnits: number;
  completedUnits: number;
  currentUnitId: Id | null;       // Bài đang học hoặc bài tiếp theo; null nếu xong
  units: UnitProgress[];
  updatedAt: Instant;
};
```

Yêu cầu nội dung:

- Mỗi unit LEARN có tập từ/nghĩa được biên soạn và sắp xếp rõ ràng. Không ép mọi chủ đề phải có đúng 9 unit.
- Unit ôn tập có thể dùng lại từ trước; tổng từ chủ đề không tính lặp.
- Không publish unit rỗng, từ không có nghĩa phù hợp, câu hỏi thiếu đáp án hoặc loại bài mobile chưa hỗ trợ.
- Catalog hiện đã có nhiều trường IPA/audio và senses. BE nên tái sử dụng dữ liệu này; lớp response có thể map tên trường theo hợp đồng mới.
- Audio/ảnh có thể thiếu; mobile dùng placeholder/TTS. Không chặn học chỉ vì media không tải được.
- Nếu dùng URL ký có hạn, trả `expiresAt` và hỗ trợ lấy URL mới qua GET content/attempt, không bắt mobile giữ URL hết hạn.

## 6. Phiên học, bài tập và nộp đáp án

```ts
type StepBase = {
  stepId: Id;
  order: number;
  instructionVi: string;
  imageUrl: string | null;
  audioUrl: string | null;
};

type StudyStep = StepBase & (
  | { type: 'WORD'; word: StudyWord }
  | { type: 'CHOICE'; prompt: string;
      options: { optionId: Id; text: string; imageUrl: string | null }[] }
  | { type: 'MATCH';
      left: { optionId: Id; text: string }[];
      right: { optionId: Id; text: string }[] }
  | { type: 'FILL'; prompt: string; sentenceBefore: string | null;
      sentenceAfter: string | null; inputMode: 'TEXT' | 'WORD_BANK';
      options: { optionId: Id; text: string }[] | null }
);

type Attempt = {
  attemptId: Id;
  topicId: Id;
  unitId: Id;
  revision: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  mode: 'FIRST_COMPLETION' | 'REPLAY';
  startedAt: Instant;
  expiresAt: Instant | null;
  currentStepId: Id | null;
  completedStepIds: Id[];
  steps: StudyStep[];            // Snapshot, thứ tự/optionId ổn định trong attempt
  completion: Completion | null;
};

type Answer =
  | { type: 'WORD'; acknowledged: true }
  | { type: 'CHOICE'; optionId: Id }
  | { type: 'MATCH'; pairs: { leftOptionId: Id; rightOptionId: Id }[] }
  | { type: 'FILL'; text: string }
  | { type: 'FILL'; optionId: Id };

type StepResult = {
  attemptId: Id;
  stepId: Id;
  submissionId: Id;
  outcome: 'ACKNOWLEDGED' | 'CORRECT' | 'INCORRECT';
  correctAnswer: Answer | null;  // Feedback sau khi trả lời; WORD trả null
  explanationVi: string | null;
  stepCompleted: boolean;
  completedStepCount: number;
  totalStepCount: number;
  nextStepId: Id | null;         // Sai: giữ step hiện tại; đúng: sang step tiếp
  canComplete: boolean;
};
```

Quy tắc chấm và resume:

1. BE sinh hoặc tải câu hỏi từ nội dung đã duyệt, gắn với đúng unit/revision. Bản đầu không cần AI sinh theo từng request.
2. API bắt đầu trả lại attempt đang học nếu tồn tại; bấm đúp/retry không tạo nhiều phiên. REPLAY chỉ hợp lệ sau khi unit đã hoàn thành, mỗi lần replay có attemptId mới.
3. GET attempt trả bước đã lưu để đổi máy hoặc đóng app vẫn tiếp tục được. BE xác thực quyền sở hữu và trạng thái khóa khi bắt đầu/nộp bài.
4. WORD được xác nhận là đã xem; đây không phải câu trả lời chấm đúng/sai. Mobile vẫn cho nghe/đọc lại các từ đã xem.
5. CHOICE có 2–4 phương án hợp lệ, không có hai phương án hiển thị giống nhau nhưng bị chấm khác. Nếu unit ít từ, lấy distractor phù hợp từ nguồn khác hoặc dùng loại bài khác.
6. MATCH dùng ID độc lập cho hai cột, không để cùng ID bộc lộ cặp đúng. Mỗi câu MATCH gửi trọn bộ cặp; hoàn thành khi tất cả đúng. Nếu ít hơn 2 cặp thì không tạo bước MATCH.
7. FILL bản đầu là một chỗ trống. TEXT chuẩn hóa trim/Unicode/case/khoảng trắng; các biến thể đúng do BE khai báo. Không tự bỏ mọi dấu câu vì có thể đổi nghĩa; WORD_BANK gửi optionId. Điền nhiều ô/sắp xếp câu là mở rộng sau.
8. Cho làm lại câu sai; bước bắt buộc hoàn thành khi đúng. Accuracy tính trên lần trả lời đầu của mỗi bước có chấm điểm; mỗi MATCH tính một bước. WORD không nằm trong mẫu số. Nếu không có bước chấm điểm thì không publish unit có thưởng.
9. Không nhận `correct`, `score`, `xp`, `streak`, `unlockedUnitId` do client tự quyết định. Client chỉ gửi lựa chọn/câu trả lời và requestId.
10. Không trả cờ đáp án đúng trong câu hỏi CHOICE/MATCH/FILL trước khi nộp. Trang học từ vốn hiển thị nghĩa là chủ đích học tập; việc giấu đáp án không thay thế xác thực và chống gửi trùng phía server.
11. `requestId` là UUID do mobile sinh cho mỗi lần gửi logic. Retry dùng lại cùng ID và cùng body. Cùng ID khác body trả 409. Cùng ID cùng body trả kết quả ban đầu, kể cả khi attempt đã hoàn thành. Lần sửa đáp án dùng ID mới.
12. Cập nhật step, attempt và completion phải có kiểm soát đồng thời. Hai thiết bị hoàn thành cùng unit không mở khóa hoặc thưởng hai lần.

## 7. Kết quả hoàn thành, XP và streak

```ts
type Completion = {
  attemptId: Id;
  unitId: Id;
  topicId: Id;
  completedAt: Instant;
  durationSeconds: number;
  gradedStepCount: number;
  firstTryCorrectCount: number;
  accuracyPercent: number;
  studiedWordCount: number;
  firstCompletion: boolean;
  topicProgress: TopicProgress;
  unlockedUnitIds: Id[];
  nextUnitId: Id | null;
  reward: {
    eventId: Id | null;
    status: 'APPLIED' | 'PENDING' | 'DISABLED';
    reason: 'FIRST_COMPLETION' | 'REPLAY' | 'DAILY_CAP' | null;
    xpEarned: number | null;
    xpCapped: boolean | null;
    totalXp: number | null;
    level: number | null;
    nextLevelAt: number | null;
    xpToNextLevel: number | null;
    xpToday: number | null;
    dailyCap: number | null;
    streakQualified: boolean | null;
    currentDays: number | null;
    longestDays: number | null;
    lastQualifiedDate: string | null; // YYYY-MM-DD
    timezone: string | null;         // IANA, ví dụ Asia/Ho_Chi_Minh
  };
};
```

BE chỉ cho complete khi tất cả bước bắt buộc đã hoàn thành. Gửi complete lần hai trả cùng kết quả gốc, không ghi thêm hoàn thành/XP/ngày streak. `durationSeconds` cần định nghĩa là thời gian phiên hoặc thời gian học thực; bản đầu đề xuất thời gian phiên theo mốc server, không dùng để tính thưởng và không gọi là thời gian học tích cực. Nếu cần thời gian học tích cực phải có cơ chế heartbeat/pause riêng.

**Đề xuất policy, cần BE/sản phẩm xác nhận trước khi bật thưởng:**

- Thưởng XP khi hoàn thành unit hợp lệ lần đầu; số XP là cấu hình BE, không hardcode mobile.
- Không trả thưởng mới khi replay, retry mạng hoặc chỉ xem từ. Chống trùng theo userId + unitId + loại thưởng; không tự reset quyền nhận thưởng khi sửa revision hoặc đổi thứ tự bài.
- Một attempt replay thực sự làm đủ bài có thể tính ngày streak, nhưng hoàn tất lại cùng attempt cũ không được tính cho ngày mới.
- Nếu áp dụng daily cap chung, phải xác định XP từ vựng có cùng nằm trong `xpToday/dailyCap` hiện có hay không; không chỉ cập nhật totalXp mà quên thống kê ngày/level.
- Streak dùng ngày hoàn thành hợp lệ theo múi giờ tài khoản. Nhiều bài cùng ngày chỉ tăng chuỗi một lần. Retry, xử lý sự kiện muộn và đổi thiết bị không đổi ngày sự kiện gốc.
- Phải có policy đổi múi giờ để không lợi dụng nhận nhiều ngày/thưởng. Múi giờ và ngày đủ điều kiện được xác định/lưu ở server.
- `studiedWordCount` chỉ là số từ đã học trong attempt; không tự coi đó là số từ mới đã thành thạo SRS.

**Tích hợp với Learning service đang có:**

- `GamificationRecorder.recordCorrectAnswers` hiện nhận questionVersionId từ Learning content. VocabularySenseId và unitId không phải questionVersionId; không gửi giả vào luồng đó.
- `StreakRecorder` hiện lắng nghe `QuestionEventsAppended` ở Learning service. Hoàn thành bài mobile hoặc ghi review flashcard không mặc nhiên phát đúng sự kiện này.
- Cần handler/hàm nghiệp vụ riêng nhận hoàn thành vocabulary unit và gọi cơ chế ledger, level, streak hiện có. Đội BE quyết định service sở hữu dữ liệu; không cần tạo thêm microservice.
- Nếu tách Library/Learning service, đề xuất transactional outbox phát `VocabularyUnitCompleted` sau khi lưu kết quả; Learning consumer chống trùng bằng eventId và khóa thưởng bền vững.
- Event tối thiểu: eventId, schemaVersion, userId, topicId, unitId, revision, attemptId, occurredAt, gradedStepCount, firstTryCorrectCount, studiedWordCount, firstCompletion. Quyết định thưởng do Learning xác minh theo policy và ledger.
- Nếu xử lý đồng bộ xong: `reward.status=APPLIED`, trả số thực. Nếu đang chờ: `PENDING`, các số chưa biết trả null; mobile không cộng tạm. GET attempt phải cập nhật phần reward sau xử lý để mobile tải lại. Có retry/dead-letter/đối soát nếu event thất bại.
- Có thể phát hành đồng bộ tiến độ trước, để reward `DISABLED`; giao diện chỉ hiển thị thưởng sau khi tích hợp hoàn tất.

## 8. Lưu từ vào flashcard và thống kê

- Giữ thao tác lưu từ do người dùng chọn. Ưu tiên API notebook/entries với vocabularySenseId để tái sử dụng flashcard đã có, tránh tạo nhiều thẻ cho cùng nghĩa.
- Nếu vẫn tổ chức theo bộ của chủ đề, mobile có thể gọi API deck hiện có sau khi lấy flashcardId từ notebook. Nếu cần tự động tạo/gắn bộ một cách atomic, BE có thể bổ sung thao tác riêng; không phải điều kiện bắt buộc để hoàn thành unit.
- Không gửi review flashcard giả cho mọi từ vừa học để tạo số liệu hoặc thưởng. Ôn SRS và hoàn thành unit là hai sự kiện khác nhau.
- Thống kê notebook và tiến độ unit cần tên/semantics riêng. “3/9 bài hoàn thành” không tương đương “33% từ đã ghi nhớ”.
- API catalog công khai không chứa cờ `saved` theo user; lấy trạng thái đã lưu bằng API saved hoặc response xác thực riêng.

## 9. Phiên bản nội dung và dữ liệu lưu

Các dữ liệu logic cần có (tên bảng do BE quyết định):

- Unit: ID ổn định, topicId, thứ tự, title, kind, trạng thái draft/published, revision.
- Unit revision: tập vocabularySenseId có thứ tự; mẫu bài tập và đáp án chuẩn. Snapshot revision đã dùng không bị sửa tại chỗ.
- User unit progress: userId, unitId, trạng thái/hoàn thành, attempt hiện tại, thời điểm, kết quả tốt nhất. Unique userId + unitId.
- Attempt + step submissions: userId, unit/revision, trạng thái, thứ tự, đáp án đã nộp, kết quả server, requestId và payload hash để idempotency.
- Completion/outbox/reward linkage: attemptId, eventId, xử lý thưởng, kết quả; đủ dữ liệu đối soát.
- Revision mới không làm mất lịch sử. Attempt đang làm dùng snapshot cũ; nếu bắt buộc thu hồi thì trả lỗi rõ, không âm thầm chấm bằng đáp án mới.
- Không khóa lại bài đã hoàn thành khi thêm/chèn unit. Bài mới nhận trạng thái theo prerequisite đã xác định. Progress trả curriculumVersion để mobile phát hiện cache nội dung cũ.
- Tiến độ AsyncStorage cũ không phải bằng chứng đáng tin cậy để thưởng hồi tố. Bản đầu không chuyển số local thành XP/streak; nếu muốn import tiến độ cần endpoint/policy riêng và đánh dấu nguồn import, không thưởng tự động.
- Khách có thể xem/học thử local bằng catalog. Đồng bộ tài khoản và thưởng chỉ áp dụng khi đăng nhập. Bản đầu không yêu cầu thưởng offline; mất mạng giữ đáp án chờ retry, không tự mở khóa bằng kết quả chưa xác nhận.

## 10. Lỗi và quy ước response

Response lỗi đề xuất:

```json
{
  "code": "VOCAB_UNIT_LOCKED",
  "message": "Hoàn thành bài trước để tiếp tục.",
  "details": { "requiredUnitId": "uuid" },
  "traceId": "server-trace-id"
}
```

| HTTP | Code đề xuất | Mobile xử lý |
|---|---|---|
| 401 | UNAUTHENTICATED | Đăng nhập lại |
| 403 hoặc 409 | VOCAB_UNIT_LOCKED | Hiện bài cần hoàn thành, tải lại progress |
| 404 | VOCAB_UNIT_NOT_FOUND / ATTEMPT_NOT_FOUND | Không tồn tại, không thuộc người dùng hoặc không công khai |
| 409 | ATTEMPT_EXPIRED / CONTENT_VERSION_RETIRED | Thông báo và tải phiên hợp lệ; không mất lịch sử đã hoàn thành |
| 409 | IDEMPOTENCY_CONFLICT | Cùng requestId khác dữ liệu; không tự retry với ID mới |
| 409 | STEP_OUT_OF_ORDER / ATTEMPT_NOT_COMPLETABLE | Lấy lại attempt và tiếp tục đúng bước |
| 422 | INVALID_ANSWER | Chỉ rõ field không hợp lệ; đáp án sai bình thường trả 200 + INCORRECT |
| 429 | RATE_LIMITED | Trả Retry-After |
| 5xx | SERVER_ERROR | Cho retry cùng requestId |

Giữ envelope và error format nhất quán với gateway hiện có. Các field `details/traceId` có thể map theo chuẩn BE, nhưng phải có machine-readable code. Media lỗi không biến thành lỗi mất kết nối API toàn màn hình.

## 11. Checklist nghiệm thu để đội BE bàn giao

- [ ] Có dữ liệu mẫu ít nhất 2 chủ đề, mỗi chủ đề nhiều unit với từ đúng nội dung tên bài.
- [ ] Mọi unit trả nội dung không rỗng; wordCount/uniqueWordCount chính xác, sortOrder ổn định.
- [ ] Phân biệt đúng các nghĩa của từ đa nghĩa bằng vocabularySenseId.
- [ ] Hỗ trợ WORD, CHOICE, MATCH, FILL; không tạo quiz chỉ có một lựa chọn hoặc ghép một cặp.
- [ ] Mở bài đầu mỗi chủ đề, chặn bài khóa trên server; complete hợp lệ mở đúng bài tiếp.
- [ ] Đang học ở máy A, đăng nhập máy B thấy cùng tiến độ và tiếp tục đúng bước.
- [ ] Sai đáp án có feedback, làm lại được; accuracy lần đầu không bị tăng giả khi retry.
- [ ] Mất mạng sau khi server đã nhận: gửi lại answer/complete không ghi trùng, không thưởng trùng.
- [ ] Hai máy bấm hoàn thành đồng thời vẫn chỉ có một lần thưởng unit.
- [ ] Replay không thưởng XP lần đầu lần nữa; streak tuân theo policy đã chốt.
- [ ] Daily cap, nửa đêm, đổi timezone, event đến muộn đều có kiểm thử nghiệp vụ.
- [ ] Reward pending có thể tải lại đến trạng thái applied, có đối soát khi xử lý thất bại.
- [ ] Thêm từ/sửa nội dung không làm mất nghĩa ID bài hoặc kết quả cũ.
- [ ] Ảnh/audio HTTPS dùng được từ thiết bị; dữ liệu null có fallback.
- [ ] Không cần tạo flashcard để được học/hoàn thành unit; lưu từ là thao tác độc lập.
- [ ] Cung cấp OpenAPI, enum, ví dụ request/response và lỗi, dữ liệu seed, giới hạn payload/phân trang, cơ chế auth/gateway.

Thứ tự thực hiện: **P0** curriculum/unit + attempt/chấm đáp án + progress/mở khóa; **P1** nối XP/streak với hệ thống hiện tại và chống trùng; **P2** nhập tiến độ cũ, offline sync, thống kê nâng cao nếu có yêu cầu. API notebook đã tồn tại được mobile tích hợp song song.

## 12. Căn cứ mã BE đã đọc

- `backend/services/library-service/.../api/controller/VocabularyCatalogController.java`
- `backend/services/library-service/.../api/controller/VocabularyController.java`
- `backend/services/library-service/.../api/controller/VocabularyLookupController.java`
- `backend/services/library-service/.../api/controller/VocabularyNotebookController.java`
- `backend/services/library-service/.../api/controller/VocabularyProgressController.java`
- `backend/services/library-service/.../application/usecase/ReviewFlashcardUseCase.java`
- `backend/services/learning-service/.../application/service/GamificationRecorder.java`
- `backend/services/learning-service/.../application/service/StreakRecorder.java`
- `backend/services/learning-service/.../api/controller/GamificationController.java`
- `backend/services/learning-service/.../api/controller/StreakController.java`

Đây là đối chiếu source code trong workspace, không phải xác nhận các API mới đã tồn tại trên môi trường đang chạy.
