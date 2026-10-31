import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BookOpen, Check, LockKeyhole, Play } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { TopicStudySheet } from '@/src/features/vocab/components/topic-study-sheet';
import { vocabApi } from '@/src/features/vocab/api';
import { createVocabularyTopicLessons, type VocabularyTopicLesson } from '@/src/features/vocab/topic-lessons';
import { topicCover } from '@/src/features/vocab/topic-artwork';
import { useTopicLessonProgress } from '@/src/features/vocab/use-topic-lesson-progress';
import { colors } from '@/src/theme';

export default function VocabularyTopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const [selectedLesson, setSelectedLesson] = useState<VocabularyTopicLesson | null>(null);
  const topicsQuery = useQuery({ queryKey: ['vocab', 'topics'], queryFn: ({ signal }) => vocabApi.listTopics(signal), staleTime: 5 * 60_000 });
  const topic = useMemo(() => topicsQuery.data?.find((item) => item.id === topicId) ?? null, [topicsQuery.data, topicId]);
  const cover = topic ? topicCover(topic) : null;
  const lessons = useMemo(() => topic ? createVocabularyTopicLessons(topic) : [], [topic]);
  const lessonProgress = useTopicLessonProgress(topicId, lessons.map((lesson) => lesson.id));

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
        <View className="px-5 pb-5 pt-3">
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-surface">
            <ArrowLeft size={21} color={colors.ink} />
          </Pressable>
          {topic ? (
            <View className="overflow-hidden rounded-[26px]">
              {cover ? <ImageBackground source={{ uri: cover }} resizeMode="cover" className="h-[168px] justify-end bg-surfaceTint">
                <View className="absolute inset-0 bg-black/40" />
                <View className="px-4 pb-4">
                  <Text weight="bold" className="text-[10px] uppercase tracking-[1.6px] text-white/75">CHỦ ĐỀ TỪ VỰNG</Text>
                  <Text weight="black" className="mt-1 text-2xl leading-8 text-white" numberOfLines={2}>{topic.nameVi || topic.name}</Text>
                  <Text className="mt-1 text-xs text-white/85">{lessons.length} bài học · {topic.wordCount} từ</Text>
                </View>
              </ImageBackground> : <View className="h-[168px] justify-end px-4 pb-4" style={{ backgroundColor: colors.heroStart }}>
                <Text weight="bold" className="text-[10px] uppercase tracking-[1.6px] text-white/75">CHỦ ĐỀ TỪ VỰNG</Text>
                <Text weight="black" className="mt-1 text-2xl leading-8 text-white" numberOfLines={2}>{topic.nameVi || topic.name}</Text>
                <Text className="mt-1 text-xs text-white/85">{lessons.length} bài học · {topic.wordCount} từ</Text>
              </View>}
            </View>
          ) : topicsQuery.isPending ? <View className="h-[168px] items-center justify-center rounded-[26px] bg-surface"><ActivityIndicator color={colors.accent} /></View> : null}
        </View>

        <View className="px-5">
          <View className="mb-5 flex-row items-end justify-between">
            <View className="flex-1 pr-3">
              <Text weight="black" className="text-xl">Lộ trình bài học</Text>
              <Text className="mt-1 text-sm text-muted">Hoàn thành bài đang mở để đi tiếp.</Text>
            </View>
            {topic ? <Text weight="bold" className="text-xs text-accent-deep">{lessonProgress.isLoading ? '…' : `${lessonProgress.completedCount}/${lessons.length}`} bài</Text> : null}
          </View>

          {topicsQuery.isSuccess && lessons.length === 0 ? <View className="items-center rounded-3xl border border-line bg-surface px-5 py-8">
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft"><BookOpen size={23} color={colors.accentDeep} /></View>
            <Text weight="bold" className="text-center">Chủ đề chưa có từ vựng</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">Lộ trình sẽ hiện ở đây khi chủ đề có từ vựng.</Text>
          </View> : null}

          <View className="-mx-1 flex-row flex-wrap">
            {lessons.map((lesson, index) => {
              const completed = lessonProgress.isCompleted(lesson.id);
              const unlocked = lessonProgress.isUnlocked(index);
              return (
                <View key={lesson.id} className="mb-7 w-1/3 items-center px-1">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: lessonProgress.isLoading || !unlocked }}
                    accessibilityLabel={`${completed ? 'Đã hoàn thành' : unlocked ? 'Mở bài' : 'Bị khóa, hoàn thành bài trước'}: ${lesson.title}`}
                    disabled={lessonProgress.isLoading || !unlocked}
                    onPress={() => setSelectedLesson(lesson)}
                    className="items-center active:opacity-80"
                  >
                    <View className="mb-3 h-[78px] w-[78px] items-center justify-center rounded-full" style={{ backgroundColor: completed ? colors.success : unlocked ? colors.accent : colors.surfaceTint, borderWidth: index === lessonProgress.completedCount && !completed ? 4 : 0, borderColor: colors.accentSoft }}>
                      {completed ? <Check size={30} color="#fff" strokeWidth={3} /> : unlocked ? <Play size={29} color="#07111f" fill="#07111f" /> : <LockKeyhole size={24} color={colors.muted} />}
                    </View>
                    <Text weight="bold" className="min-h-[44px] px-1 text-center text-sm leading-[21px]" style={{ color: completed || unlocked ? colors.ink : colors.muted }} numberOfLines={2}>{lesson.title}</Text>
                    <Text className="mt-1 text-[11px] text-muted">{completed ? 'Hoàn thành' : `${lesson.wordCount} từ`}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <TopicStudySheet topic={topic} topicPage={selectedLesson?.wordPage} topicPageSize={selectedLesson?.wordPageSize} setTitle={selectedLesson?.title} visible={selectedLesson !== null} onClose={() => setSelectedLesson(null)} onComplete={() => selectedLesson ? lessonProgress.markCompleted(selectedLesson.id) : undefined} />
    </View>
  );
}
