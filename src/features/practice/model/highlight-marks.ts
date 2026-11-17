/**
 * Highlight bookkeeping for the passage and the questions. A text is a `block` (a passage paragraph, a question, a group
 * instruction) and a position in it is a word index. Everything here is pure so the rules can be tested.
 */

/** One word of one block. */
export type Pos = { block: string; index: number };
/** Words `start`..`end` (inclusive) of one block. */
export type Segment = { block: string; start: number; end: number };
export type Mark = { id: string; sectionId: string; block: string; start: number; end: number };

/** The passage and the questions are separate surfaces: a selection never crosses from one to the other. */
export const regionOf = (block: string) => (block.startsWith('p:') ? 'passage' : 'questions');

/**
 * The words between two positions, split per block: the tail of the first block, every block in between, the head of the
 * last one. Positions in blocks that are unknown or on different surfaces fall back to the second word alone.
 */
export function selectionSegments(order: readonly string[], lengthOf: (block: string) => number, a: Pos, b: Pos): Segment[] {
  if (a.block === b.block) return [{ block: a.block, start: Math.min(a.index, b.index), end: Math.max(a.index, b.index) }];
  const ia = order.indexOf(a.block);
  const ib = order.indexOf(b.block);
  if (ia < 0 || ib < 0 || regionOf(a.block) !== regionOf(b.block)) return [{ block: b.block, start: b.index, end: b.index }];
  const [from, to] = ia <= ib ? [a, b] : [b, a];
  const lo = Math.min(ia, ib);
  const hi = Math.max(ia, ib);
  const segments: Segment[] = [];
  for (let i = lo; i <= hi; i += 1) {
    const block = order[i]!;
    const length = lengthOf(block);
    if (length <= 0) continue;
    const start = i === lo ? from.index : 0;
    const end = i === hi ? to.index : length - 1;
    if (start <= end) segments.push({ block, start, end });
  }
  return segments;
}

/** The marked word ranges of a block, sorted, with touching or overlapping ranges joined. */
export function rangesOf(marks: readonly Mark[], block: string): Array<[number, number]> {
  const ranges = marks.filter((mark) => mark.block === block).map((mark): [number, number] => [mark.start, mark.end]).sort((x, y) => x[0] - y[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

export function isMarked(marks: readonly Mark[], block: string, index: number) {
  return marks.some((mark) => mark.block === block && index >= mark.start && index <= mark.end);
}

/** How much of a selection is already highlighted. */
export function coverage(marks: readonly Mark[], segments: readonly Segment[]): 'none' | 'partial' | 'full' {
  let total = 0;
  let covered = 0;
  for (const segment of segments) {
    total += segment.end - segment.start + 1;
    for (const [start, end] of rangesOf(marks, segment.block)) {
      covered += Math.max(0, Math.min(end, segment.end) - Math.max(start, segment.start) + 1);
    }
  }
  if (covered === 0) return 'none';
  return covered >= total ? 'full' : 'partial';
}

/** The marks that touch a selection, for finding the note written about them. */
export function marksIn(marks: readonly Mark[], segments: readonly Segment[]): Mark[] {
  return marks.filter((mark) => segments.some((segment) => segment.block === mark.block && mark.start <= segment.end && mark.end >= segment.start));
}

/** Takes `segments` out of the marks: a mark is trimmed, split in two, or dropped. The right half of a split gets a new id. */
export function eraseMarks(marks: readonly Mark[], segments: readonly Segment[], newId: () => string): Mark[] {
  const result: Mark[] = [];
  for (const mark of marks) {
    let pieces: Array<[number, number]> = [[mark.start, mark.end]];
    for (const segment of segments) {
      if (segment.block !== mark.block) continue;
      pieces = pieces.flatMap(([start, end]): Array<[number, number]> => {
        if (segment.end < start || segment.start > end) return [[start, end]];
        const left: Array<[number, number]> = segment.start > start ? [[start, segment.start - 1]] : [];
        const right: Array<[number, number]> = segment.end < end ? [[segment.end + 1, end]] : [];
        return [...left, ...right];
      });
    }
    pieces.forEach(([start, end], position) => result.push({ ...mark, id: position === 0 ? mark.id : newId(), start, end }));
  }
  return result;
}

/** Highlights `segments`; marks they cover are cut back first so marks never overlap. `firstId` names the first new mark. */
export function paintMarks(marks: readonly Mark[], sectionId: string, segments: readonly Segment[], newId: () => string, firstId?: string): Mark[] {
  const kept = eraseMarks(marks, segments, newId);
  const added = segments.map((segment, position): Mark => ({ id: position === 0 && firstId ? firstId : newId(), sectionId, ...segment }));
  return [...kept, ...added];
}

/**
 * The run of highlighted words around one word: the cluster the learner sees as a single highlight. It stretches over
 * touching marks and on into the next block when the highlight reaches the end of one block and starts the next.
 */
export function runAround(marks: readonly Mark[], pos: Pos, order: readonly string[], lengthOf: (block: string) => number): { from: Pos; to: Pos } | null {
  const found = rangesOf(marks, pos.block).find(([start, end]) => pos.index >= start && pos.index <= end);
  if (!found) return null;
  let [start, end] = found;
  let startBlock = pos.block;
  let endBlock = pos.block;
  const at = order.indexOf(pos.block);
  if (at >= 0) {
    for (let i = at; start === 0 && i > 0; i -= 1) {
      const previous = order[i - 1]!;
      const length = lengthOf(previous);
      const reaching = length > 0 && regionOf(previous) === regionOf(startBlock) ? rangesOf(marks, previous).find(([, last]) => last === length - 1) : undefined;
      if (!reaching) break;
      startBlock = previous;
      start = reaching[0];
    }
    for (let i = at; end === lengthOf(endBlock) - 1 && i < order.length - 1; i += 1) {
      const next = order[i + 1]!;
      const reaching = regionOf(next) === regionOf(endBlock) ? rangesOf(marks, next).find(([first]) => first === 0) : undefined;
      if (!reaching) break;
      endBlock = next;
      end = reaching[1];
    }
  }
  return { from: { block: startBlock, index: start }, to: { block: endBlock, index: end } };
}

/** The words of a selection as one line of text, to quote in a note or to look up. */
export function segmentsText(segments: readonly Segment[], textOf: (block: string) => string) {
  return segments
    .map((segment) => textOf(segment.block).split(/\s+/).filter(Boolean).slice(segment.start, segment.end + 1).join(' '))
    .filter(Boolean)
    .join(' ');
}

export function segmentsWordCount(segments: readonly Segment[]) {
  return segments.reduce((total, segment) => total + segment.end - segment.start + 1, 0);
}

/** A note whose highlight is gone keeps its quote but no longer points at a mark. */
export function pruneLinks<T extends { highlightId: string | null }>(notes: readonly T[], marks: readonly { id: string }[]): T[] {
  const ids = new Set(marks.map((mark) => mark.id));
  return notes.map((note) => (note.highlightId && !ids.has(note.highlightId) ? { ...note, highlightId: null } : note));
}
