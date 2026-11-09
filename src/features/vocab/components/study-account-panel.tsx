import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Check, ChevronRight, Flame, Heart, LogIn, Zap } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
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

  const goalText = summary.isPending
    ? 'Đang tải tiến độ học…'
    : summary.isError || qualifiedToday === undefined
      ? 'Chưa tải được tiến độ. Chạm để thử lại.'
      : qualifiedToday
        ? 'Đã giữ chuỗi hôm nay. Tuyệt vời!'
        : (streakDays ?? 0) > 0
          ? `Học 1 bài để giữ chuỗi ${streakDays} ngày.`
          : 'Học 1 bài để bắt đầu chuỗi.';

  const chip = (
    label: string,
    value: number | undefined,
    icon: ReactNode,
    color: string,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        summary.isPending ? `Đang tải ${label}` : summary.isError || value === undefined ? `Không tải được ${label}` : `${label}: ${value}`
      }
      onPress={() => setOpen(true)}
      className="min-h-12 flex-row items-center gap-1.5 px-2 active:opacity-70">
      {icon}
      <Text weight="black" className="text-lg" style={{ color }}>
        {metricLabel(value)}
      </Text>
    </Pressable>
  );

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between pb-2">
        <View className="flex-row items-center gap-2">
          <Image
            source={require('@/assets/images/owl/nav-owl-stand.webp')}
            accessibilityLabel="Cú IELTSPath"
            style={{ width: 44, height: 44 }}
            contentFit="contain"
          />
          <Text accessibilityRole="header" weight="black" className="text-2xl text-ink">
            Hôm nay
          </Text>
        </View>

        {signedIn ? (
          <View className="flex-row items-center">
            {chip('chuỗi học', streakDays, <Flame size={22} color={colors.flame} fill={colors.flame} />, colors.flame)}
            {chip('XP', currentXp, <Zap size={22} color={colors.xp} fill={colors.xp} />, colors.xpDeep)}
            {chip('tim', heartsCount, <Heart size={21} color={colors.danger} fill={colors.danger} />, colors.danger)}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đăng nhập"
            onPress={() => router.push('/(auth)/login')}
            className="min-h-12 flex-row items-center gap-1.5 rounded-2xl px-4"
            style={{ backgroundColor: colors.accent, borderBottomWidth: 4, borderBottomColor: colors.accentShade }}>
            <LogIn size={16} color={colors.surface} />
            <Text weight="black" className="text-sm uppercase" style={{ color: colors.surface }}>
              Đăng nhập
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => (signedIn ? setOpen(true) : router.push('/(auth)/login'))}
        className="min-h-14 flex-row items-center gap-3 rounded-2xl px-4 py-3"
        style={{
          backgroundColor: signedIn && qualifiedToday ? colors.successSoft : colors.surface,
          borderWidth: 2,
          borderBottomWidth: 4,
          borderColor: signedIn && qualifiedToday ? colors.success : colors.line,
          borderBottomColor: signedIn && qualifiedToday ? colors.successShade : colors.edge,
        }}>
        {signedIn && qualifiedToday ? (
          <Check size={20} color={colors.success} strokeWidth={3.5} />
        ) : (
          <Flame size={20} color={colors.flame} fill={signedIn ? colors.flame : 'transparent'} />
        )}
        <Text weight="bold" className="flex-1 text-sm leading-5 text-ink">
          {signedIn ? goalText : 'Đăng nhập để theo dõi chuỗi ngày học và nhận XP.'}
        </Text>
        <ChevronRight size={18} color={colors.muted} />
      </Pressable>

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
