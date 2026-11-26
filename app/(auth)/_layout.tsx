import { Stack } from 'expo-router';

import { colors } from '@/src/theme';
import { themedScreenLayout, useTheme } from '@/src/theme/app-theme';

/** A crash in one screen of this group shows a retry screen here instead of taking down the whole app. */
export { RouteErrorBoundary as ErrorBoundary } from '@/src/components/ui/route-error-boundary';

export default function AuthLayout() {
  useTheme();
  return (
    <Stack screenLayout={themedScreenLayout} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />    </Stack>
  );
}
