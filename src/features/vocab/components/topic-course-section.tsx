import { BookOpen, BookOpenCheck, Check, GraduationCap, LockKeyhole, Play } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ImageBackground, Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { TopicStudySheet } from '@/src/features/vocab/components/topic-study-sheet';
import type { VocabularyTopic } from '@/src/features/vocab/api';
import { createVocabularyTopicLessons, type VocabularyTopicLesson } from '@/src/features/vocab/topic-lessons';
import { topicCover } from '@/src/features/vocab/topic-artwork';
import { useTopicLessonProgress } from '@/src/features/vocab/use-topic-lesson-progress';
import { useAuth } from '@/src/features/auth/auth-provider';
import { studyKeys, vocabularyStudyApi } from '@/src/features/vocab/study-api';
import type { TopicProgress, UnitSummary } from '@/src/features/vocab/study-types';
import { ServerTopicStudySheet } from '@/src/features/vocab/components/server-topic-study-sheet';
import { colors } from '@/src/theme';

const LESSON_ICONS = [Play, Play, Play, GraduationCap, Play, Play, BookOpen, BookOpenCheck, Play];

type ProgressQuery = { data: TopicProgress | null; isPending: boolean; error: Error | null; refetch: () => void };
export function TopicCourseSection({ topic, progressQuery }: { topic: VocabularyTopic; progressQuery?: ProgressQuery }) {
  const [activeLesson, setActiveLesson] = useState<VocabularyTopicLesson | null>(null);
  const [activeUnit, setActiveUnit] = useState<UnitSummary | null>(null);
  const { status, authEnabled } = useAuth();
  const signedIn = authEnabled && status === 'authenticated';
  const lessons = useMemo(() => createVocabularyTopicLessons(topic), [topic]);
  const progress = useTopicLessonProgress(topic.id, lessons.map((lesson) => lesson.id));
  const units = useQuery({ queryKey: studyKeys.units(topic.id), queryFn: ({ signal }) => vocabularyStudyApi.units(topic.id, signal), enabled: signedIn, staleTime: 300_000 });
  const ownProgress = useQuery({ queryKey: [...studyKeys.progress, topic.id], queryFn: async ({ signal }) => (await vocabularyStudyApi.progress([topic.id], signal))[0] ?? null, enabled: signedIn && !progressQuery, staleTime: 30_000 });
  const serverProgress = progressQuery ?? ownProgress;
  const progressFailed = Boolean(serverProgress.error);
  const serverStates = new Map((serverProgress.data?.units ?? []).map((item) => [item.unitId, item]));
  const cover = topicCover(topic);

  return (
    <View className="mb-8 -mx-5 overflow-hidden bg-canvas pb-7">
      <View className="overflow-hidden">
        {cover ? <ImageBackground source={{ uri: cover }} resizeMode="cover" className="h-[190px] justify-center bg-[#092235]">
          <View className="absolute inset-0 bg-black/35" />
          <View className="items-center px-5">
            <Text weight="bold" className="text-[10px] uppercase tracking-[1.7px] text-white/75">CHỦ ĐỀ TỪ VỰNG</Text>
            <Text weight="black" className="mt-1 text-center text-[25px] leading-8 text-white" numberOfLines={2}>{topic.nameVi || topic.name}</Text>
            <Text weight="bold" className="mt-1 text-center text-sm text-white/85">{signedIn ? units.data?.totalUnits ?? 0 : lessons.length} bài học · {topic.wordCount} từ vựng</Text>
          </View>
        </ImageBackground> : <View className="h-[190px] items-center justify-center bg-[#092235] px-5">
          <Text weight="bold" className="text-[10px] uppercase tracking-[1.7px] text-white/75">CHỦ ĐỀ TỪ VỰNG</Text>
          <Text weight="black" className="mt-1 text-center text-[25px] leading-8 text-white" numberOfLines={2}>{topic.nameVi || topic.name}</Text>
          <Text weight="bold" className="mt-1 text-center text-sm text-white/85">{signedIn ? units.data?.totalUnits ?? 0 : lessons.length} bài học · {topic.wordCount} từ vựng</Text>
        </View>}
      </View>

      <View className="px-5 pt-5">
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text weight="black" className="text-lg">Lộ trình học</Text>
            <Text className="mt-1 text-xs leading-5 text-muted">Hoàn thành bài đang mở để tiếp tục.</Text>
          </View>
          <Text weight="bold" className="text-xs text-accent-deep">{signedIn ? serverProgress.isPending || progressFailed || !serverProgress.data ? '…' : `${serverProgress.data?.completedUnits ?? 0}/${units.data?.totalUnits ?? 0}` : progress.isLoading ? '…' : `${progress.completedCount}/${lessons.length}`} bài</Text>
        </View>

        {signedIn && units.isPending ? <ActivityIndicator className="py-5" color={colors.accent} /> : null}
        {signedIn && units.isSuccess && units.data.items.length === 0 ? <Text className="mb-5 text-sm text-muted">Chủ đề chưa có bài học được xuất bản.</Text> : null}
        <View className="-mx-1 flex-row flex-wrap">
          {(signedIn ? units.data?.items ?? [] : lessons).map((lesson, index) => {
            if ('unitId' in lesson) {
              const item = lesson;
              const state = serverStates.get(item.unitId);
              const done = state?.status === 'COMPLETED';
              const unlocked = !progressFailed && (done || state?.status === 'AVAILABLE' || state?.status === 'IN_PROGRESS');
              const Icon = LESSON_ICONS[index % LESSON_ICONS.length];
              return <View key={item.unitId} className="mb-7 w-1/3 items-center px-1"><Pressable accessibilityRole="button" accessibilityState={{ disabled: serverProgress.isPending || !unlocked }} accessibilityLabel={`${done ? 'Đã hoàn thành' : unlocked ? 'Bắt đầu bài' : 'Bị khóa, hoàn thành bài trước'}: ${item.title}`} disabled={serverProgress.isPending || !unlocked} onPress={() => setActiveUnit(item)} className="items-center active:opacity-75"><View className="mb-3 h-[78px] w-[78px] items-center justify-center rounded-full" style={{ backgroundColor: done ? colors.success : unlocked ? colors.accent : colors.surfaceTint }}>{done ? <Check size={29} color={colors.canvas} strokeWidth={3} /> : unlocked ? <Icon size={29} color={colors.canvas} /> : <LockKeyhole size={23} color={colors.muted} />}</View><Text numberOfLines={3} weight="bold" className="min-h-[54px] px-1 text-center text-[13px] leading-[21px]" style={{ color: done || unlocked ? colors.accentDeep : colors.muted }}>{item.title}</Text><Text className="text-[11px] text-muted">{done ? 'Hoàn thành' : `${item.wordCount} từ · ${item.estimatedMinutes} phút`}</Text></Pressable></View>;
            }
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

      {signedIn && (units.isError || progressFailed) ? <View className="mx-5 mb-4 rounded-2xl border border-line bg-surface p-4"><Text className="text-sm text-danger">{units.error?.message ?? serverProgress.error?.message}</Text><Pressable onPress={() => { void units.refetch(); void serverProgress.refetch(); }} className="mt-2 min-h-11 justify-center"><Text weight="bold" className="text-sm text-accent-deep">Thử tải lại</Text></Pressable></View> : null}

      <TopicStudySheet topic={topic} topicPage={activeLesson?.wordPage} topicPageSize={activeLesson?.wordPageSize} setTitle={activeLesson?.title} visible={!signedIn && activeLesson !== null} onClose={() => setActiveLesson(null)} onComplete={() => activeLesson ? progress.markCompleted(activeLesson.id) : undefined} />
      {signedIn && activeUnit ? <ServerTopicStudySheet key={activeUnit.unitId} unitId={activeUnit.unitId} initialMode={serverStates.get(activeUnit.unitId)?.status === 'COMPLETED' ? 'REPLAY' : 'RESUME_OR_START'} visible onClose={() => { setActiveUnit(null); void serverProgress.refetch(); }} /> : null}
    </View>
  );
}
