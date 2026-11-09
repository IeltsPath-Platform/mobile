import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${started ? 'Tiếp tục bài học' : 'Bắt đầu bài học'}: ${unit?.title ?? target.nameVi ?? target.name}`}
          onPress={() => setOpenUnitId(unitId)}
          className="mb-4 flex-row items-center gap-3 rounded-2xl px-4 py-3 active:opacity-80"
          style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.accent, borderBottomColor: colors.accentShade, backgroundColor: colors.accentSoft }}>
          <View className="flex-1">
            <Text weight="black" className="text-[11px] uppercase tracking-wider text-accent-deep">
              {started ? 'Tiếp tục học' : 'Bài tiếp theo'}
            </Text>
            <Text accessibilityRole="header" weight="black" className="mt-0.5 text-base leading-6 text-ink" numberOfLines={1}>
              {unit?.title ?? target.nameVi ?? target.name}
            </Text>
            <Text className="text-xs text-muted" numberOfLines={1}>
              {target.nameVi ?? target.name}
              {unit ? ` · ${unit.wordCount} từ · ${unit.estimatedMinutes} phút` : ''}
            </Text>
            <View className="mt-2">
              <ProgressBar
                value={topicProgress.completedUnits}
                max={topicProgress.totalUnits}
                tone="success"
                height={6}
                accessibilityLabel="Tiến độ chủ đề"
                valueText={`${topicProgress.completedUnits} trên ${topicProgress.totalUnits} bài`}
              />
            </View>
          </View>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, borderBottomWidth: 4, borderBottomColor: colors.accentShade, alignItems: 'center', justifyContent: 'center' }}>
            <Play size={22} color={colors.canvas} fill={colors.canvas} />
          </View>
        </Pressable>
      ) : null}
      {sheet}
    </>
  );
}
