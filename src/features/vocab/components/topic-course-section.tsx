import { useQuery } from '@tanstack/react-query';
import { BookOpen, BookOpenCheck, Check, GraduationCap, LockKeyhole, Play } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import type { VocabularyTopic } from '@/src/features/vocab/api';
import { ServerTopicStudySheet } from '@/src/features/vocab/components/server-topic-study-sheet';
import { TopicStudySheet } from '@/src/features/vocab/components/topic-study-sheet';
import { studyKeys, vocabularyStudyApi } from '@/src/features/vocab/study-api';
import type { TopicProgress, UnitSummary } from '@/src/features/vocab/study-types';
import { topicCover } from '@/src/features/vocab/topic-artwork';
import { createVocabularyTopicLessons, type VocabularyTopicLesson } from '@/src/features/vocab/topic-lessons';
import { useTopicLessonProgress } from '@/src/features/vocab/use-topic-lesson-progress';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

const LESSON_ICONS = [Play, Play, Play, GraduationCap, Play, Play, BookOpen, BookOpenCheck, Play];

type ProgressQuery = { data: TopicProgress | null; isPending: boolean; error: Error | null; refetch: () => void };

export function TopicCourseSection({ topic, progressQuery }: { topic: VocabularyTopic; progressQuery?: ProgressQuery }) {
  useTheme();
  const [activeLesson, setActiveLesson] = useState<VocabularyTopicLesson | null>(null);
  const [activeUnit, setActiveUnit] = useState<UnitSummary | null>(null);
  const { status, authEnabled } = useAuth();
  const signedIn = authEnabled && status === 'authenticated';
  const lessons = useMemo(() => createVocabularyTopicLessons(topic), [topic]);
  const progress = useTopicLessonProgress(topic.id, lessons.map((lesson) => lesson.id));
  const units = useQuery({
    queryKey: studyKeys.units(topic.id),
    queryFn: ({ signal }) => vocabularyStudyApi.units(topic.id, signal),
    enabled: signedIn,
    staleTime: 300_000,
  });
  const ownProgress = useQuery({
    queryKey: [...studyKeys.progress, topic.id],
    queryFn: async ({ signal }) => (await vocabularyStudyApi.progress([topic.id], signal))[0] ?? null,
    enabled: signedIn && !progressQuery,
    staleTime: 30_000,
  });
  const serverProgress = progressQuery ?? ownProgress;
  const progressFailed = Boolean(serverProgress.error);
  const serverStates = new Map((serverProgress.data?.units ?? []).map((item) => [item.unitId, item]));
  const cover = topicCover(topic);

  const completedCount = signedIn ? (serverProgress.data?.completedUnits ?? 0) : progress.completedCount;
  const totalUnits = signedIn ? (units.data?.totalUnits ?? 0) : lessons.length;
  const lessonCountLabel = signedIn
    ? units.isPending
      ? 'Đang tải bài học'
      : units.isError
        ? 'Chưa tải được bài học'
        : `${totalUnits} bài học`
    : `${totalUnits} bài học`;
  const progressLoading = signedIn ? units.isPending || serverProgress.isPending : progress.isLoading;
  const progressUnavailable = signedIn && (units.isError || progressFailed || !units.data || !serverProgress.data);
  const progressReady = !progressLoading && !progressUnavailable;
  const progressPercent = progressReady && totalUnits > 0 ? Math.min(100, Math.round((completedCount / totalUnits) * 100)) : 0;
  const items = signedIn ? units.data?.items ?? [] : lessons;

  return (
    <View
      className="mb-6 overflow-hidden rounded-3xl border border-line bg-surface"
      style={{
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* 1. TOPIC BANNER */}
      <View className="overflow-hidden">
        {cover ? (
          <ImageBackground source={{ uri: cover }} resizeMode="cover" className="h-[155px] justify-center" style={{ backgroundColor: colors.heroStart }}>
            <View className="absolute inset-0 bg-black/45" />
            <View className="items-center px-4">
              <View className="rounded-full border border-white/20 bg-white/15 px-3 py-0.5">
                <Text weight="black" className="text-[10px] uppercase tracking-[1.5px] text-white">
                  CHỦ ĐỀ TỪ VỰNG
                </Text>
              </View>
              <Text weight="black" className="mt-1 text-center text-[22px] leading-7 text-white" numberOfLines={2}>
                {topic.nameVi || topic.name}
              </Text>
              <View className="mt-2 rounded-full bg-black/35 px-3 py-1">
                <Text weight="bold" className="text-xs text-white/95">
                  {lessonCountLabel} · {topic.wordCount} từ vựng
                </Text>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <View className="h-[155px] items-center justify-center px-4" style={{ backgroundColor: colors.heroStart }}>
            <View className="rounded-full border border-white/20 bg-white/15 px-3 py-0.5">
              <Text weight="black" className="text-[10px] uppercase tracking-[1.5px] text-white">
                CHỦ ĐỀ TỪ VỰNG
              </Text>
            </View>
            <Text weight="black" className="mt-1 text-center text-[22px] leading-7 text-white" numberOfLines={2}>
              {topic.nameVi || topic.name}
            </Text>
            <View className="mt-2 rounded-full bg-black/35 px-3 py-1">
              <Text weight="bold" className="text-xs text-white/95">
                {lessonCountLabel} · {topic.wordCount} từ vựng
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 2. PROGRESS HEADER */}
      <View className="border-b border-line px-5 py-3.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text weight="black" className="text-base text-ink">
              Lộ trình bài học
            </Text>
            <Text className="mt-0.5 text-xs text-muted">
              Hoàn thành từng bài để mở khóa bài tiếp theo.
            </Text>
          </View>
          <View
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: progressPercent === 100 ? colors.successSoft : colors.accentSoft,
            }}
          >
            <Text
              weight="black"
              className="text-xs"
              style={{ color: progressPercent === 100 ? colors.success : colors.accent }}
            >
              {progressLoading ? '…' : progressUnavailable ? '—' : `${completedCount}/${totalUnits}`}{' '}
              bài
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="mt-2.5 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: colors.line }}>
          <View
            className="h-full rounded-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: progressPercent === 100 ? colors.success : colors.accent,
            }}
          />
        </View>
      </View>

      {/* 3. LESSONS GRID (3 COLUMNS AS ORIGINAL, BUT REFINED & BEAUTIFIED) */}
      <View className="px-3 pt-5 pb-3">
        {signedIn && units.isPending ? <ActivityIndicator className="py-6" color={colors.accent} /> : null}
        {signedIn && units.isSuccess && items.length === 0 ? (
          <Text className="mb-4 text-center text-sm text-muted">Chủ đề chưa có bài học được xuất bản.</Text>
        ) : null}

        <View className="-mx-1 flex-row flex-wrap">
          {items.map((lesson, index) => {
            if ('unitId' in lesson) {
              const item = lesson;
              const state = serverStates.get(item.unitId);
              const done = state?.status === 'COMPLETED';
              const unlocked = !progressFailed && (done || state?.status === 'AVAILABLE' || state?.status === 'IN_PROGRESS');
              const Icon = LESSON_ICONS[index % LESSON_ICONS.length];

              return (
                <View key={item.unitId} className="mb-6 w-1/3 items-center px-1">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: serverProgress.isPending || !unlocked }}
                    accessibilityLabel={`${done ? 'Đã hoàn thành' : unlocked ? 'Bắt đầu bài' : 'Bị khóa'}: ${item.title}`}
                    disabled={serverProgress.isPending || !unlocked}
                    onPress={() => setActiveUnit(item)}
                    className="items-center active:opacity-75"
                  >
                    {/* Circle Node with soft depth */}
                    <View
                      className="mb-2.5 h-[74px] w-[74px] items-center justify-center rounded-full"
                      style={{
                        backgroundColor: done ? colors.success : unlocked ? colors.accent : colors.surfaceTint,
                        borderWidth: unlocked && !done ? 3 : 0,
                        borderColor: colors.accentEdge,
                        shadowColor: unlocked ? colors.accent : 'transparent',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: unlocked ? 0.35 : 0,
                        shadowRadius: 5,
                        elevation: unlocked ? 4 : 0,
                      }}
                    >
                      {done ? (
                        <Check size={32} color={colors.canvas} strokeWidth={3.5} />
                      ) : unlocked ? (
                        <Icon size={28} color={colors.canvas} fill={colors.canvas} />
                      ) : (
                        <LockKeyhole size={22} color={colors.muted} />
                      )}
                    </View>

                    {/* Lesson Title */}
                    <Text
                      numberOfLines={3}
                      weight="bold"
                      className="min-h-[48px] px-1 text-center text-xs leading-[17px]"
                      style={{ color: done ? colors.success : unlocked ? colors.ink : colors.muted }}
                    >
                      {item.title}
                    </Text>

                    {/* Meta info */}
                    <Text className="mt-1 text-[11px] text-muted">
                      {done ? 'Hoàn thành' : `${item.wordCount} từ · ${item.estimatedMinutes}p`}
                    </Text>
                  </Pressable>
                </View>
              );
            }

            // Fallback for non-authenticated lessons
            const done = progress.isCompleted(lesson.id);
            const unlocked = progress.isUnlocked(index);
            const LessonIcon = LESSON_ICONS[index % LESSON_ICONS.length];

            return (
              <View key={lesson.id} className="mb-6 w-1/3 items-center px-1">
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: progress.isLoading || !unlocked }}
                  accessibilityLabel={`${done ? 'Đã hoàn thành' : unlocked ? 'Bắt đầu bài' : 'Bị khóa'}: ${lesson.title}`}
                  disabled={progress.isLoading || !unlocked}
                  onPress={() => setActiveLesson(lesson)}
                  className="items-center active:opacity-75"
                >
                  <View
                    className="mb-2.5 h-[74px] w-[74px] items-center justify-center rounded-full"
                    style={{
                      backgroundColor: done ? colors.success : unlocked ? colors.accent : colors.surfaceTint,
                      borderWidth: unlocked && !done ? 3 : 0,
                      borderColor: colors.accentEdge,
                      shadowColor: unlocked ? colors.accent : 'transparent',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: unlocked ? 0.35 : 0,
                      shadowRadius: 5,
                      elevation: unlocked ? 4 : 0,
                    }}
                  >
                    {done ? (
                      <Check size={32} color={colors.canvas} strokeWidth={3.5} />
                    ) : unlocked ? (
                      <LessonIcon size={28} color={colors.canvas} fill={colors.canvas} />
                    ) : (
                      <LockKeyhole size={22} color={colors.muted} />
                    )}
                  </View>

                  <Text
                    numberOfLines={3}
                    weight="bold"
                    className="min-h-[48px] px-1 text-center text-xs leading-[17px]"
                    style={{ color: done ? colors.success : unlocked ? colors.ink : colors.muted }}
                  >
                    {lesson.title}
                  </Text>

                  <Text className="mt-1 text-[11px] text-muted">
                    {done ? 'Hoàn thành' : 'Bài học'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      {signedIn && (units.isError || progressFailed) ? (
        <View className="mx-4 mb-4 rounded-2xl border border-line bg-surface p-3">
          <Text className="text-xs text-danger">{units.error?.message ?? serverProgress.error?.message}</Text>
          <Pressable onPress={() => { void units.refetch(); void serverProgress.refetch(); }} className="mt-1 min-h-9 justify-center">
            <Text weight="bold" className="text-xs text-accent-deep">Thử tải lại</Text>
          </Pressable>
        </View>
      ) : null}

      <TopicStudySheet
        topic={topic}
        topicPage={activeLesson?.wordPage}
        topicPageSize={activeLesson?.wordPageSize}
        setTitle={activeLesson?.title}
        visible={!signedIn && activeLesson !== null}
        onClose={() => setActiveLesson(null)}
        onComplete={() => (activeLesson ? progress.markCompleted(activeLesson.id) : undefined)}
      />

      {signedIn && activeUnit ? (
        <ServerTopicStudySheet
          key={activeUnit.unitId}
          unitId={activeUnit.unitId}
          initialMode={serverStates.get(activeUnit.unitId)?.status === 'COMPLETED' ? 'REPLAY' : 'RESUME_OR_START'}
          visible
          onClose={() => {
            setActiveUnit(null);
            void serverProgress.refetch();
          }}
        />
      ) : null}
    </View>
  );
}
