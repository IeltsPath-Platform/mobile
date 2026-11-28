import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInRight, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormAlert } from '@/src/components/ui/form-alert';
import { OwlMascot } from '@/src/components/ui/owl-mascot';
import { ProgressBar } from '@/src/components/ui/progress-bar';
import { Text } from '@/src/components/ui/text';
import { placementApi, type PlacementPool } from '@/src/features/placement/api';
import { MINUTE_CHOICES, monthToExamDate, TARGET_CHOICES, upcomingMonths } from '@/src/features/placement/report';
import { startErrorMessage, startPlacement } from '@/src/features/placement/start';
import { safeErrorMessage } from '@/src/lib/error-message';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

const QUESTIONS = [
  'Bạn dự định thi IELTS khi nào?',
  'Mỗi ngày bạn có thể học bao lâu?',
  'Mục tiêu band của bạn là bao nhiêu?',
] as const;

/**
 * Three quick questions that set the study goal the placement report measures against. Opened with a `pool` it starts
 * the test right after (or on "Bỏ qua"); opened from the start screen it only updates the goal.
 */
export default function PlacementGoalScreen() {
  const { pool } = useLocalSearchParams<{ pool?: PlacementPool }>();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const options = useQuery({ queryKey: ['placement', 'options'], queryFn: ({ signal }) => placementApi.options(signal), enabled: Boolean(pool) });
  const [step, setStep] = useState(0);
  // undefined: not answered yet; null: "no plan yet".
  const [examDate, setExamDate] = useState<string | null | undefined>(undefined);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /** Starts the test of the chosen pool and replaces this screen with it. */
  const launch = async () => {
    if (!pool) return;
    try {
      const data = options.data ?? await placementApi.options();
      const attemptId = await startPlacement(data, pool);
      await client.invalidateQueries({ queryKey: ['placement'] });
      router.replace({ pathname: '/placement/[attemptId]', params: { attemptId } } as never);
    } catch (cause) {
      setError(options.data ? startErrorMessage(cause, options.data) : safeErrorMessage(cause, 'Chưa bắt đầu được bài kiểm tra.'));
      setBusy(false);
    }
  };

  const finish = async (targetBand: number) => {
    if (minutes === null || examDate === undefined || busy) return;
    haptics.select();
    setBusy(true);
    setError('');
    try {
      await placementApi.saveGoal({ targetBand, examDate, availableMinutesPerDay: minutes });
      await client.invalidateQueries({ queryKey: ['placement', 'goal'] });
    } catch (cause) {
      // The goal only frames the report: before a test it must not stand in the way.
      if (!pool) {
        setError(safeErrorMessage(cause, 'Chưa lưu được mục tiêu. Hãy thử lại.'));
        setBusy(false);
        return;
      }
    }
    if (pool) await launch();
    else router.back();
  };

  const skip = () => {
    setBusy(true);
    setError('');
    void launch();
  };

  const next = () => { haptics.select(); setStep((current) => current + 1); };
  const choices = [
    [
      ...upcomingMonths().map((month) => ({ label: month.label, onPick: () => { setExamDate(monthToExamDate(month.value)); next(); } })),
      { label: 'Chưa có kế hoạch', onPick: () => { setExamDate(null); next(); } },
    ],
    MINUTE_CHOICES.map((choice) => ({ label: choice.label, onPick: () => { setMinutes(choice.value); next(); } })),
    TARGET_CHOICES.map((choice) => ({ label: choice.label, onPick: () => void finish(choice.value) })),
  ][step];

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: Math.max(insets.top, 12) + 4 }}>
      <View className="flex-row items-center gap-3 px-4">
        <Pressable
          onPress={() => (step > 0 ? setStep(step - 1) : router.back())}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          className="h-11 w-11 items-center justify-center rounded-full active:opacity-60">
          <ArrowLeft size={22} color={colors.ink} />
        </Pressable>
        <View className="flex-1">
          <ProgressBar value={step + 1} max={QUESTIONS.length} accessibilityLabel="Tiến độ khảo sát" valueText={`Câu ${step + 1}/${QUESTIONS.length}`} />
        </View>
        {pool ? (
          <Pressable onPress={skip} disabled={busy} accessibilityRole="button" className="min-h-11 justify-center px-2 active:opacity-60">
            <Text weight="bold" className="text-sm text-muted">Bỏ qua</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerClassName="px-5 pb-8 pt-6">
        <Animated.View key={step} entering={FadeInRight.duration(220).reduceMotion(ReduceMotion.System)}>
          <View className="flex-row items-center gap-3">
            <OwlMascot mood="wave" size={64} />
            <Text weight="black" className="flex-1 text-[22px] leading-7">{QUESTIONS[step]}</Text>
          </View>
          <View className="mt-6 gap-2.5">
            {choices.map((choice) => (
              <Pressable
                key={choice.label}
                onPress={choice.onPick}
                disabled={busy}
                accessibilityRole="button"
                className="min-h-14 justify-center rounded-2xl bg-surface px-4 active:opacity-70"
                style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, opacity: busy ? 0.6 : 1 }}>
                <Text weight="bold" className="text-base">{choice.label}</Text>
              </Pressable>
            ))}
          </View>
          {busy ? <View className="mt-6 items-center gap-2"><ActivityIndicator color={colors.accent} /><Text className="text-sm text-muted">{pool ? 'Đang chuẩn bị đề…' : 'Đang lưu…'}</Text></View> : null}
          {error ? <View className="mt-4"><FormAlert message={error} /></View> : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
