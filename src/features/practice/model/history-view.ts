// Ported from frontend/src/features/practice/history/submissionHistoryView.ts. Links keep the web paths; routeOf() maps them to app screens.
const lessonPracticePath = (lessonId: string) => `/learn/lessons/${lessonId}?view=practice`
const freePracticePath = (attemptId: string) => `/learn/practice/${attemptId}`
import { dateText, taskText } from './examiner-reviews-view'
import type { ReadingHistoryItem } from '../api/attempts'
import type { SubmissionHistoryItem } from '../api/history'

/** How a line of the history looks: `done` is a result, `wait` something still being graded, `late` a result that did not pass. */
export type HistoryTone = 'done' | 'wait' | 'late'

export interface HistoryRow {
  key: string
  tone: HistoryTone
  /** The square at the start of the line: a band or a score; null shows the icon of where the line stands. */
  mark: { label: string; value: string } | null
  meta: string
  title: string
  facts: string[]
  status: string
  /** Where the line opens; null when the record has nothing to open. */
  href: string | null
  openLabel: string
}

/** Names the client looked up for the ids of a page; a name that could not be found is simply missing. */
export interface HistoryNames {
  topics: ReadonlyMap<string, string>
  courses: ReadonlyMap<string, string>
}

export const NO_NAMES: HistoryNames = { topics: new Map(), courses: new Map() }

const SKILL_TEXT: Record<string, string> = { READING: 'Reading', LISTENING: 'Listening', WRITING: 'Writing', SPEAKING: 'Speaking' }
export const skillText = (skill: string | null | undefined) => SKILL_TEXT[skill ?? ''] ?? 'Bài làm'

const bandMark = (band: number | null | undefined) => (band == null ? null : { label: 'Band', value: band.toFixed(1) })
const percentMark = (percent: number | null | undefined) => (percent == null ? null : { label: 'Điểm', value: `${Math.round(percent)}%` })

interface Status { text: string; tone: HistoryTone }

/** An essay: graded, or where it stands while it is not. */
function essayStatus(status: string | null | undefined): Status {
  switch (status) {
    case 'GRADED': return { text: 'Đã chấm', tone: 'done' }
    case 'AWAITING_EXAMINER': return { text: 'Chờ giáo viên chấm', tone: 'wait' }
    case 'PAYMENT_PENDING': return { text: 'Đang hoàn tất', tone: 'wait' }
    default: return { text: 'Đang chấm', tone: 'wait' }
  }
}

function speakingStatus(status: string | null | undefined): Status {
  if (status === 'GRADED') return { text: 'Đã chấm', tone: 'done' }
  if (status === 'NEEDS_EXAMINER') return { text: 'Chờ giáo viên chấm', tone: 'wait' }
  return { text: 'Đang chấm', tone: 'wait' }
}

const essayPath = (id: string) => `/practice/writing/submissions/${id}/result`
const speakingPath = (id: string) => `/practice/speaking/submissions/${id}/result`

/** An essay line, for a lesson or for free practice; `where` is the words after the task, such as "Writing trong bài học". */
function essayRow(item: SubmissionHistoryItem, where: string): HistoryRow {
  const status = essayStatus(item.status)
  const revision = item.revisionNo != null && item.revisionNo > 1 ? [`Lần ${item.revisionNo}`] : []
  return {
    key: `${item.kind}:${item.id}`, tone: status.tone, mark: status.tone === 'done' ? bandMark(item.band) : null,
    meta: `${taskText(item.task)} · ${where}`, title: item.promptPreview || 'Bài viết của bạn',
    facts: [`Nộp ${dateText(item.submittedAt)}`, ...revision], status: status.text, href: essayPath(item.id),
    openLabel: status.tone === 'done' ? 'Xem nhận xét' : 'Xem bài',
  }
}

function speakingRow(item: SubmissionHistoryItem, where: string, title: string): HistoryRow {
  const status = speakingStatus(item.status)
  return {
    key: `${item.kind}:${item.id}`, tone: status.tone, mark: status.tone === 'done' ? bandMark(item.band) : null,
    meta: where, title, facts: [`Nộp ${dateText(item.submittedAt)}`], status: status.text, href: speakingPath(item.id),
    openLabel: status.tone === 'done' ? 'Xem nhận xét' : 'Xem bài',
  }
}

/** A test taken inside a course: topic test, course test or a practice test milestone. */
function testRow(item: SubmissionHistoryItem, meta: string, title: string, query: string): HistoryRow {
  return {
    key: `${item.kind}:${item.id}`, tone: 'done', mark: percentMark(item.percent), meta, title,
    facts: [`Nộp ${dateText(item.submittedAt)}`], status: 'Đã nộp',
    href: item.attemptId ? `/learn/tests/${item.attemptId}/result${query}` : null, openLabel: 'Xem kết quả',
  }
}

/** A lesson's line has no title of its own, so it is named by the topic of its lesson when that is known. */
function inTopic(item: SubmissionHistoryItem, names: HistoryNames, what: string, fallback: string): string {
  const topic = item.topicId ? names.topics.get(item.topicId) : undefined
  return topic ? `${what} trong chủ đề “${topic}”` : fallback
}

