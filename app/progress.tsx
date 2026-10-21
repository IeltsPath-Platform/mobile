import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/src/components/ui/button';
import { ProgressSummary } from '@/src/features/progress/progress-summary';
export default function ProgressScreen() {
  const router = useRouter();
  return <SafeAreaView className="flex-1 bg-canvas"><ScrollView contentContainerClassName="p-5 pb-12">
    <Button label="‹ Hồ sơ" variant="ghost" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/account')} />
    <ProgressSummary />
    <View className="mt-5"><Button label="Tiếp tục học" onPress={() => router.push('/(tabs)')} /></View>
  </ScrollView></SafeAreaView>;
}
