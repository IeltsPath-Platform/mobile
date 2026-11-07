import { useQuery } from '@tanstack/react-query';
import { Award } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import { useAuth } from '@/src/features/auth/auth-provider';
import { ProfileAchievements } from '@/src/features/profile/profile-achievements';
import { vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

export default function AchievementsScreen() {
  useTheme();
  const { authEnabled, status } = useAuth();
  const signedIn = authEnabled && status === 'authenticated';
  const achievements = useQuery({
    queryKey: ['vocab', 'achievements'],
    queryFn: () => vocabApi.achievements(),
    enabled: signedIn,
    staleTime: 60_000,
  });
  const items = achievements.data?.items ?? [];
  const completedCount = items.filter((item) => item.achieved).length;
  const summaryLabel = achievements.isPending
    ? 'Đang tải huy hiệu'
    : achievements.isError
      ? 'Chưa tải được huy hiệu'
      : `${completedCount} / ${items.length} huy hiệu`;

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader
        title="Thành tích & Huy hiệu"
        subtitle="Các cột mốc bạn chinh phục khi học từ vựng"
        fallbackHref="/(tabs)/account"
      />
      <ScrollView contentContainerClassName="gap-4 px-4 pb-12 pt-4" showsVerticalScrollIndicator={false}>
        {!signedIn ? (
          <View className="gap-4 rounded-3xl border border-line bg-surface p-4">
            <Text>Đăng nhập để xem huy hiệu của bạn.</Text>
            <Button label="Đăng nhập" onPress={() => router.push('/(auth)/login')} />
          </View>
        ) : <>
        <View className="flex-row items-center gap-3 rounded-3xl border border-line bg-surface p-4">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft">
            <Award size={22} color={colors.accentDeep} />
          </View>
          <View className="flex-1">
            <Text weight="black" className="text-base text-ink">
              {summaryLabel}
            </Text>
            <Text className="mt-0.5 text-xs text-muted">Mỗi huy hiệu ghi nhận một cột mốc học tập cụ thể.</Text>
          </View>
        </View>
        <ProfileAchievements
          items={achievements.data?.items}
          loading={achievements.isPending}
          error={achievements.isError}
          onRetry={() => void achievements.refetch()}
        />
        </>}
      </ScrollView>
    </View>
  );
}
