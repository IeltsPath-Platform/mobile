import { useRouter, type ErrorBoundaryProps } from 'expo-router';
import { View } from 'react-native';

import { Button } from './button';
import { Text } from './text';

/**
 * Shown in place of a group of screens (practice, games, flashcards, tabs, sign-in) when one of them crashes while
 * rendering, so the rest of the app and its navigation stay usable. Layouts export it as their `ErrorBoundary`.
 * No technical detail is shown to the learner.
 */
export function RouteErrorBoundary({ retry }: ErrorBoundaryProps) {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-canvas px-6" accessibilityRole="alert">
      <Text weight="extrabold" className="text-center text-xl">Màn hình này gặp sự cố</Text>
      <Text className="mb-2 text-center text-sm text-muted">Bạn có thể thử lại hoặc quay về trang chủ.</Text>
      <Button label="Thử lại" onPress={retry} />
      <Button label="Về trang chủ" variant="secondary" onPress={() => router.replace('/')} />
    </View>
  );
}
