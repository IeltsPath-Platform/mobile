import { Volume2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { createRequestId } from '@/src/lib/request-id';

import {
  SoundToggle,
  useStudyMusic,
} from '@/src/features/session/components/sound-toggle';
import { haptics } from '@/src/lib/haptics';
import { sound } from '@/src/lib/sound';
import { colors } from '@/src/theme';
import { speakVocabularyPronunciation } from '@/src/features/vocab/pronunciation';
import { FlipCard } from './flip-card';
import type { SrsRating, StudyCard } from '../types';

type StudySessionProps = {
  cards: StudyCard[];
  onReview: (
    cardId: string,
    correct: boolean,
    requestId: string,
  ) => Promise<void>;
  hasMoreCards: boolean;
  onLoadMore: () => Promise<StudyCard[]>;
  onExit: () => void;
};

export function StudySession({
  cards,
  onReview,
  hasMoreCards,
  onLoadMore,
  onExit,
}: StudySessionProps) {
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [pendingRating, setPendingRating] = useState<SrsRating | null>(null);
  const submitting = useRef(false);
  const requestIds = useRef(new Map<string, string>());
  const retried = useRef(new Set<string>());
  const current = queue[0];
  const finished = !current && reviewed > 0;

  useStudyMusic(Boolean(current));
  // Hear each new card's word once as it appears; the speaker button replays it.
  useEffect(() => {
    if (current?.front)
      void speakVocabularyPronunciation(
        current.front,
        current.pronunciationAudioReference,
      );
    return () => sound.stopSpeaking();
  }, [current?.id, current?.pronunciationAudioReference]);
  useEffect(() => {
    if (!finished) return;
    haptics.success();
    void sound.play('complete');
  }, [finished]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const nextCards = await onLoadMore();
      if (!nextCards.length) {
        setError('Không còn thẻ nào đến hạn trong bộ này.');
        return;
      }
      retried.current.clear();
      setFlipped(false);
      setQueue(nextCards);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Không tải thêm được thẻ. Hãy thử lại.',
      );
    } finally {
      setLoadingMore(false);
    }
  };

  if (!current) {
    return (
      <View className="flex-1 justify-center px-5">
        <Text weight="black" className="text-3xl">
          {cards.length === 0 ? 'Chưa có thẻ đến hạn' : 'Hoàn thành lượt ôn'}
        </Text>
        <Text className="mt-2 text-base leading-6 text-muted">
          {cards.length === 0
            ? 'Bạn đã ôn hết thẻ đến hạn trong bộ này.'
            : `Bạn đã gửi ${reviewed} lượt ôn lên tài khoản.`}
        </Text>
        <View className="mt-6">
          {error ? (
            <Text
              accessibilityRole="alert"
              className="mb-3 text-sm text-danger"
            >
              {error}
            </Text>
          ) : null}
          {hasMoreCards ? (
            <Button
              label={loadingMore ? 'Đang tải…' : 'Tiếp tục với thẻ còn lại'}
              loading={loadingMore}
              disabled={loadingMore}
              onPress={() => void loadMore()}
            />
          ) : null}
          <Button label="Về thẻ từ" onPress={onExit} />
        </View>
      </View>
    );
  }

  const grade = async (rating: SrsRating) => {
    if (
      submitting.current ||
      (pendingRating !== null && pendingRating !== rating)
    )
      return;
    submitting.current = true;
    setPendingRating(rating);
    let id = requestIds.current.get(current.id);
    if (!id) {
      id = createRequestId();
      requestIds.current.set(current.id, id);
    }
    setReviewing(true);
    setError('');
    try {
      await onReview(current.id, rating === 'good', id);
      if (rating === 'good') void sound.play('match');
      requestIds.current.delete(current.id);
      setPendingRating(null);
      setReviewed((count) => count + 1);
      setFlipped(false);
      const requeue = rating === 'again' && !retried.current.has(current.id);
      if (requeue) retried.current.add(current.id);
      setQueue((items) => {
        const rest = items.slice(1);
        if (requeue) rest.splice(Math.min(2, rest.length), 0, current);
        return rest;
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Chưa lưu được lượt ôn. Hãy thử lại.',
      );
    } finally {
      submitting.current = false;
      setReviewing(false);
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-5 pt-4 pb-10">
      <View className="flex-row items-center justify-between">
        <Text
          weight="bold"
          className="text-xs uppercase tracking-wide text-muted"
        >
          Còn {queue.length} thẻ
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Nghe phát âm ${current.front}`}
            hitSlop={6}
            onPress={() => {
              haptics.tap();
              void speakVocabularyPronunciation(
                current.front,
                current.pronunciationAudioReference,
              );
            }}
            className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: colors.accentSoft }}
          >
            <Volume2 size={19} color={colors.accentDeep} />
          </Pressable>
          <SoundToggle />
        </View>
      </View>
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
        {error ? (
          <Text
            accessibilityRole="alert"
            className="rounded-xl bg-danger-soft p-3 text-sm text-danger"
          >
            {error}
          </Text>
        ) : null}
        {flipped ? (
          <>
            <Button
              label={
                reviewing
                  ? 'Đang lưu…'
                  : pendingRating === 'again'
                    ? 'Gửi lại: Chưa thuộc'
                    : 'Chưa thuộc'
              }
              loading={reviewing}
              disabled={reviewing || pendingRating === 'good'}
              variant="secondary"
              onPress={() => void grade('again')}
            />
            <Button
              label={
                reviewing
                  ? 'Đang lưu…'
                  : pendingRating === 'good'
                    ? 'Gửi lại: Đã thuộc'
                    : 'Đã thuộc'
              }
              loading={reviewing}
              disabled={reviewing || pendingRating === 'again'}
              onPress={() => void grade('good')}
            />
          </>
        ) : (
          <Button
            label="Lật thẻ"
            onPress={() => {
              haptics.tap();
              void sound.play('tap');
              setFlipped(true);
            }}
          />
        )}
        <Button
          variant="ghost"
          label="Kết thúc"
          disabled={reviewing}
          onPress={onExit}
        />
      </View>
    </ScrollView>
  );
}
