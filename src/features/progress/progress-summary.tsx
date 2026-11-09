import { useQuery } from '@tanstack/react-query';
import { Flame, Sparkles, Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { studyKeys, vocabularyStudyApi } from '@/src/features/vocab/study-api';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

export function ProgressSummary() {
  useTheme();
  const { authEnabled, status } = useAuth();
  const enabled = authEnabled && status === 'authenticated';
  const summary = useQuery({
    queryKey: studyKeys.summary,
    queryFn: ({ signal }) => vocabularyStudyApi.summary(signal),
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
  const data = summary.data;
  const missing = summary.isFetching ? '…' : '—';
  const percent = data && data.xp.nextLevelAt > 0
    ? Math.max(0, Math.min(100, Math.round((data.xp.totalXp / data.xp.nextLevelAt) * 100)))
    : 0;

  return (
    <View className="mt-5 gap-4">
      <View className="flex-row gap-3">
        <View className="min-w-0 flex-1 items-center rounded-3xl border border-line bg-surface px-2 py-5">
          <Sparkles size={20} color={colors.accentDeep} />
          <Text weight="black" numberOfLines={1} adjustsFontSizeToFit className="mt-2 text-3xl text-accent-deep">
            {data?.xp.totalXp ?? missing}
          </Text>
          <Text className="mt-1 text-xs text-muted">Tổng XP</Text>
        </View>
        <View className="min-w-0 flex-1 items-center rounded-3xl border border-line bg-surface px-2 py-5">
          <Trophy size={20} color={colors.accentDeep} />
          <Text weight="black" numberOfLines={1} adjustsFontSizeToFit className="mt-2 text-3xl text-accent-deep">
            {data?.xp.level ?? missing}
          </Text>
          <Text className="mt-1 text-xs text-muted">Cấp độ</Text>
        </View>
        <View className="min-w-0 flex-1 items-center rounded-3xl px-2 py-5" style={{ backgroundColor: colors.warmSoft }}>
          <Flame size={20} color={colors.accentWarm} />
          <Text weight="black" numberOfLines={1} adjustsFontSizeToFit className="mt-2 text-3xl text-ink">
            {data?.streak.currentDays ?? missing}
          </Text>
          <Text className="mt-1 text-xs text-muted">Ngày streak</Text>
        </View>
      </View>

      {data ? (
        <View className="rounded-3xl border border-line bg-surface p-4">
          <Text weight="bold">Mốc cấp tiếp theo</Text>
          <Text weight="extrabold" className="mt-1 text-accent-deep">
            {data.xp.totalXp} / {data.xp.nextLevelAt} XP tích lũy
          </Text>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="XP tích lũy so với mốc cấp tiếp theo"
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            className="mt-3 h-3 overflow-hidden rounded-full bg-line"
          >
            <View className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </View>
          <Text className="mt-2 text-sm text-muted">Còn {data.xp.xpToNextLevel} XP để lên cấp.</Text>
          <View className="my-3 h-px bg-line" />
          <Text weight="bold" className="text-sm">
            {data.streak.qualifiedToday ? 'Đã giữ chuỗi hôm nay' : 'Học một bài để giữ chuỗi hôm nay'}
          </Text>
          <Text className="mt-1 text-sm text-muted">Kỷ lục: {data.streak.longestDays} ngày liên tiếp.</Text>
        </View>
      ) : null}

      {summary.isError ? (
        <View className="gap-2">
          <Text className="text-sm text-danger">Chưa cập nhật được tiến độ học từ vựng.</Text>
          <Button variant="secondary" label="Thử lại" loading={summary.isFetching} onPress={() => void summary.refetch()} />
        </View>
      ) : !data ? (
        <Text className="text-center text-sm text-muted">
          {enabled ? 'Đang tải tiến độ…' : 'Đăng nhập để xem tiến độ đã đồng bộ.'}
        </Text>
      ) : null}
    </View>
  );
}
