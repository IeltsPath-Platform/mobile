import { BookOpen, Camera, Flame, Sparkles } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

export function ProfileSummaryCard({ name, email, joined, band, streak, xp, onEdit, error }: { name: string; email: string; joined: string; band: string; streak: number | null; xp?: number; onEdit: () => void; error: boolean }) {
  return (
    <View className="mb-5 overflow-hidden rounded-[26px] border border-line bg-surface">
      <View className="items-center px-4 pb-4 pt-4" style={{ backgroundColor: colors.surfaceTint }}>
        <View className="flex-row items-center gap-2"><Text weight="black" className="text-xl" numberOfLines={1}>{name}</Text><Pressable accessibilityRole="button" accessibilityLabel={'Ch\u1ec9nh s\u1eeda h\u1ed3 s\u01a1'} onPress={onEdit} className="h-8 w-8 items-center justify-center rounded-full bg-canvas"><Camera size={15} color={colors.accentDeep} /></Pressable></View>
        <Text className="mt-1 text-xs text-muted">{'Th\u00e0nh vi\u00ean t\u1eeb '}{joined}{' \u00b7 '}{email}</Text>
      </View>
      <View className="flex-row items-stretch px-2 py-4">
        <View className="flex-1 items-center border-r border-line px-1"><BookOpen size={18} color={colors.accentDeep} /><Text weight="bold" className="mt-2 text-xs">{'Kh\u00f3a h\u1ecdc'}</Text><Text weight="black" className="mt-1 text-sm">{band}</Text></View>
        <View className="flex-1 items-center border-r border-line px-1"><Flame size={18} color="#ff864b" /><Text weight="bold" className="mt-2 text-xs">{'Chu\u1ed7i ng\u00e0y h\u1ecdc'}</Text><Text weight="black" className="mt-1 text-sm">{streak ?? '\u2014'}</Text></View>
        <View className="flex-1 items-center px-1"><Sparkles size={18} color="#e6ad2f" /><Text weight="bold" className="mt-2 text-xs">XP</Text><Text weight="black" className="mt-1 text-sm">{xp ?? '\u2014'}</Text></View>
      </View>
      {error ? <Text className="px-4 pb-3 text-xs text-danger">{'M\u1ed9t s\u1ed1 s\u1ed1 li\u1ec7u ch\u01b0a t\u1ea3i \u0111\u01b0\u1ee3c. K\u00e9o xu\u1ed1ng \u0111\u1ec3 th\u1eed l\u1ea1i.'}</Text> : null}
    </View>
  );
}
