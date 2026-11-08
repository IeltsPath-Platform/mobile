import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { ProgressSummary } from '@/src/features/progress/progress-summary';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

export default function ProgressScreen() {
  useTheme();
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="pb-12" showsVerticalScrollIndicator={false}>

        <View className="flex-row items-center gap-2 px-5 pb-2 pt-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/account' as never))}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-line"
          >
            <ChevronLeft size={22} color={colors.ink} />
          </Pressable>
          <Text weight="black" className="text-2xl">
            Tiến độ học tập
          </Text>
        </View>

        <View className="px-5">
          <Text className="text-sm text-muted">Từng ngày một, bạn đang tiến xa hơn.</Text>
          <ProgressSummary />
          <View className="mt-6">
            <Button label="Tiếp tục học ngay" onPress={() => router.push('/(tabs)' as never)} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
