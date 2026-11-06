import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

export function QueryState({ pending, error, retry }: { pending: boolean; error: Error | null; retry: () => void }) {
  if (pending) return <ActivityIndicator className="py-6" color={colors.accent} />;
  if (error) return <View className="gap-3 py-3"><Text className="text-sm text-danger">{error.message}</Text><Button label="Thử lại" variant="secondary" onPress={retry} /></View>;
  return null;
}

export function FlashcardSignIn() {
  return <View className="gap-4 p-5"><Text>Đăng nhập để xem thư viện từ của bạn.</Text><Button label="Đăng nhập" onPress={() => router.push('/(auth)/login')} /></View>;
}
