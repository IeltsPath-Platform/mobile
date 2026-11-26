import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router } from 'expo-router';
import { Check, CircleAlert, Mic, Pause, Play, Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { ApiError } from '@/src/lib/api-client';
import { createRequestId } from '@/src/lib/request-id';
import { colors } from '@/src/theme';

import { getSpeakingTerms, type SpeakingTerms } from '../api/speaking';
import { getSpeakingTask, type SpeakingTask } from '../api/speaking-task';
import { TaskLoadError } from '../components/task-load-error';
import { leaveToCatalog, useLeaveTestGuard } from '../components/test-shell';
import { ActivateKeySheet, GradeConfirmSheet, GradeMethodSheet, NotEnoughPointsSheet, TermsSheet } from '../grading/grading-sheets';
import { POINT_PRODUCTS, type ActivationProduct } from '../grading/products';
import { usePremiumUpgrade } from '../grading/use-premium-upgrade';
import { useWallet, type GradingAccess } from '../grading/use-wallet';
import { formatClock } from '../model/clock';
import { gradeOptions, type GradeOptions } from '../model/grade-options';
import { isPremiumRequired } from '../api/premium-error';
import { parseCueCard } from '../model/speaking-cue';
import { clearSession, readPendingSend, useSessionRecordings, writePendingSend } from '../model/speaking-session';
import { sendSpeakingSubmission, type RecordingToSend, type SendProgress } from './send-submission';
import { playFromStart } from './use-recorder';

const CATALOG = '/practice/catalog/speaking';
const TEACHER_SOON = 'Giáo viên chấm Speaking sắp có. Hiện bài Speaking được AI chấm.';
const CONSENT_LABEL = 'Tôi đồng ý gửi bản ghi giọng nói của mình tới dịch vụ nhận dạng giọng nói và mô hình AI để chấm bài.';
const METHOD_COPY = {
  methodDescription: 'Bài Speaking của bạn có thể được AI hoặc giáo viên chấm. Bạn chọn cách nào cũng được.',
  teacher: 'Giáo viên IELTS nghe bài nói của bạn và nhận xét chi tiết từng tiêu chí.',
  ai: 'AI nghe bài nói, trả band Fluency, Lexical, Grammar, Pronunciation, lỗi cần sửa và gợi ý cải thiện.',
  confirmDescription: 'AI chấm theo 4 tiêu chí IELTS Speaking (Fluency, Lexical, Grammar, Pronunciation) và trả về band, lỗi cần sửa và gợi ý cải thiện.',
  backLabel: 'Quay lại xem lại bài',
  note: 'Point chỉ bị trừ khi AI chấm xong. Nếu AI gặp lỗi, point không bị trừ.',
  busyLabel: 'Đang gửi bài…',
  kept: 'Các bản ghi của bạn vẫn được giữ nguyên.',
};

/** Speaking has no teacher grading yet: the teacher way is closed and says so. */
function speakingOptions(access: GradingAccess, cost: number, enabled: boolean): GradeOptions {
  const options = gradeOptions({ balance: access.balance, cost, subscription: access.subscription });
  return {
    teacher: { enabled: false, credits: null, reason: TEACHER_SOON },
    ai: enabled ? options.ai : { ...options.ai, enabled: false, shortBy: 0, reason: 'Chấm Speaking bằng AI hiện chưa được bật. Vui lòng thử lại sau.' },
  };
}

/** The server's Speaking refusals, which it words in English. */
const SEND_ERRORS: Record<string, string> = {
  SPEAKING_SUBMISSION_IN_PROGRESS: 'Bạn đang có một bài Speaking chờ chấm. Hãy đợi bài đó xong trước khi gửi bài mới.',
  SPEAKING_GRADING_DISABLED: 'Chấm Speaking bằng AI hiện chưa được bật. Vui lòng thử lại sau.',
  SPEAKING_UPLOAD_CONFLICT: 'Bản ghi này đang được gửi ở một lần gửi khác. Đợi vài giây rồi bấm gửi lại.',
  SPEAKING_RECORDINGS_MISSING: 'Máy chủ chưa nhận đủ bản ghi. Bản ghi của bạn vẫn còn, hãy bấm gửi lại.',
};

function failureMessage(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.isNetworkError) return 'Mất kết nối khi gửi bài. Bản ghi của bạn vẫn còn, hãy bấm gửi lại.';
    return SEND_ERRORS[cause.code ?? ''] ?? cause.message;
  }
  return cause instanceof Error ? cause.message : 'Không gửi được bài. Bản ghi của bạn vẫn còn, hãy thử lại.';
}

