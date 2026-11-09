import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Search, Sparkles, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { notebookApi } from '@/src/features/flashcards/notebook-api';
import { useDebouncedSearch } from '@/src/features/flashcards/queries';
import { vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';
import { QueryState } from './query-state';

/** Collapsible dictionary search that saves senses into the notebook. */
export function DictionaryLookup({
  enabled,
  onRequireLogin,
}: {
  enabled: boolean;
  onRequireLogin: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const term = useDebouncedSearch(input);

  const dictionary = useQuery({
    queryKey: ['vocabulary', 'search', term],
    queryFn: ({ signal }) => vocabApi.search(term, signal),
    enabled: enabled && open && term.length >= 2,
    staleTime: 60_000,
    retry: 1,
  });
  const senses = useMemo(
    () =>
      (dictionary.data ?? [])
        .flatMap((word) =>
          word.senses.slice(0, 1).map((sense) => ({ ...sense, lemma: word.lemma, ipa: word.ipa })),
        )
        .slice(0, 5),
    [dictionary.data],
  );
  const senseIds = useMemo(() => senses.map((sense) => sense.id), [senses]);
  const saved = useQuery({
    queryKey: ['flashcards', 'notebook', 'saved', senseIds],
    queryFn: ({ signal }) => notebookApi.saved(senseIds, signal),
    enabled: enabled && open && senseIds.length > 0,
    staleTime: 60_000,
  });
  const add = useMutation({
    mutationFn: notebookApi.add,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['flashcards'] }),
        queryClient.invalidateQueries({ queryKey: ['vocabulary', 'search', term] }),
      ]);
    },
  });

  return (
    <View className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tra từ điển"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          if (!enabled) onRequireLogin();
          else setOpen((value) => !value);
        }}
        className="min-h-14 flex-row items-center gap-3 px-4"
      >
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-soft">
          <Search size={19} color={colors.accentDeep} />
        </View>
        <View className="flex-1">
          <Text weight="bold">Tra từ điển</Text>
          <Text className="text-xs text-muted">Tìm nghĩa và lưu từ để học</Text>
        </View>
        {open ? <X size={19} color={colors.muted} /> : <ChevronRight size={19} color={colors.muted} />}
      </Pressable>
      {open ? (
        <View className="gap-3 border-t border-line p-3">
          <TextInput
            value={input}
            onChangeText={setInput}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={100}
            returnKeyType="search"
            placeholder="Nhập từ tiếng Anh, ví dụ: achieve"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Tra từ trong từ điển"
            className="min-h-12 rounded-xl border border-line bg-canvas px-3 text-base text-ink"
          />
          {term.length < 2 ? <Text className="text-xs text-muted">Nhập ít nhất 2 ký tự để tìm từ.</Text> : null}
          {dictionary.isFetching ? <QueryState pending error={null} retry={() => void dictionary.refetch()} /> : null}
          {dictionary.isError ? (
            <QueryState pending={false} error={dictionary.error} retry={() => void dictionary.refetch()} />
          ) : null}
          {dictionary.isSuccess && dictionary.data.length === 0 ? (
            <View className="items-center py-3">
              <Sparkles size={20} color={colors.muted} />
              <Text className="mt-1 text-sm text-muted">Chưa tìm thấy từ phù hợp.</Text>
            </View>
          ) : null}
          {senses.length > 0 && (saved.isPending || saved.isError) ? (
            <QueryState pending={saved.isPending} error={saved.error} retry={() => void saved.refetch()} />
          ) : null}
          {senses.map((sense) => {
            const isSaved = saved.data?.includes(sense.id) ?? false;
            return (
              <View key={sense.id} className="gap-2 rounded-xl bg-canvas p-3">
                <View className="flex-row items-center justify-between gap-2">
                  <Text weight="black" className="flex-1 text-base text-accent-deep">
                    {sense.lemma}
                  </Text>
                  {sense.ipa ? <Text className="text-xs text-muted">{sense.ipa}</Text> : null}
                </View>
                {sense.vietnameseMeaning ? (
                  <Text weight="semibold" className="text-sm">
                    {sense.vietnameseMeaning}
                  </Text>
                ) : null}
                {sense.englishDefinition ? (
                  <Text className="text-sm leading-5 text-muted">{sense.englishDefinition}</Text>
                ) : null}
                {sense.exampleSentence ? (
                  <Text className="text-xs italic leading-5 text-muted">{sense.exampleSentence}</Text>
                ) : null}
                <Button
                  variant={isSaved ? 'secondary' : 'primary'}
                  label={isSaved ? 'Đã lưu vào sổ từ' : 'Lưu nghĩa này vào sổ từ'}
                  disabled={isSaved || !saved.isSuccess || add.isPending}
                  loading={add.isPending && add.variables === sense.id}
                  onPress={() => add.mutate(sense.id)}
                />
              </View>
            );
          })}
          {add.error ? (
            <Text accessibilityRole="alert" className="text-sm text-danger">
              {add.error.message}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
