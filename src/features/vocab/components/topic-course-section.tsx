import { BookOpen, BookOpenCheck, Check, GraduationCap, LockKeyhole, Play } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ImageBackground, Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { TopicStudySheet } from '@/src/features/vocab/components/topic-study-sheet';
import type { VocabularyTopic } from '@/src/features/vocab/api';
import { createVocabularyTopicLessons, type VocabularyTopicLesson } from '@/src/features/vocab/topic-lessons';
import { topicCover } from '@/src/features/vocab/topic-artwork';
import { useTopicLessonProgress } from '@/src/features/vocab/use-topic-lesson-progress';
import { colors } from '@/src/theme';

const LESSON_ICONS = [Play, Play, Play, GraduationCap, Play, Play, BookOpen, BookOpenCheck, Play];

export function TopicCourseSection({ topic }: { topic: VocabularyTopic }) {
  const [activeLesson, setActiveLesson] = useState<VocabularyTopicLesson | null>(null);
  const lessons = useMemo(() => createVocabularyTopicLessons(topic), [topic]);
  const progress = useTopicLessonProgress(topic.id, lessons.map((lesson) => lesson.id));
  const cover = topicCover(topic);

  return (
    <View className="mb-8 -mx-5 overflow-hidden bg-canvas pb-7">
      <View className="overflow-hidden">
        {cover ? <ImageBackground source={{ uri: cover }} resizeMode="cover" className="h-[190px] justify-center bg-[#092235]">
          <View className="absolute inset-0 bg-black/35" />
          <View className="items-center px-5">
            <Text weight="bold" className="text-[10px] uppercase tracking-[1.7px] text-white/75">CHỦ ĐỀ TỪ VỰNG</Text>
            <Text weight="black" className="mt-1 text-center text-[25px] leading-8 text-white" numberOfLines={2}>{topic.nameVi || topic.name}</Text>
            <Text weight="bold" className="mt-1 text-center text-sm text-white/85">{lessons.length} bài học · {topic.wordCount} từ vựng</Text>
          </View>
        </ImageBackground> : <View className="h-[190px] items-center justify-center bg-[#092235] px-5">
          <Text weight="bold" className="text-[10px] uppercase tracking-[1.7px] text-white/75">CHỦ ĐỀ TỪ VỰNG</Text>
          <Text weight="black" className="mt-1 text-center text-[25px] leading-8 text-white" numberOfLines={2}>{topic.nameVi || topic.name}</Text>
          <Text weight="bold" className="mt-1 text-center text-sm text-white/85">{lessons.length} bài học · {topic.wordCount} từ vựng</Text>
        </View>}
      </View>

      <View className="px-5 pt-5">
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text weight="black" className="text-lg">Lộ trình học</Text>
            <Text className="mt-1 text-xs leading-5 text-muted">Hoàn thành bài đang mở để tiếp tục.</Text>
          </View>
          <Text weight="bold" className="text-xs text-accent-deep">{progress.isLoading ? '…' : `${progress.completedCount}/${lessons.length}`} bài</Text>
        </View>

        <View className="-mx-1 flex-row flex-wrap">
          {lessons.map((lesson, index) => {
            const done = progress.isCompleted(lesson.id);
            const unlocked = progress.isUnlocked(index);
            const LessonIcon = LESSON_ICONS[index % LESSON_ICONS.length];
            return <View key={lesson.id} className="mb-7 w-1/3 items-center px-1">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: progress.isLoading || !unlocked }}
                accessibilityLabel={`${done ? 'Đã hoàn thành' : unlocked ? 'Bắt đầu bài' : 'Bị khóa, hoàn thành bài trước'}: ${lesson.title}`}
                disabled={progress.isLoading || !unlocked}
                onPress={() => setActiveLesson(lesson)}
                className="items-center active:opacity-75"
              >
                <View className="mb-3 h-[78px] w-[78px] items-center justify-center rounded-full" style={{ backgroundColor: done || unlocked ? colors.accent : colors.surfaceTint }}>
                  {done ? <Check size={29} color={colors.canvas} strokeWidth={3} /> : unlocked ? <LessonIcon size={index === 3 || index === 6 || index === 7 ? 31 : 29} color={colors.canvas} fill={index === 3 || index === 6 || index === 7 ? 'none' : colors.canvas} strokeWidth={index === 3 || index === 6 || index === 7 ? 2.5 : 2} /> : <LockKeyhole size={23} color={colors.muted} />}
                </View>
                <Text numberOfLines={3} weight="bold" className="min-h-[54px] px-1 text-center text-[13px] leading-[21px]" style={{ color: done || unlocked ? colors.accentDeep : colors.muted }}>{lesson.title}</Text>
              </Pressable>
            </View>;
          })}
        </View>
      </View>

      <TopicStudySheet topic={topic} topicPage={activeLesson?.wordPage} topicPageSize={activeLesson?.wordPageSize} setTitle={activeLesson?.title} visible={activeLesson !== null} onClose={() => setActiveLesson(null)} onComplete={() => activeLesson ? progress.markCompleted(activeLesson.id) : undefined} />
    </View>
  );
}
