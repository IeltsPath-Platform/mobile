import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Check,
  ChevronRight,
  Coins,
  Flame,
  Heart,
  LogIn,
  RotateCcw,
  Shield,
  X,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';
import { studyKeys, vocabularyStudyApi } from '../study-api';
import { purchaseStudyBenefit, type StudyPurchase } from '../study-purchase';

type PurchaseKind = 'refill' | 'freeze';

/**
 * Top Header and status bar for the Today screen.
 * Resolves overlapping text, adds sleek semi-transparent gamified status pills
 * that look stunning on both Light and Dark modes (like Airlearn / Duolingo).
 */
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
      {/* 1. TOP BAR: Mascot + Title on Left, Gamified Status Pills on Right */}
      <View className="flex-row flex-wrap items-center justify-between gap-2 pb-2.5 pt-1">
        <View className="flex-row items-center gap-2.5">
          <Image
            source={require('@/assets/images/owl/nav-owl-stand.webp')}
            accessibilityLabel="Cú IELTSPath"
            className="h-10 w-10"
            resizeMode="contain"
          />
          <Text accessibilityRole="header" weight="black" className="text-[24px] tracking-tight text-ink">
            Hôm nay
          </Text>
        </View>

        {signedIn ? (
          <View className="min-w-[200px] flex-1 flex-row items-center gap-1.5">
            {/* Streak Pill - Semi-transparent orange */}
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

            {/* XP Pill - Semi-transparent gold */}
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

            {/* Hearts Pill - Semi-transparent ruby */}
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

      {/* 2. DAILY GOAL STRIP: Fixed text overlap bug with flex-1 and shrink-0 */}
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

      {/* 3. DETAIL MODAL */}
      <StudyDetailModal visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

/**
 * Reusable detail modal for inspecting XP, Streak, Hearts refill, and Timezone.
 */
export function StudyDetailModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  useTheme();
  const client = useQueryClient();
  const summary = useQuery({
    queryKey: studyKeys.summary,
    queryFn: ({ signal }) => vocabularyStudyApi.summary(signal),
    enabled: visible,
    staleTime: 20_000,
  });

  const [selection, setConfirmation] = useState<{ kind: PurchaseKind; cost: number } | null>(null);
  const pending = useQuery<StudyPurchase | null>({
    queryKey: studyKeys.purchase,
    queryFn: async () => null,
    initialData: null,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const confirmation = pending.data ?? selection;
  const [localBusy, setBusy] = useState(false);
  const busy = localBusy || Boolean(pending.data?.inFlight);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const data = summary.data;
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const purchase = async () => {
    if (!confirmation || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await purchaseStudyBenefit(client, confirmation);
      if (result) {
        setNotice(`Đã hoàn tất. Còn ${result.balance} Points.`);
        setConfirmation(null);
      }
    } catch (cause) {
      if (!client.getQueryData(studyKeys.purchase)) setConfirmation(null);
      setError(cause instanceof Error ? cause.message : 'Chưa thực hiện được. Hãy thử lại.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const updateTimezone = async () => {
    if (!localTimezone || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await vocabularyStudyApi.settings(localTimezone);
      await summary.refetch();
      setNotice('Đã cập nhật múi giờ học.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa cập nhật được múi giờ.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaView className="flex-1 bg-canvas">
        <View className="flex-row items-center justify-between border-b border-line px-5 py-3">
          <Text weight="black" className="text-xl">
            Tiến độ học từ
          </Text>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-tint"
          >
            <X color={colors.ink} size={20} />
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="gap-4 px-5 py-4 pb-12" showsVerticalScrollIndicator={false}>
          {summary.isPending ? (
            <View className="items-center py-6">
              <ActivityIndicator color={colors.accent} />
              <Text className="mt-2 text-sm text-muted">Đang tải chỉ số…</Text>
            </View>
          ) : null}

          {summary.isError ? (
            <View className="rounded-2xl border border-line bg-surface p-4">
              <Text className="text-sm text-danger">{summary.error.message}</Text>
              <Button className="mt-3" label="Tải lại" onPress={() => void summary.refetch()} />
            </View>
          ) : null}

          {data ? (
            <>
              {/* Level and XP card */}
              <View className="gap-2.5 rounded-3xl border border-line bg-surface p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.warmSoft }}>
                      <Coins size={20} color={colors.coin} />
                    </View>
                    <View>
                      <Text weight="black" className="text-base text-ink">
                        Cấp độ {data.xp.level}
                      </Text>
                      <Text className="text-xs text-muted">{data.xp.totalXp} XP tích lũy</Text>
                    </View>
                  </View>
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: colors.warmSoft }}>
                    <Text weight="extrabold" className="text-xs text-ink">
                      +{data.xp.xpToNextLevel} XP lên cấp
                    </Text>
                  </View>
                </View>
              </View>

              {/* Hearts and Refill card */}
              <View className="gap-3 rounded-3xl border border-line bg-surface p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.dangerSoft }}>
                      <Heart size={20} color={colors.danger} fill={colors.danger} />
                    </View>
                    <View>
                      <Text weight="black" className="text-base text-ink">
                        {data.hearts.hearts} / {data.hearts.maxHearts} Tim
                      </Text>
                      <Text className="text-xs text-muted">
                        {data.hearts.nextHeartAt
                          ? `Hồi tim tiếp theo: ${new Date(data.hearts.nextHeartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Tim đã hồi đầy đủ.'}
                      </Text>
                    </View>
                  </View>
                </View>

                {data.hearts.hearts < data.hearts.maxHearts ? (
                  <Button
                    label={`Hồi đầy tim · ${data.hearts.refillCost} Points`}
                    disabled={busy || Boolean(confirmation)}
                    onPress={() => {
                      setError('');
                      setNotice('');
                      setConfirmation({ kind: 'refill', cost: data.hearts.refillCost });
                    }}
                  />
                ) : null}
              </View>

              {/* Streak card */}
              <View className="gap-3 rounded-3xl border border-line bg-surface p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.warmSoft }}>
                      <Flame size={20} color={colors.flame} />
                    </View>
                    <View>
                      <Text weight="black" className="text-base text-ink">
                        Chuỗi {data.streak.currentDays} ngày
                      </Text>
                      <Text className="text-xs text-muted">
                        Kỷ lục: {data.streak.longestDays} ngày
                        {data.streak.freezeAvailable ? ' · Đã có bảo vệ' : ''}
                      </Text>
                    </View>
                  </View>
                  <View
                    className="rounded-full px-2.5 py-1"
                    style={{
                      backgroundColor: data.streak.qualifiedToday ? colors.successSoft : colors.warmSoft,
                    }}
                  >
                    <Text
                      weight="bold"
                      className="text-xs text-ink"
                    >
                      {data.streak.qualifiedToday ? 'Đã giữ chuỗi' : 'Chưa học hôm nay'}
                    </Text>
                  </View>
                </View>

                <Text className="text-xs leading-4 text-muted">
                  {data.streak.qualifiedToday
                    ? 'Hôm nay bạn đã hoàn thành bài học và giữ vững chuỗi.'
                    : 'Hoàn thành 1 bài học hoặc ôn thẻ từ để giữ chuỗi hôm nay.'}
                </Text>

                {data.streak.freezeCost !== null && !data.streak.freezeBlockedReason ? (
                  <Button
                    variant="secondary"
                    icon={<Shield size={16} color={colors.ink} />}
                    label={`Mua bảo vệ chuỗi · ${data.streak.freezeCost} Points`}
                    disabled={busy || Boolean(confirmation)}
                    onPress={() => {
                      setError('');
                      setNotice('');
                      setConfirmation({ kind: 'freeze', cost: data.streak.freezeCost! });
                    }}
                  />
                ) : null}

                {data.streak.freezeBlockedReason === 'LIMIT' ? (
                  <Text className="text-xs text-muted">
                    Đã đạt giới hạn bảo vệ liên tiếp. Hãy học hôm nay để tiếp tục chuỗi.
                  </Text>
                ) : null}
              </View>

              {/* Timezone sync card */}
              <View className="gap-2 rounded-3xl border border-line bg-surface p-4">
                <Text weight="bold" className="text-sm">
                  Múi giờ học: {data.streak.timezone}
                </Text>
                {localTimezone && localTimezone !== data.streak.timezone ? (
                  <Button
                    variant="secondary"
                    loading={busy && !confirmation}
                    disabled={busy || Boolean(confirmation)}
                    icon={<RotateCcw size={15} color={colors.ink} />}
                    label={`Đồng bộ múi giờ thiết bị: ${localTimezone}`}
                    onPress={() => void updateTimezone()}
                  />
                ) : (
                  <Text className="text-xs text-muted">Đang khớp với múi giờ của thiết bị.</Text>
                )}
              </View>
            </>
          ) : null}

          {/* Confirmation dialog */}
          {confirmation ? (
            <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
              <Text weight="bold">
                {confirmation.kind === 'refill' ? 'Hồi đầy tim' : 'Mua bảo vệ chuỗi'} với{' '}
                {confirmation.cost} Points?
              </Text>
              <Text className="text-xs text-muted">
                Points sẽ được trừ từ ví điểm của tài khoản bạn.
              </Text>
              <Button
                loading={busy}
                label={pending.data ? 'Thử lại giao dịch' : 'Xác nhận đổi Points'}
                onPress={() => void purchase()}
              />
              <Button
                variant="ghost"
                label="Để sau"
                disabled={busy || Boolean(pending.data)}
                onPress={() => setConfirmation(null)}
              />
            </View>
          ) : null}

          {error ? (
            <Text accessibilityRole="alert" className="text-sm text-danger">
              {error}
            </Text>
          ) : null}

          {notice ? (
            <Text accessibilityLiveRegion="polite" className="text-sm text-success">
              {notice}
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Backwards compatible export for `server-topic-study-sheet.tsx`
 */
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
