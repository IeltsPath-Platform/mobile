import { describe, expect, it } from 'vitest'
import type { ReadingHistoryItem } from '@/src/features/practice/api/attempts'
import type { SubmissionHistoryItem } from '@/src/features/practice/api/history'
import { courseRow, freeRow, knowledgeRow, practiceRow, type HistoryNames } from '@/src/features/practice/model/history-view'

const id = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const item = (overrides: Partial<SubmissionHistoryItem>): SubmissionHistoryItem => ({
  kind: 'PRACTICE', id: id(1), submittedAt: '2026-11-14T10:00:00Z', ...overrides,
})
const names: HistoryNames = {
  topics: new Map([[id(20), 'Chủ đề Tenses']]),
  courses: new Map([[id(30), 'Khóa 5.0']]),
}

describe('a line of the knowledge point practice', () => {
  it('names the point, scores the set and opens it with the way back to this tab', () => {
    const row = knowledgeRow(item({ kind: 'KP_PRACTICE', skill: 'WRITING', correctCount: 3, totalCount: 4, passed: true, attemptId: id(5),
      knowledgePointId: id(6), knowledgePointCode: 'TREND', knowledgePointName: 'Từ vựng xu hướng' }))

    expect(row.title).toBe('Từ vựng xu hướng')
    expect(row.meta).toBe('Luyện theo kiến thức · Writing')
    expect(row.mark).toEqual({ label: 'Điểm', value: '75%' })
    expect(row.facts).toContain('Đúng 3/4 câu')
    expect(row.status).toBe('Đạt')
    expect(row.href).toBe(`/learn/practice/${id(5)}`)
  })

  it('falls back to a plain name when the catalog gave none, and marks a set that did not pass', () => {
    const row = knowledgeRow(item({ kind: 'KP_PRACTICE', skill: null, correctCount: 1, totalCount: 4, passed: false, attemptId: id(5) }))

    expect(row.title).toBe('Điểm kiến thức')
    expect(row.meta).toBe('Luyện theo kiến thức')
    expect(row.tone).toBe('late')
    expect(row.status).toBe('Chưa đạt')
  })
})

