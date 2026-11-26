import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { getSpeakingTask } from '@/src/features/practice/api/speaking-task';
import { TaskLoadError } from '@/src/features/practice/components/task-load-error';
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
  // A failed background refetch keeps the cached task: only a task that never loaded replaces the exam.
  if (!task.data) {
    return <TaskLoadError title="Speaking" heading="Chưa tải được đề Speaking" error={task.error} fallbackHref="/practice/catalog/speaking" onRetry={() => void task.refetch()} />;
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
