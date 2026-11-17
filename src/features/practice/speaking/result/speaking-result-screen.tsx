import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info, Mic, Quote, TrendingUp } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { ApiError } from '@/src/lib/api-client';
import { colors } from '@/src/theme';
import { refreshLearningProgressSoon } from '@/src/features/progress/learning-progress-api';

import { getSpeakingSubmission, settleSpeakingSubmission, type SpeakingSubmission } from '../../api/speaking';
import { ActivateKeySheet, PremiumPlansSheet } from '../../grading/grading-sheets';
import type { ActivationProduct } from '../../grading/products';
import { useWallet } from '../../grading/use-wallet';
import { averageBand, bandComment, errorLabel, groupErrors, parseSpeakingResult, summaryLine, toneOf, weakestCriteria, weakestWord, type ResultCriterion, type ResultWord, type SpeakingResultView } from '../../model/speaking-result-view';
import { BandIcon, BandScore, SkillBand } from '../../components/skill-band';
import { Card } from '../../writing/result/writing-blocks';

const CATALOG = '/practice/catalog/speaking';
const WORKING = new Set(['UPLOADING', 'QUEUED', 'ANALYZING', 'GRADING', 'PAYMENT_PENDING', 'FAILED_RETRYABLE']);
const TERMINAL = new Set(['GRADED', 'NEEDS_EXAMINER', 'ABANDONED']);
const POLL_STEPS_MS = [4000, 4000, 4000, 4000, 4000, 8000, 8000, 8000, 15000];
const TONE_COLOR = { good: '#2f9e44', fair: '#e6a321', weak: '#e03131', none: '#8a94a6' } as const;
const TONE_NAME = { good: 'tốt', fair: 'tạm ổn', weak: 'cần luyện', none: 'chưa có điểm' } as const;
const fmt = (band: number | null) => (band === null ? '—' : band.toFixed(1));
const score = (value: number | null) => (value === null ? '—' : value.toFixed(0));

/**
 * Follows a Speaking submission until it ends. When the grade waits for its payment the screen releases it itself
 * (settle), as the confirm step said; a 402 then means the balance fell short and polling stops until the learner retries.
 */
