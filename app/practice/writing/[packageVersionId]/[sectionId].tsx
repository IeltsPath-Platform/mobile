import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { getWritingTask } from '@/src/features/practice/api/writing';
import { TaskLoadError } from '@/src/features/practice/components/task-load-error';
import { WritingScreen } from '@/src/features/practice/writing/writing-screen';
import { colors } from '@/src/theme';

export default function WritingTaskRoute() {
  const { packageVersionId = '', sectionId = '', mode } = useLocalSearchParams<{ packageVersionId: string; sectionId: string; mode?: string }>();
  const task = useQuery({ queryKey: ['practice', 'writing-task', packageVersionId, sectionId], queryFn: ({ signal }) => getWritingTask(packageVersionId, sectionId, signal), enabled: Boolean(packageVersionId && sectionId) });
  if (task.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent} /></View>;
  // A failed background refetch keeps the cached task: only a task that never loaded replaces the exam.
  if (!task.data) {
    return <TaskLoadError title="Writing" heading="Chưa tải được đề Writing" error={task.error} fallbackHref="/practice/catalog/writing" onRetry={() => void task.refetch()} />;
  }
  return <WritingScreen key={`${task.data.sectionId}:${mode}`} task={task.data} mode={mode === 'exam' ? 'exam' : 'practice'} />;
}
