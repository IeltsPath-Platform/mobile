import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { ReadingAttempt } from '../api/attempts';
import { useAttemptData } from '../hooks/use-attempt-data';
import type { SavedResponse, TestSection } from '../model/sections';

/**
 * Loads a Reading or Listening attempt and decides what to show: the test while in progress, the result once
 * submitted, or the catalog when the attempt can no longer be taken.
 */
export function AttemptGate({ attemptId, skill, children }: {
  attemptId: string;
  skill: 'reading' | 'listening';
  children: (data: { attempt: ReadingAttempt; sections: TestSection[]; saved: SavedResponse[] }) => ReactNode;
}) {
  const data = useAttemptData(attemptId);
  const catalog = `/practice/catalog/${skill}`;
  if (data.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={colors.accent} />
        <Text className="mt-2 text-sm text-muted">Đang tải bài {skill === 'reading' ? 'Reading' : 'Listening'}…</Text>
      </View>
    );
  }
  if (data.isError) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Không mở được bài làm" fallbackHref={catalog} />
        <EmptyState title="Chưa tải được bài làm" message={data.error.message} mood="oops" action={<Button label="Thử lại" variant="secondary" onPress={() => void data.refetch()} />} />
      </View>
    );
  }
  const { attempt, sections, saved } = data.data;
  if (attempt.status === 'SUBMITTED') return <Redirect href={{ pathname: '/practice/result/[attemptId]', params: { attemptId, skill } } as never} />;
  if (attempt.status && attempt.status !== 'IN_PROGRESS') return <Redirect href={catalog as never} />;
  if (!sections.length || sections.every((section) => section.items.every((item) => !item.question))) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Đề chưa có câu hỏi" fallbackHref={catalog} />
        <EmptyState title="Đề này chưa có câu hỏi" message="Hãy chọn đề khác trong danh mục." />
      </View>
    );
  }
  return <>{children({ attempt, sections, saved })}</>;
}