function useSpeakingResult(submissionId: string) {
  const polls = useRef(0);
  const [short, setShort] = useState(false);
  const [settleError, setSettleError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const settling = useRef(false);
  const query = useQuery({
    queryKey: ['practice', 'speaking-submission', submissionId],
    // Counted per request: refetchInterval is also read on every render, so it must not move the back-off itself.
    queryFn: ({ signal }) => { polls.current += 1; return getSpeakingSubmission(submissionId, signal); },
    refetchInterval: (state) => {
      const status = state.state.data?.status;
      if (!status || TERMINAL.has(status) || short) return false;
      return POLL_STEPS_MS[Math.min(Math.max(0, polls.current - 1), POLL_STEPS_MS.length - 1)]!;
    },
  });
  const status = query.data?.status;
  const { refetch } = query;
  useEffect(() => {
    if (status !== 'PAYMENT_PENDING' || short || settling.current) return;
    settling.current = true;
    settleSpeakingSubmission(submissionId)
      .then(() => { setSettleError(''); void refetch(); })
      .catch((cause) => {
        if (cause instanceof ApiError && cause.status === 402) setShort(true);
        else setSettleError(cause instanceof Error ? cause.message : 'Chưa hoàn tất được kết quả. Hãy thử lại.');
      })
      .finally(() => { settling.current = false; });
  }, [status, short, submissionId, refetch, retryCount]);
  return { query, short, settleError, retry: () => { setShort(false); setSettleError(''); setRetryCount((count) => count + 1); polls.current = 0; void refetch(); } };
}

export function SpeakingResultScreen({ submissionId }: { submissionId: string }) {
  const client = useQueryClient();
  const { query, short, settleError, retry } = useSpeakingResult(submissionId);
  const submission: SpeakingSubmission | undefined = query.data;
  const status = submission?.status;
  useEffect(() => {
    if (status !== 'GRADED') return;
    refreshLearningProgressSoon(client);
    void client.invalidateQueries({ queryKey: ['practice', 'progress'] });
    void client.invalidateQueries({ queryKey: ['practice', 'catalog'] });
  }, [client, status]);
  const view = status === 'GRADED' && submission?.result ? parseSpeakingResult(submission.result) : null;
  const working = status !== undefined && WORKING.has(status);
  const error = (query.error?.message ?? '') || settleError;

  return (
    <View className="flex-1 bg-canvas">
      <SkillBand color={colors.skill.speaking} title="Kết quả Speaking" subtitle={view ? 'Đã chấm xong' : query.isPending || working ? 'AI đang chấm bài nói' : 'Bài luyện Speaking'} onBack={() => router.replace(CATALOG as never)} right={<BandIcon><Mic size={22} color={colors.skill.speaking} /></BandIcon>} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        {query.isPending ? <Waiting status={undefined} /> : null}
        {working && !short ? <Waiting status={status} /> : null}
        {short ? <Notice tone="warn" title="Chưa nhận được kết quả" text="Số dư point hiện tại chưa đủ để nhận kết quả bài này. Bài chấm của bạn được giữ lại, bạn nạp thêm point rồi thử lại nhé." action={<Button label="Thử lại" variant="secondary" onPress={retry} />} /> : null}
        {status === 'NEEDS_EXAMINER' ? <Notice tone="stop" title="Hệ thống chấm đang lỗi" text="Hệ thống chấm đang lỗi, vui lòng thử lại sau. Bạn không bị trừ point." /> : null}
        {status === 'ABANDONED' ? <Notice tone="stop" title="Bài nộp đã dừng" text="Bài này chưa được gửi đủ bản ghi nên đã dừng. Bạn có thể ghi âm và gửi lại." /> : null}
        {error ? <Notice tone="stop" title="Có lỗi xảy ra" text={error} action={<Button label="Tải lại" variant="secondary" onPress={retry} />} /> : null}
        {view ? <ResultDetail view={view} /> : null}
        <Button label="Về danh mục Speaking" variant="ghost" onPress={() => router.replace(CATALOG as never)} />
      </ScrollView>
    </View>
  );
}

const STEPS = [
  { label: 'Đã nhận bài', hint: 'Bản ghi của bạn đã vào hàng chờ.' },
  { label: 'Phân tích giọng nói', hint: 'Đang chép lời và đo phát âm từng từ, từng âm.' },
  { label: 'Chấm bài', hint: 'AI đang đọc bài nói và chấm theo từng tiêu chí.' },
  { label: 'Hoàn tất kết quả', hint: 'Kết quả sắp hiện ra.' },
];
const STAGE_OF: Record<string, number> = { UPLOADING: 0, QUEUED: 0, ANALYZING: 1, GRADING: 2, PAYMENT_PENDING: 3, FAILED_RETRYABLE: 2 };

function Waiting({ status }: { status: string | undefined }) {
  const [opened] = useState(Date.now);
  const [, tick] = useState(0);
  useEffect(() => { const timer = setInterval(() => tick((value) => value + 1), 5000); return () => clearInterval(timer); }, []);
  const waited = (Date.now() - opened) / 1000;
  const stage = status === undefined ? 0 : STAGE_OF[status] ?? 0;
  const retrying = status === 'FAILED_RETRYABLE';
  const note = waited >= 120 ? 'Vẫn đang chấm, bài nói dài có thể mất vài phút · bạn không cần gửi lại.' : waited >= 30 ? 'Bài nói dài hoặc hệ thống đang đông nên cần thêm thời gian.' : 'Thời gian chấm tùy độ dài bài nói · kết quả sẽ tự hiện ra.';
  return (
    <Card>
      <View className="flex-row items-center gap-3">
        <ActivityIndicator color={colors.accent} />
        <Text weight="extrabold" className="flex-1 text-base text-ink">{retrying ? 'Đang thử chấm lại' : status === undefined ? 'Đang tải kết quả' : ['Đang chờ tới lượt chấm', 'Đang phân tích giọng nói', 'Đang chấm bài', 'Đang hoàn tất kết quả'][stage]}</Text>
      </View>
      <Text className="mt-2 text-sm text-muted">{retrying ? 'Lần chấm trước chưa thành công, hệ thống tự thử lại. Bạn không bị trừ point.' : STEPS[stage]!.hint}</Text>
      <View className="mt-3 gap-2">
        {STEPS.map((step, index) => (
          <View key={step.label} className="flex-row items-center gap-2">
            <View className="h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: index < stage ? colors.success : index === stage ? colors.accent : colors.line }}>
              {index < stage ? <CheckCircle2 size={13} color="#ffffff" /> : null}
            </View>
            <Text weight={index === stage ? 'bold' : 'regular'} className="text-sm" style={{ color: index <= stage ? colors.ink : colors.muted }}>{step.label}</Text>
          </View>
        ))}
      </View>
      <Text className="mt-3 text-xs text-muted">{note} Bạn có thể rời màn hình, kết quả sẽ có trong Lịch sử làm bài.</Text>
    </Card>
  );
}

function Notice({ tone, title, text, action }: { tone: 'warn' | 'stop'; title: string; text: string; action?: React.ReactNode }) {
  return (
    <View className="gap-2 rounded-3xl p-4" style={{ backgroundColor: tone === 'warn' ? colors.warmSoft : colors.dangerSoft }}>
      <View className="flex-row items-center gap-2"><AlertTriangle size={18} color={tone === 'warn' ? colors.accentWarm : colors.danger} /><Text weight="extrabold" className="text-base text-ink">{title}</Text></View>
      <Text className="text-sm leading-5 text-ink">{text}</Text>
      {action}
    </View>
  );
}

function ResultDetail({ view }: { view: SpeakingResultView }) {
  const wallet = useWallet();
  const [plansOpen, setPlansOpen] = useState(false);
  const [product, setProduct] = useState<ActivationProduct | null>(null);
  const shown = view.overallBand ?? averageBand(view.criteria);
  const worst = weakestCriteria(view.criteria);
  return (
    <>
      <View className="flex-row gap-2 rounded-3xl p-4" style={{ backgroundColor: colors.canvas, borderWidth: 2, borderColor: colors.line }}>
        <Info size={16} color={colors.accentDeep} />
        <View className="flex-1">
          <Text className="text-sm leading-5 text-ink"><Text weight="bold">Điểm do AI chấm chỉ mang tính tham khảo.</Text>{view.transcriptWarning ? ' Lần ghi âm này khó nhận dạng nên độ chính xác có thể thấp hơn.' : ''} Muốn nhận xét chính xác hơn, hãy dùng gói Premium để được giáo viên chấm.</Text>
          <Pressable onPress={() => setPlansOpen(true)} accessibilityRole="button" className="mt-1 self-start py-1"><Text weight="bold" className="text-sm" style={{ color: colors.accentDeep }}>Xem gói Premium ›</Text></Pressable>
        </View>
      </View>
      {view.bandLimits.length ? <View className="rounded-3xl p-4" style={{ backgroundColor: colors.warmSoft }}>{view.bandLimits.map((message) => <Text key={message} className="text-sm leading-5 text-ink">• {message}</Text>)}</View> : null}

      <View className="overflow-hidden rounded-3xl pb-5" style={{ backgroundColor: colors.skill.speaking }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -40, top: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: '#ffffff', opacity: 0.12 }} />
        <BandScore
          label={view.label}
          value={fmt(shown)}
          formula={view.overallBand !== null ? 'Band tổng' : 'Trung bình các tiêu chí (band tổng hiện khi đủ ba part)'}
          comment={shown !== null ? bandComment(shown) : undefined}
        />
      </View>

      <Card title="Điểm từng tiêu chí" right={<Text className="text-xs text-muted">Thang 0–9</Text>}>
        {view.criteria.map((item) => {
          const weak = worst.some((entry) => entry.code === item.code);
          return (
            <View key={item.code} className="mt-2">
              <View className="flex-row justify-between"><Text className="flex-1 text-sm text-ink">{item.name}{weak ? <Text weight="bold" style={{ color: colors.danger }}>  · cần cải thiện nhất</Text> : null}</Text><Text weight="extrabold" className="text-sm text-ink">{fmt(item.band)}</Text></View>
              <View className="mt-1" style={{ height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' }}><View style={{ width: `${((item.band ?? 0) / 9) * 100}%`, height: 8, backgroundColor: weak ? colors.danger : colors.skill.speaking }} /></View>
            </View>
          );
        })}
        {view.summary ? <Text className="mt-3 text-sm leading-5 text-ink">{view.summary}</Text> : null}
      </Card>

      {view.focus.length || view.personalNote || view.studyPlan.length ? (
        <Card title="Nên làm gì tiếp theo">
          {view.personalNote ? <Text className="text-sm leading-5 text-ink">{view.personalNote}</Text> : null}
          {view.focus.length ? <><Text weight="bold" className="mt-3 text-sm text-ink">Trọng tâm cải thiện</Text>{view.focus.map((item, index) => <Text key={index} className="mt-1 text-sm leading-5 text-ink">• {item}</Text>)}</> : null}
          {view.studyPlan.length ? <><Text weight="bold" className="mt-3 text-sm text-ink">Kế hoạch luyện tập</Text>{view.studyPlan.map((item, index) => <Text key={index} className="mt-1 text-sm leading-5 text-ink">{index + 1}. {item}</Text>)}</> : null}
        </Card>
      ) : null}

      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        <Tile label="Từ / phút" value={view.metrics.wordsPerMinute ? view.metrics.wordsPerMinute.toFixed(0) : '—'} />
        <Tile label="Quãng ngắt dài" value={view.metrics.longPauses === null ? '—' : String(view.metrics.longPauses)} />
        <Tile label="Chính xác" value={score(view.metrics.accuracy)} />
        <Tile label="Trôi chảy" value={score(view.metrics.fluency)} />
        <Tile label="Phát âm" value={score(view.metrics.pronunciation)} />
      </View>
      {view.weakWords.length ? <Card title="Từ phát âm cần luyện"><View className="flex-row flex-wrap gap-1.5">{view.weakWords.map((entry, index) => <View key={index} className="rounded-full px-3 py-1" style={{ backgroundColor: colors.dangerSoft }}><Text weight="bold" className="text-sm" style={{ color: colors.danger }}>{entry.word}</Text></View>)}</View></Card> : null}

      <Text weight="extrabold" className="text-base text-ink">Chi tiết theo từng tiêu chí</Text>
      <CriteriaAccordion criteria={view.criteria} worstCode={worst[0]?.code ?? null} />

      {view.transcripts.some((entry) => entry.words.length > 0) ? <><Text weight="extrabold" className="text-base text-ink">Phát âm từng từ, từng âm</Text><Pronunciation view={view} /></> : null}

      {view.partNotes.length ? <Card title="Nhận xét theo part">{view.partNotes.map((entry) => <Text key={entry.partNo} className="mt-2 text-sm leading-5 text-ink"><Text weight="bold">Part {entry.partNo}: </Text>{entry.note}</Text>)}</Card> : null}

      {view.errors.length ? (
        <Card title="Lỗi nên sửa">
          {groupErrors(view.errors).map((group) => (
            <View key={group.name} className="mt-3">
              <Text weight="bold" className="text-sm text-ink">{group.name} <Text className="text-xs text-muted">· {group.items.length} chỗ</Text></Text>
              {group.items.map((entry, index) => (
                <View key={index} className="mt-1.5 rounded-2xl p-3" style={{ backgroundColor: colors.canvas }}>
                  <Text className="text-sm italic text-ink">“{entry.excerpt}”{entry.partNo !== null ? <Text className="text-xs text-muted">  Part {entry.partNo}</Text> : null}</Text>
                  {entry.suggestion ? <Text className="mt-1 text-sm text-ink"><Text weight="bold">Cách sửa: </Text>{entry.suggestion}</Text> : null}
                </View>
              ))}
            </View>
          ))}
        </Card>
      ) : null}

      {view.transcripts.length ? <Transcripts view={view} /> : null}

      <PremiumPlansSheet visible={plansOpen} onClose={() => setPlansOpen(false)} onChoose={(chosen) => { setPlansOpen(false); setProduct(chosen); }} />
      <ActivateKeySheet visible={product !== null} product={product} onActivated={wallet.onActivated} onClose={() => setProduct(null)} />
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return <View className="rounded-2xl bg-surface px-3 py-2" style={{ minWidth: '30%', flexGrow: 1, borderWidth: 2, borderColor: colors.line }}><Text className="text-xs text-muted">{label}</Text><Text weight="extrabold" className="text-lg text-ink">{value}</Text></View>;
}

/** Each criterion as a bar; the weakest is open on arrival and opening another closes it. */
function CriteriaAccordion({ criteria, worstCode }: { criteria: ResultCriterion[]; worstCode: string | null }) {
  const [open, setOpen] = useState<string | null>(worstCode ?? criteria[0]?.code ?? null);
  return (
    <View className="gap-2">
      {criteria.map((item) => {
        const isOpen = open === item.code;
        return (
          <View key={item.code} className="overflow-hidden rounded-3xl bg-surface" style={{ borderWidth: 2, borderColor: item.code === worstCode ? colors.danger : colors.line }}>
            <Pressable onPress={() => setOpen(isOpen ? null : item.code)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} className="flex-row items-center gap-3 p-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.skill.speaking }}><Text weight="black" style={{ color: '#ffffff' }}>{fmt(item.band)}</Text></View>
              <View className="flex-1">
                <Text weight="extrabold" className="text-sm text-ink">{item.name} <Text className="text-xs text-muted">{item.code}</Text>{item.limited ? <Text weight="bold" className="text-xs" style={{ color: colors.accentWarm }}>  · đã giới hạn band</Text> : null}</Text>
                <Text numberOfLines={isOpen ? undefined : 1} className="text-xs text-muted">{summaryLine(item.comment)}</Text>
              </View>
              {isOpen ? <ChevronUp size={18} color={colors.muted} /> : <ChevronDown size={18} color={colors.muted} />}
            </Pressable>
            {isOpen ? (
              <View className="gap-2 px-4 pb-4">
                {item.comment ? <Text className="text-sm leading-5 text-ink">{item.comment}</Text> : null}
                {item.strengths.length ? <View><View className="flex-row items-center gap-1"><CheckCircle2 size={14} color={colors.success} /><Text weight="bold" className="text-sm" style={{ color: colors.success }}>Điểm tốt</Text></View>{item.strengths.map((point, index) => <Text key={index} className="mt-1 text-sm leading-5 text-ink">• {point}</Text>)}</View> : null}
                {item.weaknesses.length ? <View><View className="flex-row items-center gap-1"><TrendingUp size={14} color={colors.accentWarm} /><Text weight="bold" className="text-sm" style={{ color: colors.accentWarm }}>Cần cải thiện</Text></View>{item.weaknesses.map((point, index) => <Text key={index} className="mt-1 text-sm leading-5 text-ink">• {point}</Text>)}</View> : null}
                {item.evidence.length ? <View><View className="flex-row items-center gap-1"><Quote size={14} color={colors.muted} /><Text weight="bold" className="text-sm text-muted">Trích từ bài của bạn</Text></View>{item.evidence.map((entry, index) => <View key={index} className="mt-1 rounded-xl p-2" style={{ backgroundColor: colors.canvas }}><Text className="text-sm italic text-ink">“{entry.quote}”</Text>{entry.note ? <Text className="text-xs text-muted">{entry.note}</Text> : null}</View>)}</View> : null}
                {!item.comment && !item.strengths.length && !item.weaknesses.length ? <Text className="text-sm text-muted">Chưa có nhận xét chi tiết cho tiêu chí này.</Text> : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** Every word coloured by its score; tapping one shows its sounds. Weak sounds over the whole test are listed below. */
function Pronunciation({ view }: { view: SpeakingResultView }) {
  const answers = view.transcripts.filter((entry) => entry.words.length > 0);
  const [question, setQuestion] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const current = answers[Math.min(question, answers.length - 1)]!;
  const index = picked !== null && picked < current.words.length ? picked : Math.max(0, weakestWord(current.words));
  const word = current.words[index]!;
  const tip = view.weakWords.find((entry) => entry.word.toLowerCase() === word.text.toLowerCase())?.tip ?? '';
  const all = answers.flatMap((entry) => entry.words);
  const counts = { good: 0, fair: 0, weak: 0 };
  all.forEach((item) => { const tone = toneOf(item.accuracy); if (tone !== 'none') counts[tone] += 1; });
  const total = counts.good + counts.fair + counts.weak;
  return (
    <Card>
      {total ? (
        <View>
          <View className="flex-row justify-between">
            {(['good', 'fair', 'weak'] as const).map((tone) => <View key={tone} className="items-center"><Text weight="black" className="text-xl" style={{ color: TONE_COLOR[tone] }}>{counts[tone]}</Text><Text className="text-[11px] text-muted">từ {TONE_NAME[tone]}</Text></View>)}
          </View>
          <View className="mt-2 flex-row overflow-hidden rounded-full" style={{ height: 8 }}>
            {(['good', 'fair', 'weak'] as const).map((tone) => <View key={tone} style={{ flex: counts[tone], backgroundColor: TONE_COLOR[tone] }} />)}
          </View>
        </View>
      ) : null}
      {answers.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 6 }}>
          {answers.map((entry, position) => (
            <Pressable key={`${entry.partNo}-${entry.questionNo}`} onPress={() => { setQuestion(position); setPicked(null); }} accessibilityRole="tab" accessibilityState={{ selected: position === question }} className="min-h-11 justify-center rounded-full px-3" style={{ backgroundColor: position === question ? colors.accentSoft : colors.canvas }}>
              <Text weight="bold" className="text-xs" style={{ color: position === question ? colors.accentDeep : colors.muted }}>Part {entry.partNo} · câu {entry.questionNo}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {current.question ? <Text className="mt-3 text-sm text-muted">{current.question}</Text> : null}
      <View className="mt-2 flex-row flex-wrap" style={{ gap: 4 }}>
        {current.words.map((item: ResultWord, position) => {
          const tone = toneOf(item.accuracy);
          return (
            <Pressable key={position} onPress={() => setPicked(position)} accessibilityRole="button" accessibilityState={{ selected: position === index }} accessibilityLabel={`${item.text}, ${score(item.accuracy)} điểm`} className="rounded-lg px-2 py-1" style={{ backgroundColor: `${TONE_COLOR[tone]}22`, borderWidth: 2, borderColor: position === index ? TONE_COLOR[tone] : 'transparent' }}>
              <Text weight="bold" className="text-sm" style={{ color: TONE_COLOR[tone] }}>{item.text}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="mt-2 text-xs text-muted">Chạm vào một từ để xem từng âm của nó.</Text>
      <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: colors.canvas }}>
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full" style={{ borderWidth: 4, borderColor: TONE_COLOR[toneOf(word.accuracy)] }}><Text weight="black" className="text-sm text-ink">{score(word.accuracy)}</Text></View>
          <View className="flex-1">
            <Text weight="extrabold" className="text-lg text-ink">{word.text}</Text>
            <Text className="text-xs" style={{ color: TONE_COLOR[toneOf(word.accuracy)] }}>{score(word.accuracy)} điểm · {TONE_NAME[toneOf(word.accuracy)]}{word.errorType ? ` · ${errorLabel(word.errorType)}` : ''}</Text>
          </View>
        </View>
        {word.sounds.length ? (
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {word.sounds.map((sound, position) => (
              <View key={position} className="items-center rounded-xl px-2.5 py-1.5" style={{ backgroundColor: colors.surface, borderWidth: 2, borderColor: TONE_COLOR[toneOf(sound.accuracy)] }}>
                <Text weight="extrabold" className="text-sm text-ink">/{sound.symbol}/</Text>
                <Text className="text-[11px]" style={{ color: TONE_COLOR[toneOf(sound.accuracy)] }}>{score(sound.accuracy)}</Text>
                {sound.heardAs ? <Text className="text-[10px] text-muted">nghe như /{sound.heardAs}/</Text> : null}
              </View>
            ))}
          </View>
        ) : <Text className="mt-2 text-xs text-muted">Chưa có điểm từng âm cho từ này.</Text>}
        {tip ? <Text className="mt-2 text-sm leading-5 text-ink"><Text weight="bold">Cách sửa: </Text>{tip}</Text> : null}
      </View>
      <Text weight="extrabold" className="mt-4 text-sm text-ink">Âm cần luyện nhất</Text>
      {view.weakSounds.length ? view.weakSounds.map((sound) => (
        <View key={sound.symbol} className="mt-2 rounded-2xl p-3" style={{ backgroundColor: colors.canvas }}>
          <Text className="text-sm text-ink"><Text weight="black">/{sound.symbol}/</Text>{sound.heardAs ? ` → /${sound.heardAs}/` : ''}  <Text className="text-xs text-muted">Yếu ở {sound.count} chỗ · điểm TB {score(sound.accuracy)}</Text></Text>
          {sound.words.length ? <Text className="mt-1 text-xs text-muted">Ví dụ: {sound.words.join(', ')}</Text> : null}
          {sound.tip ? <Text className="mt-1 text-sm leading-5 text-ink">{sound.tip}</Text> : null}
        </View>
      )) : <Text className="mt-1 text-sm text-muted">{all.some((item) => item.sounds.length) ? 'Không có âm nào dưới 60 điểm. Các âm của bạn khá ổn.' : 'Bài này chưa có điểm từng âm.'}</Text>}
    </Card>
  );
}

function Transcripts({ view }: { view: SpeakingResultView }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Card title="Bản chép lời">
      {view.transcripts.map((entry, index) => (
        <View key={index} className="mt-2 rounded-2xl" style={{ backgroundColor: colors.canvas }}>
          <Pressable onPress={() => setOpen(open === index ? null : index)} accessibilityRole="button" accessibilityState={{ expanded: open === index }} className="min-h-11 flex-row items-center gap-2 px-3 py-2">
            <View className="flex-1"><Text weight="bold" className="text-sm text-ink">Part {entry.partNo} · câu {entry.questionNo}</Text>{entry.question ? <Text numberOfLines={1} className="text-xs text-muted">{entry.question}</Text> : null}</View>
            {open === index ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}
          </Pressable>
          {open === index ? <Text className="px-3 pb-3 text-sm leading-5 text-ink">{entry.transcript || 'Không nhận dạng được lời nói trong câu này.'}</Text> : null}
        </View>
      ))}
    </Card>
  );
}
