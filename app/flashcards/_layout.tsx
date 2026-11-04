import { Stack } from 'expo-router';

import { colors } from '@/src/theme';

/** Screens render their own BackHeader so back navigation looks the same across the app. */
export default function FlashcardsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}
