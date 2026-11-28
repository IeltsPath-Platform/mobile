import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpen, Check, ChevronRight, Clock3, Headphones, Mic, PenLine, Target } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { FormAlert } from '@/src/components/ui/form-alert';
import { OwlMascot } from '@/src/components/ui/owl-mascot';
import { Text } from '@/src/components/ui/text';
import { placementApi, type PlacementPool } from '@/src/features/placement/api';
import { POOL_META } from '@/src/features/placement/model';
import { formatExamMonth, hoursPerWeek } from '@/src/features/placement/report';
import { startErrorMessage, startPlacement } from '@/src/features/placement/start';
import { safeErrorMessage } from '@/src/lib/error-message';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

const POOLS: PlacementPool[] = ['BAND_0_3', 'BAND_3_5', 'BAND_5_9'];
const SKILLS = [
  { icon: Headphones, label: 'Listening' },
  { icon: BookOpen, label: 'Reading' },
  { icon: PenLine, label: 'Writing' },
  { icon: Mic, label: 'Speaking' },
];

/** Entry of the placement test: continue the open attempt, or pick a level and start a new one. */
export default function PlacementStartScreen() {
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const current = useQuery({ queryKey: ['placement', 'current'], queryFn: ({ signal }) => placementApi.current(signal), staleTime: 0 });
  const options = useQuery({ queryKey: ['placement', 'options'], queryFn: ({ signal }) => placementApi.options(signal), staleTime: 0 });
  const goal = useQuery({ queryKey: ['placement', 'goal'], queryFn: ({ signal }) => placementApi.goal(signal), staleTime: 60_000, retry: 1 });
  const [pool, setPool] = useState<PlacementPool | null>(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const attempt = current.data ?? null;
  const inProgress = attempt?.status === 'IN_PROGRESS';
  const submitted = attempt && !inProgress && attempt.status !== 'CANCELLED' && attempt.status !== 'EXPIRED';

  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['placement'] }),
    client.invalidateQueries({ queryKey: ['practice'] }),
  ]);

  const start = async () => {
    const data = options.data;
    if (!pool || !data || starting) return;
    // The goal frames the report (feasibility, target band), so it is asked once before the first test.
    if (goal.isSuccess && goal.data === null) {
      router.push({ pathname: '/placement/goal', params: { pool } } as never);
      return;
    }
    setStarting(true);
    setError('');
    try {
      const attemptId = await startPlacement(data, pool);
      haptics.success();
      await refresh();
      router.replace({ pathname: '/placement/[attemptId]', params: { attemptId } } as never);
    } catch (cause) {
      setError(startErrorMessage(cause, data));
      setStarting(false);
    }
  };

  const cancelOpen = async () => {
    if (!attempt || cancelling) return;
    setCancelling(true);
    setError('');
    try {
      await placementApi.cancel(attempt.id);
      const open = options.data?.openAssignment;
      if (open && open.packageVersionId === attempt.packageVersionId) await placementApi.release(open.assignmentId).catch(() => undefined);
      await refresh();
    } catch (cause) {
      setError(safeErrorMessage(cause, 'Chưa hủy được lượt làm này.'));
    } finally {
      setCancelling(false);
    }
  };

  const loading = current.isPending || options.isPending;
  const loadError = current.error ?? options.error;

  return (
    <View className="flex-1 bg-canvas">
      <View className="px-4 pb-1" style={{ paddingTop: Math.max(insets.top, 12) + 4 }}>
        <BackButton fallbackHref="/(tabs)" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.accent} /></View>
      ) : loadError && !current.data && !options.data ? (
        <EmptyState mood="oops" title="Chưa tải được bài kiểm tra" message={loadError.message} action={<Button label="Thử lại" variant="secondary" onPress={() => { void current.refetch(); void options.refetch(); }} />} />
      ) : (
        <>
          <ScrollView contentContainerClassName="px-5 pb-6" showsVerticalScrollIndicator={false}>
            <View className="items-center">
              <OwlMascot mood="wave" size={112} />
              <Text accessibilityRole="header" weight="black" className="mt-4 text-center text-[26px] leading-8">Kiểm tra trình độ</Text>
              <Text className="mt-2 text-center text-[15px] leading-6 text-muted">
                Làm một bài ngắn đủ 4 kỹ năng để biết band hiện tại và nhận gợi ý khóa học phù hợp.
              </Text>
            </View>

            <View className="mt-5 flex-row justify-between">
              {SKILLS.map(({ icon: Icon, label }) => (
                <View key={label} className="items-center gap-1.5" style={{ width: '24%' }}>
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft"><Icon size={22} color={colors.accentDeep} /></View>
                  <Text weight="bold" className="text-xs">{label}</Text>
                </View>
              ))}
            </View>

            {inProgress ? (
              <View className="mt-7 rounded-2xl bg-surface p-4" style={{ borderWidth: 1.5, borderColor: colors.accent }}>
                <Text weight="extrabold" className="text-base">Bạn đang có một lượt làm dở</Text>
                <Text className="mt-1 text-sm leading-5 text-muted">Câu trả lời đã lưu được giữ nguyên khi bạn làm tiếp.</Text>
                <Button className="mt-4" label="Làm tiếp" onPress={() => router.push({ pathname: '/placement/[attemptId]', params: { attemptId: attempt.id } } as never)} />
                <Button className="mt-1" variant="ghost" label={cancelling ? 'Đang hủy…' : 'Hủy lượt này, làm đề khác'} disabled={cancelling} onPress={() => void cancelOpen()} />
              </View>
            ) : (
              <>
                {submitted ? (
                  <Pressable
                    onPress={() => router.push({ pathname: '/placement/[attemptId]/result', params: { attemptId: attempt.id } } as never)}
                    accessibilityRole="button"
                    className="mt-7 flex-row items-center gap-3 rounded-2xl bg-surface p-4 active:opacity-80"
                    style={{ borderWidth: 1.5, borderColor: colors.line }}>
                    <View className="flex-1">
                      <Text weight="extrabold" className="text-base">
                        {options.data?.currentBand != null ? `Band gần nhất: ${options.data.currentBand.toFixed(1)}` : 'Bài gần nhất của bạn'}
                      </Text>
                      <Text className="text-sm text-muted">Xem kết quả chi tiết</Text>
                    </View>
                  </Pressable>
                ) : null}

                {goal.data ? (
                  <Pressable
                    onPress={() => router.push('/placement/goal' as never)}
                    accessibilityRole="button"
                    accessibilityLabel="Sửa mục tiêu"
                    className="mt-3 flex-row items-center gap-3 rounded-2xl bg-surface p-4 active:opacity-80"
                    style={{ borderWidth: 1.5, borderColor: colors.line }}>
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-soft"><Target size={20} color={colors.accentDeep} /></View>
                    <View className="flex-1">
                      <Text weight="extrabold" className="text-base">Mục tiêu band {goal.data.targetBand.toFixed(1)}</Text>
                      <Text className="text-[13px] text-muted">{formatExamMonth(goal.data.examDate)} · {hoursPerWeek(goal.data.availableMinutesPerDay)} giờ/tuần</Text>
                    </View>
                    <ChevronRight size={20} color={colors.muted} />
                  </Pressable>
                ) : null}

                <Text weight="extrabold" className="mb-2 mt-7 text-base">Chọn mức đề</Text>
                <View className="gap-2">
                  {POOLS.map((value) => {
                    const count = options.data?.pools.find((entry) => entry.pool === value)?.examCount ?? 0;
                    const selected = pool === value;
                    // Out of retakes, only the pool of the assignment already held can still be started (as on the web).
                    const locked = count === 0 || (options.data!.retakesLeft <= 0 && options.data!.openAssignment?.pool !== value);
                    return (
                      <Pressable
                        key={value}
                        disabled={locked || starting}
                        onPress={() => { haptics.select(); setPool(value); setError(''); }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected, disabled: locked }}
                        className="min-h-16 flex-row items-center gap-3 rounded-2xl bg-surface px-4 py-3 active:opacity-80"
                        style={{ borderWidth: 2, borderColor: selected ? colors.accent : colors.line, opacity: locked ? 0.5 : 1 }}>
                        <View className="flex-1">
                          <Text weight="extrabold" className="text-base" style={{ color: selected ? colors.accentDeep : colors.ink }}>{POOL_META[value].title}</Text>
                          <Text className="text-[13px] text-muted">{count === 0 ? 'Chưa có đề' : POOL_META[value].detail}</Text>
                        </View>
                        <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: selected ? colors.accent : 'transparent', borderWidth: 2, borderColor: selected ? colors.accent : colors.line }}>
                          {selected ? <Check size={14} color={colors.onAccent} strokeWidth={3.5} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                {options.data ? (
                  <View className="mt-3 flex-row items-center gap-2 px-1">
                    <Clock3 size={14} color={colors.muted} />
                    <Text className="text-[13px] text-muted">Khoảng 40 phút · còn {options.data.retakesLeft}/{options.data.limitPer24h} lượt trong 24 giờ</Text>
                  </View>
                ) : null}
              </>
            )}
            {error ? <View className="mt-4"><FormAlert message={error} /></View> : null}
          </ScrollView>

          {!inProgress ? (
            <View className="px-5 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              <Button label={pool ? 'Bắt đầu làm bài' : 'Chọn mức đề để bắt đầu'} disabled={!pool} loading={starting} loadingLabel="Đang chuẩn bị đề" onPress={() => void start()} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
