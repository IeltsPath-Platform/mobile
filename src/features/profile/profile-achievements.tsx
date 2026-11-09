import { Check, Lock, Trophy } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import type { VocabularyAchievement } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

type AchievementTone = 'accent' | 'warm' | 'success';

export const ACHIEVEMENT_COPY: Record<string, { title: string; detail: string; tone: AchievementTone }> = {
  REVIEW_STREAK_7: {
    title: 'Bền bỉ 7 ngày',
    detail: 'Ôn từ liên tục một tuần',
    tone: 'accent',
  },
  TOPIC_COMPLETED: {
    title: 'Chinh phục chủ đề',
    detail: 'Hoàn thành 1 chủ đề từ vựng',
    tone: 'warm',
  },
  MASTERED_300: {
    title: 'Bậc thầy từ vựng',
    detail: 'Thành thạo 300 từ vựng',
    tone: 'success',
  },
};

function achievementColors(tone: AchievementTone) {
  if (tone === 'warm') return { foreground: colors.xpDeep, background: colors.warmSoft };
  if (tone === 'success') return { foreground: colors.success, background: colors.successSoft };
  return { foreground: colors.accentDeep, background: colors.accentSoft };
}

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
  return (
    <View
      className="mb-5 overflow-hidden rounded-3xl border border-line bg-surface p-4"
      style={{
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View className="mb-3.5 flex-row items-center justify-between">
        <View>
          <Text weight="black" className="text-base text-ink">
            Thành tích & Huy hiệu
          </Text>
          <Text className="mt-0.5 text-xs text-muted">
            Các mốc chinh phục học tập của bạn
          </Text>
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.warmSoft }}>
          <Trophy size={18} color={colors.xpDeep} />
        </View>
      </View>

      {loading ? (
        <Text className="py-4 text-center text-xs text-muted">
          Đang tải danh sách huy hiệu…
        </Text>
      ) : null}

      {error ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="rounded-2xl border border-line bg-canvas p-3"
        >
          <Text weight="bold" className="text-center text-xs text-accent-deep">
            Chưa tải được huy hiệu · Chạm để thử lại
          </Text>
        </Pressable>
      ) : null}

      {items?.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 pb-1"
        >
          {items.map((item) => {
            const design = ACHIEVEMENT_COPY[item.code] ?? {
              title: item.code,
              detail: 'Thành tựu học tập',
              tone: 'accent' as const,
            };
            const palette = achievementColors(design.tone);
            const Icon = item.achieved ? Trophy : Lock;
            const percentage = Math.max(
              0,
              Math.min(100, item.target ? (item.progress / item.target) * 100 : 0),
            );

            return (
              <View
                key={item.code}
                className="w-[148px] rounded-2xl border border-line bg-canvas p-3.5 justify-between"
              >
                <View>
                  <View
                    className="mb-2.5 h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: item.achieved ? palette.background : colors.surfaceTint,
                    }}
                  >
                    <Icon size={19} color={item.achieved ? palette.foreground : colors.muted} />
                  </View>
                  <Text weight="black" className="text-xs leading-4 text-ink" numberOfLines={2}>
                    {design.title}
                  </Text>
                  <Text className="mt-1 min-h-[32px] text-[10px] leading-4 text-muted" numberOfLines={2}>
                    {design.detail}
                  </Text>
                </View>

                <View className="mt-3">
                  <View className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: item.achieved ? colors.success : palette.foreground,
                      }}
                    />
                  </View>
                  <View className="mt-1.5 flex-row items-center justify-between">
                    <Text className="text-[10px] text-muted">
                      {item.progress}/{item.target}
                    </Text>
                    {item.achieved ? (
                      <View className="flex-row items-center gap-0.5">
                        <Check size={10} color={colors.success} strokeWidth={3} />
                        <Text weight="bold" className="text-[10px] text-success">
                          Đã nhận
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      {!loading && !error && !items?.length ? (
        <Text className="rounded-2xl bg-canvas px-4 py-6 text-center text-sm text-muted">
          Chưa có huy hiệu nào. Tiếp tục học và ôn từ để mở khóa các cột mốc đầu tiên.
        </Text>
      ) : null}
    </View>
  );
}
