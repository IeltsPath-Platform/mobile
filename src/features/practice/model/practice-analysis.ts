// Ported from frontend/src/features/practice/lib/practiceAnalysis.ts. Keep behaviour in step with the web version.
/** Rules that turn the numbers of a finished practice test into ratings, priorities and advice. */

/** `skipped` is a format the learner did not answer at all, which says nothing about how well they handle it. */
export type AccuracyRating = 'excellent' | 'good' | 'average' | 'weak' | 'veryWeak' | 'skipped'

export const RATING_LABELS: Record<AccuracyRating, string> = {
  excellent: 'Xuất sắc',
  good: 'Tốt',
  average: 'Trung bình',
  weak: 'Yếu',
  veryWeak: 'Rất yếu',
  skipped: 'Chưa làm',
}

/** Below this share of correct answers a question format counts as a reason for losing points. */
export const WEAK_BELOW_PERCENT = 50

/** The share of correct answers decides the rating: 90+ excellent, 75+ good, 50+ average, 25+ weak, else very weak. */
export function rateAccuracy(percent: number): Exclude<AccuracyRating, 'skipped'> {
  if (percent >= 90) return 'excellent'
  if (percent >= 75) return 'good'
  if (percent >= 50) return 'average'
  if (percent >= 25) return 'weak'
  return 'veryWeak'
}

export interface FormatStat {
  formatCode: string
  total: number
  correct: number
  incorrect: number
  blank: number
}

export interface RatedFormat extends FormatStat {
  percent: number
  rating: AccuracyRating
  /**
   * 1 for the formats at the lowest share of correct answers, 2 for the next lowest share, otherwise null. Formats at the
   * same share have the same priority, so a tie is never broken by a rule the learner cannot see.
   */
  priority: 1 | 2 | null
}

/** True when every question of the format was left blank. */
export function isSkipped(stat: FormatStat): boolean {
  return stat.total > 0 && stat.blank >= stat.total
}

const questionsLost = (format: FormatStat) => format.total - format.correct

/**
 * Rates every format. Only formats the learner actually answered and that fall under the weak line can be a priority.
 * They are grouped by their share of correct answers: the lowest share is priority 1 (every format at it, however many),
 * the next lowest share is priority 2. The table lists the priorities first, then the other answered formats weakest
 * first, and the skipped formats last; inside one share the format that lost more questions comes first.
 */
export function rateFormats(stats: readonly FormatStat[]): RatedFormat[] {
  const rated = stats.map((stat): RatedFormat => {
    const percent = stat.total ? Math.round(stat.correct / stat.total * 100) : 0
    return { ...stat, percent, rating: isSkipped(stat) ? 'skipped' : rateAccuracy(percent), priority: null }
  })
  const weakShares = [...new Set(rated.filter((format) => format.rating !== 'skipped' && format.percent < WEAK_BELOW_PERCENT).map((format) => format.percent))].sort((a, b) => a - b)
  for (const format of rated) {
    const tier = weakShares.indexOf(format.percent)
    if (format.rating !== 'skipped' && tier >= 0 && tier < 2) format.priority = tier === 0 ? 1 : 2
  }
  const position = (format: RatedFormat) => format.priority ?? (format.rating === 'skipped' ? 4 : 3)
  return rated.sort((a, b) => position(a) - position(b) || a.percent - b.percent || questionsLost(b) - questionsLost(a) || b.total - a.total)
}

/** The formats of one priority level (they share the same share of correct answers), the one that lost most first. */
export function priorityFormats(rated: readonly RatedFormat[], priority: 1 | 2): RatedFormat[] {
  return rated.filter((format) => format.priority === priority).sort((a, b) => questionsLost(b) - questionsLost(a) || b.total - a.total)
}

/** The formats that explain the lost points: answered ones under the weak line, worst first. */
export function weakFormats(rated: readonly RatedFormat[]): RatedFormat[] {
  return rated
    .filter((format) => format.rating !== 'skipped' && format.percent < WEAK_BELOW_PERCENT)
    .sort((a, b) => a.percent - b.percent || questionsLost(b) - questionsLost(a) || b.total - a.total)
}

/** The formats the learner did not answer at all, the longest first. */
export function skippedFormats(rated: readonly RatedFormat[]): RatedFormat[] {
  return rated.filter((format) => format.rating === 'skipped').sort((a, b) => b.total - a.total)
}

