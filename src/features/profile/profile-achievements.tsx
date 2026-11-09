import { Check, Lock, Trophy } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import type { VocabularyAchievement } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

type AchievementTone = 'accent' | 'warm' | 'success';

export const ACHIEVEMENT_COPY: Record<string, { title: string; detail: string; tone: AchievementTone }> = {
  REVIEW_STREAK_7: { title: 'Bền bỉ 7 ngày', detail: 'Ôn từ liên tục một tuần', tone: 'accent' },
  TOPIC_COMPLETED: { title: 'Chinh phục chủ đề', detail: 'Hoàn thành 1 chủ đề từ vựng', tone: 'warm' },
  MASTERED_300: { title: 'Bậc thầy từ vựng', detail: 'Thành thạo 300 từ vựng', tone: 'success' },
};

export function achievementColors(tone: AchievementTone) {
  if (tone === 'warm') return { foreground: colors.xpDeep, background: colors.warmSoft, solid: colors.xp };
  if (tone === 'success') return { foreground: colors.success, background: colors.successSoft, solid: colors.success };
  return { foreground: colors.accentDeep, background: colors.accentSoft, solid: colors.accent };
}

/** Two-column grid of medals: coloured and framed when earned, dimmed with a lock and progress bar otherwise. */
export function ProfileAchievements({
  items,
  loading,
  error,
  onRetry,
}: {
  items?: VocabularyAchievement[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  useTheme();

  if (loading) return <Text className="py-10 text-center text-sm text-muted">Đang tải danh sách huy hiệu…</Text>;

  if (error) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="min-h-14 items-center justify-center rounded-2xl active:opacity-80"
        style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge, backgroundColor: colors.surface }}>
        <Text weight="extrabold" className="text-sm" style={{ color: colors.accentDeep }}>
          Chưa tải được huy hiệu · Chạm để thử lại
        </Text>
      </Pressable>
    );
  }

  if (!items?.length) {
    return (
      <Text className="py-10 text-center text-sm leading-6 text-muted">
        Chưa có huy hiệu nào. Tiếp tục học và ôn từ để mở khóa các cột mốc đầu tiên.
      </Text>
    );
  }

  return (
    <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
      {items.map((item) => {
        const copy = ACHIEVEMENT_COPY[item.code] ?? { title: item.code, detail: 'Thành tựu học tập', tone: 'accent' as const };
        const palette = achievementColors(copy.tone);
        const ratio = item.target ? Math.max(0, Math.min(1, item.progress / item.target)) : 0;
        return (
          <View key={item.code} style={{ width: '50%', padding: 6 }}>
            <View
              accessible
              accessibilityLabel={`${copy.title}. ${copy.detail}. ${item.achieved ? 'Đã đạt' : `Chưa đạt, ${item.progress} trên ${item.target}`}`}
              style={{
                alignItems: 'center',
                padding: 14,
                borderRadius: 24,
                borderWidth: 2,
                borderBottomWidth: 4,
                borderColor: item.achieved ? palette.solid : colors.line,
                borderBottomColor: item.achieved ? palette.solid : colors.edge,
                backgroundColor: item.achieved ? palette.background : colors.surface,
              }}>
              <View
                style={{
                  width: 72,
                  height: 92,
                  borderRadius: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: item.achieved ? palette.solid : colors.surfaceTint,
                }}>
                {item.achieved ? <Trophy size={32} color={colors.canvas} /> : <Lock size={26} color={colors.muted} />}
              </View>
              <Text weight="black" className="mt-3 min-h-[44px] text-center text-base leading-[22px] text-ink" numberOfLines={2}>
                {copy.title}
              </Text>
              <Text className="mt-1 min-h-[36px] text-center text-xs leading-[18px] text-muted" numberOfLines={2}>
                {copy.detail}
              </Text>
              <View className="mt-2 w-full">
                <View style={{ height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.line }}>
                  <View
                    style={{
                      width: `${ratio * 100}%`,
                      height: '100%',
                      borderRadius: 5,
                      backgroundColor: item.achieved ? colors.success : palette.solid,
                    }}
                  />
                </View>
                <View className="mt-1.5 flex-row items-center justify-center gap-1">
                  {item.achieved ? <Check size={14} color={colors.success} strokeWidth={3.5} /> : null}
                  <Text weight="bold" className="text-xs" style={{ color: item.achieved ? colors.success : colors.muted }}>
                    {item.achieved ? 'Đã nhận' : `${item.progress}/${item.target}`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
