import { useCallback, useState } from 'react';

import { haptics } from '@/src/lib/haptics';

import type { TextSelection } from '../components/markable-text';
import { bareWord, wordsBetween } from '../model/tokens';
import type { Annotations, Highlight } from './use-annotations';

/**
 * Touch rules for marking text: long-press a word to start a selection, tap another word of the same text to stretch
 * it, then Highlight / Note / Look up from the toolbar. Tapping a marked word offers to remove the mark; tapping any
 * other word looks it up (when lookup is allowed).
 */
export function useTextMarking({ annotations, sectionId, textOf, lookupEnabled }: {
  annotations: Annotations;
  sectionId: string;
  /** The full text of a block, to quote the selected words. */
  textOf: (block: string) => string;
  lookupEnabled: boolean;
}) {
  const [selection, setSelection] = useState<TextSelection>(null);
  const [lookup, setLookup] = useState<string | null>(null);
  const [markMenu, setMarkMenu] = useState<Highlight | null>(null);
  const [noteFocus, setNoteFocus] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const onWordLongPress = useCallback((block: string, index: number) => {
    haptics.hold();
    setSelection({ block, start: index, end: index });
  }, []);

  const onWordPress = useCallback((block: string, index: number, word: string) => {
    if (selection) {
      if (selection.block === block) { haptics.select(); setSelection({ ...selection, end: index }); }
      else setSelection(null);
      return;
    }
    const mark = annotations.highlights.find((item) => item.block === block && index >= item.start && index <= item.end);
    if (mark) { setMarkMenu(mark); return; }
    if (lookupEnabled) {
      const bare = bareWord(word);
      if (bare) setLookup(bare);
    }
  }, [selection, annotations.highlights, lookupEnabled]);

  const selectedText = selection ? wordsBetween(textOf(selection.block), selection.start, selection.end) : '';
  const singleWord = selection !== null && selection.start === selection.end;

  const highlight = useCallback(() => {
    if (!selection) return;
    annotations.addHighlight(sectionId, selection.block, selection.start, selection.end);
    haptics.tap();
    setSelection(null);
  }, [selection, annotations, sectionId]);

  const note = useCallback(() => {
    if (!selection) return;
    const mark = annotations.addHighlight(sectionId, selection.block, selection.start, selection.end);
    const created = annotations.addNote(sectionId, selectedText, mark.id);
    setSelection(null);
    setNoteFocus(created.id);
    setNotesOpen(true);
  }, [selection, annotations, sectionId, selectedText]);

  const lookUpSelection = useCallback(() => {
    const bare = bareWord(selectedText);
    setSelection(null);
    if (bare) setLookup(bare);
  }, [selectedText]);

  const noteOnMark = useCallback((mark: Highlight) => {
    const existing = annotations.notes.find((item) => item.highlightId === mark.id);
    const target = existing ?? annotations.addNote(mark.sectionId, wordsBetween(textOf(mark.block), mark.start, mark.end), mark.id);
    setMarkMenu(null);
    setNoteFocus(target.id);
    setNotesOpen(true);
  }, [annotations, textOf]);

  return {
    selection, selectedText, singleWord, clearSelection: () => setSelection(null),
    onWordPress, onWordLongPress, highlight, note, lookUpSelection,
    lookup, closeLookup: () => setLookup(null),
    markMenu, closeMarkMenu: () => setMarkMenu(null), removeMark: (mark: Highlight) => { annotations.removeHighlight(mark.id); setMarkMenu(null); }, noteOnMark,
    notesOpen, openNotes: () => { setNoteFocus(null); setNotesOpen(true); }, closeNotes: () => setNotesOpen(false), noteFocus,
  };
}

export type TextMarking = ReturnType<typeof useTextMarking>;
