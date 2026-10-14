import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';

import { FlipCard } from './flip-card';
import { applySrs, buildQueue } from '../srs';
import type { SrsRating, SrsState, StudyCard } from '../types';

type StudySessionProps = {
  cards: StudyCard[];
  states: Record<string, SrsState>;
  onPersist: (cardId: string, next: SrsState) => void;
  onExit: () => void;
};

export function StudySession({ cards, states, onPersist, onExit }: StudySessionProps) {
  const [queue, setQueue] = useState(() => buildQueue(cards, states, Date.now()));
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const current = queue[0];

  if (!current) {
    return (
      <View className="flex-1 justify-center px-5">
        <Text weight="black" className="text-3xl">
          {cards.length === 0 ? 'Deck trống' : reviewed > 0 ? 'Hết lượt hôm nay' : 'Chưa có thẻ đến hạn'}
        </Text>
        <Text className="mt-2 text-base leading-6 text-muted">
          {cards.length === 0
            ? 'Thêm thẻ vào deck trên web rồi quay lại.'
            : `Bạn đã lật ${reviewed} thẻ trong lượt này.`}
        </Text>
        <View className="mt-6">
          {cards.length === 0 ? (
            <Button label="Về Flashcards" onPress={onExit} />
          ) : (
            <>
              <Button label="Ôn lại tất cả" onPress={() => setQueue(cards.slice(0, 20))} />
              <View className="mt-3">
                <Button variant="secondary" label="Về Flashcards" onPress={onExit} />
              </View>
            </>
          )}
        </View>
      </View>
    );
  }

  const grade = (rating: SrsRating) => {
    const next = applySrs(states[current.id], rating, Date.now());
    onPersist(current.id, next);
    setReviewed((count) => count + 1);
    setFlipped(false);
    setQueue((items) => {
      const rest = items.slice(1);
      if (rating === 'again') {
        const at = Math.min(2, rest.length);
        rest.splice(at, 0, current);
      }
      return rest;
    });
  };

  return (
    <View className="flex-1 px-5 pt-4">
      <Text weight="bold" className="text-xs uppercase tracking-wide text-muted">
        Còn {queue.length} thẻ
      </Text>
      <View className="mt-4">
        <FlipCard
          key={current.id}
          front={current.front}
          back={current.back}
          flipped={flipped}
          onFlip={() => setFlipped((value) => !value)}
        />
      </View>
      <View className="mt-6 gap-3">
        {flipped ? (
          <>
            <Button label="Chưa thuộc" variant="secondary" onPress={() => grade('again')} />
            <Button label="Đã thuộc" onPress={() => grade('good')} />
          </>
        ) : (
          <Button label="Lật thẻ" onPress={() => setFlipped(true)} />
        )}
        <Button variant="ghost" label="Kết thúc" onPress={onExit} />
      </View>
    </View>
  );
}