describe('a line of the course history', () => {
  it('shows a Practice set as a score named by the topic of its lesson, and opens the lesson Practice', () => {
    const row = courseRow(item({ kind: 'PRACTICE', skill: 'READING', correctCount: 5, totalCount: 8, passed: true, lessonId: id(10), topicId: id(20) }), names)

    expect(row.title).toBe('Practice trong chủ đề “Chủ đề Tenses”')
    expect(row.meta).toBe('Practice · Reading')
    expect(row.mark).toEqual({ label: 'Điểm', value: '63%' })
    expect(row.facts).toContain('Đúng 5/8 câu')
    expect(row.status).toBe('Đạt')
    expect(row.tone).toBe('done')
    expect(row.href).toBe(`/learn/lessons/${id(10)}?view=practice`)
  })

  it('marks a Practice set that was not passed, and falls back to a plain title when the topic is unknown', () => {
    const row = courseRow(item({ kind: 'PRACTICE', skill: 'LISTENING', correctCount: 1, totalCount: 8, passed: false, lessonId: id(99), topicId: id(98) }), names)

    expect(row.title).toBe('Practice của bài học')
    expect(row.status).toBe('Chưa đạt')
    expect(row.tone).toBe('late')
  })

  it('shows a graded essay with its band and the revision it is, and a waiting one without a band', () => {
    const graded = courseRow(item({ kind: 'WRITING', task: 'TASK_2', promptPreview: 'Do schools matter?', band: 6.5, status: 'GRADED', revisionNo: 2 }))
    const waiting = courseRow(item({ kind: 'WRITING', id: id(2), task: 'TASK_1', status: 'AWAITING_EXAMINER', band: null }))

    expect(graded.mark).toEqual({ label: 'Band', value: '6.5' })
    expect(graded.meta).toBe('Task 2 · Writing trong bài học')
    expect(graded.facts).toContain('Lần 2')
    expect(graded.href).toBe(`/practice/writing/submissions/${id(1)}/result`)
    expect(waiting.mark).toBeNull()
    expect(waiting.status).toBe('Chờ giáo viên chấm')
    expect(waiting.tone).toBe('wait')
    expect(waiting.title).toBe('Bài viết của bạn')
  })

  it('opens a speaking submission at its result and calls an unfinished one grading', () => {
    const graded = courseRow(item({ kind: 'SPEAKING', band: 6, status: 'GRADED', lessonId: id(10), topicId: id(20) }), names)
    const queued = courseRow(item({ kind: 'SPEAKING', status: 'QUEUED' }))

    expect(graded.title).toBe('Speaking trong chủ đề “Chủ đề Tenses”')
    expect(queued.title).toBe('Bài Speaking trong bài học')
    expect(graded.mark).toEqual({ label: 'Band', value: '6.0' })
    expect(graded.href).toBe(`/practice/speaking/submissions/${id(1)}/result`)
    expect(queued.status).toBe('Đang chấm')
    expect(queued.mark).toBeNull()
  })

  it('opens each kind of test at the result page with the query that page needs', () => {
    const topic = courseRow(item({ kind: 'TOPIC_TEST', percent: 72.5, attemptId: id(5), topicId: id(20) }), names)
    const course = courseRow(item({ kind: 'COURSE_TEST', percent: 61, attemptId: id(6), courseId: id(30) }), names)
    const milestone = courseRow(item({ kind: 'PRACTICE_TEST', percent: 80, attemptId: id(7), courseId: id(30) }), names)

    expect(topic.title).toBe('Chủ đề Tenses')
    expect(topic.mark).toEqual({ label: 'Điểm', value: '73%' })
    expect(topic.href).toBe(`/learn/tests/${id(5)}/result?topic=${id(20)}`)
    expect(course.title).toBe('Khóa 5.0')
    expect(course.href).toBe(`/learn/tests/${id(6)}/result?course=${id(30)}`)
    expect(milestone.meta).toBe('Practice test của khóa')
    expect(milestone.href).toBe(`/learn/tests/${id(7)}/result?course=${id(30)}&practice=1`)
  })

  it('has nothing to open for a test whose attempt is unknown, and still shows a kind it does not know', () => {
    expect(courseRow(item({ kind: 'TOPIC_TEST', attemptId: null, topicId: id(20) })).href).toBeNull()
    const unknown = courseRow(item({ kind: 'SOMETHING_NEW' }))
    expect(unknown.title).toBe('Bài nộp trong khóa học')
    expect(unknown.href).toBeNull()
  })
})

describe('a line of the free practice history', () => {
  it('labels a free essay and a free speaking submission', () => {
    const essay = freeRow(item({ kind: 'WRITING', task: 'TASK_1', promptPreview: 'The table shows…', band: 5, status: 'GRADED' }))
    const speaking = freeRow(item({ kind: 'SPEAKING', band: 6.5, status: 'GRADED' }))

    expect(essay.meta).toBe('Task 1 · Luyện tập tự do')
    expect(essay.title).toBe('The table shows…')
    expect(speaking.meta).toBe('Luyện tập tự do · Speaking')
    expect(speaking.href).toBe(`/practice/speaking/submissions/${id(1)}/result`)
  })

  it('shows a submitted Reading or Listening attempt with its test title and score, and opens its result', () => {
    const attempt: ReadingHistoryItem = {
      attemptId: id(8), packageId: id(40), packageVersionId: id(41), skill: 'READING', scope: 'PART', partNos: [2], status: 'SUBMITTED',
      submittedAt: '2026-11-13T09:00:00Z', percent: 76.4,
    }
    const titles = new Map([[`PART:${id(40)}:2`, 'Cambridge 17 Test 1']])

    const row = practiceRow(attempt, titles)
    expect(row.title).toBe('Cambridge 17 Test 1')
    expect(row.meta).toBe('Reading · Passage 2')
    expect(row.mark).toEqual({ label: 'Điểm', value: '76%' })
    expect(row.href).toBe(`/practice/reading/attempts/${id(8)}/result`)

    const listening = practiceRow({ ...attempt, skill: 'LISTENING', scope: 'FULL', partNos: [] }, new Map())
    expect(listening.title).toBe('Bài Listening')
    expect(listening.meta).toBe('Listening · Full test')
    expect(listening.href).toBe(`/practice/listening/attempts/${id(8)}/result`)
  })
})
