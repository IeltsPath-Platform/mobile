import { describe, expect, it } from 'vitest';

import { lookupWords } from '../../src/features/practice/model/tokens';
import {
  coverage, eraseMarks, isMarked, marksIn, paintMarks, pruneLinks, rangesOf, runAround, segmentsText, selectionSegments, type Mark,
} from '../../src/features/practice/model/highlight-marks';

const ORDER = ['p:s:0', 'p:s:1', 'p:s:2', 'g:a', 'q:1'];
const LENGTHS: Record<string, number> = { 'p:s:0': 10, 'p:s:1': 8, 'p:s:2': 6, 'g:a': 5, 'q:1': 7 };
const lengthOf = (block: string) => LENGTHS[block] ?? 0;
const counter = () => { let n = 0; return () => `n${++n}`; };
const mark = (id: string, block: string, start: number, end: number): Mark => ({ id, sectionId: 's', block, start, end });

describe('selectionSegments', () => {
  it('stays in one block, whichever way the learner dragged', () => {
    expect(selectionSegments(ORDER, lengthOf, { block: 'p:s:0', index: 6 }, { block: 'p:s:0', index: 2 })).toEqual([{ block: 'p:s:0', start: 2, end: 6 }]);
  });

  it('runs over whole blocks in between', () => {
    expect(selectionSegments(ORDER, lengthOf, { block: 'p:s:0', index: 7 }, { block: 'p:s:2', index: 1 })).toEqual([
      { block: 'p:s:0', start: 7, end: 9 },
      { block: 'p:s:1', start: 0, end: 7 },
      { block: 'p:s:2', start: 0, end: 1 },
    ]);
  });

  it('reads backwards the same as forwards', () => {
    const forward = selectionSegments(ORDER, lengthOf, { block: 'p:s:0', index: 7 }, { block: 'p:s:1', index: 3 });
    const backward = selectionSegments(ORDER, lengthOf, { block: 'p:s:1', index: 3 }, { block: 'p:s:0', index: 7 });
    expect(backward).toEqual(forward);
  });

  it('does not cross from the passage into the questions', () => {
    expect(selectionSegments(ORDER, lengthOf, { block: 'p:s:2', index: 2 }, { block: 'q:1', index: 3 })).toEqual([{ block: 'q:1', start: 3, end: 3 }]);
  });

  it('skips a block with no words', () => {
    const lengths = (block: string) => (block === 'p:s:1' ? 0 : lengthOf(block));
    expect(selectionSegments(ORDER, lengths, { block: 'p:s:0', index: 8 }, { block: 'p:s:2', index: 0 }).map((segment) => segment.block)).toEqual(['p:s:0', 'p:s:2']);
  });
});

describe('painting and erasing', () => {
  it('painting over a mark cuts the old one back instead of stacking', () => {
    const marks = paintMarks([mark('a', 'p:s:0', 2, 6)], 's', [{ block: 'p:s:0', start: 4, end: 8 }], counter(), 'new');
    expect(marks).toEqual([mark('a', 'p:s:0', 2, 3), mark('new', 'p:s:0', 4, 8)]);
  });

  it('a mark inside a new one disappears', () => {
    const marks = paintMarks([mark('a', 'p:s:0', 3, 4)], 's', [{ block: 'p:s:0', start: 1, end: 6 }], counter(), 'new');
    expect(marks.map((item) => item.id)).toEqual(['new']);
  });

  it('erasing the middle splits a mark in two', () => {
    const marks = eraseMarks([mark('a', 'p:s:0', 1, 8)], [{ block: 'p:s:0', start: 4, end: 5 }], counter());
    expect(marks).toEqual([mark('a', 'p:s:0', 1, 3), mark('n1', 'p:s:0', 6, 8)]);
  });

  it('erasing the whole mark drops it, and other blocks are left alone', () => {
    const marks = eraseMarks([mark('a', 'p:s:0', 1, 3), mark('b', 'p:s:1', 1, 3)], [{ block: 'p:s:0', start: 0, end: 9 }], counter());
    expect(marks).toEqual([mark('b', 'p:s:1', 1, 3)]);
  });

  it('a highlight over several blocks is one mark per block', () => {
    const marks = paintMarks([], 's', [{ block: 'p:s:0', start: 7, end: 9 }, { block: 'p:s:1', start: 0, end: 7 }, { block: 'p:s:2', start: 0, end: 1 }], counter(), 'first');
    expect(marks.map((item) => item.id)).toEqual(['first', 'n1', 'n2']);
    expect(marks.every((item) => item.sectionId === 's')).toBe(true);
  });
});

