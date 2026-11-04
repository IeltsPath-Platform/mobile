import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/src/theme';

/** Game screens draw their own top row; this keeps it clear of the status bar / notch. */
export default function GamesLayout() {
  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
    </SafeAreaView>
  );
}
