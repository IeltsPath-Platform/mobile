// Ported from frontend/src/features/practice/speaking/speakingResultView.ts. Keep behaviour in step with the web version.
/**
 * The learner's Speaking result, read defensively from the stored `display` object: a field that is missing or of the
 * wrong type is left out, never thrown on, so an older or partly filled result still renders.
 */

export interface ResultEvidence { quote: string; note: string }

export interface ResultCriterion {
  code: string
  name: string
  band: number | null
  comment: string
  strengths: string[]
  weaknesses: string[]
  evidence: ResultEvidence[]
  /** The band was lowered because the answer was too short, off topic or not in English. */
  limited: boolean
}

export interface ResultError { name: string; partNo: number | null; excerpt: string; suggestion: string }
/** Every place one kind of mistake happens, in the order the grader listed them. */
export interface ResultErrorGroup { name: string; items: ResultError[] }
/** One sound of a word as the speech service scored it (IPA); `heardAs` is the sound it heard instead, when it named one. */
export interface ResultSound { symbol: string; accuracy: number | null; heardAs: string | null }
/** One word of an answer with its score; `errorType` is null when the service named no error. */
export interface ResultWord { text: string; accuracy: number | null; errorType: string | null; sounds: ResultSound[] }
export interface ResultTranscript { partNo: number; questionNo: number; question: string; transcript: string; words: ResultWord[] }
export interface ResultWeakWord { word: string; accuracy: number | null; sounds: ResultSound[]; tip: string }
/** A sound that was weak in several places, with the words it was weak in and a tip when the model wrote one. */
export interface ResultWeakSound { symbol: string; count: number; accuracy: number | null; heardAs: string | null; words: string[]; tip: string }

export interface SpeakingResultView {
  label: string
  overallBand: number | null
  criteria: ResultCriterion[]
  summary: string
  focus: string[]
  partNotes: { partNo: number; note: string }[]
  bandLimits: string[]
  transcripts: ResultTranscript[]
  transcriptWarning: string
  errors: ResultError[]
  personalNote: string
  studyPlan: string[]
  metrics: { accuracy: number | null; fluency: number | null; pronunciation: number | null; wordsPerMinute: number | null; longPauses: number | null }
  weakWords: ResultWeakWord[]
  weakSounds: ResultWeakSound[]
}

type Obj = Record<string, unknown>

function obj(value: unknown): Obj { return value && typeof value === 'object' && !Array.isArray(value) ? value as Obj : {} }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
function text(value: unknown): string { return typeof value === 'string' ? value : '' }
function num(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null }
function texts(value: unknown): string[] { return list(value).map(text).filter((item) => item !== '') }

/** The strict IPA letters the speech service uses, written as a learner's dictionary writes them (the English r is /r/, not /ɹ/). */
const DICTIONARY_FORM: Record<string, string> = { 'ɹ': 'r', 'ɚ': 'ər', 'ɝ': 'ɜr', 'ɡ': 'g' }
export function learnerIpa(symbol: string): string { return DICTIONARY_FORM[symbol] ?? symbol }

function sounds(value: unknown): ResultSound[] {
  return list(value).map(obj).filter((item) => text(item.symbol) !== '')
    .map((item) => ({ symbol: learnerIpa(text(item.symbol)), accuracy: num(item.accuracy), heardAs: text(item.heardAs) ? learnerIpa(text(item.heardAs)) : null }))
}

function words(value: unknown): ResultWord[] {
  return list(value).map(obj).filter((item) => text(item.text) !== '').map((item) => ({
    text: text(item.text), accuracy: num(item.accuracy), errorType: text(item.errorType) || null, sounds: sounds(item.sounds),
  }))
}

export function parseSpeakingResult(display: unknown): SpeakingResultView {
  const root = obj(display)
  const pronunciation = obj(root.pronunciation)
  const rhythm = obj(root.rhythm)
  const personal = obj(root.personalFeedback)
  const quality = obj(root.transcriptQuality)
  return {
    label: text(root.label) || 'Điểm ước lượng để luyện tập',
    overallBand: num(root.overallBand),
    criteria: list(root.criteria).map(obj).filter((item) => text(item.code) !== '').map((item) => ({
      code: text(item.code),
      name: text(item.name) || text(item.code),
      band: num(item.band),
      comment: text(item.comment),
      strengths: texts(item.strengths),
      weaknesses: texts(item.weaknesses),
      evidence: list(item.evidence).map(obj).filter((entry) => text(entry.quote) !== '')
        .map((entry) => ({ quote: text(entry.quote), note: text(entry.note) })),
      limited: item.limited === true,
    })),
    summary: text(root.summary),
    focus: texts(root.focus),
    partNotes: list(root.partNotes).map(obj).filter((item) => num(item.partNo) !== null && text(item.note) !== '')
      .map((item) => ({ partNo: num(item.partNo) as number, note: text(item.note) })),
    bandLimits: list(root.bandLimits).map(obj).map((item) => text(item.message)).filter((item) => item !== ''),
    transcripts: list(root.transcripts).map(obj).map((item) => ({
      partNo: num(item.partNo) ?? 0, questionNo: num(item.questionNo) ?? 0,
      question: text(item.question), transcript: text(item.transcript), words: words(item.words),
    })),
    transcriptWarning: quality.warning === true ? text(quality.message) : '',
    errors: list(root.errors).map(obj).filter((item) => text(item.excerpt) !== '').map((item) => ({
      name: text(item.name) || text(item.code), partNo: num(item.partNo),
      excerpt: text(item.excerpt), suggestion: text(item.suggestion),
    })),
    personalNote: text(personal.note),
    studyPlan: texts(personal.studyPlan),
    metrics: {
      accuracy: num(pronunciation.accuracy), fluency: num(pronunciation.fluency), pronunciation: num(pronunciation.pronunciation),
      wordsPerMinute: num(rhythm.wordsPerMinute), longPauses: num(rhythm.longPauses),
    },
    weakWords: list(pronunciation.weakWords).map(obj).filter((item) => text(item.word) !== '')
      .map((item) => ({ word: text(item.word), accuracy: num(item.accuracy), sounds: sounds(item.sounds), tip: text(item.tip) })),
    weakSounds: list(pronunciation.weakSounds).map(obj).filter((item) => text(item.symbol) !== '').map((item) => ({
      symbol: learnerIpa(text(item.symbol)), count: num(item.count) ?? 0, accuracy: num(item.accuracy),
      heardAs: text(item.heardAs) ? learnerIpa(text(item.heardAs)) : null, words: texts(item.words), tip: text(item.tip),
    })),
  }
}

