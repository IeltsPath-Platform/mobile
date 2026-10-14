import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { StudySession } from '@/src/features/flashcards/components/study-session';
import { mockCardsFor } from '@/src/features/flashcards/mock-cards';
import { loadSrs, saveSrs } from '@/src/features/flashcards/storage';
import type { SrsState, StudyCard } from '@/src/features/flashcards/types';
import { vocabApi, type DeckItem } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

function cardsFromItems(items: DeckItem[]): StudyCard[] {
  return items
    .filter((item) => item.status !== 'DELETED' && item.status !== 'ARCHIVED')
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      id: item.flashcardId,
      front: item.front,
      back: item.back,
    }));
}

export default function DeckStudyScreen() {
  const { deckId, name } = useLocalSearchParams<{ deckId: string; name?: string }>();
  const isMock = Boolean(deckId?.startsWith('mock-'));
  const [states, setStates] = useState<Record<string, SrsState> | null>(null);

  const itemsQuery = useQuery({
    queryKey: ['decks', deckId, 'items'],
    queryFn: () => vocabApi.listDeckItems(deckId!),
    enabled: Boolean(deckId) && !isMock,
  });

  useEffect(() => {
    let cancelled = false;
    void loadSrs().then((loaded) => {
      if (!cancelled) setStates(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = isMock ? mockCardsFor(deckId ?? '') : itemsQuery.data ? cardsFromItems(itemsQuery.data) : [];
  const title = name || 'Học thẻ';

  if (!deckId || states == null || (!isMock && itemsQuery.isPending)) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!isMock && itemsQuery.isError) {
    return (
      <View className="flex-1 bg-canvas px-5 pt-6">
        <FormAlert tone="error" message="Không tải được thẻ trong bộ này." />
        <View className="mt-4">
          <Button variant="secondary" label="Về Flashcards" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <Text weight="bold" className="px-5 pt-2 text-sm text-muted">
        {title}
      </Text>
      <StudySession
        key={deckId}
        cards={cards}
        states={states}
        onPersist={(cardId, next) => {
          setStates((prev) => {
            const all = { ...(prev ?? {}), [cardId]: next };
            void saveSrs(all);
            return all;
          });
        }}
        onExit={() => router.back()}
      />
    </View>
  );
}
