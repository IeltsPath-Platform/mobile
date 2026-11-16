import { useQueryClient } from '@tanstack/react-query';
import { Flame, Snowflake, Sparkles, Trophy } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { ApiError } from '@/src/lib/api-client';
import { createRequestId } from '@/src/lib/request-id';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

import { learningProgressApi, learningProgressKeys, useLearningProgress } from './learning-progress-api';

/** XP, level and the study streak of the learning service, the same numbers as the web overview. */
export function ProgressSummary() {
  useTheme();
  const { enabled, streak, progress } = useLearningProgress();
  const xp = progress.data;
  const days = streak.data;
  const missing = progress.isFetching || streak.isFetching ? '…' : '—';
  const percent = xp && xp.nextLevelAt > 0 ? Math.max(0, Math.min(100, Math.round((xp.totalXp / xp.nextLevelAt) * 100))) : 0;
  const lost = days ? days.currentDays === 0 && days.lostStreakDays > 0 : false;

  return (
    <View className="mt-5 gap-4">
      <View className="flex-row gap-3">
        <Stat icon={<Sparkles size={20} color={colors.accentDeep} />} value={xp?.totalXp ?? missing} label="Tổng XP" />
        <Stat icon={<Trophy size={20} color={colors.accentDeep} />} value={xp?.level ?? missing} label="Cấp độ" />
        <View className="min-w-0 flex-1 items-center rounded-3xl px-2 py-5" style={{ backgroundColor: colors.warmSoft }}>
          <Flame size={20} color={colors.accentWarm} />
          <Text weight="black" numberOfLines={1} adjustsFontSizeToFit className="mt-2 text-3xl text-ink">{days?.currentDays ?? missing}</Text>
          <Text className="mt-1 text-xs text-muted">Ngày streak</Text>
        </View>
      </View>

      {xp ? (
        <View className="rounded-3xl border border-line bg-surface p-4">
          <Text weight="bold">Mốc cấp tiếp theo</Text>
          <Text weight="extrabold" className="mt-1 text-accent-deep">{xp.totalXp} / {xp.nextLevelAt} XP tích lũy</Text>
          <View accessibilityRole="progressbar" accessibilityLabel="XP tích lũy so với mốc cấp tiếp theo" accessibilityValue={{ min: 0, max: 100, now: percent }} className="mt-3 h-3 overflow-hidden rounded-full bg-line">
            <View className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </View>
          <Text className="mt-2 text-sm text-muted">Còn {xp.xpToNextLevel} XP để lên cấp · hôm nay {xp.xpToday}/{xp.dailyCap} XP.</Text>
        </View>
      ) : null}

      {days ? (
        <View className="rounded-3xl border border-line bg-surface p-4">
          <Text weight="bold" className="text-sm">
            {lost ? `Chuỗi ${days.lostStreakDays} ngày đã đứt. Làm một câu để bắt đầu chuỗi mới.` : days.activeToday ? 'Hôm nay bạn đã học.' : 'Hôm nay bạn chưa làm câu nào.'}
          </Text>
          <Text className="mt-1 text-sm text-muted">Kỷ lục: {days.longestDays} ngày liên tiếp.</Text>
          <View className="my-3 h-px bg-line" />
          <FreezeRow ownsFreeze={days.freezeAvailable} cost={days.nextFreezeCost} hasStreak={days.currentDays > 0} />
          <Text className="mt-3 text-xs leading-4 text-muted">
            Mỗi 7 ngày liên tiếp được +100 XP và +10 điểm; đạt 30 ngày được thêm +500 XP. Đóng băng liên tiếp giá tăng dần (10, 20, 30… điểm), tối đa 5 ngày liên tiếp.
          </Text>
        </View>
      ) : null}

      {progress.isError || streak.isError ? (
        <View className="gap-2">
          <Text className="text-sm text-danger">Chưa cập nhật được tiến độ học tập.</Text>
          <Button variant="secondary" label="Thử lại" loading={progress.isFetching || streak.isFetching} onPress={() => { void progress.refetch(); void streak.refetch(); }} />
        </View>
      ) : !xp && !days ? (
        <Text className="text-center text-sm text-muted">{enabled ? 'Đang tải tiến độ…' : 'Đăng nhập để xem tiến độ đã đồng bộ.'}</Text>
      ) : null}
    </View>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <View className="min-w-0 flex-1 items-center rounded-3xl border border-line bg-surface px-2 py-5">
      {icon}
      <Text weight="black" numberOfLines={1} adjustsFontSizeToFit className="mt-2 text-3xl text-accent-deep">{value}</Text>
      <Text className="mt-1 text-xs text-muted">{label}</Text>
    </View>
  );
}

/**
 * A freeze keeps the streak through one missed day. One request id per purchase: a retry after a dropped connection
 * reuses it so the points are charged once; "already owned" means an earlier try went through.
 */
function FreezeRow({ ownsFreeze, cost, hasStreak }: { ownsFreeze: boolean; cost: number; hasStreak: boolean }) {
  const client = useQueryClient();
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef<string | null>(null);

  if (ownsFreeze) {
    return (
      <View className="flex-row items-center gap-2">
        <Snowflake size={16} color={colors.accent} />
        <Text className="flex-1 text-sm text-ink">Bạn có một lượt đóng băng: nó tự bảo vệ chuỗi qua một ngày bạn bỏ lỡ.</Text>
      </View>
    );
  }

  const done = () => {
    requestId.current = null;
    void client.invalidateQueries({ queryKey: learningProgressKeys.all });
    void client.invalidateQueries({ queryKey: ['access'] });
  };
  const buy = async () => {
    if (buying) return;
    setBuying(true);
    setError('');
    requestId.current ??= createRequestId();
    try {
      await learningProgressApi.buyFreeze(requestId.current);
      done();
    } catch (cause) {
      const code = cause instanceof ApiError ? cause.code : undefined;
      if (code === 'FREEZE_ALREADY_OWNED') { done(); return; }
      // Nothing was charged for this id as far as we know on these, so the retry keeps it.
      const keep = !(cause instanceof ApiError) || cause.isNetworkError || cause.status >= 500 || code === 'ACCESS_UNAVAILABLE';
      if (!keep) requestId.current = null;
      setError(cause instanceof Error && cause.message ? cause.message : 'Chưa mua được lượt đóng băng.');
    } finally {
      setBuying(false);
    }
  };

  return (
    <View className="gap-2">
      <Button variant="secondary" label={`Mua đóng băng · ${cost} điểm`} icon={<Snowflake size={16} color={colors.accentDeep} />} loading={buying} disabled={!hasStreak} onPress={() => void buy()} />
      {!hasStreak ? <Text className="text-xs text-muted">Cần có chuỗi đang chạy mới mua được.</Text> : null}
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
