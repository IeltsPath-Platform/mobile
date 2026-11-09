import { Lock, Trophy } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import type { VocabularyAchievement } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

import { ACHIEVEMENT_COPY } from '../profile-achievements';

/** Arched medals: coloured when earned, dimmed with a lock and progress otherwise. */
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
  return (
    <Card className="mt-4 p-4">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text weight="black" className="text-lg text-ink">
          Giải thưởng
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Xem tất cả thành tích" onPress={onOpenAll} hitSlop={12} className="active:opacity-70">
          <Text weight="bold" className="text-sm" style={{ color: colors.accent }}>
            Xem tất cả
          </Text>
        </Pressable>
      </View>
      {shown.length === 0 ? (
        <Text className="py-6 text-center text-sm text-muted">{loading ? 'Đang tải thành tích…' : 'Chưa có thành tích nào.'}</Text>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 }}>
          {shown.map((item) => {
            const copy = ACHIEVEMENT_COPY[item.code];
            const tone = copy?.tone ?? 'accent';
            const fg = tone === 'warm' ? colors.xpDeep : tone === 'success' ? colors.success : colors.accentDeep;
            const bg = tone === 'warm' ? colors.warmSoft : tone === 'success' ? colors.successSoft : colors.accentSoft;
            const title = copy?.title ?? item.code;
            return (
              <View
                key={item.code}
                accessible
                accessibilityLabel={`${title}, ${item.achieved ? 'đã đạt' : `chưa đạt, ${item.progress} trên ${item.target}`}`}
                style={{ width: 76, alignItems: 'center' }}>
                <View
                  style={{
                    width: 62,
                    height: 80,
                    borderRadius: 31,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: item.achieved ? bg : colors.canvas,
                    borderWidth: 2,
                    borderColor: item.achieved ? fg : colors.line,
                  }}>
                  {item.achieved ? <Trophy size={26} color={fg} /> : <Lock size={22} color={colors.muted} />}
                </View>
                <Text weight="bold" className="mt-2 text-center text-[11px] text-ink" numberOfLines={2}>
                  {title}
                </Text>
                {!item.achieved ? (
                  <Text className="text-center text-[10px] text-muted">
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