describe('coverage', () => {
  const marks = [mark('a', 'p:s:0', 2, 4), mark('b', 'p:s:0', 5, 7)];

  it('joins touching marks', () => {
    expect(rangesOf(marks, 'p:s:0')).toEqual([[2, 7]]);
    expect(isMarked(marks, 'p:s:0', 6)).toBe(true);
    expect(isMarked(marks, 'p:s:0', 8)).toBe(false);
  });

  it('tells none, partial and full apart', () => {
    expect(coverage(marks, [{ block: 'p:s:0', start: 8, end: 9 }])).toBe('none');
    expect(coverage(marks, [{ block: 'p:s:0', start: 6, end: 9 }])).toBe('partial');
    expect(coverage(marks, [{ block: 'p:s:0', start: 3, end: 6 }])).toBe('full');
  });

  it('finds the marks that touch a selection', () => {
    expect(marksIn(marks, [{ block: 'p:s:0', start: 5, end: 9 }]).map((item) => item.id)).toEqual(['b']);
  });
});

describe('runAround', () => {
  it('finds the cluster of touching marks', () => {
    const marks = [mark('a', 'p:s:0', 2, 4), mark('b', 'p:s:0', 5, 7), mark('c', 'p:s:0', 9, 9)];
    expect(runAround(marks, { block: 'p:s:0', index: 3 }, ORDER, lengthOf)).toEqual({ from: { block: 'p:s:0', index: 2 }, to: { block: 'p:s:0', index: 7 } });
  });

  it('is null on a word that is not marked', () => {
    expect(runAround([mark('a', 'p:s:0', 2, 4)], { block: 'p:s:0', index: 8 }, ORDER, lengthOf)).toBeNull();
  });

  it('follows a highlight on into the next block and back', () => {
    const marks = [mark('a', 'p:s:0', 7, 9), mark('b', 'p:s:1', 0, 7), mark('c', 'p:s:2', 0, 1)];
    const whole = { from: { block: 'p:s:0', index: 7 }, to: { block: 'p:s:2', index: 1 } };
    expect(runAround(marks, { block: 'p:s:1', index: 4 }, ORDER, lengthOf)).toEqual(whole);
    expect(runAround(marks, { block: 'p:s:2', index: 0 }, ORDER, lengthOf)).toEqual(whole);
    expect(runAround(marks, { block: 'p:s:0', index: 8 }, ORDER, lengthOf)).toEqual(whole);
  });

  it('stops when the next block does not start marked', () => {
    const marks = [mark('a', 'p:s:0', 7, 9), mark('b', 'p:s:1', 2, 4)];
    expect(runAround(marks, { block: 'p:s:0', index: 8 }, ORDER, lengthOf)).toEqual({ from: { block: 'p:s:0', index: 7 }, to: { block: 'p:s:0', index: 9 } });
  });
});

describe('text and notes', () => {
  it('quotes the words across blocks', () => {
    const texts: Record<string, string> = { 'p:s:0': 'one two three four', 'p:s:1': 'five six seven' };
    const text = segmentsText([{ block: 'p:s:0', start: 2, end: 3 }, { block: 'p:s:1', start: 0, end: 1 }], (block) => texts[block] ?? '');
    expect(text).toBe('three four five six');
  });

  it('a note keeps its quote when its highlight is erased', () => {
    const notes = [{ id: 'n', highlightId: 'a', text: '' }, { id: 'm', highlightId: 'b', text: '' }, { id: 'f', highlightId: null, text: '' }];
    expect(pruneLinks(notes, [{ id: 'b' }]).map((note) => note.highlightId)).toEqual([null, 'b', null]);
  });
});

describe('lookupWords', () => {
  it('looks a single word up as it is', () => {
    expect(lookupWords('(dogs),')).toEqual(['dogs']);
    expect(lookupWords('the')).toEqual(['the']);
  });

  it('keeps the words of a phrase that carry meaning, once each', () => {
    expect(lookupWords('The snow guns make the snow, and snowflakes 2024')).toEqual(['snow', 'guns', 'make', 'snowflakes']);
  });

  it('stops at the limit', () => {
    expect(lookupWords('alpha bravo charlie delta echo foxtrot golf hotel india juliet', 3)).toEqual(['alpha', 'bravo', 'charlie']);
  });
});
