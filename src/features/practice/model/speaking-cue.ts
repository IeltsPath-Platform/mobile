// Ported from frontend/src/features/practice/speaking/speakingCue.ts. Keep behaviour in step with the web version.
export interface CueCard {
  topic: string
  points: string[]
}

const LEAD = /\s*You should say:?\s*/i

/**
 * A Part 2 prompt is stored as one sentence: "Describe a teacher who influenced you. You should say: who the teacher was,
 * what subject they taught, and explain why they influenced you." Split it into the topic and the points to cover.
 * A prompt without that lead (Part 1 and Part 3 questions) is returned as it is.
 */
export function parseCueCard(prompt: string): CueCard {
  const [topic, rest] = prompt.split(LEAD, 2)
  if (!rest) return { topic: prompt.trim(), points: [] }
  const points = rest.replace(/\.\s*$/, '').split(/,\s*/).map((point) => point.trim()).filter(Boolean)
  return { topic: topic.trim(), points }
}

/** What the examiner says: the question, and for a cue card the points to cover ("... You should say: a, b, c."). */
export function spokenPrompt(prompt: string): string {
  const cue = parseCueCard(prompt)
  if (cue.points.length === 0) return cue.topic
  const topic = /[.?!]$/.test(cue.topic) ? cue.topic : `${cue.topic}.`
  return `${topic} You should say: ${cue.points.join(', ')}.`
}
