import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { notebookApi } from '@/src/features/flashcards/notebook-api';
import { invalidateFlashcards, useDebouncedSearch, useFlashcardAccess } from '@/src/features/flashcards/queries';
import { FlashcardSignIn, QueryState } from '@/src/features/flashcards/components/query-state';
import { vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

export default function NotebookAddScreen() {
  const enabled = useFlashcardAccess();
  const client = useQueryClient();
  const [input, setInput] = useState('');
  const q = useDebouncedSearch(input);
  const searching = q.length >= 2;
  const search = useQuery({
    queryKey: ['vocabulary', 'search', q],
    queryFn: ({ signal }) => vocabApi.search(q, signal),
    enabled: enabled && searching,
    staleTime: 60_000,
  });
  const senses = useMemo(
    () => (search.data ?? []).flatMap((word) => word.senses.map((sense) => ({ ...sense, lemma: word.lemma }))),
    [search.data],
  );
  const ids = useMemo(() => senses.map((sense) => sense.id), [senses]);
  const saved = useQuery({
    queryKey: ['flashcards', 'notebook', 'saved', ids],
    queryFn: ({ signal }) => notebookApi.saved(ids, signal),
    enabled: enabled && ids.length > 0,
  });
  const add = useMutation({ mutationFn: notebookApi.add, onSuccess: () => invalidateFlashcards(client) });

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader title="Thêm từ vào sổ" fallbackHref="/flashcards/notebook" />
      {!enabled ? (
        <FlashcardSignIn />
      ) : (
        <FlatList
          data={searching ? senses : []}
          keyExtractor={(sense) => sense.id}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-5 pb-10"
          ListHeaderComponent={
            <View className="gap-3 pb-4">
              <TextInput
                value={input}
                onChangeText={setInput}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={100}
                placeholder="Nhập từ tiếng Anh…"
                placeholderTextColor={colors.muted}
                accessibilityLabel="Tra từ để lưu"
                className="min-h-12 rounded-2xl border border-line bg-surface px-4 text-ink"
              />
              <Text className="text-sm text-muted">
                Chọn đúng nghĩa bạn muốn học. Từ đã lưu sẽ không được tạo lại.
              </Text>
              {searching ? (
                <QueryState pending={search.isPending} error={search.error} retry={() => void search.refetch()} />
              ) : null}
              {ids.length ? (
                <QueryState pending={saved.isPending} error={saved.error} retry={() => void saved.refetch()} />
              ) : null}
              {add.error ? (
                <Text accessibilityRole="alert" className="text-sm text-danger">
                  {add.error.message}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const isSaved = saved.data?.includes(item.id) ?? false;
            return (
              <View className="mb-3 gap-2 rounded-2xl border border-line bg-surface p-4">
                <Text weight="bold" className="text-lg">
                  {item.lemma} <Text className="text-sm text-muted">{item.partOfSpeech}</Text>
                </Text>
                <Text>{item.vietnameseMeaning || item.englishDefinition}</Text>
                {item.exampleSentence ? (
                  <Text className="text-sm italic text-muted">{item.exampleSentence}</Text>
                ) : null}
                <Button
                  label={isSaved ? 'Đã lưu' : 'Lưu vào sổ từ'}
                  disabled={add.isPending || !saved.isSuccess || isSaved}
                  loading={add.isPending && add.variables === item.id}
                  onPress={() => add.mutate(item.id)}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            searching && search.isSuccess ? (
              <Text className="py-8 text-center text-muted">Không tìm thấy từ phù hợp.</Text>
            ) : undefined
          }
        />
      )}
    </View>
  );
}
