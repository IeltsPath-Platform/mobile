import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpenCheck, Clock, PenLine } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View, type ScrollViewInstance } from 'react-native';

import { BackHeader } from '@/src/components/navigation/back-header';
import { StatusBarStrip } from '@/src/components/ui/band-status-bar';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Text } from '@/src/components/ui/text';
import { safeErrorMessage } from '@/src/lib/error-message';
import { colors } from '@/src/theme';

import { getWritingSubmission, type WritingCorrection, type WritingCriterion, type WritingSubmission } from '../../api/writing';
import { Sheet } from '../../components/sheet';
import { mapKnowledgeJudgments, mapStudyPoints } from '../../model/essay-mappers';
import { correctedEssay, errorNames, markEssay, segmentAt } from '../../model/writing-result-model';
import { formatClock } from '../../model/clock';
import { loadResultContext, lowestIndex, measureEssay, roundBand } from '../../model/writing-text';
import { BandScore, SkillBand } from '../../components/skill-band';
import { leaveToCatalog } from '../../components/test-shell';
import { ExaminerResultView } from './examiner-result';
import { Card, Collapsible, CorrectionCard, DataChecksView, NextSteps, Priorities, RevisionSummary, TaskChecksView, categoryOf } from './writing-blocks';

const CATALOG = '/practice/catalog/writing';
const CRITERIA: Record<string, { name: string; meaning: string }> = {
  TA: { name: 'Task Achievement', meaning: 'Hoàn thành yêu cầu đề bài' },
  TR: { name: 'Task Response', meaning: 'Đáp ứng yêu cầu đề bài' },
  CC: { name: 'Coherence & Cohesion', meaning: 'Mạch lạc và liên kết' },
  LR: { name: 'Lexical Resource', meaning: 'Vốn từ vựng' },
  GRA: { name: 'Grammatical Range & Accuracy', meaning: 'Ngữ pháp' },
};

function comment(band: number) {
  if (band >= 7) return 'Bài viết rất tốt! Hãy giữ nhịp luyện tập để chạm band cao hơn.';
  if (band >= 6) return 'Bài viết khá tốt! Hãy sửa các lỗi được đánh dấu để lên band cao hơn.';
  if (band >= 5) return 'Bài viết đạt yêu cầu cơ bản. Tập trung vào tiêu chí thấp nhất để cải thiện nhanh.';
  return 'Bài viết còn nhiều điểm cần cải thiện. Hãy luyện từng tiêu chí một từ phần gợi ý bên dưới.';
}

/** The result of a Writing submission: AI grade, teacher review, or the state while it is still being graded. */
export function WritingResultScreen({ submissionId }: { submissionId: string }) {
  const client = useQueryClient();
  const submission = useQuery({
    queryKey: ['practice', 'writing-submission', submissionId],
    queryFn: ({ signal }) => getWritingSubmission(submissionId, signal),
    // Only GRADING moves on by itself; PAYMENT_PENDING waits for the learner to resend, so polling it would never end.
    // Polling stops after about 3 minutes: a grade stuck that long is taken over by the server on the next send.
    refetchInterval: (query) => (query.state.data?.status === 'GRADING' && query.state.dataUpdateCount < 60 ? 3000 : false),
  });
  const context = useQuery({ queryKey: ['practice', 'writing-context', submissionId], queryFn: () => loadResultContext(submissionId), staleTime: Infinity });
  const status = submission.data?.status;
  useEffect(() => {
    if (status !== 'GRADED') return;
    void client.invalidateQueries({ queryKey: ['practice', 'progress'] });
    void client.invalidateQueries({ queryKey: ['practice', 'catalog'] });
    void client.invalidateQueries({ queryKey: ['practice', 'history'] });
    // The grade took points: the balance shown elsewhere in the app is read again.
    void client.invalidateQueries({ queryKey: ['access'] });
  }, [client, status]);

  if (submission.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent} /><Text className="mt-2 text-sm text-muted">Đang tải kết quả chấm bài…</Text></View>;
  if (!submission.data) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Kết quả Writing" fallbackHref={CATALOG} />
        <EmptyState title="Chưa tải được kết quả" message={safeErrorMessage(submission.error, 'Chưa tải được kết quả. Vui lòng thử lại.')} mood="oops" action={<Button label="Thử lại" variant="secondary" onPress={() => void submission.refetch()} />} />
      </View>
    );
  }
  const data = submission.data;
  const title = context.data?.title ?? 'Bài Writing';
  if (data.status === 'AWAITING_EXAMINER') return <ExaminerResultView submission={data} submissionId={submissionId} title={title} />;
  if (data.status === 'GRADING') {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Kết quả Writing" fallbackHref={CATALOG} />
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <ActivityIndicator size="large" color={colors.accent} />
          <Text weight="extrabold" className="text-center text-lg text-ink">AI đang chấm bài viết</Text>
          <Text className="text-center text-sm text-muted">Thường mất vài chục giây. Bạn có thể rời màn hình, kết quả sẽ có trong Lịch sử làm bài.</Text>
          <Button label="Kiểm tra lại" variant="secondary" loading={submission.isRefetching} onPress={() => void submission.refetch()} />
        </View>
      </View>
    );
  }
  if (data.status !== 'GRADED') {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Kết quả Writing" fallbackHref={CATALOG} />
        <EmptyState title="Bài viết chưa có điểm" message={data.status === 'PAYMENT_PENDING'
          ? 'Bài đã được chấm nhưng chưa trừ được point nên kết quả chưa mở. Hãy kiểm tra số dư rồi gửi chấm lại bài này; point chỉ bị trừ khi bạn nhận được kết quả.'
          : 'Bài này chưa được chấm xong. Point chỉ bị trừ khi chấm thành công, bạn có thể làm lại từ danh mục Writing.'} mood="oops" action={<Button label="Về danh mục Writing" variant="secondary" onPress={() => leaveToCatalog(CATALOG)} />} />
      </View>
    );
  }
  return <Graded submission={data} submissionId={submissionId} title={title} seconds={context.data?.seconds ?? null} limit={context.data?.timeLimitSeconds ?? null} retryPath={context.data?.retryPath ?? null} />;
}

