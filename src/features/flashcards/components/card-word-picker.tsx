import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { useDebouncedSearch } from '@/src/features/flashcards/queries';
import { vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

export type PickedSense = {
  id: string;
  lemma: string;
  meaning: string;
  example: string | null;
};

/** Dictionary search that pre-fills a new flashcard from an existing vocabulary sense. */
export function CardWordPicker({
  selected,
  onPick,
  onClear,
}: {
  selected: PickedSense | null;
  onPick: (sense: PickedSense) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedSearch(query);
  const search = useQuery({
    queryKey: ['vocabulary', 'search', debounced],
    queryFn: ({ signal }) => vocabApi.search(debounced, signal),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  return (
    <View className="mb-4 rounded-3xl border border-line bg-surface p-4">
      <View className="mb-3 flex-row items-center gap-2">
        <Sparkles size={17} color={colors.accent} />
        <Text weight="bold">Chọn từ có sẵn</Text>
        <Text className="text-xs text-muted">· nhanh hơn</Text>
      </View>
      <View className="flex-row items-center rounded-2xl border border-line bg-canvas px-3">
        <Search size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm từ vựng tiếng Anh"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Tìm từ vựng tiếng Anh"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          className="min-h-12 flex-1 px-2 text-base text-ink"
        />
      </View>
      {search.isFetching ? (
        <View className="flex-row items-center gap-2 py-3">
          <ActivityIndicator size="small" color={colors.accent} />
          <Text className="text-xs text-muted">Đang tìm từ…</Text>
        </View>
      ) : null}
      {search.isError ? (
        <Text className="mt-2 text-xs text-danger">
          Chưa tìm được từ. Bạn vẫn có thể nhập thẻ thủ công bên dưới.
        </Text>
      ) : null}
      {query.trim().length >= 2
        ? search.data?.slice(0, 4).map((item) => (
            <View key={item.id}>
              {item.senses.slice(0, 2).map((sense) => {
                const meaning = sense.vietnameseMeaning ?? sense.englishDefinition ?? '';
                return (
                  <Pressable
                    key={sense.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn ${item.lemma}: ${meaning}`}
                    onPress={() => {
                      onPick({ id: sense.id, lemma: item.lemma, meaning, example: sense.exampleSentence });
                      setQuery('');
                    }}
                    className="mt-2 min-h-11 rounded-2xl bg-canvas p-3"
                  >
                    <Text weight="bold">
                      {item.lemma} <Text className="text-xs text-muted">{item.ipa}</Text>
                    </Text>
                    <Text numberOfLines={2} className="mt-1 text-sm text-muted">
                      {meaning}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))
        : null}
      {selected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bỏ chọn từ trong kho"
          onPress={onClear}
          className="mt-3 min-h-11 flex-row items-center gap-2"
        >
          <Text className="text-sm text-success" weight="bold">
            Đã chọn từ trong kho
          </Text>
          <X size={15} color={colors.success} />
        </Pressable>
      ) : null}
    </View>
  );
}
