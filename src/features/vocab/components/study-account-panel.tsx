import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Check, ChevronRight, Coins, Flame, Heart, LogIn } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';
import { studyKeys, vocabularyStudyApi } from '../study-api';
import { StudyDetailModal } from './study-detail-modal';

/** Top bar and daily-goal strip for the Today screen. */
export function TodayHeader({ signedIn }: { signedIn: boolean }) {
  useTheme();
  const summary = useQuery({
    queryKey: studyKeys.summary,
    queryFn: ({ signal }) => vocabularyStudyApi.summary(signal),
    enabled: signedIn,
    staleTime: 20_000,
  });

  const [open, setOpen] = useState(false);
  const data = summary.data;

  const streakDays = data?.streak.currentDays;
  const qualifiedToday = data?.streak.qualifiedToday;
  const currentXp = data?.xp.totalXp;
  const heartsCount = data?.hearts.hearts;
  const metricLabel = (value: number | undefined) =>
    summary.isPending ? '…' : summary.isError || value === undefined ? '—' : value;

  return (
    <View className="mb-3">
      <View className="flex-row flex-wrap items-center justify-between gap-2 pb-2.5 pt-1">
        <View className="flex-row items-center gap-2.5">
          <Image
            source={require('@/assets/images/owl/nav-owl-stand.webp')}
            accessibilityLabel="Cú IELTSPath"
            style={{ width: 40, height: 40 }}
            contentFit="contain"
          />
          <Text accessibilityRole="header" weight="black" className="text-[24px] tracking-tight text-ink">
            Hôm nay
          </Text>
        </View>

        {signedIn ? (
          <View className="min-w-[200px] flex-1 flex-row items-center gap-1.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={summary.isPending ? 'Đang tải chuỗi học' : summary.isError || streakDays === undefined ? 'Không tải được chuỗi học' : `Chuỗi học ${streakDays} ngày`}
              onPress={() => setOpen(true)}
              className="min-h-11 min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-full border px-2.5 py-1.5"
              style={{
                backgroundColor: colors.warmSoft,
                borderColor: colors.line,
              }}
            >
              <Flame size={15} color={colors.flame} />
              <Text weight="black" numberOfLines={1} className="shrink text-xs text-ink">
                {metricLabel(streakDays)}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={summary.isPending ? 'Đang tải XP' : summary.isError || currentXp === undefined ? 'Không tải được XP' : `${currentXp} XP`}
              onPress={() => setOpen(true)}
              className="min-h-11 min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-full border px-2.5 py-1.5"
              style={{
                backgroundColor: colors.warmSoft,
                borderColor: colors.line,
              }}
            >
              <Coins size={15} color={colors.coin} />
              <Text weight="black" numberOfLines={1} className="shrink text-xs text-ink">
                {metricLabel(currentXp)}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={summary.isPending ? 'Đang tải số tim' : summary.isError || heartsCount === undefined ? 'Không tải được số tim' : `${heartsCount} tim`}
              onPress={() => setOpen(true)}
              className="min-h-11 min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-full border px-2.5 py-1.5"
              style={{
                backgroundColor: colors.dangerSoft,
                borderColor: colors.line,
              }}
            >
              <Heart size={14} color={colors.danger} fill={colors.danger} />
              <Text weight="black" numberOfLines={1} className="shrink text-xs text-ink">
                {metricLabel(heartsCount)}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đăng nhập"
            onPress={() => router.push('/(auth)/login')}
            className="min-h-11 flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5"
            style={{ backgroundColor: colors.accent }}
          >
            <LogIn size={14} color={colors.canvas} />
            <Text weight="bold" className="text-xs" style={{ color: colors.canvas }}>
              Đăng nhập
            </Text>
          </Pressable>
        )}
      </View>

      {signedIn ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          className="flex-row items-center justify-between rounded-2xl border px-3.5 py-2.5"
          style={{
            backgroundColor: qualifiedToday ? colors.successSoft : colors.warmSoft,
            borderColor: colors.line,
          }}
        >
          <View className="flex-1 flex-row items-center gap-2 pr-3">
            {qualifiedToday ? (
              <Check size={16} color={colors.success} strokeWidth={3} />
            ) : (
              <Flame size={16} color={colors.flame} />
            )}
            <Text
              weight="bold"
              className="flex-1 text-xs leading-4 text-ink"
              numberOfLines={1}
            >
              {summary.isPending
                ? 'Đang tải tiến độ học…'
                : summary.isError || qualifiedToday === undefined
                  ? 'Chưa tải được tiến độ. Chạm để thử lại.'
                : qualifiedToday
                  ? 'Đã giữ chuỗi hôm nay. Tuyệt vời!'
                  : (streakDays ?? 0) > 0
                    ? `Học 1 bài để giữ chuỗi ${streakDays} ngày.`
                    : 'Học 1 bài để bắt đầu chuỗi.'}
            </Text>
          </View>
          <View className="shrink-0 flex-row items-center gap-0.5">
            <Text weight="bold" className="text-[11px] text-muted">
              Chi tiết
            </Text>
            <ChevronRight size={13} color={colors.muted} />
          </View>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(auth)/login')}
          className="flex-row items-center justify-between rounded-2xl border border-line bg-surface px-3.5 py-2.5"
        >
          <Text className="flex-1 text-xs text-muted pr-2" numberOfLines={1}>
            Đăng nhập để theo dõi chuỗi ngày học và nhận XP.
          </Text>
          <Text weight="bold" className="shrink-0 text-[11px] text-accent-deep">
            Đăng nhập →
          </Text>
        </Pressable>
      )}

      <StudyDetailModal visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

/** Opens the hearts/streak detail sheet from places that only need a button. */
export function StudyAccountPanel({ heartOnly = false }: { heartOnly?: boolean }) {
  const [open, setOpen] = useState(false);

  if (heartOnly) {
    return (
      <>
        <Button variant="secondary" label="Xem tim và hồi tim" onPress={() => setOpen(true)} />
        <StudyDetailModal visible={open} onClose={() => setOpen(false)} />
      </>
    );
  }
  return <TodayHeader signedIn={true} />;
}
