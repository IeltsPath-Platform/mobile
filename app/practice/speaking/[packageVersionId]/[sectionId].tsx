import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { getSpeakingTask } from '@/src/features/practice/api/speaking-task';
import { SpeakingRoom } from '@/src/features/practice/speaking/speaking-room';
import { colors } from '@/src/theme';

const ID = /^[0-9a-f-]{36}$/i;

export default function SpeakingTaskRoute() {
  const params = useLocalSearchParams<{ packageVersionId: string; sectionId: string; parts?: string; q?: string }>();
  const packageVersionId = params.packageVersionId ?? '';
  const sectionId = params.sectionId ?? '';
  const task = useQuery({ queryKey: ['practice', 'speaking-task', packageVersionId, sectionId], queryFn: ({ signal }) => getSpeakingTask(packageVersionId, sectionId, signal), enabled: Boolean(packageVersionId && sectionId) });
  const parts = (params.parts ?? '').split(',').filter((id) => ID.test(id));
  const question = Number(params.q);
  if (task.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent} /></View>;
  if (task.isError) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Speaking" fallbackHref="/practice/catalog/speaking" />
        <EmptyState title="Chưa tải được đề Speaking" message={task.error.message} mood="oops" action={<Button label="Thử lại" variant="secondary" onPress={() => void task.refetch()} />} />
      </View>
    );
  }
  return (
    <SpeakingRoom
      key={`${task.data.sectionId}:${params.q ?? ''}`}
      task={task.data}
      parts={parts.length ? parts : [sectionId]}
      initialIndex={Number.isInteger(question) && question > 0 ? question : 0}
      timed={params.q === undefined}
    />
  );
}
