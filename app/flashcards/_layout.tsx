import { Stack } from 'expo-router';

import { colors } from '@/src/theme';

export default function FlashcardsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.accentDeep,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.canvas },
      }}>
      <Stack.Screen name="[deckId]" options={{ title: 'Học thẻ' }} />
    </Stack>
  );
}
