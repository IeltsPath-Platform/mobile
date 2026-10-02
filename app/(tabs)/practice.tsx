import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { TopicList } from '@/src/features/learning/components/topic-list';
import { MOCK_VOCAB, vocabApi, type VocabularyItem } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

export default function PracticeScreen() {
  const { authEnabled, status } = useAuth();
  const canFetch = authEnabled && status === 'authenticated';
  const [query, setQuery] = useState('');

  const searchQuery = useQuery({
    queryKey: ['vocab', 'search', query],
    queryFn: () => vocabApi.search(query.trim()),
    enabled: canFetch && query.trim().length >= 2,
    retry: 1,
  });

  const results: VocabularyItem[] = useMemo(() => {
    if (!query.trim()) return [];
    if (canFetch && searchQuery.data) return searchQuery.data;
    if (canFetch && searchQuery.isFetching) return [];
    const q = query.trim().toLowerCase();
    return MOCK_VOCAB.filter(
      (item) =>
        item.lemma.toLowerCase().includes(q) ||
        item.senses.some((s) => s.vietnameseMeaning?.toLowerCase().includes(q)),
    );
  }, [canFetch, query, searchQuery.data, searchQuery.isFetching]);

  const showingMock = !canFetch || Boolean(searchQuery.error);

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-12 pt-5" showsVerticalScrollIndicator={false}>
      <Text weight="black" className="text-2xl" style={{ letterSpacing: -0.5 }}>
        Luyện đề
      </Text>
      <Text className="mt-1 text-sm text-muted">
        Lộ trình Reading (topic → lesson → ôn → đề cuối) theo contract `/api/learning`
      </Text>

      <View className="mt-5">
        <TopicList />
      </View>

      <Text weight="bold" className="mb-2 mt-8 text-sm text-muted">
        Tra từ vựng
      </Text>
      <View className="flex-row items-center rounded-2xl border border-line bg-surface px-3 py-2.5">
        <Search size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tra từ IELTS (vd: achieve)"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          className="ml-2 flex-1 py-1 text-base text-ink"
        />
      </View>
      {query.trim().length > 0 ? (
        <Text className="mt-2 text-xs text-muted">
          {showingMock ? 'Nguồn: mock local (hoặc API lỗi)' : 'Nguồn: BE vocabulary'}
        </Text>
      ) : null}

      {results.map((item) => {
        const sense = item.senses[0];
        return (
          <Card key={item.id} className="mt-3">
            <Text weight="extrabold" className="text-base text-accent">
              {item.lemma}
              {item.ipa ? (
                <Text weight="medium" className="text-sm text-muted">
                  {' '}
                  {item.ipa}
                </Text>
              ) : null}
            </Text>
            {sense?.vietnameseMeaning ? (
              <Text className="mt-1 text-sm text-ink">{sense.vietnameseMeaning}</Text>
            ) : null}
            {sense?.englishDefinition ? (
              <Text className="mt-0.5 text-xs text-muted">{sense.englishDefinition}</Text>
            ) : null}
          </Card>
        );
      })}
    </ScrollView>
  );
}
