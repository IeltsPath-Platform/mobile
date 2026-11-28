import { Stack } from 'expo-router';

import { ReaderPrefsProvider } from '@/src/features/practice/components/reader-prefs';
import { colors } from '@/src/theme';
import { themedScreenLayout, useTheme } from '@/src/theme/app-theme';

export { RouteErrorBoundary as ErrorBoundary } from '@/src/components/ui/route-error-boundary';

/** The placement test reuses the practice test screens, which read the reader preferences. */
export default function PlacementLayout() {
  useTheme();
  return (
    <ReaderPrefsProvider>
      <Stack screenLayout={themedScreenLayout} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
    </ReaderPrefsProvider>
  );
}
