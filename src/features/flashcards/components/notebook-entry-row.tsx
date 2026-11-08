import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { levels, type NotebookEntry, type UnderstandingLevel } from '@/src/features/flashcards/notebook-api';

const LEVEL_KEYS = Object.keys(levels) as UnderstandingLevel[];

export const NotebookEntryRow = memo(function NotebookEntryRow({
  entry,
  editing,
  updating,
  onToggleEdit,
  onSetLevel,
  onEditCard,
}: {
  entry: NotebookEntry;
  editing: boolean;
  updating: boolean;
  onToggleEdit: (id: string) => void;
  onSetLevel: (id: string, value: UnderstandingLevel) => void;
  onEditCard: (id: string) => void;
}) {
  return (
    <View className="mb-3 rounded-2xl border border-line bg-surface p-4">
      <View className="flex-row items-center gap-3">
        {entry.imageUrl ? (
          <Image
            source={{ uri: entry.imageUrl }}
            accessibilityLabel={entry.lemma}
            contentFit="cover"
            style={{ width: 56, height: 56, borderRadius: 12 }}
          />
        ) : null}
        <View className="flex-1">
          <Text weight="bold" className="text-lg">
            {entry.lemma}
          </Text>
          <Text className="text-sm text-muted">
            {[entry.ipa, entry.partOfSpeech].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      <Text className="mt-2">{entry.vietnameseMeaning || entry.englishDefinition}</Text>
      {entry.exampleSentence ? (
        <Text className="mt-2 text-sm italic text-muted">{entry.exampleSentence}</Text>
      ) : null}
      <View className="mt-2 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Đổi mức độ ghi nhớ ${entry.lemma}`}
          accessibilityState={{ expanded: editing }}
          onPress={() => onToggleEdit(entry.flashcardId)}
          className="min-h-11 justify-center"
        >
          <Text weight="bold" className="text-sm text-accent-deep">
            {levels[entry.level]} ▾
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sửa thẻ ${entry.lemma}`}
          onPress={() => onEditCard(entry.flashcardId)}
          className="min-h-11 justify-center px-2"
        >
          <Text className="text-sm text-muted">Sửa thẻ</Text>
        </Pressable>
      </View>
      {editing ? (
        <View className="flex-row flex-wrap gap-2">
          {LEVEL_KEYS.map((value) => (
            <Button
              key={value}
              variant="secondary"
              label={levels[value]}
              disabled={updating || value === entry.level}
              onPress={() => onSetLevel(entry.flashcardId, value)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
});
