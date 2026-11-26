// Ported from frontend/src/features/learning-path/lib/attemptSnapshot.ts. Keep behaviour in step with the web version.
import type { AttemptStructure, MediaAudio, Passage, Question, QuestionOption, SectionSnapshot } from './types'

export interface TestItem {
  id: string
  sortOrder: number
  /** `null` when the snapshot is a kind this client cannot render yet. */
  question: Question | null
}

export interface TestSection {
  id: string
  sortOrder: number
  partNo: number | null
  snapshot: SectionSnapshot | null
  items: TestItem[]
  startedAt: string | null
  completedAt: string | null
}

function parseJson(raw: string | null): unknown {
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** Passage text as Content stores it: blank-line separated paragraphs, each optionally starting with "A. ". */
function passageFromText(text: string): Passage {
  const paragraphs = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean).map((block) => {
    const labelled = /^([A-Z])\.\s+([\s\S]*)$/.exec(block)
    return labelled ? { label: labelled[1], text: labelled[2] } : { label: null, text: block }
  })
  return { title: '', paragraphs }
}

function toPassage(value: unknown): Passage | null {
  // Assessment snapshots carry the passage as plain text.
  if (typeof value === 'string') return passageFromText(value)
  if (!isRecord(value)) return null
  if (typeof value.title === 'string' && Array.isArray(value.paragraphs)) {
    const paragraphs = value.paragraphs.filter((paragraph): paragraph is Passage['paragraphs'][number] =>
      isRecord(paragraph) && typeof paragraph.text === 'string' && (paragraph.label === null || typeof paragraph.label === 'string'))
    return { title: value.title, paragraphs }
  }
  if (typeof value.text === 'string') return passageFromText(value.text)
  return null
}

function toAudio(value: unknown): MediaAudio | null {
  if (!isRecord(value)) return null
  const url = typeof value.url === 'string' ? value.url : typeof value.mediaUrl === 'string' ? value.mediaUrl : null
  if (!url) return null
  return {
    mediaUrl: url,
    durationSeconds: typeof value.durationSeconds === 'number' ? value.durationSeconds : null,
    transcript: typeof value.transcript === 'string' ? value.transcript : null,
  }
}

function toSectionSnapshot(raw: string): SectionSnapshot | null {
  const value = parseJson(raw)
  if (!isRecord(value) || typeof value.title !== 'string') return null
  const passage = value.passage != null ? toPassage(value.passage) : null
  const audio = value.audio != null ? toAudio(value.audio) : null
  if (!passage && !audio) {
    return {
      title: value.title,
      instructions: typeof value.instructions === 'string' ? value.instructions : '',
      skill: typeof value.skill === 'string' ? value.skill : undefined,
      passage: { title: '', paragraphs: [] },
      audio: null,
      partNo: typeof value.partNo === 'number' ? value.partNo : undefined,
      groups: toGroups(value.groups),
    }
  }
  return {
    title: value.title,
    instructions: typeof value.instructions === 'string' ? value.instructions : '',
    skill: typeof value.skill === 'string' ? value.skill : undefined,
    passage,
    audio,
    partNo: typeof value.partNo === 'number' ? value.partNo : undefined,
    groups: toGroups(value.groups),
  }
}

function toGroups(value: unknown): NonNullable<SectionSnapshot['groups']> {
  if (!Array.isArray(value)) return []
  return value.filter((group): group is Record<string, unknown> => isRecord(group) && typeof group.groupId === 'string')
    .map((group) => ({
      groupId: String(group.groupId),
      sortOrder: typeof group.sortOrder === 'number' ? group.sortOrder : 0,
      formatCode: typeof group.formatCode === 'string' ? group.formatCode : 'OTHER',
      instructions: typeof group.instructions === 'string' ? group.instructions : null,
    }))
}

function toOptions(value: unknown): QuestionOption[] | null | undefined {
  if (value === null) return null
  if (!Array.isArray(value)) return undefined
  const options = value.filter((option): option is QuestionOption =>
    isRecord(option) && typeof option.value === 'string' && typeof option.label === 'string')
  return options.length === value.length ? options : undefined
}

function toQuestion(itemId: string, raw: string, sortOrderFallback = 0): Question | null {
  const value = parseJson(raw)
  if (!isRecord(value)) return null
  const prompt = typeof value.prompt === 'string' ? value.prompt : typeof value.stem === 'string' ? value.stem : null
  const number = typeof value.number === 'number'
    ? value.number
    : typeof value.sortOrder === 'number'
      ? value.sortOrder
      : sortOrderFallback > 0
        ? sortOrderFallback
        : null
  if (prompt === null || number === null) return null
  const options = toOptions(
    Array.isArray(value.options)
      ? value.options.map((option) => {
          if (!isRecord(option)) return option
          if (typeof option.value === 'string' && typeof option.label === 'string') return option
          if (typeof option.optionKey === 'string' && typeof option.content === 'string') {
            return { value: option.optionKey, label: option.content }
          }
          return option
        })
      : value.options,
  )
  if (options === undefined) return null
  return {
    id: itemId,
    number,
    prompt,
    options,
    hint: typeof value.hint === 'string' ? value.hint : null,
    groupId: typeof value.groupId === 'string' ? value.groupId : null,
  }
}

export function parseAttemptStructure(structure: AttemptStructure): TestSection[] {
  return [...structure.sections]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) => ({
      id: section.id,
      sortOrder: section.sortOrder,
      partNo: section.partNo ?? null,
      snapshot: toSectionSnapshot(section.snapshot),
      startedAt: section.startedAt ?? null,
      completedAt: section.completedAt ?? null,
      items: [...section.items]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          id: item.id,
          sortOrder: item.sortOrder,
          question: toQuestion(item.id, item.questionSnapshot, item.sortOrder),
        })),
    }))
}
