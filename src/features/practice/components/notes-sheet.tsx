import { Plus, Trash2 } from 'lucide-react-native';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { Annotations } from '../hooks/use-annotations';
import { Sheet } from './sheet';

type NotesSheetProps = {
  visible: boolean;
  onClose: () => void;
  annotations: Annotations;
  sectionId: string;
  sectionLabel: string;
  /** Note to focus (just created from a selection). */
  focusId?: string | null;
};

/** The notes of the open part: edit, delete one, delete all, or add a free note not tied to any words. */
export function NotesSheet({ visible, onClose, annotations, sectionId, sectionLabel, focusId }: NotesSheetProps) {
  const notes = annotations.notes.filter((note) => note.sectionId === sectionId);
  return (
    <Sheet visible={visible} onClose={onClose} title={`Ghi chú · ${sectionLabel}`} subtitle={notes.length ? `${notes.length} ghi chú, lưu trên thiết bị này` : 'Chọn chữ rồi bấm Ghi chú, hoặc thêm ghi chú tự do.'}>
      <View className="gap-3">
        {notes.map((note) => (
          <View key={note.id} className="rounded-2xl p-3" style={{ backgroundColor: colors.warmSoft }}>
            {note.quote ? <Text numberOfLines={3} className="mb-1 text-xs italic text-muted">“{note.quote}”</Text> : null}
            <TextInput
              value={note.text}
              onChangeText={(text) => annotations.setNoteText(note.id, text)}
              autoFocus={note.id === focusId}
              multiline
              placeholder="Viết ghi chú…"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Nội dung ghi chú"
              className="min-h-11 text-base text-ink"
              style={{ textAlignVertical: 'top' }}
            />
            <Pressable onPress={() => annotations.removeNote(note.id)} accessibilityRole="button" accessibilityLabel="Xoá ghi chú" hitSlop={8} className="mt-1 h-9 w-9 items-center justify-center self-end">
              <Trash2 size={17} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        <Pressable onPress={() => annotations.addNote(sectionId, '', null)} accessibilityRole="button" className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl" style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: colors.line }}>
          <Plus size={18} color={colors.accentDeep} />
          <Text weight="bold" style={{ color: colors.accentDeep }}>Thêm ghi chú</Text>
        </Pressable>
        {notes.length > 1 ? (
          <Pressable
            onPress={() => Alert.alert('Xoá tất cả ghi chú?', `Xoá ${notes.length} ghi chú của ${sectionLabel}.`, [{ text: 'Huỷ', style: 'cancel' }, { text: 'Xoá hết', style: 'destructive', onPress: () => annotations.removeSectionNotes(sectionId) }])}
            accessibilityRole="button"
            className="min-h-11 items-center justify-center">
            <Text weight="bold" style={{ color: colors.danger }}>Xoá tất cả ghi chú</Text>
          </Pressable>
        ) : null}
      </View>
    </Sheet>
  );
}
