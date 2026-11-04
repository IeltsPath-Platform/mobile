import { sound } from '@/src/lib/sound';
import { vocabApi } from './api';

const audioByLemma = new Map<string, string | null>();
const pendingByLemma = new Map<string, Promise<void>>();

function normalize(lemma: string) {
  return lemma.trim().toLocaleLowerCase();
}

/** Loads recorded audio in batches of ten, matching the vocabulary lookup API limit. */
export async function loadVocabularyPronunciations(lemmas: string[]) {
  const unique = [...new Set(lemmas.map(normalize).filter(Boolean))];
  const missing = unique.filter((lemma) => !audioByLemma.has(lemma) && !pendingByLemma.has(lemma));
  const tasks: Promise<void>[] = unique.flatMap((lemma) => {
    const pending = pendingByLemma.get(lemma);
    return pending ? [pending] : [];
  });

  for (let index = 0; index < missing.length; index += 10) {
    const chunk = missing.slice(index, index + 10);
    const task = vocabApi.lookupPronunciations(chunk).then((records) => {
      const returned = new Set<string>();
      for (const record of records) {
        const lemma = normalize(record.normalizedLemma || record.lemma);
        if (!lemma) continue;
        const audio = record.audioUs || record.audioUk;
        audioByLemma.set(lemma, audio?.startsWith('https://') ? audio : null);
        returned.add(lemma);
      }
      for (const lemma of chunk) if (!returned.has(lemma)) audioByLemma.set(lemma, null);
    }).catch(() => {
      // Leave failed lookups uncached so a later attempt can retry; callers use device TTS meanwhile.
    });
    for (const lemma of chunk) pendingByLemma.set(lemma, task);
    tasks.push(task);
  }

  await Promise.all(tasks);
  for (const lemma of missing) pendingByLemma.delete(lemma);

  return Object.fromEntries(unique.map((lemma) => [lemma, audioByLemma.get(lemma) ?? null]));
}

export async function speakVocabularyPronunciation(lemma: string, audioUrl?: string | null) {
  const normalized = normalize(lemma);
  if (!normalized) return;

  const availableUrl = audioUrl?.startsWith('https://')
    ? audioUrl
    : (await loadVocabularyPronunciations([normalized]))[normalized];

  if (availableUrl && await sound.playPronunciation(availableUrl)) return;
  await sound.speak(lemma);
}
