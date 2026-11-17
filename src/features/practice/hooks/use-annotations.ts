import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createRequestId } from '@/src/lib/request-id';

import { eraseMarks, paintMarks, pruneLinks, type Mark, type Segment } from '../model/highlight-marks';

/** A highlighted run of words: `block` names the text (a passage paragraph or a question), `start`/`end` are word indexes. */
export type Highlight = Mark;
/** A note, optionally tied to a highlight; `quote` keeps the words it was written about. */
export type Note = { id: string; sectionId: string; highlightId: string | null; quote: string; text: string; createdAt: number };

type Stored = { highlights: Highlight[]; notes: Note[] };
const KEY_PREFIX = 'practice.annotations:';

/**
 * Highlights and notes of one attempt, kept on the device (the web app keeps them in the page). They survive closing
 * the app and are dropped with the attempt's result.
 */
export function useAnnotations(attemptId: string) {
  const [state, setState] = useState<Stored>({ highlights: [], notes: [] });
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY_PREFIX + attemptId).then((raw) => {
      if (cancelled) return;
      loaded.current = true;
      if (!raw) return;
      const value = JSON.parse(raw) as Partial<Stored>;
      setState({ highlights: Array.isArray(value.highlights) ? value.highlights : [], notes: Array.isArray(value.notes) ? value.notes : [] });
    }).catch(() => { loaded.current = true; });
    return () => { cancelled = true; };
  }, [attemptId]);

  const update = useCallback((change: (current: Stored) => Stored) => {
    setState((current) => {
      const next = change(current);
      if (loaded.current) void AsyncStorage.setItem(KEY_PREFIX + attemptId, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, [attemptId]);

  /** Highlights the words of a selection (one segment per block) and returns the id of its first mark. */
  const paintHighlight = useCallback((sectionId: string, segments: Segment[]) => {
    const firstId = createRequestId();
    update((current) => {
      const highlights = paintMarks(current.highlights, sectionId, segments, createRequestId, firstId);
      return { highlights, notes: pruneLinks(current.notes, highlights) };
    });
    return firstId;
  }, [update]);

  /** Takes exactly the selected words out of the highlights; a mark that is only partly covered is cut back. */
  const eraseHighlight = useCallback((segments: Segment[]) => {
    update((current) => {
      const highlights = eraseMarks(current.highlights, segments, createRequestId);
      return { highlights, notes: pruneLinks(current.notes, highlights) };
    });
  }, [update]);

  const addNote = useCallback((sectionId: string, quote: string, highlightId: string | null, text = '') => {
    const note: Note = { id: createRequestId(), sectionId, highlightId, quote, text, createdAt: Date.now() };
    update((current) => ({ ...current, notes: [...current.notes, note] }));
    return note;
  }, [update]);

  const setNoteText = useCallback((id: string, text: string) => {
    update((current) => ({ ...current, notes: current.notes.map((note) => note.id === id ? { ...note, text } : note) }));
  }, [update]);

  const removeNote = useCallback((id: string) => {
    update((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }));
  }, [update]);

  const removeSectionNotes = useCallback((sectionId: string) => {
    update((current) => ({ ...current, notes: current.notes.filter((note) => note.sectionId !== sectionId) }));
  }, [update]);

  const clearAll = useCallback(() => { void AsyncStorage.removeItem(KEY_PREFIX + attemptId).catch(() => undefined); }, [attemptId]);

  return { ...state, paintHighlight, eraseHighlight, addNote, setNoteText, removeNote, removeSectionNotes, clearAll };
}

export type Annotations = ReturnType<typeof useAnnotations>;