/** One line of method for each question format; unknown formats get a general tip. */
const FORMAT_TIPS: Record<string, string> = {
  TRUE_FALSE_NOT_GIVEN: 'Phân biệt FALSE (trái ngược với bài) và NOT GIVEN (bài không nhắc tới); đừng dùng kiến thức bên ngoài.',
  YES_NO_NOT_GIVEN: 'Tìm ý kiến của tác giả chứ không phải sự kiện; chú ý các từ chỉ mức độ như may, usually, all.',
  GAP_FILLING: 'Đoán loại từ cần điền trước; chép đúng từ trong bài và tuân thủ giới hạn số từ.',
  SENTENCE_COMPLETION: 'Tìm câu gốc trong bài bằng từ khóa, rồi điền đúng dạng từ và giới hạn số từ.',
  SUMMARY_COMPLETION: 'Đọc cả đoạn tóm tắt để hiểu ý, đoán loại từ cần điền rồi tìm trong đoạn tương ứng của bài.',
  FORM_COMPLETION: 'Đoán loại thông tin cần điền (số, tên, ngày); nghe kỹ chính tả và các con số.',
  NOTE_COMPLETION: 'Gạch từ khóa của từng ô trước khi nghe; ghi đúng chính tả và giới hạn số từ.',
  MULTIPLE_CHOICE_ONE: 'Gạch từ khóa của cả ba đáp án; loại đáp án sai trước và cẩn thận với các từ gây nhiễu.',
  MULTIPLE_CHOICE_MANY: 'Xác định đủ số đáp án cần chọn; xét từng phương án với đoạn văn tương ứng.',
  MATCHING_INFORMATION: 'Lấy từ khóa của thông tin cần tìm rồi lướt qua từng đoạn; một đoạn có thể được dùng nhiều lần.',
  MATCHING_HEADINGS: 'Đọc câu đầu và câu cuối mỗi đoạn để nắm ý chính; loại các tiêu đề chỉ trùng từ khóa.',
  MATCHING: 'Đọc trước danh sách lựa chọn; chúng thường xuất hiện theo thứ tự nên đừng kẹt ở câu đã lỡ.',
  MAP_DIAGRAM_LABEL: 'Xác định các mốc trên bản đồ hoặc sơ đồ trước khi nghe, rồi theo dõi từ chỉ hướng và vị trí.',
  MATCHING_FEATURES:'Đọc trước danh sách lựa chọn; chúng thường xuất hiện theo thứ tự nên đừng kẹt ở câu đã lỡ.',
}
const GENERAL_TIP = 'Luyện riêng dạng này để quen cách hỏi và rút kinh nghiệm từ phần giải thích.'

export function formatTip(formatCode: string): string {
  return FORMAT_TIPS[formatCode] ?? GENERAL_TIP
}

/** The mascot's sentence, chosen by the overall share of correct answers. */
export function mascotMessage(percent: number): string {
  if (percent >= 90) return 'Xuất sắc! Gần như tuyệt đối, bạn đã sẵn sàng cho thử thách cao hơn!'
  if (percent >= 75) return 'Rất tốt! Bạn nắm khá chắc, chỉ cần soát lại vài dạng nhỏ nữa thôi.'
  if (percent >= 50) return 'Khá ổn! Củng cố thêm các dạng còn yếu để lên band nhanh hơn nhé.'
  if (percent >= 25) return 'Đề IELTS hơi khó bạn nhỉ, mình cố tiếp cùng nhau nha, từ từ sẽ giỏi thôi!'
  return 'Đừng nản nhé! Hãy xem phần giải thích và luyện từng dạng một, bạn sẽ tiến bộ.'
}

export interface TimeAdvice {
  /** spent / limit, or null when there is no limit to compare with. */
  usedShare: number | null
  secondsPerQuestion: number | null
  message: string
}

/**
 * Compares the time the learner took with the time the test gives. A very short attempt on a long test usually means
 * guessing, a very long one means the pace is too slow for the real exam.
 */
export function adviseTime(spentSeconds: number | null, limitSeconds: number | null, questionCount: number): TimeAdvice {
  if (spentSeconds === null) return { usedShare: null, secondsPerQuestion: null, message: 'Chưa ghi nhận được thời gian làm bài.' }
  const perQuestion = questionCount > 0 ? Math.round(spentSeconds / questionCount) : null
  if (!limitSeconds) return { usedShare: null, secondsPerQuestion: perQuestion, message: perQuestion === null ? '' : `Bạn dùng khoảng ${perQuestion} giây cho mỗi câu.` }
  const share = spentSeconds / limitSeconds
  const pace = perQuestion === null ? '' : ` (khoảng ${perQuestion} giây/câu)`
  let message: string
  if (share < 0.3) message = `Bạn nộp bài sau chỉ ${Math.round(share * 100)}% thời gian cho phép${pace}, nhiều khả năng đã đoán đáp án. Hãy đọc kỹ hơn và dành thời gian soát lại.`
  else if (share <= 0.85) message = `Bạn dùng ${Math.round(share * 100)}% thời gian cho phép${pace}, còn dư thời gian để soát lại đáp án.`
  else if (share <= 1) message = `Bạn dùng gần hết thời gian${pace}. Hãy luyện tăng tốc để còn thời gian soát bài.`
  else message = `Bạn làm quá thời gian quy định${pace}. Hãy giới hạn thời gian cho từng phần khi luyện.`
  return { usedShare: share, secondsPerQuestion: perQuestion, message }
}

/** mm:ss, or h:mm:ss from an hour on; a dash when the value is unknown. */
export function formatMinutes(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  const safe = Math.max(0, Math.round(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const rest = String(safe % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${String(minutes).padStart(2, '0')}:${rest}`
}

/** hh:mm:ss, the way the exam clock shows it. */
export function formatClockTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  const safe = Math.max(0, Math.round(seconds))
  return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60].map((value) => String(value).padStart(2, '0')).join(':')
}
