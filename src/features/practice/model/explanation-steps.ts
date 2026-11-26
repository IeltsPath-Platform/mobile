// Ported from frontend/src/features/practice/lib/explanationSteps.ts. Keep behaviour in step with the web version.
/**
 * An explanation is plain text. A detailed one is written in steps, each starting with a line such as
 * "Bước 2 · Tìm từ khóa": the steps are drawn one by one. Older one-line explanations stay a single paragraph.
 */
export type ExplanationLineKind = 'text' | 'bullet' | 'evidence'

export interface ExplanationLine {
  kind: ExplanationLineKind
  text: string
}

export interface ExplanationStep {
  number: number
  title: string
  lines: ExplanationLine[]
}

export interface ParsedExplanation {
  steps: ExplanationStep[]
  /** The text of an explanation that has no steps; empty when it is made of steps. */
  plain: string
}

const STEP_HEADING = /^Bước\s+(\d+)\s*[·:.\-–]\s*(.+)$/i

export function parseExplanation(text: string | null | undefined): ParsedExplanation {
  const lines = (text ?? '').replace(/\r\n/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean)
  const steps: ExplanationStep[] = []
  const loose: string[] = []
  for (const line of lines) {
    const heading = STEP_HEADING.exec(line)
    if (heading) {
      steps.push({ number: Number(heading[1]), title: heading[2]!.trim(), lines: [] })
      continue
    }
    const current = steps.at(-1)
    if (!current) { loose.push(line); continue }
    if (line.startsWith('- ')) current.lines.push({ kind: 'bullet', text: line.slice(2).trim() })
    else if (/^Đoạn\s+[A-Z]\b/.test(line)) current.lines.push({ kind: 'evidence', text: line })
    else current.lines.push({ kind: 'text', text: line })
  }
  return { steps, plain: steps.length ? '' : loose.join('\n') }
}
