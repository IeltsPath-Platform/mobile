import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Check, ExternalLink, Hourglass } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Text } from '@/src/components/ui/text';
import { colors, lightColors } from '@/src/theme';

import { getApprovedErrorTypes, errorTypesByCode, type LearnerErrorType } from '../../api/examiner-reviews';
import { getExaminer, getHumanReview, readStudyPoints, type ExaminerStudyPoint, type HumanReview } from '../../api/examiners';
import { findJobOfReview, type MyGradingJob } from '../../api/grading-jobs';
import { WEB_APP_URL, openOnWeb, practiseKnowledgePointOnWeb } from '../../api/learning-links';
import type { WritingSubmission } from '../../api/writing';
import { Sheet } from '../../components/sheet';
import { BandScore, SkillBand } from '../../components/skill-band';
import { ExaminerAvatar } from '../../grading/grading-sheets';
import { LateExaminerNotice } from '../../grading/late-examiner-notice';
import { CRITERION_NAME } from '../../model/essay-criteria';
import { certificateText } from '../../model/examiner-labels';
import { dateTimeText } from '../../model/examiner-reviews-view';
import { criterionName, markByOffsets, shownMarks } from '../../model/review-marks';
import { Card } from './writing-blocks';

const POLL_MS = 60_000;
const CATALOG = '/practice/catalog/writing';
const SHORT_NAME: Record<string, string> = { taskResponse: 'TR', coherence: 'CC', lexical: 'LR', grammar: 'GRA' };
const tidy = (text: string) => text.trim().replace(/\n\s*\n+/g, '\n');

