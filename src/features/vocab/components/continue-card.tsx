import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { ProgressBar } from '@/src/components/ui/progress-bar';
import { Text } from '@/src/components/ui/text';
import { useTheme } from '@/src/theme/app-theme';
import { colors } from '@/src/theme';

import type { VocabularyTopic } from '../api';
import { studyKeys, vocabularyStudyApi } from '../study-api';
import type { TopicProgress } from '../study-types';
import { ServerTopicStudySheet } from './server-topic-study-sheet';

/**
 * The single most useful next action for a signed-in learner: the first topic whose server
 * progress still has a current unit. Hidden when everything is finished or progress is unknown.
 */
export function ContinueCard({ topics, progress }: { topics: VocabularyTopic[]; progress: TopicProgress[] }) {
  useTheme();
  const client = useQueryClient();
  const [openUnitId, setOpenUnitId] = useState<string | null>(null);

  const byTopic = new Map(progress.map((item) => [item.topicId, item]));
  const target = topics.find((topic) => {
    const item = byTopic.get(topic.id);
    return item?.currentUnitId && item.completedUnits < item.totalUnits;
  });
  const topicProgress = target ? byTopic.get(target.id) : undefined;
  const unitId = topicProgress?.currentUnitId ?? null;

  const units = useQuery({
    queryKey: studyKeys.units(target?.id ?? ''),
    queryFn: ({ signal }) => vocabularyStudyApi.units(target!.id, signal),
    enabled: Boolean(target),
    staleTime: 300_000,
  });

  const sheet = openUnitId ? (
    <ServerTopicStudySheet
      key={openUnitId}
      unitId={openUnitId}
      visible
      onClose={() => {
        setOpenUnitId(null);
        void client.invalidateQueries({ queryKey: studyKeys.progress });
      }}
    />
  ) : null;

  const showCard = Boolean(target && topicProgress && unitId);
  const unit = units.data?.items.find((item) => item.unitId === unitId);
  const unitProgress = topicProgress?.units.find((item) => item.unitId === unitId);
  const started = unitProgress?.status === 'IN_PROGRESS';

  // The sheet sits at a fixed position in the tree so it survives the card disappearing
  // (e.g. the last lesson of the last topic was just completed).
  return (
    <>
      {showCard && target && topicProgress && unitId ? (
    <View
      className="mb-4 rounded-3xl border border-accent-edge bg-accent-soft p-4"
      style={{ shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
      <Text weight="black" className="text-[11px] uppercase tracking-wider text-accent-deep">
        {started ? 'Tiếp tục học' : 'Bài tiếp theo'}
      </Text>
      <Text accessibilityRole="header" weight="black" className="mt-1 text-xl leading-7 text-ink" numberOfLines={2}>
        {unit?.title ?? target.nameVi ?? target.name}
      </Text>
      <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
        {target.nameVi ?? target.name}
        {unit ? ` · ${unit.wordCount} từ · khoảng ${unit.estimatedMinutes} phút` : ''}
      </Text>
      <View className="mt-3">
        <ProgressBar
          value={topicProgress.completedUnits}
          max={topicProgress.totalUnits}
          tone="success"
          height={8}
          accessibilityLabel="Tiến độ chủ đề"
          valueText={`${topicProgress.completedUnits} trên ${topicProgress.totalUnits} bài`}
        />
        <Text className="mt-1 text-xs text-muted">
          {topicProgress.completedUnits}/{topicProgress.totalUnits} bài đã hoàn thành
        </Text>
      </View>
      <Button
        className="mt-3"
        label={started ? 'Tiếp tục bài học' : 'Bắt đầu bài học'}
        icon={<Play size={18} color={colors.canvas} fill={colors.canvas} />}
        onPress={() => setOpenUnitId(unitId)}
      />
    </View>
      ) : null}
      {sheet}
    </>
  );
}