/**
 * The criteria with the lowest band. When several share it all of them are returned, because a tie must not single one out
 * (three criteria at 5.0 do not make the first of them the weakest). Nothing is returned when fewer than two criteria have
 * a band, or when every graded criterion has the same band: nothing is then weaker than the rest.
 */
export function weakestCriteria(criteria: ResultCriterion[]): ResultCriterion[] {
  const bands = criteria.flatMap((item) => (item.band === null ? [] : [item.band]))
  if (bands.length < 2) return []
  const lowest = Math.min(...bands)
  if (lowest === Math.max(...bands)) return []
  return criteria.filter((item) => item.band === lowest)
}


/** Puts the places of one kind of mistake together, so a learner sees where it happens and every fix under one name. */
export function groupErrors(errors: ResultError[]): ResultErrorGroup[] {
  const groups = new Map<string, ResultErrorGroup>()
  for (const error of errors) {
    const group = groups.get(error.name)
    if (group) group.items.push(error)
    else groups.set(error.name, { name: error.name, items: [error] })
  }
  return [...groups.values()]
}

/**
 * The mean of the criterion bands rounded the way IELTS rounds an overall band, to the nearest half band (a quarter rounds
 * up to the next half, three quarters up to the next whole band). Shown when there is no overall band, and it must match
 * the server, which keeps the same rule: a band such as 5.1 or 5.2 does not exist.
 */
export function averageBand(criteria: ResultCriterion[]): number | null {
  const bands = criteria.map((item) => item.band).filter((band): band is number => band !== null)
  if (bands.length === 0) return null
  return Math.round((bands.reduce((sum, band) => sum + band, 0) / bands.length) * 2) / 2
}

/** A short line about what the band means, in words a learner can act on. */
export function bandComment(band: number): string {
  if (band >= 7.5) return 'Rất tốt. Hãy giữ nhịp luyện đều để ổn định ở mức này.'
  if (band >= 6.5) return 'Khá tốt. Còn một vài điểm cần mài giũa để lên band cao hơn.'
  if (band >= 5.5) return 'Ở mức trung bình khá. Tập trung vào tiêu chí thấp nhất để tăng nhanh.'
  if (band >= 4.5) return 'Cần củng cố nền tảng. Hãy luyện câu trả lời dài hơn và rõ ý hơn.'
  return 'Cần luyện thêm nhiều. Bắt đầu từ câu đầy đủ chủ ngữ, động từ và một lý do.'
}

/** The first sentence of a comment, cut to fit one line of a closed bar; the whole comment is in the open panel. */
export function summaryLine(comment: string, max = 120): string {
  const first = comment.trim().split(/(?<=[.!?])\s+/)[0] ?? ''
  if (first.length <= max) return first
  return `${first.slice(0, max).replace(/\s+\S*$/, '')}…`
}

/** How a score reads: good from 80, fair from 60, weak below; a missing score has no tone. */
export type SoundTone = 'good' | 'fair' | 'weak' | 'none'
export function toneOf(score: number | null): SoundTone {
  if (score === null) return 'none'
  if (score >= 80) return 'good'
  if (score >= 60) return 'fair'
  return 'weak'
}

const ERROR_LABELS: Record<string, string> = {
  Mispronunciation: 'Phát âm chưa đúng',
  Omission: 'Bỏ sót từ',
  Insertion: 'Thêm từ thừa',
  UnexpectedBreak: 'Ngắt giữa từ',
  MissingBreak: 'Thiếu ngắt nghỉ',
  Monotone: 'Giọng đều, thiếu nhấn',
}

/** The name of an error the speech service gave, in Vietnamese; an unknown one is shown as it came. */
export function errorLabel(errorType: string): string {
  return ERROR_LABELS[errorType] ?? errorType
}

/** The word to look at first in an answer: the lowest score, so the learner starts with what to fix. */
export function weakestWord(words: ResultWord[]): number {
  let worst = -1
  words.forEach((word, index) => {
    if (word.accuracy !== null && (worst < 0 || word.accuracy < (words[worst]!.accuracy as number))) worst = index
  })
  return worst
}
