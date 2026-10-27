import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { createRequestId } from '@/src/lib/request-id';

import { FlipCard } from './flip-card';
import type { SrsRating, StudyCard } from '../types';

type StudySessionProps = {
  cards: StudyCard[];
  onReview: (cardId: string, correct: boolean, requestId: string) => Promise<void>;
  hasMoreCards: boolean;
  onLoadMore: () => Promise<StudyCard[]>;
  onExit: () => void;
};

export function StudySession({ cards, onReview, hasMoreCards, onLoadMore, onExit }: StudySessionProps) {
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestIds = useRef(new Map<string, string>());
  const retried = useRef(new Set<string>());
  const current = queue[0];

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true); setError('');
    try {
      const nextCards = await onLoadMore();
      if (!nextCards.length) { setError('Không còn thẻ nào đến hạn trong bộ này.'); return; }
      retried.current.clear();
      setFlipped(false);
      setQueue(nextCards);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải thêm được thẻ. Hãy thử lại.');
    } finally { setLoadingMore(false); }
  };

  if (!current) {
    return (
      <View className="flex-1 justify-center px-5">
        <Text weight="black" className="text-3xl">
          {cards.length === 0 ? 'Chưa có thẻ đến hạn' : 'Hoàn thành lượt ôn'}
        </Text>
        <Text className="mt-2 text-base leading-6 text-muted">
          {cards.length === 0 ? 'Bạn đã ôn hết thẻ đến hạn trong bộ này.' : `Bạn đã gửi ${reviewed} lượt ôn lên tài khoản.`}
        </Text>
        <View className="mt-6">
          {hasMoreCards ? <Button label={loadingMore ? 'Đang tải…' : 'Tiếp tục với thẻ còn lại'} loading={loadingMore} disabled={loadingMore} onPress={() => void loadMore()} /> : null}
          <Button label="Về Flashcards" onPress={onExit} />
        </View>
      </View>
    );
  }

  const grade = async (rating: SrsRating) => {
    if (reviewing) return;
    let id = requestIds.current.get(current.id);
    if (!id) {
      id = createRequestId();
      requestIds.current.set(current.id, id);
    }
    setReviewing(true);
    setError('');
    try {
      await onReview(current.id, rating === 'good', id);
      requestIds.current.delete(current.id);
      setReviewed((count) => count + 1);
      setFlipped(false);
      setQueue((items) => {
        const rest = items.slice(1);
        if (rating === 'again' && !retried.current.has(current.id)) {
          retried.current.add(current.id);
          rest.splice(Math.min(2, rest.length), 0, current);
        }
        return rest;
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa lưu được lượt ôn. Hãy thử lại.');
    } finally {
      setReviewing(false);
    }
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
          imageUrl={current.imageUrl}
          flipped={flipped}
          onFlip={() => setFlipped((value) => !value)}
        />
      </View>
      <View className="mt-6 gap-3">
        {error ? <Text accessibilityRole="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</Text> : null}
        {flipped ? (
          <>
            <Button label={reviewing ? 'Đang lưu…' : 'Chưa thuộc'} loading={reviewing} disabled={reviewing} variant="secondary" onPress={() => void grade('again')} />
            <Button label={reviewing ? 'Đang lưu…' : 'Đã thuộc'} loading={reviewing} disabled={reviewing} onPress={() => void grade('good')} />
          </>
        ) : (
          <Button label="Lật thẻ" onPress={() => setFlipped(true)} />
        )}
        <Button variant="ghost" label="Kết thúc" onPress={onExit} />
      </View>
    </View>
  );
}
