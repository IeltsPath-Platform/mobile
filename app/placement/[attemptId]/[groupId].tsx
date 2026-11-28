import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { finishSkill } from '@/src/features/placement/finish';
import { groupSections } from '@/src/features/placement/model';
import { PlacementSpeakingRunner } from '@/src/features/placement/speaking-runner';
import { PlacementWritingRunner } from '@/src/features/placement/writing-runner';
import { useAttemptData } from '@/src/features/practice/hooks/use-attempt-data';
import { ListeningScreen } from '@/src/features/practice/listening/listening-screen';
import { ReadingScreen } from '@/src/features/practice/reading/reading-screen';
import { colors } from '@/src/theme';

/** One skill of the placement test, drawn with the practice screens for Reading and Listening. */
export default function PlacementSkillScreen() {
  const { attemptId = '', groupId = '' } = useLocalSearchParams<{ attemptId: string; groupId: string }>();
  const client = useQueryClient();
  const data = useAttemptData(attemptId);
  const hub = `/placement/${attemptId}`;
  const group = useMemo(() => groupSections(data.data?.sections ?? []).find((candidate) => candidate.id === groupId), [data.data?.sections, groupId]);

  const onFinish = useCallback(async () => {
    if (!group) return;
    const submitted = await finishSkill(attemptId, group.sections);
    await Promise.all([
      client.invalidateQueries({ queryKey: ['placement'] }),
      client.invalidateQueries({ queryKey: ['practice', 'attempt-data', attemptId] }),
    ]);
    if (submitted) router.replace({ pathname: '/placement/[attemptId]/result', params: { attemptId } } as never);
    else router.back();
  }, [attemptId, client, group]);
  const placement = useMemo(() => ({ onFinish, exitHref: hub }), [onFinish, hub]);

  if (data.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent} /></View>;
  if (!data.data || !group) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Kiểm tra trình độ" fallbackHref={hub} />
        <EmptyState mood="oops" title="Chưa mở được phần này" message={data.error?.message} action={<Button label="Thử lại" variant="secondary" onPress={() => void data.refetch()} />} />
      </View>
    );
  }

  const { attempt, saved } = data.data;
  switch (group.skill) {
    case 'WRITING':
      return <PlacementWritingRunner attemptId={attemptId} sections={group.sections} saved={saved} exitHref={hub} onFinish={onFinish} />;
    case 'SPEAKING':
      return <PlacementSpeakingRunner attemptId={attemptId} sections={group.sections} saved={saved} exitHref={hub} onFinish={onFinish} />;
    case 'LISTENING':
      return <ListeningScreen attemptId={attemptId} attempt={attempt} sections={group.sections} saved={saved} placement={placement} />;
    default:
      return <ReadingScreen attemptId={attemptId} attempt={attempt} sections={group.sections} saved={saved} placement={placement} />;
  }
}