/** An essay sent to a teacher: who grades it, the way to the review, and the review itself once it is done. */
export function ExaminerResultView({ submission, submissionId, title }: { submission: WritingSubmission; submissionId: string; title: string }) {
  const client = useQueryClient();
  const review = useQuery({
    queryKey: ['practice', 'human-review', submissionId],
    queryFn: ({ signal }) => getHumanReview(submissionId, signal),
    refetchInterval: (query) => (query.state.data && query.state.data.status !== 'PENDING' ? false : POLL_MS),
  });
  const done = review.data?.status === 'DONE';
  const cancelled = review.data?.status === 'CANCELLED';
  const examinerId = review.data?.examinerId ?? null;
  const reviewId = review.data?.reviewSubmissionId ?? null;
  const profile = useQuery({ queryKey: ['practice', 'examiner', examinerId], queryFn: ({ signal }) => getExaminer(examinerId!, signal).catch(() => null), enabled: Boolean(examinerId) });
  const job = useQuery({ queryKey: ['practice', 'job-of-review', reviewId], queryFn: ({ signal }) => findJobOfReview(reviewId!, signal).catch(() => null), enabled: Boolean(reviewId), refetchInterval: done || cancelled ? false : POLL_MS });
  const catalogue = useQuery({ queryKey: ['practice', 'error-types'], queryFn: ({ signal }) => getApprovedErrorTypes(signal).catch(() => []), enabled: done, staleTime: 600_000 });
  const types = useMemo(() => errorTypesByCode(catalogue.data), [catalogue.data]);
  const essay = submission.essayText ?? '';

  const refresh = () => {
    void review.refetch();
    void job.refetch();
    // A change or cancel decides whether the prompt still shows "đang chờ giáo viên chấm" on the writing screen.
    void client.invalidateQueries({ queryKey: ['practice', 'writing-pending'] });
    void client.invalidateQueries({ queryKey: ['practice', 'grading-jobs'] });
  };

  if (review.isError) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Kết quả Writing" fallbackHref={CATALOG} />
        <EmptyState title="Chưa tải được bài chấm" message={review.error.message} mood="oops" action={<Button label="Thử lại" variant="secondary" onPress={refresh} />} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerStyle={{ paddingBottom: 40 }}>
      <SkillBand color={colors.skill.writing} title="Giáo viên chấm" subtitle={title} fallbackHref={CATALOG}>
        {done && review.data ? <TeacherBand review={review.data} /> : null}
      </SkillBand>
      <View style={{ padding: 16, gap: 14 }}>
        {profile.data ? (
          <View className="flex-row items-center gap-3 rounded-3xl bg-surface p-4" style={{ borderWidth: 2, borderColor: colors.line }}>
            <ExaminerAvatar examiner={profile.data} size={52} />
            <View className="flex-1">
              <Text weight="extrabold" className="text-base text-ink">{profile.data.displayName}</Text>
              {profile.data.ieltsBand != null ? <Text weight="bold" className="text-xs" style={{ color: colors.accentDeep }}>IELTS {profile.data.ieltsBand.toFixed(1)}</Text> : null}
              {profile.data.certificates.length ? <Text className="text-xs text-muted">{profile.data.certificates.map(certificateText).join(' · ')}</Text> : null}
            </View>
          </View>
        ) : null}
        {!done && !cancelled && job.data ? <LateExaminerNotice job={job.data} examinerName={profile.data?.displayName} onChanged={refresh} /> : null}
        {review.isPending ? <Text className="text-sm text-muted">Đang tải…</Text> : done && review.data ? (
          <Done review={review.data} essay={essay} types={types} />
        ) : (
          <>
            {cancelled ? <Cancelled /> : <Waiting job={job.data ?? null} />}
            <Card title={`Bài viết của bạn${essay.trim() ? ` · ${essay.trim().split(/\s+/).length} từ` : ''}`}>
              <Text className="text-base leading-7 text-ink">{essay}</Text>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}

/** The teacher's overall band and the four criteria, in the skill band at the top. */
function TeacherBand({ review }: { review: HumanReview }) {
  const criteria = review.criteria ?? [];
  return (
    <BandScore
      label="Band tổng · Giáo viên chấm"
      value={(review.band ?? 0).toFixed(1)}
      extra={criteria.length ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {criteria.map((item) => (
            <View key={item.criterion} accessibilityLabel={`${criterionName(item.criterion)} ${item.band.toFixed(1)}`} className="rounded-2xl px-3 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
              <Text className="text-[11px]" style={{ color: 'rgba(255,255,255,0.85)' }}>{SHORT_NAME[item.criterion] ?? criterionName(item.criterion)}</Text>
              <Text weight="extrabold" className="text-base" style={{ color: '#ffffff' }}>{item.band.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    />
  );
}

function Waiting({ job }: { job: MyGradingJob | null }) {
  const overdue = job?.state === 'OVERDUE';
  const deadline = dateTimeText(job?.deadline);
  const steps = [
    { state: 'done', title: 'Đã gửi bài', note: dateTimeText(job?.requestedAt) },
    { state: 'current', title: 'Giáo viên đang chấm', note: overdue ? 'Đã quá hạn 48 giờ' : deadline ? `Hạn chấm: ${deadline}` : 'Tối đa 48 giờ' },
    { state: 'next', title: 'Có kết quả', note: 'Hiện ngay tại màn hình này' },
  ] as const;
  return (
    <Card title="Tiến trình chấm bài">
      {steps.map((step, index) => (
        <View key={step.title} className="flex-row gap-3">
          <View className="items-center">
            <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: step.state === 'done' ? colors.success : step.state === 'current' ? colors.accentWarm : colors.line }}>
              {step.state === 'done' ? <Check size={14} color={colors.onAccent} /> : step.state === 'current' ? <Hourglass size={13} color={colors.onAccent} /> : null}
            </View>
            {index < steps.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: colors.line }} /> : null}
          </View>
          <View className="flex-1 pb-3">
            <Text weight="bold" className="text-sm text-ink">{step.title}</Text>
            {step.note ? <Text className="text-xs text-muted">{step.note}</Text> : null}
          </View>
        </View>
      ))}
    </Card>
  );
}

function Cancelled() {
  return (
    <Card>
      <View className="flex-row items-center gap-2"><Ban size={18} color={colors.danger} /><Text weight="extrabold" className="text-base text-ink">Đã hủy yêu cầu chấm bài</Text></View>
      <Text className="mt-2 text-sm leading-5 text-ink">Giáo viên sẽ không chấm bài này nữa. Lượt giáo viên chấm của bạn đã được hoàn lại, bạn có thể viết lại hoặc gửi bài này cho một giáo viên khác.</Text>
    </Card>
  );
}

function Done({ review, essay, types }: { review: HumanReview; essay: string; types: ReadonlyMap<string, LearnerErrorType> }) {
  const [active, setActive] = useState<number | null>(null);
  const criteria = review.criteria ?? [];
  const segments = useMemo(() => markByOffsets(essay, review.annotations ?? []), [essay, review.annotations]);
  const marks = shownMarks(segments);
  const codes = [...new Set([...(review.errorCodes ?? []), ...(review.annotations ?? []).flatMap((item) => (item.errorCode ? [item.errorCode] : []))])];
  const explained = codes.map((code) => types.get(code)).filter((type): type is LearnerErrorType => type !== undefined);
  const nameOf = (code: string) => types.get(code)?.name ?? code;
  const activeMark = marks.find((mark) => mark.number === active) ?? null;

  return (
    <>
      <Card title={`Bài viết của bạn${marks.length ? ' đã được giáo viên đánh dấu' : ''}`}>
        {marks.length ? <Text className="mb-2 text-xs text-muted">Chạm vào chỗ được tô màu để xem lỗi và cách sửa.</Text> : null}
        <Text className="text-base leading-7 text-ink">
          {segments.map((segment, index) => segment.annotation ? (
            <Text key={index} suppressHighlighting onPress={() => setActive(segment.number ?? null)} style={segment.number === active ? { backgroundColor: colors.xp, color: lightColors.ink, textDecorationLine: 'underline' } : { backgroundColor: colors.warmSoft, textDecorationLine: 'underline' }}>
              {segment.text}<Text weight="bold" className="text-[10px]" style={{ color: colors.accentWarm }}> {segment.number}</Text>
            </Text>
          ) : <Text key={index}>{segment.text}</Text>)}
        </Text>
      </Card>

      {marks.length ? (
        <Card title={`Các lỗi cần sửa (${marks.length})`}>
          {marks.map(({ annotation, number }) => (
            <Pressable key={number} onPress={() => setActive(number)} accessibilityRole="button" className="mt-2 rounded-2xl p-3" style={{ backgroundColor: number === active ? colors.warmSoft : colors.canvas }}>
              <Text className="text-sm text-ink">
                <Text weight="black" style={{ color: colors.accentWarm }}>{number}. </Text>
                {annotation.errorCode ? <Text weight="bold">[{nameOf(annotation.errorCode)}] </Text> : null}
                <Text weight="bold">{annotation.excerpt}</Text>{annotation.suggestion ? ` → ${annotation.suggestion}` : ''}
              </Text>
              {annotation.errorCode && types.get(annotation.errorCode)?.fixHint ? <Text className="mt-1 text-xs text-muted">Cách sửa: {types.get(annotation.errorCode)?.fixHint}</Text> : null}
            </Pressable>
          ))}
        </Card>
      ) : <Text className="text-sm text-muted">Giáo viên không đánh dấu lỗi cụ thể trong bài này.</Text>}

      {explained.length ? (
        <Card title="Các loại lỗi trong bài">
          {explained.map((type) => <View key={type.code} className="mt-2"><Text weight="bold" className="text-sm text-ink">{type.name}</Text>{type.fixHint ? <Text className="text-sm text-muted">{type.fixHint}</Text> : null}</View>)}
        </Card>
      ) : null}

      <Card title="Nhận xét của giáo viên">
        {review.feedback ? <><Text weight="bold" className="text-sm text-ink">Nhận xét chung</Text><Text className="mt-1 text-sm leading-5 text-ink">{tidy(review.feedback)}</Text></> : null}
        <Text weight="bold" className="mt-3 text-sm text-ink">Nhận xét theo từng tiêu chí</Text>
        {criteria.map((item) => (
          <View key={item.criterion} className="mt-2 rounded-2xl p-3" style={{ backgroundColor: colors.canvas }}>
            <View className="flex-row items-center justify-between"><Text weight="bold" className="flex-1 text-sm text-ink">{criterionName(item.criterion)}</Text><Text weight="extrabold" className="text-sm text-ink">{item.band.toFixed(1)}</Text></View>
            <View className="mt-1" style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}><View style={{ width: `${(item.band / 9) * 100}%`, height: 6, backgroundColor: colors.accent }} /></View>
            {item.comment ? <Text className="mt-2 text-sm leading-5 text-ink">{tidy(item.comment)}</Text> : null}
          </View>
        ))}
        {(review.errorCodes ?? []).length ? <Text className="mt-3 text-xs text-muted">Các loại lỗi giáo viên ghi nhận: {(review.errorCodes ?? []).map(nameOf).join(', ')}</Text> : null}
      </Card>

      <StudyPoints points={readStudyPoints(review.studyPoints)} />

      <Sheet visible={activeMark !== null} onClose={() => setActive(null)} title={activeMark ? `Lỗi số ${activeMark.number}` : undefined}>
        {activeMark ? (
          <View>
            {activeMark.annotation.errorCode ? <Text weight="bold" className="text-sm" style={{ color: colors.accentWarm }}>{nameOf(activeMark.annotation.errorCode)}</Text> : null}
            <Text className="mt-1 text-base text-ink"><Text weight="bold" style={{ color: colors.danger }}>{activeMark.annotation.excerpt}</Text>{activeMark.annotation.suggestion ? <>  →  <Text weight="bold" style={{ color: colors.success }}>{activeMark.annotation.suggestion}</Text></> : null}</Text>
            {activeMark.annotation.errorCode && types.get(activeMark.annotation.errorCode)?.fixHint ? <Text className="mt-2 text-sm leading-5 text-ink">Cách sửa: {types.get(activeMark.annotation.errorCode)?.fixHint}</Text> : null}
          </View>
        ) : null}
      </Sheet>
    </>
  );
}

/** What to study after the examiner's grade; each point opens its review or practice on the website. */
function StudyPoints({ points }: { points: ExaminerStudyPoint[] }) {
  if (!points.length) return null;
  return (
    <Card title="Cần ôn">
      {points.map((point, index) => {
        const title = point.name ?? point.code ?? CRITERION_NAME[point.criterionCode ?? ''] ?? point.criterionCode ?? 'Kiến thức cần học';
        const detail = point.kind === 'ERROR_CODE' ? `Lỗi giáo viên đánh dấu ×${point.count ?? 1}` : `${CRITERION_NAME[point.criterionCode ?? ''] ?? point.criterionCode ?? 'Tiêu chí'}${point.band != null ? ` · band ${point.band.toFixed(1)}` : ''}`;
        const target = point.practiceKnowledgePointId ?? point.knowledgePointId;
        const open = async () => {
          try {
            if (point.reviewItemId) await openOnWeb(`/learn/reviews/${point.reviewItemId}`);
            else if (target) await practiseKnowledgePointOnWeb(target);
          } catch (cause) { Alert.alert('Chưa mở được bài ôn', cause instanceof Error ? cause.message : 'Hãy thử lại sau.'); }
        };
        return (
          <View key={`${point.kind}-${point.knowledgePointId ?? index}`} className="mt-2 rounded-2xl p-3" style={{ backgroundColor: colors.canvas }}>
            <Text weight="bold" className="text-sm text-ink">{title}</Text>
            <Text className="text-xs text-muted">{detail}</Text>
            {WEB_APP_URL && (point.reviewItemId || target) ? (
              <Pressable onPress={() => void open()} accessibilityRole="link" className="mt-2 min-h-10 flex-row items-center gap-1.5 self-start rounded-full px-3" style={{ backgroundColor: colors.accentSoft }}>
                <ExternalLink size={14} color={colors.accentDeep} />
                <Text weight="bold" className="text-sm" style={{ color: colors.accentDeep }}>{point.reviewItemId ? 'Ôn tập (web)' : 'Luyện (web)'}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}
