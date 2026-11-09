import { Pressable, View } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { Award, X } from 'lucide-react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { LivesBadge, ProgressBar, StreakChip } from '../ui/game-ui';

/** One-row header: exit, word progress, streak, lives, score. */
export function WordlyTopBar({
  wordNumber,
  wordLimit,
  streak,
  lives,
  score,
  leaving,
  onExit,
}: {
  wordNumber: number;
  wordLimit: number | null;
  streak: number;
  lives: number;
  score: number;
  leaving: boolean;
  onExit: () => void;
}) {
  return (
    <View className="flex-row items-center gap-2.5 px-4 pb-2 pt-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rời ván chơi"
        disabled={leaving}
        onPress={onExit}
        className="h-12 w-12 items-center justify-center rounded-full active:opacity-70"
      >
        {leaving ? <ActivityIndicator size="small" color={colors.muted} /> : <X size={26} color={colors.muted} strokeWidth={3} />}
      </Pressable>
      <View className="flex-1">
        <Text weight="bold" className="mb-1 text-xs text-muted">
          Từ {wordNumber}
          {wordLimit ? `/${wordLimit}` : ' · vô hạn'}
        </Text>
        {wordLimit ? <ProgressBar ratio={(wordNumber - 1) / wordLimit} /> : <View style={{ height: 14 }} />}
      </View>
      <StreakChip streak={streak} />
      <LivesBadge remaining={lives} />
      <View accessibilityLabel={`${score} điểm`} className="h-9 flex-row items-center gap-1 rounded-full px-2.5" style={{ backgroundColor: colors.warmSoft, borderWidth: 2, borderColor: colors.xp }}>
        <Award size={15} color={colors.xpDeep} />
        <Text weight="black" className="text-sm" style={{ color: colors.xpDeep }}>
          {score}
        </Text>
      </View>
    </View>
  );
}
