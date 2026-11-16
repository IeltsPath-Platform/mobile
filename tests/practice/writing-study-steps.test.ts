import { describe, expect, it } from 'vitest'
import type { EssayKnowledgeJudgment, EssayStudyPoint } from '@/src/features/practice/model/types'
import { buildNextSteps } from '@/src/features/practice/model/writing-study-steps'

const criterion = (code: string, band: number, name = `Tên ${code}`, extra: Partial<EssayStudyPoint> = {}): EssayStudyPoint => ({
  kind: 'CRITERION', criterionCode: code, band, knowledgePointId: `kp-${code}`, code: `C_${code}`, name, title: null,
  reason: 'Write a clear overview and meet the minimum length.', ...extra,
})
const failedPoint: EssayStudyPoint = {
  kind: 'KNOWLEDGE_POINT', criterionCode: null, band: null, knowledgePointId: 'kp-chart', code: 'CHART', name: 'Mô tả biểu đồ (Task 1)',
  title: 'Mô tả biểu đồ (Task 1)', reason: 'Nêu sai xu hướng chính.', excerpt: 'Overall, the young people is going library.',
  practiceKnowledgePointId: 'kp-chart',
}
const note = (title: string, reason: string): EssayStudyPoint => ({
  kind: 'AI', criterionCode: null, band: null, knowledgePointId: null, code: null, name: null, title, reason,
})
const judgment = (name: string, value: EssayKnowledgeJudgment['judgment']): EssayKnowledgeJudgment => ({
  knowledgePointId: name, code: null, name, judgment: value, excerpt: null, reason: null,
})

describe('buildNextSteps', () => {
  it('lists failed points of the question first, then weak criteria, then advice that names no criterion', () => {
    const { steps } = buildNextSteps([
      criterion('TA', 3), criterion('LR', 4), failedPoint, note('Paragraphing', 'Split the essay in four.'),
    ], undefined)
    expect(steps.map((step) => step.kind)).toEqual(['KNOWLEDGE_POINT', 'CRITERION', 'CRITERION', 'NOTE'])
    expect(steps.map((step) => step.title)).toEqual(['Mô tả biểu đồ (Task 1)', 'Tên TA', 'Tên LR', 'Paragraphing'])
  })

  it('names a weak criterion and its band and drops the English line the catalog gives it', () => {
    const [step] = buildNextSteps([criterion('TA', 3, 'Hoàn thành yêu cầu Task 1 (TA)')], undefined).steps
    expect(step.title).toBe('Hoàn thành yêu cầu Task 1 (TA)')
    expect(step.meta).toBe('Task Achievement · band 3.0')
    expect(step.reasons).toEqual([])
  })

  it('shows the advice about a criterion under that criterion', () => {
    const { steps } = buildNextSteps([
      criterion('TA', 3), note('Task Achievement', 'Luyện đọc bảng và viết overview đúng xu hướng chính.'),
    ], undefined)
    expect(steps).toHaveLength(1)
    expect(steps[0].reasons).toEqual(['Luyện đọc bảng và viết overview đúng xu hướng chính.'])
  })

  it('carries the sentence and the reason of a failed point, and its practice target', () => {
    const [step] = buildNextSteps([failedPoint], undefined).steps
    expect(step.excerpt).toBe('Overall, the young people is going library.')
    expect(step.reasons).toEqual(['Nêu sai xu hướng chính.'])
    expect(step.target).toBe('kp-chart')
  })

  it('has no practice target for a failed point without a practice set, and none for advice', () => {
    const steps = buildNextSteps([{ ...failedPoint, practiceKnowledgePointId: null }, note('Paragraphing', 'x')], undefined).steps
    expect(steps.map((step) => step.target)).toEqual([null, null])
  })

  it('does not list a failed judgment a second time', () => {
    const result = buildNextSteps([failedPoint], [judgment('Mô tả biểu đồ (Task 1)', 'FAIL'), judgment('Từ vựng xu hướng', 'PASS')])
    expect(result.steps).toHaveLength(1)
    expect(result.passed).toEqual(['Từ vựng xu hướng'])
    expect(result.unassessed).toEqual([])
  })

  it('keeps the points that were not judged apart from the passed ones', () => {
    const result = buildNextSteps([], [judgment('A', 'PASS'), judgment('B', 'NOT_ASSESSED')])
    expect(result).toMatchObject({ steps: [], passed: ['A'], unassessed: ['B'] })
  })
})
