// Ported from frontend/src/features/practice/writing/examinerLabels.ts. Keep behaviour in step with the web version.
import type { Examiner } from '../api/examiners'

/** The last two words of the name as capital letters, for an examiner without a photo. */
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]?.toUpperCase()).join('') || '?'

/** One certificate as a line: name, who issued it, year. */
export function certificateText(item: Examiner['certificates'][number]) {
  return [item.name, item.issuer, item.year].filter(Boolean).join(' · ')
}
