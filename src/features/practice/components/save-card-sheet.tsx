import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { invalidateFlashcards } from '@/src/features/flashcards/queries';
import { vocabApi } from '@/src/features/vocab/api';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

import { Sheet } from './sheet';

/** The most characters of a highlighted text the library keeps. */
const HIGHLIGHT_MAX = 2000;

/** Saves the selected words of a passage as a flashcard of the learner's library: the words in front, their own meaning or note behind. */
export function SaveCardSheet({ text, onClose }: { text: string | null; onClose: () => void }) {
  return (
    <Sheet visible={text !== null} onClose={onClose} title="Lưu thành flashcard" subtitle="Thẻ nằm trong tab Flashcards để ôn lại sau." maxHeight="88%">
      {text !== null ? <CardForm key={text} text={text} onClose={onClose} /> : null}
    </Sheet>
  );
}

function CardForm({ text, onClose }: { text: string; onClose: () => void }) {
  const client = useQueryClient();
  const [front, setFront] = useState(text.slice(0, HIGHLIGHT_MAX));
  const [back, setBack] = useState('');
  const save = useMutation({
    mutationFn: () => vocabApi.createCard({ sourceType: 'HIGHLIGHT', highlightedText: text.slice(0, HIGHLIGHT_MAX), front: front.trim(), back: back.trim() }),
    onSuccess: () => { haptics.success(); void invalidateFlashcards(client); },
  });

  if (save.isSuccess) {
    return (
      <View className="items-center gap-3 py-4">
        <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: colors.successSoft }}><Check size={28} color={colors.success} strokeWidth={3} /></View>
        <Text weight="black" className="text-lg text-ink">Đã lưu thẻ</Text>
        <Text className="text-center text-sm text-muted">Bạn sẽ gặp thẻ này khi ôn trong tab Flashcards.</Text>
        <View className="mt-2 self-stretch"><Button label="Xong" onPress={onClose} /></View>
      </View>
    );
  }

  const ready = front.trim().length > 0 && back.trim().length > 0;
  return (
    <View className="gap-4 pb-2">
      <View className="gap-1.5">
        <Text weight="bold" className="text-xs uppercase text-muted">Mặt trước</Text>
        <TextInput
          value={front}
          onChangeText={setFront}
          multiline
          maxLength={HIGHLIGHT_MAX}
          accessibilityLabel="Mặt trước của thẻ"
          className="max-h-40 min-h-12 rounded-2xl bg-canvas px-4 py-3 text-base text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </View>
      <View className="gap-1.5">
        <Text weight="bold" className="text-xs uppercase text-muted">Mặt sau</Text>
        <TextInput
          value={back}
          onChangeText={setBack}
          multiline
          maxLength={4000}
          autoFocus
          placeholder="Nghĩa tiếng Việt hoặc ghi chú của bạn"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Mặt sau của thẻ"
          className="max-h-40 min-h-24 rounded-2xl bg-canvas px-4 py-3 text-base text-ink"
          style={{ textAlignVertical: 'top' }}
        />
      </View>
      {save.isError ? <FormAlert message={save.error.message || 'Chưa lưu được thẻ. Hãy thử lại.'} /> : null}
      <Button label="Lưu thẻ" disabled={!ready} loading={save.isPending} onPress={() => save.mutate()} />
    </View>
  );
}