/** A line of the "Trong khóa học" tab. */
export function courseRow(item: SubmissionHistoryItem, names: HistoryNames = NO_NAMES): HistoryRow {
  switch (item.kind) {
    case 'PRACTICE': {
      const total = item.totalCount ?? 0
      const correct = item.correctCount ?? 0
      const passed = item.passed === true
      return {
        key: `${item.kind}:${item.id}`, tone: passed ? 'done' : 'late', mark: total > 0 ? percentMark((correct / total) * 100) : null,
        meta: `Practice · ${skillText(item.skill)}`, title: inTopic(item, names, 'Practice', 'Practice của bài học'),
        facts: [`Nộp ${dateText(item.submittedAt)}`, ...(total > 0 ? [`Đúng ${correct}/${total} câu`] : [])],
        status: passed ? 'Đạt' : 'Chưa đạt', href: item.lessonId ? lessonPracticePath(item.lessonId) : null, openLabel: 'Xem bài học',
      }
    }
    case 'WRITING': return essayRow(item, 'Writing trong bài học')
    case 'SPEAKING': return speakingRow(item, 'Speaking trong bài học', inTopic(item, names, 'Speaking', 'Bài Speaking trong bài học'))
    case 'TOPIC_TEST':
      return testRow(item, 'Thi topic', (item.topicId && names.topics.get(item.topicId)) || 'Bài thi topic', item.topicId ? `?topic=${item.topicId}` : '')
    case 'COURSE_TEST':
      return testRow(item, 'Thi cuối khóa', (item.courseId && names.courses.get(item.courseId)) || 'Bài thi cuối khóa', item.courseId ? `?course=${item.courseId}` : '')
    case 'PRACTICE_TEST':
      return testRow(item, 'Practice test của khóa', (item.courseId && names.courses.get(item.courseId)) || 'Practice test của khóa',
        item.courseId ? `?course=${item.courseId}&practice=1` : '')
    default:
      return { key: `${item.kind}:${item.id}`, tone: 'done', mark: null, meta: 'Bài nộp', title: 'Bài nộp trong khóa học', facts: [`Nộp ${dateText(item.submittedAt)}`],
        status: 'Đã nộp', href: null, openLabel: 'Xem' }
  }
}

/** A line of the free practice tab for Writing or Speaking. */
export function freeRow(item: SubmissionHistoryItem): HistoryRow {
  if (item.kind === 'SPEAKING') return speakingRow(item, 'Luyện tập tự do · Speaking', 'Bài Speaking')
  return essayRow(item, 'Luyện tập tự do')
}

/** A line of the "Luyện theo kiến thức" tab: one free practice set on a knowledge point. */
export function knowledgeRow(item: SubmissionHistoryItem): HistoryRow {
  const total = item.totalCount ?? 0
  const correct = item.correctCount ?? 0
  const passed = item.passed === true
  const name = item.knowledgePointName?.trim() || 'Điểm kiến thức'
  const attemptId = item.attemptId ?? item.id
  return {
    key: `${item.kind}:${item.id}`, tone: passed ? 'done' : 'late', mark: total > 0 ? percentMark((correct / total) * 100) : null,
    meta: item.skill && SKILL_TEXT[item.skill] ? `Luyện theo kiến thức · ${SKILL_TEXT[item.skill]}` : 'Luyện theo kiến thức',
    title: name,
    facts: [`Nộp ${dateText(item.submittedAt)}`, ...(total > 0 ? [`Đúng ${correct}/${total} câu`] : [])],
    status: passed ? 'Đạt' : 'Chưa đạt', href: freePracticePath(attemptId), openLabel: 'Xem kết quả',
  }
}

/** The key `historyTitleMap` files a title under, so a practice bank title can be found for a line. */
const titleKey = (item: ReadingHistoryItem) => `${item.scope}:${item.packageId}:${item.scope === 'PART' ? item.partNos[0] ?? '' : ''}`

/** A line of the free practice tab for Listening or Reading (a submitted attempt of the practice bank). */
export function practiceRow(item: ReadingHistoryItem, titles: ReadonlyMap<string, string>): HistoryRow {
  const partNo = item.scope === 'PART' ? item.partNos[0] ?? null : null
  const partWord = item.skill === 'READING' ? 'Passage' : 'Part'
  const skill = skillText(item.skill)
  const title = titles.get(titleKey(item)) ?? `Bài ${skill}${partNo ? ` · ${partWord} ${partNo}` : ''}`
  return {
    key: `ATTEMPT:${item.attemptId}`, tone: 'done', mark: percentMark(item.percent),
    meta: `${skill} · ${partNo ? `${partWord} ${partNo}` : 'Full test'}`, title,
    facts: [`Nộp ${dateText(item.submittedAt)}`], status: 'Đã nộp',
    href: `/practice/${item.skill.toLowerCase()}/attempts/${item.attemptId}/result`, openLabel: 'Xem kết quả',
  }
}

/** Where a history link opens in the app; null for a page that only exists on the website (the learning path). */
export function routeOf(href: string): string | null {
  const essay = /^\/practice\/writing\/submissions\/([^/]+)\/result$/.exec(href);
  if (essay) return `/practice/writing-result/${essay[1]}`;
  const speaking = /^\/practice\/speaking\/submissions\/([^/]+)\/result$/.exec(href);
  if (speaking) return `/practice/speaking-result/${speaking[1]}`;
  const attempt = /^\/practice\/(reading|listening)\/attempts\/([^/]+)\/result$/.exec(href);
  if (attempt) return `/practice/result/${attempt[2]}?skill=${attempt[1]}`;
  return null;
}
