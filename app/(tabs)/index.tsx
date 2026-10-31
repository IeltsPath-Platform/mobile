import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpen, CircleUserRound, Flame, Play, Sparkles } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, Image, ImageBackground, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { useProgress } from '@/src/features/progress/progress-summary';
import { useStreak } from '@/src/features/progress/use-streak';
import { vocabApi } from '@/src/features/vocab/api';
import { topicCover } from '@/src/features/vocab/topic-artwork';
import { colors } from '@/src/theme';

const owl = require('@/assets/images/owl/hero-cheer.webp');
const TOPIC_TINTS = ['#20aaf2', '#ff9951', '#23b88e', '#a175ee', '#e8ad2c'];

export default function HomeScreen() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const progress = useProgress();
  const streak = useStreak();
  const topicsQuery = useQuery({ queryKey: ['vocab', 'topics'], queryFn: ({ signal }) => vocabApi.listTopics(signal), staleTime: 5 * 60_000 });
  const topics = useMemo(() => [...(topicsQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [topicsQuery.data]);

  const openTopic = (topicId: string) => router.push({ pathname: '/vocabulary/topics/[topicId]', params: { topicId } });

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerClassName="px-5 pb-10 pt-3" showsVerticalScrollIndicator={false}>
        <View className="mb-3 flex-row items-center justify-between">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft"><BookOpen size={20} color={colors.accentDeep} /></View>
          <View className="items-center"><Text weight="black" className="text-sm text-accent-deep">IELTSPath</Text><Text weight="bold" className="text-[9px] uppercase tracking-[1.8px] text-muted">Học cùng cú</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Mở hồ sơ" onPress={() => router.push('/(tabs)/account' as never)} className="h-10 w-10 items-center justify-center rounded-2xl border border-line bg-surface"><CircleUserRound size={20} color={colors.accentDeep} /></Pressable>
        </View>

        <View className="mb-4 flex-row gap-2">
          <View className="min-h-10 flex-1 flex-row items-center justify-center gap-2 rounded-full border border-line bg-surface px-3"><Flame size={16} color="#ff864b" /><Text weight="black" className="text-sm">{streak.currentDays ?? '—'}</Text><Text className="text-xs text-muted">ngày</Text></View>
          <View className="min-h-10 flex-1 flex-row items-center justify-center gap-2 rounded-full border border-line bg-surface px-3"><Sparkles size={15} color="#e6ad2f" /><Text weight="black" className="text-sm">{progress.data?.totalXp ?? '—'}</Text><Text className="text-xs text-muted">XP</Text></View>
        </View>

        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1 pr-2"><Text weight="black" className="text-[23px] leading-7">Hôm nay học gì?</Text><Text className="mt-1 text-sm text-muted">Chọn chủ đề, rồi chọn một bài học.</Text></View>
          <Image source={owl} resizeMode="contain" accessibilityLabel="Cú IELTSPath cổ vũ bạn" className="h-[54px] w-[52px]" />
        </View>

        <View className="mb-3 flex-row items-end justify-between">
          <View><Text weight="black" className="text-lg">Chủ đề từ vựng</Text><Text className="mt-0.5 text-xs text-muted">{topicsQuery.data ? `${topics.length} chủ đề` : 'Ảnh và bài học theo từng chủ đề'}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Mở luyện tập" onPress={() => router.push('/(tabs)/practice' as never)} className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: '#ff9650' }}><Play size={16} color="#17120e" fill="#17120e" /></Pressable>
        </View>

        {topicsQuery.isPending ? <View className="items-center py-12"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải chủ đề…</Text></View> : null}
        {topicsQuery.isError ? <View className="rounded-3xl border border-line bg-surface p-5"><Text weight="bold">Chưa tải được chủ đề</Text><Text className="mt-2 text-sm leading-5 text-muted">Kiểm tra kết nối máy chủ rồi thử lại.</Text><Button className="mt-4" variant="secondary" label="Thử lại" onPress={() => void queryClient.invalidateQueries({ queryKey: ['vocab', 'topics'] })} /></View> : null}
        {topicsQuery.isSuccess && !topics.length ? <View className="rounded-3xl border border-line bg-surface p-5"><Text weight="bold">Chưa có chủ đề từ vựng</Text><Text className="mt-2 text-sm text-muted">Các chủ đề sẽ hiện ở đây sau khi được xuất bản.</Text></View> : null}

        <View className="flex-row flex-wrap justify-between gap-y-3">
          {topics.map((topic, index) => {
            const tint = TOPIC_TINTS[index % TOPIC_TINTS.length];
            const cover = topicCover(topic);
            return <Pressable key={topic.id} accessibilityRole="button" accessibilityLabel={`Mở chủ đề ${topic.nameVi || topic.name}`} onPress={() => openTopic(topic.id)} className="w-[48.5%] overflow-hidden rounded-[22px] border border-line bg-surface active:opacity-80">
              <View className="h-[116px] overflow-hidden" style={{ backgroundColor: `${tint}20` }}>
                {cover ? <ImageBackground source={{ uri: cover }} resizeMode="cover" className="h-full w-full">
                  <View className="absolute inset-0 bg-black/20" />
                  <View className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full bg-black/35"><Play size={13} color="#fff" fill="#fff" /></View>
                </ImageBackground> : <View className="h-full items-center justify-center" style={{ backgroundColor: `${tint}20` }}>
                  <Image source={owl} resizeMode="contain" className="h-[76px] w-[76px]" />
                  <View className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full bg-surface"><Play size={13} color={tint} fill={tint} /></View>
                </View>}
              </View>
              <View className="px-3 pb-3 pt-2.5">
                <Text weight="black" className="text-sm leading-5" numberOfLines={2}>{topic.nameVi || topic.name}</Text>
                <Text className="mt-1 text-[11px] text-muted">{topic.wordCount} từ vựng</Text>
              </View>
            </Pressable>;
          })}
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/flashcards' as never)} className="mt-5 min-h-[60px] flex-row items-center gap-3 rounded-3xl border border-line bg-surface px-4">
          <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: '#ff965030' }}><BookOpen size={19} color="#ff9650" /></View>
          <View className="flex-1"><Text weight="bold">Ôn lại từ đã lưu</Text><Text className="mt-0.5 text-xs text-muted">Mở thư viện flashcard của bạn</Text></View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
