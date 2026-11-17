import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { haptics } from '@/src/lib/haptics';

import type { Point, WordHandler } from '../components/markable-text';
import {
  coverage, isMarked, marksIn, regionOf, runAround, segmentsText, segmentsWordCount, selectionSegments, type Pos,
} from '../model/highlight-marks';
import { bareWord } from '../model/tokens';
import type { Annotations } from './use-annotations';

type Selection = { anchor: Pos; focus: Pos; point: Point; menuVisible: boolean };

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * Touch rules for marking text.
 * - Long-press a word to select it; a menu opens next to it (Highlight, Note, Translate).
 * - Tap another word to stretch the selection up to it, in the same text or over several paragraphs. Tap the only
 *   selected word again to let go.
 * - Tap a highlighted word to select its whole highlight, then Remove highlight; select part of it first to remove
 *   only that part.
 * - Tap any other word to look it up (when lookup is allowed).
 */
export function useTextMarking({ annotations, sectionId, textOf, blockOrder, lookupEnabled }: {
  annotations: Annotations;
  sectionId: string;
  /** The full text of a block, to count and quote its words. */
  textOf: (block: string) => string;
  /** Every markable text of the open section in reading order. */
  blockOrder: string[];
  lookupEnabled: boolean;
}) {
  const { highlights, notes, paintHighlight, eraseHighlight, addNote } = annotations;
  const [selection, setSelection] = useState<Selection | null>(null);
  const [lookupText, setLookupText] = useState<string | null>(null);
  const [cardText, setCardText] = useState<string | null>(null);
  const [noteFocus, setNoteFocus] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const lengthOf = useCallback((block: string) => countWords(textOf(block)), [textOf]);
  const anchor = selection?.anchor;
  const focus = selection?.focus;
  const segments = useMemo(() => (anchor && focus ? selectionSegments(blockOrder, lengthOf, anchor, focus) : null), [anchor, focus, blockOrder, lengthOf]);
  const selectedText = useMemo(() => (segments ? segmentsText(segments, textOf) : ''), [segments, textOf]);
  const wordCount = segments ? segmentsWordCount(segments) : 0;
  const covered = useMemo(() => (segments ? coverage(highlights, segments) : 'none'), [segments, highlights]);

  // The touch handlers keep one identity, so choosing a word does not rebuild every paragraph of the passage.
  const latest = useRef({ selection, highlights, lookupEnabled, blockOrder, lengthOf });
  latest.current = { selection, highlights, lookupEnabled, blockOrder, lengthOf };

  // A selection belongs to the part it was made in.
  useEffect(() => { setSelection(null); }, [sectionId]);

  const onWordLongPress = useCallback<WordHandler>((block, index, _word, point) => {
    haptics.hold();
    setSelection({ anchor: { block, index }, focus: { block, index }, point, menuVisible: true });
  }, []);

  const onWordPress = useCallback<WordHandler>((block, index, word, point) => {
    const { selection: current, highlights: marks, lookupEnabled: canLookUp, blockOrder: order, lengthOf: length } = latest.current;
    if (current) {
      if (regionOf(current.anchor.block) !== regionOf(block)) { setSelection(null); return; }
      if (current.anchor.block === block && current.anchor.index === index && current.focus.block === block && current.focus.index === index) { setSelection(null); return; }
      haptics.select();
      setSelection({ ...current, focus: { block, index }, point, menuVisible: true });
      return;
    }
    if (isMarked(marks, block, index)) {
      const run = runAround(marks, { block, index }, order, length);
      if (run) { haptics.select(); setSelection({ anchor: run.from, focus: run.to, point, menuVisible: true }); return; }
    }
    if (canLookUp) {
      const bare = bareWord(word);
      if (bare) setLookupText(bare);
    }
  }, []);

  const hideMenu = useCallback(() => {
    setSelection((current) => (current && current.menuVisible ? { ...current, menuVisible: false } : current));
  }, []);
  const clearSelection = useCallback(() => setSelection(null), []);

  const highlight = useCallback(() => {
    if (!segments) return;
    paintHighlight(sectionId, segments);
    haptics.tap();
    setSelection(null);
  }, [segments, paintHighlight, sectionId]);

  const unhighlight = useCallback(() => {
    if (!segments) return;
    eraseHighlight(segments);
    haptics.tap();
    setSelection(null);
  }, [segments, eraseHighlight]);

  const note = useCallback(() => {
    if (!segments) return;
    setSelection(null);
    setNotesOpen(true);
    // The same words already have a note: open it instead of writing a second one.
    const existing = notes.find((item) => item.sectionId === sectionId && item.quote === selectedText);
    if (existing) { setNoteFocus(existing.id); return; }
    const touched = marksIn(highlights, segments);
    const markId = covered === 'full' && touched[0] ? touched[0].id : paintHighlight(sectionId, segments);
    setNoteFocus(addNote(sectionId, selectedText, markId).id);
  }, [segments, notes, highlights, paintHighlight, addNote, sectionId, selectedText, covered]);

  const translate = useCallback(() => {
    if (!selectedText) return;
    setLookupText(selectedText);
    setSelection(null);
  }, [selectedText]);

  /** Keeps the selected words as a flashcard of the library. */
  const saveCard = useCallback(() => {
    if (!selectedText) return;
    // One word goes on the card without the punctuation that follows it in the text ("river," -> "river").
    setCardText(wordCount === 1 ? bareWord(selectedText) || selectedText : selectedText);
    setSelection(null);
  }, [selectedText, wordCount]);

  return {
    /** The selected words per block, for the texts to draw. */
    selection: segments,
    selectedText,
    wordCount,
    /** Whether the selected words are already highlighted: none, some or all of them. */
    coverage: covered,
    /** Where the menu opens, or null while there is no selection or the menu is out of the way (scrolling). */
    callout: selection?.menuVisible ? selection.point : null,
    onWordPress, onWordLongPress, hideMenu, clearSelection,
    highlight, unhighlight, note, translate, saveCard,
    cardText, closeCard: () => setCardText(null),
    lookupText, closeLookup: () => setLookupText(null),
    notesOpen, openNotes: () => { setNoteFocus(null); setNotesOpen(true); }, closeNotes: () => setNotesOpen(false), noteFocus,
  };
}

export type TextMarking = ReturnType<typeof useTextMarking>;
