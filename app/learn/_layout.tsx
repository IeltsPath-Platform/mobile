import { Stack } from 'expo-router';

import { colors } from '@/src/theme';

/** Screens render their own BackHeader so back navigation looks the same across the app. */
export default function LearnLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="topic/[topicId]" />
      <Stack.Screen name="lesson/[lessonId]" />
      <Stack.Screen name="session/[lessonId]" />
      <Stack.Screen name="review/[reviewId]" />
    </Stack>
  );
}
