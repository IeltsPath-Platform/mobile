import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { notebookApi } from '@/src/features/flashcards/notebook-api';
import { vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';
import { QueryState } from './query-state';
import { CollapseHeader, Panel, ProgressBar } from './progress-ui';

const ACHIEVEMENT_LABELS: Record<string, string> = {
  REVIEW_STREAK_7: 'Ôn từ 7 ngày liên tiếp',
  TOPIC_COMPLETED: 'Học hết từ trong một chủ đề',
  MASTERED_300: 'Ghi nhớ 300 từ',
};

/** CEFR level map; fetched only once the panel is opened. */
export function VocabularyMapPanel() {
  const [open, setOpen] = useState(false);
  const map = useQuery({
    queryKey: ['flashcards', 'notebook', 'vocabulary-map'],
    queryFn: () => notebookApi.vocabularyMap(),
    enabled: open,
  });

  return (
    <Panel>
      <CollapseHeader label="Bản đồ trình độ từ vựng" open={open} onPress={() => setOpen((value) => !value)} />
      {open ? (
        <>
          <QueryState pending={map.isPending} error={map.error} retry={() => void map.refetch()} />
          {map.data?.suggestedBand ? (
            <Text className="text-sm text-accent-deep">Gợi ý ôn: {map.data.suggestedBand}</Text>
          ) : null}
          {map.data?.bands.map((band) => (
            <View key={band.cefr} className="gap-2 border-t border-line pt-3">
              <View className="flex-row items-center justify-between">
                <Text weight="bold">
                  {band.cefr} · {band.band}
                </Text>
                <Text className="text-xs text-muted">
                  {band.learned}/{band.total}
                </Text>
              </View>
              <ProgressBar value={band.learned} max={band.total} />
              {band.needsReview > 0 ? (
                <Text className="text-xs text-muted">Cần ôn lại {band.needsReview} từ</Text>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
    </Panel>
  );
}

/** Review achievements; fetched only once the panel is opened. */
export function ReviewAchievementsPanel({ timezone }: { timezone: string }) {
  const [open, setOpen] = useState(false);
  const achievements = useQuery({
    queryKey: ['vocab', 'achievements', timezone],
    queryFn: () => vocabApi.achievements(timezone),
    enabled: open,
  });

  return (
    <Panel>
      <CollapseHeader label="Thành tích ôn từ" open={open} onPress={() => setOpen((value) => !value)} />
      {open ? (
        <>
          <QueryState
            pending={achievements.isPending}
            error={achievements.error}
            retry={() => void achievements.refetch()}
          />
          {achievements.data?.items.map((item) => (
            <View key={item.code} className="gap-2 border-t border-line pt-3">
              <View className="flex-row items-center gap-2">
                {item.achieved ? (
                  <View
                    className="h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.successSoft }}
                  >
                    <Text className="text-xs" style={{ color: colors.success }}>
                      ✓
                    </Text>
                  </View>
                ) : null}
                <Text weight={item.achieved ? 'bold' : 'medium'} className="flex-1">
                  {ACHIEVEMENT_LABELS[item.code] ?? 'Thành tích từ vựng'}
                </Text>
              </View>
              <ProgressBar
                value={item.progress}
                max={item.target}
                color={item.achieved ? colors.success : colors.accent}
              />
              <Text className="text-xs text-muted">
                {item.progress}/{item.target}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </Panel>
  );
}