function Graded({ submission, submissionId, title, seconds, limit, retryPath }: { submission: WritingSubmission; submissionId: string; title: string; seconds: number | null; limit: number | null; retryPath: string | null }) {
  const scroll = useRef<ScrollViewInstance>(null);
  const essayY = useRef(0);
  const contentY = useRef(0);
  const [picked, setPicked] = useState<WritingCorrection | null>(null);
  const [focusAt, setFocusAt] = useState<number | null>(null);
  const criteria = submission.criteria ?? [];
  const corrections = useMemo(() => submission.corrections ?? [], [submission.corrections]);
  const groups = useMemo(() => submission.errorGroups ?? [], [submission.errorGroups]);
  const essay = submission.essayText ?? '';
  const bands = criteria.map((item) => item.band);
  const worst = bands.length ? lowestIndex(bands) : -1;
  const band = submission.overallBand ?? roundBand(bands);
  const metrics = useMemo(() => measureEssay(essay), [essay]);
  const segments = useMemo(() => markEssay(essay, corrections), [essay, corrections]);
  const names = useMemo(() => errorNames(corrections, groups), [corrections, groups]);
  const groupOf = useMemo(() => new Map(groups.map((group) => [group.errorCode, group])), [groups]);
  const corrected = useMemo(() => correctedEssay(essay, corrections), [essay, corrections]);
  const studyPoints = useMemo(() => mapStudyPoints(submission.studyPoints), [submission.studyPoints]);
  const judgments = useMemo(() => mapKnowledgeJudgments(submission.taskKnowledgePointJudgments), [submission.taskKnowledgePointJudgments]);
  const legend = [...new Map(corrections.map((item) => [categoryOf(item.category).label, categoryOf(item.category)])).values()];

  const showExcerpt = (excerpt: string) => {
    const segment = segmentAt(segments, essay, excerpt);
    if (!segment) return;
    setFocusAt(segment.start);
    scroll.current?.scrollTo({ y: Math.max(0, contentY.current + essayY.current - 12), animated: true });
  };

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <SkillBand color={colors.skill.writing} title="Kết quả Writing" subtitle={title} fallbackHref={CATALOG}>
          <BandScore
            label="Band Score · AI chấm"
            value={band.toFixed(1)}
            formula={bands.length ? `(${bands.map((value) => value.toFixed(1)).join(' + ')}) / ${bands.length} = ${(bands.reduce((a, c) => a + c, 0) / bands.length).toFixed(2)} → ${band.toFixed(1)}` : undefined}
            comment={comment(band)}
            extra={seconds !== null ? <View className="mt-2 flex-row items-center gap-1 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}><Clock size={13} color="#ffffff" /><Text weight="bold" className="text-xs" style={{ color: '#ffffff' }}>{formatClock(seconds)}{limit ? ` / ${formatClock(limit)}` : ''}</Text></View> : null}
          />
        </SkillBand>
        <View style={{ padding: 16, gap: 14 }} onLayout={(event) => { contentY.current = event.nativeEvent.layout.y; }}>

        <Card title="Điểm từng tiêu chí">
          {criteria.map((item, index) => (
            <View key={item.code} className="mt-2">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-sm text-ink">{CRITERIA[item.code]?.name ?? item.code}{index === worst ? <Text weight="bold" style={{ color: colors.danger }}>  · cần cải thiện nhất</Text> : null}</Text>
                <Text weight="extrabold" className="text-sm text-ink">{item.band.toFixed(1)}</Text>
              </View>
              <View className="mt-1" style={{ height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' }}>
                <View style={{ width: `${(item.band / 9) * 100}%`, height: 8, backgroundColor: index === worst ? colors.danger : colors.accent }} />
              </View>
            </View>
          ))}
          <Text className="mt-3 text-xs text-muted">Điểm từng tiêu chí do AI chấm (thang 0–9) theo band descriptor của IELTS.</Text>
          {submission.summary ? <Text className="mt-2 text-sm leading-5 text-ink">{submission.summary}</Text> : null}
        </Card>

        <View className="flex-row gap-3">
          <View className="flex-1"><Button label="Bài đã chấm" icon={<BookOpenCheck size={16} color={colors.onAccent} />} onPress={() => scroll.current?.scrollTo({ y: contentY.current + essayY.current, animated: true })} /></View>
          <View className="flex-1"><Button label="Viết lại" variant="secondary" icon={<PenLine size={16} color={colors.accentDeep} />} onPress={() => router.replace((retryPath ?? CATALOG) as never)} /></View>
        </View>

        <Priorities priorities={submission.priorities ?? []} onShow={showExcerpt} />
        {submission.revision ? <RevisionSummary revision={submission.revision} names={names} /> : null}

        <Card title="Số đo tự động từ bài viết">
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            <Metric label="Số từ" value={String(metrics.words)} />
            <Metric label="Số đoạn" value={String(metrics.paragraphs)} />
            <Metric label="Từ/câu" value={String(metrics.wordsPerSentence)} />
            <Metric label="Từ nối" value={String(metrics.linkingTotal)} note={metrics.linking.slice(0, 3).map((item) => `${item.word} ×${item.count}`).join(' · ') || 'chưa dùng từ nối'} />
            <Metric label="Lặp nhiều nhất" value={metrics.mostRepeated ? `${metrics.mostRepeated.word} ×${metrics.mostRepeated.count}` : '—'} note={metrics.mostRepeated ? 'nên đa dạng hóa' : 'không đáng kể'} />
          </View>
        </Card>

        <Collapsible title="Chi tiết theo từng tiêu chí" count={criteria.length}>
          <View className="gap-3">{criteria.map((item, index) => <CriterionDetail key={item.code} item={item} worst={index === worst} limits={(submission.bandLimits ?? []).filter((limit) => limit.criterion === item.code).map((limit) => limit.message)} />)}</View>
        </Collapsible>

        {submission.dataChecks ? <DataChecksView checks={submission.dataChecks} onShow={showExcerpt} /> : null}
        {submission.taskChecks ? <TaskChecksView checks={submission.taskChecks} onShow={showExcerpt} /> : null}

        <View onLayout={(event) => { essayY.current = event.nativeEvent.layout.y; }}>
          <Card title="Bài viết đã được đánh dấu">
            {legend.length ? (
              <View className="mb-2 flex-row flex-wrap gap-1.5">
                {legend.map((look) => <View key={look.label} className="rounded-full px-2 py-0.5" style={{ backgroundColor: look.soft }}><Text weight="bold" className="text-[11px]" style={{ color: look.color }}>{look.label}</Text></View>)}
              </View>
            ) : null}
            {corrections.length ? <Text className="mb-2 text-xs text-muted">Chạm vào chỗ được tô màu để xem lỗi và cách sửa.</Text> : null}
            {essay ? (
              <Text className="text-base leading-7 text-ink">
                {segments.map((segment) => {
                  if (!segment.correction) return <Text key={segment.start} style={focusAt === segment.start ? { backgroundColor: colors.accentSoft } : undefined}>{segment.text}</Text>;
                  const look = categoryOf(segment.correction.category);
                  const correction = segment.correction;
                  return (
                    <Text key={segment.start} suppressHighlighting onPress={() => setPicked(correction)} style={{ backgroundColor: focusAt === segment.start ? colors.accentSoft : look.soft, color: look.color, textDecorationLine: 'underline', textDecorationStyle: correction.certainty === 'SUGGESTION' ? 'dotted' : 'solid' }}>
                      {segment.text}
                    </Text>
                  );
                })}
              </Text>
            ) : <Text className="text-sm text-muted">Không còn bản bài viết để hiển thị.</Text>}
          </Card>
        </View>

        {corrections.length ? (
          <Collapsible title="Các lỗi cần sửa" count={corrections.length} initiallyOpen>
            <View className="gap-2">{corrections.map((item, index) => <CorrectionCard key={`${item.excerpt}-${index}`} item={item} group={item.errorCode ? groupOf.get(item.errorCode) : undefined} />)}</View>
          </Collapsible>
        ) : null}

        {corrected.some((segment) => segment.changed) ? (
          <Collapsible title="Đọc bản đã sửa">
            <Text className="text-base leading-7 text-ink">
              {corrected.map((segment, index) => <Text key={index} style={segment.changed ? { color: colors.success, textDecorationLine: 'underline', fontWeight: '700' } : undefined}>{segment.text}</Text>)}
            </Text>
          </Collapsible>
        ) : null}

        <NextSteps points={studyPoints} judgments={judgments} submissionId={submissionId} />

        {submission.sampleAnswer ? (
          <Collapsible title="Xem bài mẫu">
            <Text className="text-base leading-7 text-ink">{submission.sampleAnswer.replace(/\*\*/g, '')}</Text>
          </Collapsible>
        ) : null}
        </View>
      </ScrollView>
      <StatusBarStrip color={colors.skill.writing} />

      <Sheet visible={picked !== null} onClose={() => setPicked(null)} title="Lỗi trong bài">
        {picked ? <CorrectionCard item={picked} group={picked.errorCode ? groupOf.get(picked.errorCode) : undefined} /> : null}
      </Sheet>
    </View>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View className="rounded-2xl bg-canvas px-3 py-2" style={{ minWidth: '30%', flexGrow: 1 }}>
      <Text className="text-xs text-muted">{label}</Text>
      <Text weight="extrabold" className="text-base text-ink">{value}</Text>
      {note ? <Text numberOfLines={2} className="text-[11px] text-muted">{note}</Text> : null}
    </View>
  );
}

function CriterionDetail({ item, worst, limits }: { item: WritingCriterion; worst: boolean; limits: string[] }) {
  const info = CRITERIA[item.code] ?? { name: item.code, meaning: '' };
  return (
    <View className="rounded-2xl p-3" style={{ backgroundColor: colors.canvas, borderWidth: worst ? 2 : 0, borderColor: colors.danger }}>
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: worst ? colors.danger : colors.accent }}><Text weight="black" style={{ color: colors.onAccent }}>{item.band.toFixed(1)}</Text></View>
        <View className="flex-1">
          <Text weight="extrabold" className="text-sm text-ink">{info.name}</Text>
          <Text className="text-xs text-muted">{info.meaning} · band ước tính</Text>
        </View>
      </View>
      {limits.map((message) => <Text key={message} className="mt-2 text-sm" style={{ color: colors.accentWarm }}>{message}</Text>)}
      {item.strengths.map((text) => <Text key={text} className="mt-2 text-sm leading-5 text-ink"><Text weight="bold" style={{ color: colors.success }}>✓ Làm tốt: </Text>{text}</Text>)}
      {item.improvements.map((text) => <Text key={text} className="mt-2 text-sm leading-5 text-ink"><Text weight="bold" style={{ color: colors.accentWarm }}>△ Cần cải thiện: </Text>{text}</Text>)}
      {item.evidence?.map((text) => <Text key={text} className="mt-2 text-sm italic leading-5 text-ink"><Text weight="bold">Dẫn chứng: </Text>“{text}”</Text>)}
      {item.descriptor ? <Text className="mt-2 text-xs leading-4 text-muted"><Text weight="bold">Mô tả band này: </Text>{item.descriptor}</Text> : null}
      {item.nextBand ? <Text className="mt-2 text-sm leading-5" style={{ color: colors.accentDeep }}><Text weight="bold">Để lên band {item.nextBand.band.toFixed(1)}: </Text>{item.nextBand.descriptor}</Text> : null}
    </View>
  );
}
