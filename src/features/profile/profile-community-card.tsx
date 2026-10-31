import { ChevronRight, UsersRound } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

export function ProfileCommunityCard({ followers, following, onPress }: { followers?: number; following?: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="mb-5 overflow-hidden rounded-[26px] border border-line bg-surface p-4 active:opacity-80">
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: '#d7628020' }}><UsersRound size={22} color="#d76280" /></View>
        <View className="flex-1"><Text weight="black" className="text-base">{'C\u1ed9ng \u0111\u1ed3ng h\u1ecdc t\u1eadp'}</Text><Text className="mt-1 text-xs text-muted">{'K\u1ebft n\u1ed1i v\u1edbi nh\u1eefng ng\u01b0\u1eddi c\u00f9ng h\u1ecdc IELTS'}</Text></View>
        <ChevronRight size={18} color={colors.muted} />
      </View>
      <View className="mt-4 flex-row rounded-2xl" style={{ backgroundColor: colors.canvas }}>
        <View className="flex-1 items-center border-r border-line py-3"><Text weight="black" className="text-lg text-accent">{followers ?? '\u2014'}</Text><Text className="mt-0.5 text-[10px] text-muted">{'Ng\u01b0\u1eddi theo d\u00f5i'}</Text></View>
        <View className="flex-1 items-center py-3"><Text weight="black" className="text-lg" style={{ color: '#d76280' }}>{following ?? '\u2014'}</Text><Text className="mt-0.5 text-[10px] text-muted">{'\u0110ang theo d\u00f5i'}</Text></View>
      </View>
    </Pressable>
  );
}
