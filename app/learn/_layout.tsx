import { Stack } from 'expo-router';

import { colors } from '@/src/theme';

export default function LearnLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.accentDeep,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.canvas },
      }}>
      <Stack.Screen name="topic/[topicId]" options={{ title: 'Chủ đề' }} />
      <Stack.Screen name="lesson/[lessonId]" options={{ title: 'Bài học' }} />
      <Stack.Screen name="review/[reviewId]" options={{ title: 'Ôn tập' }} />
    </Stack>
  );
}
