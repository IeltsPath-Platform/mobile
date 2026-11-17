// Ported from frontend/src/features/practice/reading/wordLookupApi.ts. Keep behaviour in step with the web version.
import { z } from 'zod'
import { apiRequest } from '@/src/lib/api-client'

/** Looking a word up in the vocabulary library (library-service), for the "click a word" popover of the practice passage. */

const senseSchema = z.object({
  partOfSpeech: z.string().nullish(),
  englishDefinition: z.string().nullish(),
  vietnameseMeaning: z.string().nullish(),
  exampleSentence: z.string().nullish(),
})

const itemSchema = z.object({
  lemma: z.string(),
  normalizedLemma: z.string(),
  ipa: z.string().nullish(),
  audioUk: z.string().nullish(),
  audioUs: z.string().nullish(),
  senses: z.array(senseSchema).default([]),
})

export type LookupItem = z.infer<typeof itemSchema>

export interface WordSense {
  partOfSpeech: string | null
  vietnameseMeaning: string | null
  englishDefinition: string | null
  exampleSentence: string | null
}

export interface WordEntry {
  lemma: string
  ipa: string | null
  /** Playable recording of each accent; null when the library has none. */
  audioUk: string | null
  audioUs: string | null
  /** Empty for a word that only has its pronunciation in the library. */
  senses: WordSense[]
}

/**
 * The forms to look for, most likely first: the word as written, then simple dictionary forms without a plural, tense or
 * adverb ending ("audiobooks" -> "audiobook", "wanders" -> "wander", "easily" -> "easy"). The library holds lemmas only.
 */
export function lemmaCandidates(word: string): string[] {
  const w = word.toLowerCase().replace(/[’']s$/, '').replace(/[’']/g, '')
  const forms = [w]
  if (w.length > 4 && w.endsWith('ies')) forms.push(`${w.slice(0, -3)}y`)
  if (w.length > 4 && w.endsWith('ied')) forms.push(`${w.slice(0, -3)}y`)
  if (w.length > 4 && w.endsWith('ier')) forms.push(`${w.slice(0, -3)}y`)
  if (w.length > 5 && w.endsWith('iest')) forms.push(`${w.slice(0, -4)}y`)
  if (w.length > 4 && w.endsWith('es')) forms.push(w.slice(0, -2))
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) forms.push(w.slice(0, -1))
  if (w.length > 5 && w.endsWith('ing')) forms.push(w.slice(0, -3), `${w.slice(0, -3)}e`)
  if (w.length > 4 && w.endsWith('ed')) forms.push(w.slice(0, -2), w.slice(0, -1))
  if (w.length > 5 && w.endsWith('ily')) forms.push(`${w.slice(0, -3)}y`)
  if (w.length > 4 && w.endsWith('ly')) forms.push(w.slice(0, -2))
  if (w.length > 4 && w.endsWith('est')) forms.push(w.slice(0, -3), `${w.slice(0, -3)}e`)
  if (w.length > 3 && w.endsWith('er')) forms.push(w.slice(0, -2), w.slice(0, -1))
  return [...new Set(forms)].filter((form) => form.length >= 2).slice(0, 6)
}

const toSenses = (item: LookupItem): WordSense[] => item.senses
  .filter((sense) => sense.vietnameseMeaning?.trim() || sense.englishDefinition?.trim())
  .map((sense): WordSense => ({
    partOfSpeech: sense.partOfSpeech ?? null,
    vietnameseMeaning: sense.vietnameseMeaning?.trim() || null,
    englishDefinition: sense.englishDefinition?.trim() || null,
    exampleSentence: sense.exampleSentence?.trim() || null,
  }))

/**
 * The entry to show for the forms asked for (in order): the first form that has a meaning wins; failing that, the first one
 * that has a pronunciation; null when the library knows none of them.
 */
export function pickEntry(items: LookupItem[], forms: string[]): WordEntry | null {
  let pronunciationOnly: WordEntry | null = null
  for (const form of forms) {
    const item = items.find((candidate) => candidate.normalizedLemma.toLowerCase() === form)
    if (!item) continue
    const senses = toSenses(item)
    const entry: WordEntry = {
      lemma: item.lemma,
      ipa: item.ipa?.trim() || null,
      audioUk: item.audioUk?.trim() || null,
      audioUs: item.audioUs?.trim() || null,
      senses,
    }
    if (senses.length) return entry
    if (entry.ipa || entry.audioUk || entry.audioUs) pronunciationOnly ??= entry
  }
  return pronunciationOnly
}

// Words already looked up while the app runs; a word that is not in the library is remembered too (null).
const cache = new Map<string, WordEntry | null>()

export async function lookupWord(word: string, signal?: AbortSignal): Promise<WordEntry | null> {
  const key = word.toLowerCase()
  if (cache.has(key)) return cache.get(key) ?? null
  const forms = lemmaCandidates(word)
  const items = z.array(itemSchema).parse(await apiRequest<unknown>(`/api/content/vocabulary/lookup?forms=${encodeURIComponent(forms.join(','))}`, { auth: true, signal }))
  const entry = pickEntry(items, forms)
  cache.set(key, entry)
  return entry
}
