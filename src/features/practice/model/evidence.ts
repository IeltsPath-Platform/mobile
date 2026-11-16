// Ported from frontend/src/features/practice/lib/evidenceHighlight.ts. Keep behaviour in step with the web version.
/**
 * The "Đối chiếu với bài đọc" step of an explanation quotes the sentence that answers the question, for example
 * "Đoạn C: «The loudest places were often not main roads»". These helpers read that line and find the quote in the passage
 * so the review screen can highlight it.
 */
export interface EvidenceRef {
  /** The paragraph letter ("C"), or null when the line does not name one. */
  label: string | null
  /** The quoted sentence, or null when the line quotes nothing (then the whole paragraph is the evidence). */
  quote: string | null
}

export interface EvidenceSpot {
  /** Index of the paragraph in the list that was searched. */
  index: number
  start: number
  end: number
}

const LABEL = /^Đoạn\s+([A-Z])\b/
const QUOTE = /«([^»]+)»/

export function parseEvidence(line: string): EvidenceRef | null {
  const label = LABEL.exec(line)?.[1] ?? null
  const quote = QUOTE.exec(line)?.[1]?.trim() || null
  return label || quote ? { label, quote } : null
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Case-insensitive; white space in the quote may be any run of white space in the text. */
function findPiece(text: string, piece: string): { start: number; end: number } | null {
  const direct = text.toLowerCase().indexOf(piece.toLowerCase())
  if (direct >= 0) return { start: direct, end: direct + piece.length }
  const pattern = piece.split(/\s+/).filter(Boolean).map(escapeRegExp).join('\\s+')
  const match = pattern ? new RegExp(pattern, 'i').exec(text) : null
  return match ? { start: match.index, end: match.index + match[0].length } : null
}

/**
 * A quote may skip words with "…" ("Teenagers are often accused of laziness… Sleep researchers argue that…"): the mark then
 * runs from the start of the first piece that is found to the end of the last one.
 */
function findQuote(text: string, quote: string): { start: number; end: number } | null {
  const whole = findPiece(text, quote)
  if (whole) return whole
  const found = quote.split(/…|\.{3}/).map((piece) => piece.trim()).filter(Boolean).flatMap((piece) => findPiece(text, piece) ?? [])
  if (!found.length) return null
  const start = Math.min(...found.map((range) => range.start))
  const end = Math.max(...found.map((range) => range.end))
  return end > start ? { start, end } : null
}

/**
 * Where the evidence is: in the paragraph with the named letter (the whole paragraph when the quote is not found
 * there), otherwise the first paragraph that contains the quote. Null when nothing matches.
 */
export function locateEvidence(paragraphs: ReadonlyArray<{ label?: string | null; text: string }>, evidence: EvidenceRef): EvidenceSpot | null {
  const named = evidence.label ? paragraphs.findIndex((paragraph) => paragraph.label === evidence.label) : -1
  if (named >= 0) {
    const text = paragraphs[named]!.text
    const range = evidence.quote ? findQuote(text, evidence.quote) : null
    return { index: named, ...(range ?? { start: 0, end: text.length }) }
  }
  if (!evidence.quote) return null
  for (let index = 0; index < paragraphs.length; index += 1) {
    const range = findQuote(paragraphs[index]!.text, evidence.quote)
    if (range) return { index, ...range }
  }
  return null
}
