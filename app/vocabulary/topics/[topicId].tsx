import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BookOpen, BookOpenCheck, Check, ChevronRight, GraduationCap, Link2, PenLine, Play } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { TopicStudySheet } from '@/src/features/vocab/components/topic-study-sheet';
import { vocabApi, type VocabularySet, type VocabularyTopic } from '@/src/features/vocab/api';
import { topicCover } from '@/src/features/vocab/topic-artwork';
import { colors } from '@/src/theme';

const MODES = [
  { label: 'Từ mới', Icon: BookOpen, color: '#20aaf2' },
  { label: 'Thẻ', Icon: BookOpenCheck, color: '#ff9951' },
  { label: 'Quiz', Icon: GraduationCap, color: '#a175ee' },
  { label: 'Nối', Icon: Link2, color: '#23b88e' },
  { label: 'Điền', Icon: PenLine, color: '#e8ad2c' },
];

export default function VocabularyTopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const [selectedSet, setSelectedSet] = useState<VocabularySet | null>(null);
  const topicsQuery = useQuery({ queryKey: ['vocab', 'topics'], queryFn: ({ signal }) => vocabApi.listTopics(signal), staleTime: 5 * 60_000 });
  const setsQuery = useQuery({ queryKey: ['vocab', 'topic-sets'], queryFn: ({ signal }) => vocabApi.listSets('TOPIC', 0, 50, signal), staleTime: 5 * 60_000 });
  const topic = useMemo(() => topicsQuery.data?.find((item) => item.id === topicId) ?? null, [topicsQuery.data, topicId]);
  const cover = topic ? topicCover(topic) : null;
  const lessons = useMemo(() => (setsQuery.data?.items ?? [])
    .filter((item) => item.topicId === topicId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)), [setsQuery.data, topicId]);

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
        <View className="px-5 pb-5 pt-3">
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-surface">
            <ArrowLeft size={21} color={colors.ink} />
          </Pressable>
          {topic ? (
            <View className="overflow-hidden rounded-[26px]">
              {cover ? <ImageBackground source={{ uri: cover }} resizeMode="cover" className="h-[148px] justify-end bg-surfaceTint">
                <View className="absolute inset-0 bg-black/40" />
                <View className="px-4 pb-4">
                  <Text weight="bold" className="text-[10px] uppercase tracking-[1.6px] text-white/75">CHỦ ĐỀ TỪ VỰNG</Text>
                  <Text weight="black" className="mt-1 text-2xl leading-8 text-white" numberOfLines={2}>{topic.nameVi || topic.name}</Text>
                  <Text className="mt-1 text-xs text-white/85">{lessons.length} bài học · {topic.wordCount} từ</Text>
                </View>
              </ImageBackground> : <View className="h-[148px] justify-end px-4 pb-4" style={{ backgroundColor: colors.heroStart }}>
                <Text weight="bold" className="text-[10px] uppercase tracking-[1.6px] text-white/75">CHỦ ĐỀ TỪ VỰNG</Text>
                <Text weight="black" className="mt-1 text-2xl leading-8 text-white" numberOfLines={2}>{topic.nameVi || topic.name}</Text>
                <Text className="mt-1 text-xs text-white/85">{lessons.length} bài học · {topic.wordCount} từ</Text>
              </View>}
            </View>
          ) : topicsQuery.isPending ? <View className="h-[148px] items-center justify-center rounded-[26px] bg-surface"><ActivityIndicator color={colors.accent} /></View> : null}
        </View>

        <View className="px-5">
          <View className="mb-4 flex-row items-end justify-between">
            <View className="flex-1 pr-3"><Text weight="black" className="text-xl">Các bài học</Text><Text className="mt-1 text-sm text-muted">Mỗi bài có nhiều cách luyện từ vựng.</Text></View>
            {topic ? <Text weight="bold" className="text-xs text-accent-deep">{lessons.length} bài</Text> : null}
          </View>

          {setsQuery.isPending ? <View className="items-center py-10"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải bài học…</Text></View> : null}
          {setsQuery.isError ? <View className="rounded-3xl border border-line bg-surface p-5"><Text weight="bold">Chưa tải được bài học</Text><Text className="mt-2 text-sm text-muted">Kiểm tra kết nối rồi thử lại.</Text><Button className="mt-4" variant="secondary" label="Thử lại" onPress={() => void setsQuery.refetch()} /></View> : null}
          {setsQuery.isSuccess && lessons.length === 0 ? <View className="items-center rounded-3xl border border-line bg-surface px-5 py-8">
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft"><BookOpen size={23} color={colors.accentDeep} /></View>
            <Text weight="bold" className="text-center">Chủ đề chưa có bài học</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">Bài học sẽ hiện ở đây khi được thêm vào chủ đề này.</Text>
          </View> : null}

          <View className="gap-3">
            {lessons.map((lesson, index) => (
              <Pressable key={lesson.id} accessibilityRole="button" accessibilityLabel={`Mở bài ${lesson.title}`} onPress={() => setSelectedSet(lesson)} className="overflow-hidden rounded-3xl border border-line bg-surface active:opacity-80">
                <View className="flex-row items-center gap-3 p-4">
                  <View className="h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-2xl" style={{ backgroundColor: `${MODES[index % MODES.length].color}20` }}>
                    {lesson.coverUrl ? <ImageBackground source={{ uri: lesson.coverUrl }} resizeMode="cover" className="h-full w-full" /> : <View className="flex-1 items-center justify-center"><Text weight="black" className="text-xl" style={{ color: MODES[index % MODES.length].color }}>{String(index + 1).padStart(2, '0')}</Text></View>}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2"><Text weight="black" className="flex-1 text-base leading-5" numberOfLines={2}>{lesson.title}</Text>{lesson.status === 'ACTIVE' ? <Check size={15} color={colors.success} /> : null}</View>
                    <Text className="mt-1 text-xs text-muted">{lesson.wordCount ?? 0} từ · Bài {index + 1}</Text>
                  </View>
                  <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.accent }}><Play size={17} color="#fff" fill="#fff" /></View>
                </View>
                <View className="flex-row items-center gap-3 border-t border-line px-4 py-3">
                  {MODES.map(({ label, Icon, color }) => <View key={label} className="flex-1 items-center gap-1">
                    <Icon size={16} color={color} />
                    <Text className="text-[9px] text-muted">{label}</Text>
                  </View>)}
                  <ChevronRight size={17} color={colors.muted} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      <TopicStudySheet topic={topic} setId={selectedSet?.id} setTitle={selectedSet?.title} visible={selectedSet !== null} onClose={() => setSelectedSet(null)} />
    </View>
  );
}
