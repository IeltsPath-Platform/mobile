import { Eraser, Highlighter, Languages, StickyNote, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';

import { ActionSheet } from '@/src/components/ui/action-sheet';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { Annotations } from '../hooks/use-annotations';
import type { TextMarking } from '../hooks/use-text-marking';
import { NotesSheet } from './notes-sheet';
import { WordLookupSheet } from './word-lookup-sheet';

/** Floating toolbar for a live selection, docked above the bottom bar. */
export function SelectionToolbar({ marking, lookupEnabled }: { marking: TextMarking; lookupEnabled: boolean }) {
  if (!marking.selection) return null;
  return (
    <Animated.View entering={FadeInDown.duration(140).reduceMotion(ReduceMotion.System)} exiting={FadeOutDown.duration(100).reduceMotion(ReduceMotion.System)} className="absolute bottom-3 left-3 right-3">
      <View className="rounded-2xl px-2 py-2" style={{ backgroundColor: colors.ink }}>
        <Text numberOfLines={1} className="px-2 pb-1 text-xs" style={{ color: '#ffffffaa' }}>
          {marking.singleWord ? 'Chạm thêm một từ để chọn cả đoạn' : `“${marking.selectedText}”`}
        </Text>
        <View className="flex-row">
          <ToolButton icon={<Highlighter size={19} color="#ffe58f" />} label="Highlight" onPress={marking.highlight} />
          <ToolButton icon={<StickyNote size={19} color="#ffffff" />} label="Ghi chú" onPress={marking.note} />
          {lookupEnabled && marking.singleWord ? <ToolButton icon={<Languages size={19} color="#ffffff" />} label="Tra từ" onPress={marking.lookUpSelection} /> : null}
          <ToolButton icon={<X size={19} color="#ffffff" />} label="Huỷ" onPress={marking.clearSelection} />
        </View>
      </View>
    </Animated.View>
  );
}

function ToolButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="min-h-12 flex-1 items-center justify-center gap-0.5 rounded-xl">
      {icon}
      <Text weight="bold" className="text-[11px]" style={{ color: '#ffffff' }}>{label}</Text>
    </Pressable>
  );
}

/** The sheets that marking opens: word meaning, the menu of an existing mark, and the notes of the part. */
export function MarkingSheets({ marking, annotations, sectionId, sectionLabel }: { marking: TextMarking; annotations: Annotations; sectionId: string; sectionLabel: string }) {
  const mark = marking.markMenu;
  return (
    <>
      <WordLookupSheet word={marking.lookup} onClose={marking.closeLookup} />
      <ActionSheet
        visible={mark !== null}
        title="Đoạn đã highlight"
        onClose={marking.closeMarkMenu}
        items={mark ? [
          { label: annotations.notes.some((note) => note.highlightId === mark.id) ? 'Xem ghi chú' : 'Thêm ghi chú', icon: StickyNote, onPress: () => marking.noteOnMark(mark) },
          { label: 'Bỏ highlight', icon: Eraser, destructive: true, onPress: () => marking.removeMark(mark) },
        ] : []}
      />
      <NotesSheet visible={marking.notesOpen} onClose={marking.closeNotes} annotations={annotations} sectionId={sectionId} sectionLabel={sectionLabel} focusId={marking.noteFocus} />
    </>
  );
}
