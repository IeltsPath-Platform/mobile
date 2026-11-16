import { Stack } from 'expo-router';

import { ReaderPrefsProvider } from '@/src/features/practice/components/reader-prefs';
import { colors } from '@/src/theme';
import { themedScreenLayout, useTheme } from '@/src/theme/app-theme';

/** Practice-test screens draw their own headers; the test screens hide the tab bar by living in this stack. */
export default function PracticeLayout() {
  useTheme();
  return (
    <ReaderPrefsProvider>
      <Stack screenLayout={themedScreenLayout} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
    </ReaderPrefsProvider>
  );
}