type Popup = 'terms' | 'method' | 'confirm' | 'short' | null;

/**
 * The review after the last answer: every question with its recording, to listen, record again and see what is still
 * missing before sending. "Gửi chấm" asks who grades, confirms the cost and consent, uploads each answer with progress
 * and opens the result. A failed send keeps its request id, so sending again continues the same submission.
 */
export function SpeakingReview({ packageVersionId, parts }: { packageVersionId: string; parts: string[] }) {
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const tasks = useQuery({ queryKey: ['practice', 'speaking-review', packageVersionId, parts.join(',')], queryFn: ({ signal }) => Promise.all(parts.map((id) => getSpeakingTask(packageVersionId, id, signal))) });
  const recordings = useSessionRecordings(packageVersionId);
  const wallet = useWallet();
  const upgrade = usePremiumUpgrade();
  const [popup, setPopup] = useState<Popup>(null);
  const [terms, setTerms] = useState<SpeakingTerms | null>(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<SendProgress | null>(null);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [activation, setActivation] = useState<ActivationProduct | null>(null);
  const requestId = useRef<string | null>(null);
  /** Files uploaded under `requestId`; dropped with it. */
  const sentFiles = useRef(new Map<string, string>());
  // An unfinished send from an earlier visit (the app was closed mid-upload) is continued, not started over.
  useEffect(() => {
    let alive = true;
    void readPendingSend(packageVersionId).then((pending) => {
      if (!alive || !pending || requestId.current) return;
      requestId.current = pending.requestId;
      sentFiles.current = pending.sent;
    });
    return () => { alive = false; };
  }, [packageVersionId]);
  const [playing, setPlaying] = useState<string | null>(null);
  const guardOff = useLeaveTestGuard(recordings.size > 0 && !sent, 'Các bản ghi được giữ trên thiết bị này. Bạn có thể quay lại để nộp sau.', 'Chưa gửi bài Speaking');

  const list = tasks.data ?? [];
  const questions = list.flatMap((task) => task.questions);
  const recorded = questions.filter((question) => recordings.has(question.questionVersionId));
  const silent = recorded.filter((question) => recordings.get(question.questionVersionId)?.silent).length;
  const missing = questions.length - recorded.length;
  const seconds = recorded.reduce((total, question) => total + (recordings.get(question.questionVersionId)?.durationSeconds ?? 0), 0);
  const toSend: RecordingToSend[] = list.flatMap((task) => task.questions.flatMap((question, index) => {
    const recording = recordings.get(question.questionVersionId);
    return recording ? [{ questionVersionId: question.questionVersionId, label: `${task.partNo ? `Part ${task.partNo}` : task.title}, câu ${index + 1}`, recording }] : [];
  }));
  const context = `Speaking · ${list.map((task) => (task.partNo ? `Part ${task.partNo}` : task.title)).join(', ')} · ${list[0]?.packageTitle ?? 'Luyện tập'}`;
  const options = terms ? speakingOptions(wallet.access, terms.pointCost, terms.enabled !== false) : null;
  const problem = missing > 0 ? `Còn ${missing} câu chưa ghi âm.` : silent > 0 ? `${silent} bản ghi không có tiếng. Hãy ghi lại các câu đó.` : null;

  async function start() {
    setPopup('terms');
    setTermsLoading(true);
    const [, loaded] = await Promise.all([wallet.checkAccess(), getSpeakingTerms().catch((): null => null)]);
    setTerms(loaded);
    setTermsLoading(false);
    if (loaded) setPopup('method');
  }

  async function send() {
    if (sending || problem || !terms || terms.enabled === false || !consent || toSend.length === 0) return;
    requestId.current ??= createRequestId();
    const pending = { requestId: requestId.current, sent: sentFiles.current };
    writePendingSend(packageVersionId, pending);
    setSending(true);
    setError('');
    setProgress(null);
    try {
      const submission = await sendSpeakingSubmission({
        requestId: requestId.current, packageVersionId, partSectionIds: parts, recordings: toSend, maxRecordingBytes: terms.maxRecordingBytes, sent: sentFiles.current,
        onProgress: (next) => { setProgress(next); writePendingSend(packageVersionId, pending); },
      });
      requestId.current = null;
      sentFiles.current = new Map();
      writePendingSend(packageVersionId, null);
      guardOff();
      setSent(true);
      clearSession(packageVersionId);
      void client.invalidateQueries({ queryKey: ['practice'] });
      // Straight to the result: it shows the grading as it goes and the grade as soon as it is ready.
      setPopup(null);
      router.replace(`/practice/speaking-result/${submission.id}` as never);
    } catch (cause) {
      if (isPremiumRequired(cause)) { setPopup(null); upgrade.open(); }
      else if (cause instanceof ApiError && cause.status === 402) { void wallet.checkAccess(); setPopup('short'); }
      else if (cause instanceof ApiError && (cause.code === 'SPEAKING_SUBMISSION_NOT_UPLOADING' || cause.code === 'SPEAKING_SUBMISSION_ABANDONED')) {
        // The server gave up the upload this send was continuing (left unfinished too long): the next send opens a new one.
        requestId.current = null;
        sentFiles.current = new Map();
        writePendingSend(packageVersionId, null);
        setError('Lần gửi trước đã quá hạn. Bản ghi của bạn vẫn còn, hãy bấm gửi lại.');
      } else setError(failureMessage(cause));
    } finally {
      setSending(false);
    }
  }

  const recordAgain = (task: SpeakingTask, index: number) => {
    setPlaying(null);
    router.push({ pathname: '/practice/speaking/[packageVersionId]/[sectionId]', params: { packageVersionId, sectionId: task.sectionId, parts: parts.join(','), q: String(index) } } as never);
  };

  const leave = () => Alert.alert('Bỏ bài Speaking này?', 'Các bản ghi trên thiết bị sẽ bị xoá.', [
    { text: 'Ở lại', style: 'cancel' },
    { text: 'Bỏ bài', style: 'destructive', onPress: () => { guardOff(); clearSession(packageVersionId); leaveToCatalog(CATALOG); } },
  ]);

  if (tasks.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent} /><Text className="mt-2 text-sm text-muted">Đang tải bài của bạn…</Text></View>;
  if (tasks.isError) return <TaskLoadError title="Xem lại bài Speaking" heading="Chưa tải được bài" error={tasks.error} fallbackHref={CATALOG} onRetry={() => void tasks.refetch()} />;

  return (
    <View className="flex-1 bg-canvas">
      <BackHeader title="Xem lại bài Speaking" subtitle={context} fallbackHref={CATALOG} rightAction={<Pressable onPress={leave} accessibilityRole="button" className="h-11 justify-center px-2"><Text weight="bold" style={{ color: colors.danger }}>Bỏ bài</Text></Pressable>} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }}>
        <View className="rounded-3xl p-4" style={{ backgroundColor: problem ? colors.warmSoft : colors.successSoft }}>
          <View className="flex-row items-center gap-2">
            {problem ? <CircleAlert size={18} color={colors.accentWarm} /> : <Check size={18} color={colors.success} />}
            <Text weight="extrabold" className="flex-1 text-base text-ink">{recorded.length}/{questions.length} câu đã ghi âm · tổng {formatClock(seconds)}</Text>
          </View>
          <Text className="mt-1 text-sm text-ink">{problem ?? 'Đã đủ bản ghi. Nghe lại từng câu, câu nào chưa vừa ý thì ghi lại trước khi gửi.'}</Text>
        </View>
        {list.map((task) => (
          <View key={task.sectionId} className="gap-2">
            <View className="flex-row items-center gap-2">
              <View className="rounded-full px-3 py-1" style={{ backgroundColor: colors.skill.speaking }}><Text weight="black" className="text-xs" style={{ color: '#ffffff' }}>{task.partNo ? `Part ${task.partNo}` : 'Speaking'}</Text></View>
              <Text weight="bold" numberOfLines={1} className="flex-1 text-sm text-ink">{task.title}</Text>
            </View>
            {task.questions.map((question, index) => {
              const recording = recordings.get(question.questionVersionId);
              const tone = !recording ? colors.danger : recording.silent ? colors.accentWarm : colors.success;
              return (
                <View key={question.questionVersionId} className="rounded-2xl bg-surface p-3" style={{ borderWidth: 2, borderColor: colors.line, borderLeftWidth: 5, borderLeftColor: tone }}>
                  <Text className="text-sm leading-5 text-ink"><Text weight="black">{index + 1}. </Text>{parseCueCard(question.prompt).topic}</Text>
                  <Text className="mt-1 text-xs" style={{ color: tone }}>{!recording ? 'Chưa ghi âm' : recording.silent ? 'Không thu được tiếng nói' : `Đã ghi âm · ${formatClock(recording.durationSeconds)}`}</Text>
                  <View className="mt-2 flex-row gap-2">
                    {recording ? <PlayButton label={`câu ${index + 1}`} uri={recording.uri} active={playing === question.questionVersionId} onToggle={(on) => setPlaying(on ? question.questionVersionId : null)} /> : null}
                    <Pressable onPress={() => recordAgain(task, index)} accessibilityRole="button" accessibilityLabel={`${recording ? 'Ghi lại' : 'Ghi âm'} câu ${index + 1}`} className="min-h-11 flex-row items-center gap-1.5 rounded-full px-4" style={{ backgroundColor: colors.canvas }}>
                      <Mic size={15} color={colors.ink} /><Text weight="bold" className="text-sm text-ink">{recording ? 'Ghi lại' : 'Ghi âm'}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View className="border-t border-line bg-surface px-3 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        {/* The server grades a submission only with every answer, so nothing is opened while one is missing or silent. */}
        {problem ? <Text className="mb-2 text-center text-xs text-muted">{problem}</Text> : null}
        <Button label={`Gửi chấm · ${recorded.length} bản ghi`} icon={<Send size={18} color={colors.onAccent} />} disabled={recorded.length === 0 || problem !== null} onPress={() => void start()} />
      </View>

      <TermsSheet visible={popup === 'terms' && !terms} loading={termsLoading} onRetry={() => void start()} onClose={() => setPopup(null)} />
      <GradeMethodSheet visible={popup === 'method'} options={options} context={context} copy={METHOD_COPY} onClose={() => setPopup(null)} onTeacher={() => setPopup(null)} onAi={() => { if (terms?.enabled !== false) setPopup(options?.ai.enabled ? 'confirm' : 'short'); }} />
      <GradeConfirmSheet
        visible={popup === 'confirm'}
        busy={sending}
        error={error}
        canGrade={toSend.length > 0 && terms?.enabled !== false}
        copy={METHOD_COPY}
        consent={{ label: CONSENT_LABEL, checked: consent, onChange: setConsent }}
        progress={progress ? `Đang gửi bản ghi ${Math.min(progress.done + 1, progress.total)}/${progress.total}…` : 'Đang gửi bài…'}
        onGrade={() => void send()}
        onClose={() => { setError(''); setPopup(null); }}
        figures={terms && options ? { cost: options.ai.cost, balance: wallet.access.balance, context, benefits: ['Band từng tiêu chí và band tổng (điểm ước lượng để luyện tập)', 'Lỗi cần sửa, kèm gợi ý cải thiện', 'Bài luyện tiếp theo cho điểm yếu của bạn'], checks: [{ text: `${toSend.length} bản ghi · tổng ${formatClock(seconds)}`, ok: true }] } : null}
      />
      <NotEnoughPointsSheet visible={popup === 'short' && Boolean(terms)} cost={terms?.pointCost ?? 0} balance={wallet.access.balance} copy={METHOD_COPY} onClose={() => setPopup(null)} onActivate={() => { setPopup(null); setActivation(POINT_PRODUCTS[0]); }} />
      <ActivateKeySheet visible={activation !== null} product={activation} onActivated={wallet.onActivated} onClose={() => setActivation(null)} />
      {upgrade.sheets}
    </View>
  );
}

/** Plays one recording; starting another stops this one (the parent tracks which is active). */
function PlayButton({ label, uri, active, onToggle }: { label: string; uri: string; active: boolean; onToggle: (on: boolean) => void }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  useEffect(() => { if (!active && status.playing) player.pause(); }, [active, status.playing, player]);
  useEffect(() => { if (status.didJustFinish) { onToggle(false); void player.seekTo(0); } }, [status.didJustFinish, player, onToggle]);
  const playing = active && status.playing;
  return (
    <Pressable onPress={() => { if (playing) { player.pause(); onToggle(false); } else { onToggle(true); void playFromStart(player); } }} accessibilityRole="button" accessibilityLabel={`${playing ? 'Dừng phát' : 'Nghe lại'} ${label}`} className="min-h-11 flex-row items-center gap-1.5 rounded-full px-4" style={{ backgroundColor: colors.accentSoft }}>
      {playing ? <Pause size={15} color={colors.accentDeep} /> : <Play size={15} color={colors.accentDeep} />}
      <Text weight="bold" className="text-sm" style={{ color: colors.accentDeep }}>{playing ? 'Đang phát' : 'Nghe lại'}</Text>
    </Pressable>
  );
}
