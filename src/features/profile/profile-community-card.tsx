import { ChevronRight, UsersRound } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

export function ProfileCommunityCard({ followers, following, onPress }: { followers?: number; following?: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="mb-5 overflow-hidden rounded-[26px] border border-line bg-surface p-4 active:opacity-80">
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${colors.social}20` }}><UsersRound size={22} color={colors.social} /></View>
        <View className="flex-1"><Text weight="black" className="text-base">Hồ sơ cộng đồng</Text><Text className="mt-1 text-xs text-muted">Bài viết và kết nối của bạn</Text></View>
        <ChevronRight size={18} color={colors.muted} />
      </View>
      <View className="mt-4 flex-row rounded-2xl" style={{ backgroundColor: colors.canvas }}>
        <View className="flex-1 items-center border-r border-line py-3"><Text weight="black" className="text-lg text-accent">{followers ?? '\u2014'}</Text><Text className="mt-0.5 text-[10px] text-muted">{'Ng\u01b0\u1eddi theo d\u00f5i'}</Text></View>
        <View className="flex-1 items-center py-3"><Text weight="black" className="text-lg" style={{ color: colors.social }}>{following ?? '\u2014'}</Text><Text className="mt-0.5 text-[10px] text-muted">{'\u0110ang theo d\u00f5i'}</Text></View>
      </View>
    </Pressable>
  );
}
