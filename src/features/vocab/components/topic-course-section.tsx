import { useQuery } from '@tanstack/react-query';
import { BookOpen, BookOpenCheck, GraduationCap, Play } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import type { VocabularyTopic } from '@/src/features/vocab/api';
import { LessonNode, TopicBanner } from '@/src/features/vocab/components/topic-course-parts';
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
  const serverUnits = serverProgress.data?.units;
  const serverStates = useMemo(() => new Map((serverUnits ?? []).map((item) => [item.unitId, item])), [serverUnits]);
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
      <TopicBanner
        cover={cover}
        title={topic.nameVi || topic.name}
        subtitle={`${lessonCountLabel} · ${topic.wordCount} từ vựng`}
      />

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

      <View className="px-3 pb-3 pt-5">
        {signedIn && units.isPending ? <ActivityIndicator className="py-6" color={colors.accent} /> : null}
        {signedIn && units.isSuccess && items.length === 0 ? (
          <Text className="mb-4 text-center text-sm text-muted">Chủ đề chưa có bài học được xuất bản.</Text>
        ) : null}

        <View className="-mx-1 flex-row flex-wrap">
          {items.map((lesson, index) => {
            const icon = LESSON_ICONS[index % LESSON_ICONS.length];
            if ('unitId' in lesson) {
              const state = serverStates.get(lesson.unitId);
              const done = state?.status === 'COMPLETED';
              const unlocked =
                !progressFailed && (done || state?.status === 'AVAILABLE' || state?.status === 'IN_PROGRESS');
              return (
                <LessonNode
                  key={lesson.unitId}
                  title={lesson.title}
                  meta={done ? 'Hoàn thành' : `${lesson.wordCount} từ · ${lesson.estimatedMinutes}p`}
                  icon={icon}
                  done={done}
                  unlocked={unlocked}
                  disabled={serverProgress.isPending || !unlocked}
                  onPress={() => setActiveUnit(lesson)}
                />
              );
            }

            const done = progress.isCompleted(lesson.id);
            const unlocked = progress.isUnlocked(index);
            return (
              <LessonNode
                key={lesson.id}
                title={lesson.title}
                meta={done ? 'Hoàn thành' : 'Bài học'}
                icon={icon}
                done={done}
                unlocked={unlocked}
                disabled={progress.isLoading || !unlocked}
                onPress={() => setActiveLesson(lesson)}
              />
            );
          })}
        </View>
      </View>

      {signedIn && (units.isError || progressFailed) ? (
        <View className="mx-4 mb-4 rounded-2xl border border-line bg-surface p-3">
          <Text className="text-xs text-danger">{units.error?.message ?? serverProgress.error?.message}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Thử tải lại" onPress={() => { void units.refetch(); void serverProgress.refetch(); }} className="mt-1 min-h-11 justify-center">
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
