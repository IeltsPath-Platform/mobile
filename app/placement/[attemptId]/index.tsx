import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BookOpen, Check, ChevronRight, Headphones, Mic, PenLine, type LucideIcon } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { FormAlert } from '@/src/components/ui/form-alert';
import { ProgressBar } from '@/src/components/ui/progress-bar';
import { Text } from '@/src/components/ui/text';
import { placementApi } from '@/src/features/placement/api';
import { groupSections, isGroupDone, questionItems, SKILL_LABEL, type GroupSkill } from '@/src/features/placement/model';
import { useAttemptData } from '@/src/features/practice/hooks/use-attempt-data';
import { safeErrorMessage } from '@/src/lib/error-message';
import { colors } from '@/src/theme';

const ICONS: Record<GroupSkill, LucideIcon> = { LISTENING: Headphones, READING: BookOpen, WRITING: PenLine, SPEAKING: Mic, OTHER: BookOpen };

/** The placement test's home while it is taken: one row per skill, in any order; the test is submitted after the last. */
export default function PlacementHubScreen() {
  const { attemptId = '' } = useLocalSearchParams<{ attemptId: string }>();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const data = useAttemptData(attemptId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Coming back from a skill shows what was just handed in. The first focus is the mount, which the query already
  // loads; `refetch` is stable, while the query result object is not and would refetch after every fetch.
  const { refetch } = data;
  const focusedOnce = useRef(false);
  useFocusEffect(useCallback(() => {
    if (focusedOnce.current) void refetch();
    focusedOnce.current = true;
  }, [refetch]));

  const groups = useMemo(() => groupSections(data.data?.sections ?? []), [data.data?.sections]);
  const done = groups.filter(isGroupDone).length;

  if (data.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent} /></View>;
  if (!data.data) {
    return (
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
        <EmptyState mood="oops" title="Chưa tải được bài làm" message={data.error?.message} action={<Button label="Thử lại" variant="secondary" onPress={() => void data.refetch()} />} />
      </View>
    );
  }
  const { attempt } = data.data;
  if (attempt.status && attempt.status !== 'IN_PROGRESS') {
    return <Redirect href={(attempt.status === 'CANCELLED' || attempt.status === 'EXPIRED' ? '/placement' : { pathname: '/placement/[attemptId]/result', params: { attemptId } }) as never} />;
  }

  // Every skill handed in but the submit failed (a lost connection): offer it again.
  const submitNow = async () => {
    setSubmitting(true);
    setError('');
    try {
      await placementApi.submit(attemptId);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['placement'] }),
        client.invalidateQueries({ queryKey: ['practice', 'attempt-data', attemptId] }),
      ]);
      router.replace({ pathname: '/placement/[attemptId]/result', params: { attemptId } } as never);
    } catch (cause) {
      setError(safeErrorMessage(cause, 'Chưa nộp được bài. Hãy thử lại.'));
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-canvas">
      <View className="flex-row items-center gap-3 px-4 pb-3" style={{ paddingTop: Math.max(insets.top, 12) + 4 }}>
        <BackButton fallbackHref="/placement" />
        <View className="flex-1">
          <Text accessibilityRole="header" weight="black" className="text-lg">Kiểm tra trình độ</Text>
          <Text className="text-xs text-muted">Đã xong {done}/{groups.length} kỹ năng</Text>
        </View>
      </View>
      <View className="px-4">
        <ProgressBar value={done} max={groups.length} accessibilityLabel="Tiến độ bài kiểm tra" valueText={`${done}/${groups.length} kỹ năng`} />
      </View>

      <ScrollView contentContainerClassName="gap-3 px-4 pb-8 pt-5">
        <Text className="mb-1 text-sm leading-5 text-muted">Làm theo thứ tự bất kỳ. Câu trả lời được lưu ngay, bạn có thể thoát ra và làm tiếp sau.</Text>
        {groups.map((group) => {
          const Icon = ICONS[group.skill];
          const finished = isGroupDone(group);
          const count = group.sections.reduce((total, section) => total + questionItems(section).length, 0);
          return (
            <Pressable
              key={group.id}
              disabled={finished}
              onPress={() => router.push({ pathname: '/placement/[attemptId]/[groupId]', params: { attemptId, groupId: group.id } } as never)}
              accessibilityRole="button"
              accessibilityState={{ disabled: finished }}
              accessibilityLabel={`${SKILL_LABEL[group.skill]}${finished ? ', đã xong' : ''}`}
              className="min-h-20 flex-row items-center gap-4 rounded-2xl bg-surface px-4 py-3 active:opacity-80"
              style={{ borderWidth: 1.5, borderColor: colors.line }}>
              <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: finished ? colors.successSoft : colors.accentSoft }}>
                {finished ? <Check size={22} color={colors.success} strokeWidth={3} /> : <Icon size={22} color={colors.accentDeep} />}
              </View>
              <View className="flex-1">
                <Text weight="extrabold" className="text-base">{SKILL_LABEL[group.skill]}</Text>
                <Text className="text-[13px] text-muted">
                  {finished ? 'Đã nộp' : group.skill === 'WRITING' ? `${count} bài viết` : group.skill === 'SPEAKING' ? `${count} câu trả lời nói` : `${count} câu hỏi`}
                </Text>
              </View>
              {finished ? null : <ChevronRight size={20} color={colors.muted} />}
            </Pressable>
          );
        })}
        {groups.length > 0 && done === groups.length ? (
          <View className="mt-2 gap-2">
            {error ? <FormAlert message={error} /> : null}
            <Button label="Nộp bài kiểm tra" loading={submitting} loadingLabel="Đang nộp" onPress={() => void submitNow()} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
