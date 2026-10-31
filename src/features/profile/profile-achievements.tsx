import { Lock, Trophy } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import type { VocabularyAchievement } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

const ACHIEVEMENT_COPY: Record<string, { title: string; detail: string; color: string; tint: string }> = {
  REVIEW_STREAK_7: { title: 'B\u1ec1n b\u1ec9 7 ng\u00e0y', detail: '\u00d4n t\u1eeb li\u00ean t\u1ee5c m\u1ed9t tu\u1ea7n', color: '#218fda', tint: '#e7f5ff' },
  TOPIC_COMPLETED: { title: 'Chinh ph\u1ee5c ch\u1ee7 \u0111\u1ec1', detail: 'Ho\u00e0n th\u00e0nh m\u1ed9t ch\u1ee7 \u0111\u1ec1', color: '#e59524', tint: '#fff4da' },
  MASTERED_300: { title: 'B\u1eadc th\u1ea7y t\u1eeb v\u1ef1ng', detail: 'Th\u00e0nh th\u1ea1o 300 t\u1eeb', color: '#14a27b', tint: '#e3f8f0' },
};

export function ProfileAchievements({ items, loading, error, onRetry }: { items?: VocabularyAchievement[]; loading: boolean; error: boolean; onRetry: () => void }) {
  return (
    <View className="mb-5 overflow-hidden rounded-[26px] border border-line bg-surface p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View><Text weight="black" className="text-lg">{'Gi\u1ea3i th\u01b0\u1edfng'}</Text><Text className="mt-1 text-xs text-muted">{'Huy hi\u1ec7u ti\u1ebfn \u0111\u1ed9 t\u1eeb t\u00e0i kho\u1ea3n'}</Text></View>
        <Trophy size={20} color={colors.accentWarm} />
      </View>
      {loading ? <Text className="py-4 text-center text-sm text-muted">{'\u0110ang t\u1ea3i huy hi\u1ec7u...'}</Text> : null}
      {error ? <Pressable accessibilityRole="button" onPress={onRetry} className="rounded-2xl bg-canvas p-4"><Text weight="bold" className="text-sm">{'Ch\u01b0a t\u1ea3i \u0111\u01b0\u1ee3c huy hi\u1ec7u - ch\u1ea1m \u0111\u1ec3 th\u1eed l\u1ea1i'}</Text></Pressable> : null}
      {items?.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pb-1">
        {items.map((item) => {
          const design = ACHIEVEMENT_COPY[item.code] ?? { title: item.code, detail: 'Th\u00e0nh t\u1ef1u h\u1ecdc t\u1eadp', color: colors.accentDeep, tint: colors.accentSoft };
          const Icon = item.achieved ? Trophy : Lock;
          const percentage = Math.max(0, Math.min(100, item.target ? item.progress / item.target * 100 : 0));
          return <View key={item.code} className="w-[142px] rounded-2xl border border-line p-3" style={{ backgroundColor: design.tint }}>
            <View className="mb-2 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${design.color}20` }}><Icon size={19} color={design.color} /></View>
            <Text weight="black" className="text-xs leading-4" numberOfLines={2}>{design.title}</Text>
            <Text className="mt-1 min-h-8 text-[10px] leading-4 text-muted" numberOfLines={2}>{design.detail}</Text>
            <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70"><View className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: design.color }} /></View>
            <Text className="mt-1 text-[10px] text-muted">{item.progress}/{item.target}{item.achieved ? ' \u00b7 \u0110\u00e3 nh\u1eadn' : ''}</Text>
          </View>;
        })}
      </ScrollView> : null}
    </View>
  );
}
