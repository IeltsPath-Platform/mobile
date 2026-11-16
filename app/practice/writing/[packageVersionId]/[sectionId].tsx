import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { getWritingTask } from '@/src/features/practice/api/writing';
import { WritingScreen } from '@/src/features/practice/writing/writing-screen';
import { colors } from '@/src/theme';

export default function WritingTaskRoute() {
  const { packageVersionId = '', sectionId = '', mode } = useLocalSearchParams<{ packageVersionId: string; sectionId: string; mode?: string }>();
  const task = useQuery({ queryKey: ['practice', 'writing-task', packageVersionId, sectionId], queryFn: ({ signal }) => getWritingTask(packageVersionId, sectionId, signal), enabled: Boolean(packageVersionId && sectionId) });
  if (task.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent} /></View>;
  if (task.isError) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Writing" fallbackHref="/practice/catalog/writing" />
        <EmptyState title="Chưa tải được đề Writing" message={task.error.message} mood="oops" action={<Button label="Thử lại" variant="secondary" onPress={() => void task.refetch()} />} />
      </View>
    );
  }
  return <WritingScreen key={`${task.data.sectionId}:${mode}`} task={task.data} mode={mode === 'exam' ? 'exam' : 'practice'} />;
}
