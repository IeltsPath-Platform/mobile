import { Redirect, Stack } from 'expo-router';

import { AUTH_ENABLED } from '@/src/lib/env';
import { colors } from '@/src/theme';

export default function AuthLayout() {
  if (!AUTH_ENABLED) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
