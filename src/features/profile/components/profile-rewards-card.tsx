import { ChevronRight, Lock, Trophy } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import type { VocabularyAchievement } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

import { ACHIEVEMENT_COPY, achievementColors } from '../profile-achievements';

/** Compact achievement strip: one row of small badges; the full list lives on the achievements screen. */
export function ProfileRewardsCard({
  items,
  loading,
  onOpenAll,
}: {
  items?: VocabularyAchievement[];
  loading: boolean;
  onOpenAll: () => void;
}) {
  useTheme();
  const shown = (items ?? []).slice(0, 4);
  const earned = (items ?? []).filter((item) => item.achieved).length;
  return (
    <Card className="mt-4 px-4 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem tất cả thành tích"
        onPress={onOpenAll}
        className="min-h-10 flex-row items-center justify-between active:opacity-70">
        <Text weight="black" className="text-base text-ink">
          Thành tích{items ? <Text className="text-xs text-muted">{`  ${earned}/${items.length}`}</Text> : null}
        </Text>
        <View className="flex-row items-center">
          <Text weight="bold" className="text-xs" style={{ color: colors.accent }}>
            Tất cả
          </Text>
          <ChevronRight size={15} color={colors.accent} />
        </View>
      </Pressable>
      {shown.length === 0 ? (
        <Text className="py-3 text-center text-xs text-muted">{loading ? 'Đang tải thành tích…' : 'Chưa có thành tích nào.'}</Text>
      ) : (
        <View className="mt-1 flex-row">
          {shown.map((item) => {
            const copy = ACHIEVEMENT_COPY[item.code];
            const { foreground: fg, background: bg } = achievementColors(copy?.tone ?? 'accent');
            const title = copy?.title ?? item.code;
            return (
              <View
                key={item.code}
                accessible
                accessibilityLabel={`${title}, ${item.achieved ? 'đã đạt' : `chưa đạt, ${item.progress} trên ${item.target}`}`}
                className="flex-1 items-center px-1">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: item.achieved ? bg : colors.canvas, borderWidth: 2, borderColor: item.achieved ? fg : colors.line }}>
                  {item.achieved ? <Trophy size={17} color={fg} /> : <Lock size={15} color={colors.muted} />}
                </View>
                <Text weight="bold" className="mt-1 text-center text-[10px] leading-[13px] text-ink" numberOfLines={2}>
                  {title}
                </Text>
                {!item.achieved ? (
                  <Text className="text-[10px] text-muted">
                    {item.progress}/{item.target}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}
