import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Flame, Sparkles, Trophy } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { Button } from '@/src/components/ui/button';
import { useAuth } from '@/src/features/auth/auth-provider';
import { apiRequest } from '@/src/lib/api-client';
import { colors } from '@/src/theme';
import { useStreak } from './use-streak';

type Progress = { totalXp: number; level: number; nextLevelAt: number; xpToNextLevel: number; xpToday: number; dailyCap: number };
export function useProgress() {
  const { status } = useAuth();
  return useQuery({ queryKey: ['progress', 'summary'], queryFn: () => apiRequest<Progress>('/api/learning/me/progress', { auth: true }), enabled: status === 'authenticated', staleTime: 30000, retry: 1 });
}
export function ProgressSummary({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const progress = useProgress();
  const streak = useStreak();
  if (compact) {
    return (
      <View className="mt-4 rounded-3xl border border-line bg-surface px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View><Text weight="bold" className="text-base">Thành quả của bạn</Text><Text className="mt-0.5 text-xs text-muted">Mỗi buổi học đều có ý nghĩa</Text></View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/progress' as never)} className="min-h-10 flex-row items-center justify-center rounded-full bg-accent-soft px-3">
            <Text weight="bold" className="text-xs text-accent-deep">Chi tiết →</Text>
          </Pressable>
        </View>
        <View className="mt-2 flex-row gap-2">
          <View className="min-w-0 flex-1 rounded-2xl bg-accent-soft px-2.5 py-3">
            <Sparkles size={15} color={colors.accentDeep} />
            <Text weight="black" numberOfLines={1} adjustsFontSizeToFit className="text-xl text-accent-deep">{progress.data?.totalXp ?? '—'}</Text>
            <Text className="mt-0.5 text-xs text-muted">Tổng XP</Text>
          </View>
          <View className="min-w-0 flex-1 rounded-2xl bg-canvas px-2.5 py-3">
            <Trophy size={15} color={colors.accentDeep} />
            <Text weight="black" className="text-xl text-accent-deep">{progress.data?.level ?? '—'}</Text>
            <Text className="mt-0.5 text-xs text-muted">Cấp độ</Text>
          </View>
          <View className="min-w-0 flex-1 rounded-2xl bg-xp/10 px-2.5 py-3">
            <Flame size={15} color={colors.xpDeep} />
            <Text weight="black" className="text-xl text-xp-deep">{streak.currentDays ?? '—'}</Text>
            <Text className="mt-0.5 text-xs text-muted">Streak</Text>
          </View>
        </View>
        {progress.data ? <View className="mt-3 flex-row items-center gap-3"><View className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas"><View className="h-full rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, Math.round((progress.data.xpToday / Math.max(progress.data.dailyCap, 1)) * 100)))}%` }} /></View><Text className="text-xs text-muted">{progress.data.xpToday}/{progress.data.dailyCap} XP hôm nay</Text></View> : null}
        {!progress.data && !progress.isError ? (
          <Text className="mt-2 text-xs text-muted">
            {progress.isFetching ? 'Đang tải tiến độ…' : 'Đăng nhập để đồng bộ tiến độ học.'}
          </Text>
        ) : null}
        {progress.isError || streak.error ? (
          <View className="mt-2 gap-2">
            <Text className="text-xs text-danger">Chưa tải được một phần tiến độ.</Text>
            <Button variant="secondary" label="Thử lại" onPress={() => { void progress.refetch(); void streak.refetch(); }} />
          </View>
        ) : null}
      </View>
    );
  }

  return <View className="mt-5 rounded-3xl border border-line bg-surface p-5">
    <Text weight="bold" className="text-lg">Tiến độ học tập</Text>
    <Text className="mt-1 text-sm text-muted">Từng ngày một, bạn đang tiến xa hơn.</Text>
    <View className="mt-5 flex-row flex-wrap gap-4">
      <View className="min-w-[80px] flex-1"><Text weight="black" className="text-2xl text-accent-deep">{progress.data?.totalXp ?? '—'}</Text><Text className="text-xs text-muted">Tổng XP</Text></View>
      <View className="min-w-[80px] flex-1"><Text weight="black" className="text-2xl text-accent-deep">{progress.data?.level ?? '—'}</Text><Text className="text-xs text-muted">Cấp độ</Text></View>
      <View className="min-w-[80px] flex-1"><Text weight="black" className="text-2xl text-accent-deep">{streak.currentDays ?? '—'}</Text><Text className="text-xs text-muted">Ngày liên tiếp</Text></View>
    </View>
    {progress.isError || streak.error ? <View className="mt-4 gap-2"><Text className="text-sm text-danger">Chưa tải được một phần tiến độ.</Text><Button variant="secondary" label="Thử lại" onPress={() => { void progress.refetch(); void streak.refetch(); }} /></View> : null}
    {!progress.data && !progress.isError ? <Text className="mt-4 text-sm text-muted">{progress.isFetching ? 'Đang tải tiến độ…' : 'Đăng nhập để xem tiến độ đã đồng bộ.'}</Text> : null}
    {!compact && progress.data ? <View className="mt-5 border-t border-line pt-4"><Text className="text-sm">Hôm nay: {progress.data.xpToday} / {progress.data.dailyCap} XP</Text><Text className="mt-2 text-sm text-muted">Còn {progress.data.xpToNextLevel} XP đến cấp tiếp theo.</Text><Text className="mt-2 text-sm text-muted">Kỷ lục: {streak.longestDays ?? '—'} ngày liên tiếp.</Text></View> : null}
    {compact ? <Pressable accessibilityRole="button" onPress={() => router.push('/progress' as never)} className="mt-4 min-h-11 justify-center border-t border-line pt-3"><Text weight="bold" className="text-accent-deep">Xem tiến độ học tập →</Text></Pressable> : null}
  </View>;
}
