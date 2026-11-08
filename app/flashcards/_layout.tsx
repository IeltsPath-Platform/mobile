import { Stack } from 'expo-router';

import { colors } from '@/src/theme';
import { themedScreenLayout, useTheme } from '@/src/theme/app-theme';

/** Screens render their own BackHeader so back navigation looks the same across the app. */
export default function FlashcardsLayout() {
  useTheme();
  return <Stack screenLayout={themedScreenLayout} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}
