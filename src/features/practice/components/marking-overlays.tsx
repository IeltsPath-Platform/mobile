import type { Annotations } from '../hooks/use-annotations';
import type { TextMarking } from '../hooks/use-text-marking';
import { NotesSheet } from './notes-sheet';
import { SaveCardSheet } from './save-card-sheet';
import { WordLookupSheet } from './word-lookup-sheet';

/** The sheets that marking opens: the meaning of the selected words, and the notes of the part. */
export function MarkingSheets({ marking, annotations, sectionId, sectionLabel }: { marking: TextMarking; annotations: Annotations; sectionId: string; sectionLabel: string }) {
  return (
    <>
      <WordLookupSheet text={marking.lookupText} onClose={marking.closeLookup} />
      <SaveCardSheet text={marking.cardText} onClose={marking.closeCard} />
      <NotesSheet visible={marking.notesOpen} onClose={marking.closeNotes} annotations={annotations} sectionId={sectionId} sectionLabel={sectionLabel} focusId={marking.noteFocus} />
    </>
  );
}
