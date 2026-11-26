// Ported from frontend/src/features/practice/writing/writingText.ts; drafts are kept with AsyncStorage instead of localStorage.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { USER_DATA_KEYS } from '@/src/lib/user-data-keys'
/** Same rule as the grader: letters and digits, joined by an apostrophe or a hyphen, count as one word. */
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu

export function countWords(text: string) {
  return text.match(WORD)?.length ?? 0
}

/** The parts a free essay is written in, in order. Task 1 has an overview; Task 2 ends with a conclusion. */
export function essaySections(task: 'TASK_1' | 'TASK_2' | null) {
  return task === 'TASK_2' ? ['Introduction', 'Body 1', 'Body 2', 'Conclusion'] : ['Introduction', 'Overview', 'Body 1', 'Body 2']
}

/** The essay the grader receives: one paragraph per non-empty part. */
export function joinSections(texts: string[]) {
  return texts.map((text) => text.trim()).filter(Boolean).join('\n\n')
}

export type GuideBlock = { kind: 'heading' | 'paragraph' | 'bullet'; text: string }

/** The guide is stored as light Markdown: `## ` headings, `- ` bullets and plain paragraphs. */
export function parseGuide(markdown: string | null): GuideBlock[] {
  if (!markdown) return []
  return markdown.split('\n').map((line) => line.trim()).filter(Boolean).map((line): GuideBlock => {
    if (line.startsWith('## ')) return { kind: 'heading', text: line.slice(3) }
    if (line.startsWith('- ')) return { kind: 'bullet', text: line.slice(2) }
    return { kind: 'paragraph', text: line }
  })
}

/** Splits `**bold**` runs so a guide line can be drawn without raw HTML. */
export function boldRuns(text: string): { text: string; bold: boolean }[] {
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part) => (
    part.startsWith('**') && part.endsWith('**') ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false }
  ))
}

const LINKING_WORDS = ['overall', 'however', 'whereas', 'while', 'in contrast', 'by contrast', 'moreover', 'furthermore', 'in addition',
  'therefore', 'as a result', 'for example', 'for instance', 'in conclusion', 'although', 'nevertheless', 'firstly', 'secondly', 'finally', 'on the other hand']

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'is', 'was', 'were', 'are', 'that', 'it', 'for', 'on', 'with', 'as', 'by', 'at', 'from', 'this', 'be', 'or', 'but', 'its', 'their', 'than', 'which', 'have', 'has', 'had', 'also', 'more', 'most'])

export interface EssayMetrics {
  words: number
  paragraphs: number
  wordsPerSentence: number
  linking: { word: string; count: number }[]
  linkingTotal: number
  mostRepeated: { word: string; count: number } | null
}

/** Numbers measured from the text itself, without the grader. */
export function measureEssay(text: string): EssayMetrics {
  const lower = text.toLowerCase()
  const words = countWords(text)
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter((part) => countWords(part) > 0).length
  const linking = LINKING_WORDS
    .map((word) => ({ word, count: lower.match(new RegExp(`\\b${word}\\b`, 'g'))?.length ?? 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
  const counts = new Map<string, number>()
  for (const word of lower.match(WORD) ?? []) {
    if (word.length < 4 || STOP_WORDS.has(word) || /^\d/.test(word)) continue
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return {
    words,
    paragraphs: text.split(/\n\s*\n/).filter((part) => part.trim()).length,
    wordsPerSentence: sentences ? Math.round(words / sentences) : 0,
    linking,
    linkingTotal: linking.reduce((sum, item) => sum + item.count, 0),
    mostRepeated: top && top[1] > 2 ? { word: top[0], count: top[1] } : null,
  }
}

/** The band of the lowest criterion, so the result can point at what to improve first. */
export function lowestIndex(bands: number[]) {
  return bands.reduce((best, band, index) => (band < bands[best]! ? index : best), 0)
}

/** IELTS rounding of the mean of the criteria, as the server computes it: .25 up to .5 and .75 up to the next band. */
export function roundBand(bands: number[]) {
  const mean = bands.reduce((sum, band) => sum + band, 0) / bands.length
  return Math.floor(mean * 2 + 0.5) / 2
}

const DRAFT_PREFIX = USER_DATA_KEYS.writingDraft

export interface WritingDraft {
  texts: string[]
  /** Seconds already spent, so the clock continues after a reload. */
  seconds: number
  step?: number
  hints?: number
}

export async function loadDraft(key: string): Promise<WritingDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_PREFIX + key)
    if (!raw) return null
    const draft: unknown = JSON.parse(raw)
    if (typeof draft !== 'object' || draft === null) return null
    const value = draft as Partial<WritingDraft>
    if (!Array.isArray(value.texts) || !value.texts.every((text) => typeof text === 'string')
      || typeof value.seconds !== 'number' || !Number.isFinite(value.seconds) || value.seconds < 0) return null
    return value as WritingDraft
  } catch { return null }
}

export async function saveDraft(key: string, draft: WritingDraft) {
  try { await AsyncStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(draft)) } catch { /* the draft lives in memory only */ }
}

export async function clearDraft(key: string) {
  try { await AsyncStorage.removeItem(DRAFT_PREFIX + key) } catch { /* nothing stored */ }
}

const RESULT_PREFIX = USER_DATA_KEYS.writingResult

/** What the result page shows besides the grade: how long the learner wrote and which task it was. */
export interface WritingResultContext {
  seconds: number
  timeLimitSeconds: number | null
  title: string
  mode: 'practice' | 'exam'
  retryPath: string
}

export async function storeResultContext(submissionId: string, context: WritingResultContext) {
  try { await AsyncStorage.setItem(RESULT_PREFIX + submissionId, JSON.stringify(context)) } catch { /* the page falls back to the grade alone */ }
}

export async function loadResultContext(submissionId: string): Promise<WritingResultContext | null> {
  try {
    const raw = await AsyncStorage.getItem(RESULT_PREFIX + submissionId)
    return raw ? (JSON.parse(raw) as WritingResultContext) : null
  } catch { return null }
}
