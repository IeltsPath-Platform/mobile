import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/button';
import { OwlMascot } from '@/src/components/ui/owl-mascot';
import { Text } from '@/src/components/ui/text';
import { placementApi, type CourseSummary, type LearningGoal, type PlacementResult } from '@/src/features/placement/api';
import { placementVerdict } from '@/src/features/placement/report';
import { CourseRow, GoalRow, SkillBars, skillBands, SkillRows } from '@/src/features/placement/report-sections';
import { ApiError } from '@/src/lib/api-client';
import { colors } from '@/src/theme';

const POLL_MS = 4000;
/** About three minutes of waiting before the screen says grading is slow. */
const MAX_POLLS = 45;

const goHome = () => router.dismissTo('/(tabs)' as never);

/** Waits for the grade (essays and recordings are graded after submit), then shows the report. */
export default function PlacementResultScreen() {
  const { attemptId = '' } = useLocalSearchParams<{ attemptId: string }>();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const result = useQuery({
    queryKey: ['placement', 'result', attemptId],
    queryFn: ({ signal }) => placementApi.result(attemptId, signal),
    // 404 means "still grading": keep asking; any other error stops.
    retry: (count, error) => error instanceof ApiError && error.status === 404 && count < MAX_POLLS,
    retryDelay: POLL_MS,
  });
  const graded = Boolean(result.data);
  const goal = useQuery({ queryKey: ['placement', 'goal'], queryFn: ({ signal }) => placementApi.goal(signal), enabled: graded, staleTime: 60_000 });
  // The recommended course follows the band Learning stores, read once the result is in.
  const courses = useQuery({ queryKey: ['placement', 'courses', attemptId], queryFn: ({ signal }) => placementApi.courses(signal), enabled: graded, staleTime: 60_000 });

  // The band is stored once grading ends, so the home card and the start screen read it again then.
  useEffect(() => {
    if (graded) void client.invalidateQueries({ queryKey: ['placement', 'options'] });
  }, [graded, client]);

  // The test is over: Back leaves for home rather than returning to the submitted test underneath.
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { goHome(); return true; });
    return () => subscription.remove();
  }, []));

  const grading = result.isPending || (result.isFetching && !result.data);

  if (result.data) {
    return (
      <View className="flex-1 bg-canvas">
        <View className="flex-row items-center justify-end px-3" style={{ paddingTop: Math.max(insets.top, 12) }}>
          <Pressable onPress={goHome} accessibilityRole="button" accessibilityLabel="Đóng" className="h-11 w-11 items-center justify-center rounded-full active:opacity-60">
            <X size={22} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="px-5" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
          <Report result={result.data} goal={goal.data ?? null} courses={courses.data ?? []} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 pb-6" contentContainerStyle={{ paddingTop: insets.top + 24 }}>
        {grading ? (
          <View className="items-center">
            <OwlMascot mood="wave" size={120} />
            <Text weight="black" className="mt-5 text-center text-2xl">Đang chấm bài của bạn</Text>
            <Text className="mt-2 text-center text-[15px] leading-6 text-muted">Bài viết và bài nói được chấm tự động, có thể mất một đến hai phút. Bạn có thể rời màn này, kết quả vẫn được lưu.</Text>
            <ActivityIndicator className="mt-6" color={colors.accent} />
          </View>
        ) : (
          <View className="items-center">
            <OwlMascot mood="oops" size={120} />
            <Text weight="black" className="mt-5 text-center text-2xl">Kết quả chưa sẵn sàng</Text>
            <Text className="mt-2 text-center text-[15px] leading-6 text-muted">
              {result.error instanceof ApiError && result.error.status === 404
                ? 'Việc chấm đang lâu hơn bình thường. Bài của bạn đã được nộp, hãy kiểm tra lại sau ít phút.'
                : result.error?.message}
            </Text>
          </View>
        )}
      </ScrollView>
      <View className="px-5 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        {!grading ? <Button label="Kiểm tra lại" onPress={() => void result.refetch()} /> : null}
        <Button className="mt-1" variant="ghost" label="Về trang Hôm nay" onPress={goHome} />
      </View>
    </View>
  );
}

/** The report: the band and one line per skill up top, everything else one tap away. */
function Report({ result, goal, courses }: { result: PlacementResult; goal: LearningGoal | null; courses: CourseSummary[] }) {
  const bands = skillBands(result);
  const overall = result.overallBand;
  const note = result.reachedCeiling && result.ceiling != null
    ? `Bạn chạm mức cao nhất đề này đo được (${result.ceiling.toFixed(1)}). Làm đề mức cao hơn để biết chính xác hơn.`
    : result.partial ? 'Kỹ năng chưa chấm xong không bị tính là 0.' : null;

  return (
    <View>
      <Text weight="bold" className="text-[13px] uppercase tracking-wider text-muted">Kết quả kiểm tra trình độ</Text>
      <View className="mt-1 flex-row items-end gap-3">
        <Text weight="black" style={{ fontSize: 56, lineHeight: 64, color: colors.ink }}>{overall == null ? '–' : overall.toFixed(1)}</Text>
        <Text className="mb-2.5 flex-1 text-[15px] leading-5 text-muted">{placementVerdict(overall)}</Text>
      </View>
      {note ? <Text className="text-[13px] leading-5 text-muted">{note}</Text> : null}

      <View className="mt-5 rounded-2xl bg-surface px-4 py-4" style={{ borderWidth: 1, borderColor: colors.line }}>
        <SkillBars bands={bands} />
      </View>

      <GoalRow overall={overall ?? 0} goal={goal} onSetGoal={() => router.push('/placement/goal' as never)} />
      <SkillRows result={result} bands={bands} />
      <CourseRow courses={courses} />
    </View>
  );
}
