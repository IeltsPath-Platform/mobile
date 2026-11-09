import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { ScrollView, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { ProgressBar } from '@/src/components/ui/progress-bar';
import { Text } from '@/src/components/ui/text';
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
  const earned = items.filter((item) => item.achieved).length;

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader title="Huy hiệu" fallbackHref="/(tabs)/account" />
      <ScrollView contentContainerClassName="px-4 pb-12 pt-4" showsVerticalScrollIndicator={false}>
        {!signedIn ? (
          <View
            className="items-center gap-4 rounded-3xl p-6"
            style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge, backgroundColor: colors.surface }}>
            <Text className="text-center text-base">Đăng nhập để xem huy hiệu của bạn.</Text>
            <Button className="w-full" label="Đăng nhập" onPress={() => router.push('/(auth)/login')} />
          </View>
        ) : (
          <>
            <View
              className="mb-4 flex-row items-center gap-4 overflow-hidden rounded-3xl p-4"
              style={{ backgroundColor: colors.heroStart }}>
              <View style={{ position: 'absolute', right: -30, top: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: colors.heroEnd, opacity: 0.45 }} />
              <Image
                source={require('@/assets/images/owl/hero-cheer.webp')}
                contentFit="contain"
                style={{ width: 84, height: 84 }}
                accessibilityIgnoresInvertColors
              />
              <View className="flex-1">
                <Text weight="black" className="text-2xl" style={{ color: '#ffffff' }}>
                  {achievements.isPending ? 'Đang tải…' : `${earned}/${items.length} huy hiệu`}
                </Text>
                <Text className="mb-2 mt-0.5 text-sm" style={{ color: '#ffffff', opacity: 0.85 }}>
                  Mỗi cột mốc học tập là một huy hiệu.
                </Text>
                <ProgressBar value={earned} max={items.length} tone="xp" height={12} accessibilityLabel="Số huy hiệu đã nhận" valueText={`${earned} trên ${items.length}`} />
              </View>
            </View>
            <ProfileAchievements
              items={items}
              loading={achievements.isPending}
              error={achievements.isError}
              onRetry={() => void achievements.refetch()}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
