import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Flame, Sparkles, Trophy, ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import { useAuth } from '@/src/features/auth/auth-provider';
import { gamificationApi } from './gamification-api';
import { colors } from '@/src/theme';
import { useStreak } from './use-streak';

export function useProgress() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ['progress', 'summary'],
    queryFn: gamificationApi.progress,
    enabled: status === 'authenticated',
    staleTime: 30000,
    retry: 1,
  });
}

export function ProgressSummary({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const progress = useProgress();
  const streak = useStreak();
  const pct = progress.data
    ? Math.max(0, Math.min(100, Math.round((progress.data.xpToday / Math.max(progress.data.dailyCap, 1)) * 100)))
    : 0;

  if (compact) {
    return (
      <View className="mt-4 rounded-3xl border border-line bg-surface px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text weight="bold" className="text-base">
              Thành quả của bạn
            </Text>
            <Text className="mt-0.5 text-xs text-muted">Mỗi buổi học đều có ý nghĩa</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/progress' as never)}
            className="flex-row items-center gap-1 rounded-full px-3 py-2"
            style={{ backgroundColor: colors.accentSoft }}
          >
            <Text weight="bold" className="text-xs text-accent-deep">
              Chi tiết
            </Text>
            <ChevronRight size={13} color={colors.accentDeep} />
          </Pressable>
        </View>

        {/* 3 chỉ số */}
        <View className="mt-3 flex-row gap-2">
          <View className="min-w-0 flex-1 items-center rounded-2xl py-3" style={{ backgroundColor: colors.accentSoft }}>
            <Sparkles size={15} color={colors.accentDeep} />
            <Text weight="black" numberOfLines={1} adjustsFontSizeToFit className="mt-1 text-xl text-accent-deep">
              {progress.data?.totalXp ?? '—'}
            </Text>
            <Text className="mt-0.5 text-[10px] text-muted">Tổng XP</Text>
          </View>
          <View className="min-w-0 flex-1 items-center rounded-2xl bg-canvas py-3">
            <Trophy size={15} color={colors.accentDeep} />
            <Text weight="black" className="mt-1 text-xl text-accent-deep">
              {progress.data?.level ?? '—'}
            </Text>
            <Text className="mt-0.5 text-[10px] text-muted">Cấp độ</Text>
          </View>
          <View className="min-w-0 flex-1 items-center rounded-2xl py-3" style={{ backgroundColor: colors.warmSoft }}>
            <Flame size={15} color={colors.accentWarm} />
            <Text weight="black" className="mt-1 text-xl" style={{ color: colors.accentWarm }}>
              {streak.currentDays ?? '—'}
            </Text>
            <Text className="mt-0.5 text-[10px] text-muted">Streak</Text>
          </View>
        </View>

        {/* Daily XP bar */}
        {progress.data ? (
          <View className="mt-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted">Hôm nay</Text>
              <Text weight="bold" className="text-xs text-accent-deep">
                {progress.data.xpToday}/{progress.data.dailyCap} XP
              </Text>
            </View>
            <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
              <View className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </View>
          </View>
        ) : null}

        {/* States */}
        {!progress.data && !progress.isError ? (
          <Text className="mt-2 text-xs text-muted">
            {progress.isFetching ? 'Đang tải tiến độ…' : 'Đăng nhập để đồng bộ tiến độ học.'}
          </Text>
        ) : null}
        {progress.isError || streak.error ? (
          <View className="mt-2 gap-2">
            <Text className="text-xs text-danger">Chưa tải được một phần tiến độ.</Text>
            <Button
              variant="secondary"
              label="Thử lại"
              onPress={() => {
                void progress.refetch();
                void streak.refetch();
              }}
            />
          </View>
        ) : null}
      </View>
    );
  }

  // ── Non-compact (màn hình /progress) ──────────────────────────────────────
  return (
    <View className="mt-5 gap-4">
      {/* 3 card chỉ số lớn */}
      <View className="flex-row gap-3">
        <View className="flex-1 items-center rounded-3xl border border-line bg-surface py-5">
          <Sparkles size={20} color={colors.accentDeep} />
          <Text weight="black" className="mt-2 text-3xl text-accent-deep">
            {progress.data?.totalXp ?? '—'}
          </Text>
          <Text className="mt-1 text-xs text-muted">Tổng XP</Text>
        </View>
        <View className="flex-1 items-center rounded-3xl border border-line bg-surface py-5">
          <Trophy size={20} color={colors.accentDeep} />
          <Text weight="black" className="mt-2 text-3xl text-accent-deep">
            {progress.data?.level ?? '—'}
          </Text>
          <Text className="mt-1 text-xs text-muted">Cấp độ</Text>
        </View>
        <View className="flex-1 items-center rounded-3xl py-5" style={{ backgroundColor: colors.warmSoft }}>
          <Flame size={20} color={colors.accentWarm} />
          <Text weight="black" className="mt-2 text-3xl" style={{ color: colors.accentWarm }}>
            {streak.currentDays ?? '—'}
          </Text>
          <Text className="mt-1 text-xs text-muted">Ngày streak</Text>
        </View>
      </View>

      {/* Daily XP progress */}
      {progress.data ? (
        <View className="rounded-3xl border border-line bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text weight="bold">Hôm nay</Text>
            <Text weight="extrabold" className="text-accent-deep">
              {progress.data.xpToday} / {progress.data.dailyCap} XP
            </Text>
          </View>
          <View className="mt-3 h-3 overflow-hidden rounded-full bg-canvas">
            <View className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </View>
          <Text className="mt-2 text-xs text-muted">
            Còn {Math.max(0, progress.data.dailyCap - progress.data.xpToday)} XP để đạt mục tiêu hôm nay
          </Text>
          <View className="mt-3 h-px bg-line" />
          <Text className="mt-3 text-sm text-muted">
            Còn{' '}
            <Text weight="bold" className="text-ink">
              {progress.data.xpToNextLevel} XP
            </Text>{' '}
            đến cấp tiếp theo
          </Text>
          {streak.longestDays ? (
            <Text className="mt-1 text-sm text-muted">
              Kỷ lục:{' '}
              <Text weight="bold" className="text-ink">
                {streak.longestDays} ngày
              </Text>{' '}
              liên tiếp
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Error / loading */}
      {progress.isError || streak.error ? (
        <View className="gap-2">
          <Text className="text-sm text-danger">Chưa tải được một phần tiến độ.</Text>
          <Button
            variant="secondary"
            label="Thử lại"
            onPress={() => {
              void progress.refetch();
              void streak.refetch();
            }}
          />
        </View>
      ) : null}
      {!progress.data && !progress.isError ? (
        <Text className="text-center text-sm text-muted">
          {progress.isFetching ? 'Đang tải tiến độ…' : 'Đăng nhập để xem tiến độ đã đồng bộ.'}
        </Text>
      ) : null}
    </View>
  );
}
