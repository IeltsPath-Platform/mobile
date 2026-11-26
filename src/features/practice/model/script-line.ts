// Ported from frontend/src/features/practice/listening/scriptLine.ts. Keep behaviour in step with the web version.
// "Receptionist: Hello." -> speaker "Receptionist". A line without a speaker label (a talk read by one voice, a note) has no chip.
const SPEAKER_LINE = /^([A-Z][A-Za-z.' ]{0,28}):\s+/

/** Splits the script line of a recording into the speaker and the words, and how many characters the label took. */
export function splitScriptLine(line: string): { speaker: string | null; offset: number } {
  const match = SPEAKER_LINE.exec(line)
  return match ? { speaker: match[1], offset: match[0].length } : { speaker: null, offset: 0 }
}

const TONES = 4;

/**
 * The lines of a script with who speaks each: the speaker, how many characters his label took, whether the name is shown
 * (the speaker changed) and a colour number, given to speakers in order of appearance.
 */
export function scriptRows(lines: readonly string[]) {
  const tones = new Map<string, number>();
  let previous: string | null = null;
  return lines.map((line) => {
    const { speaker, offset } = splitScriptLine(line);
    if (speaker && !tones.has(speaker)) tones.set(speaker, tones.size % TONES);
    const row = { speaker, offset, showName: speaker !== null && speaker !== previous, tone: speaker ? (tones.get(speaker) ?? 0) : null };
    previous = speaker;
    return row;
  });
}
