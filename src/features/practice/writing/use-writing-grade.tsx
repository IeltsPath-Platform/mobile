import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Hourglass } from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { ApiError } from '@/src/lib/api-client';
import { createRequestId } from '@/src/lib/request-id';
import { colors } from '@/src/theme';

import { getPendingExaminerSubmission, submitToExaminer } from '../api/examiners';
import { getGradingTerms, submitFreeWriting, type WritingMode, type WritingTask } from '../api/writing';
import { ActivateKeySheet, ExaminerPickSheet, GradeConfirmSheet, GradeMethodSheet, NotEnoughPointsSheet, PremiumPlansSheet, TermsSheet } from '../grading/grading-sheets';
import { POINT_PRODUCTS, type ActivationProduct } from '../grading/products';
import { useWallet } from '../grading/use-wallet';
import { gradeOptions } from '../model/grade-options';
import { isPremiumRequired } from '../api/premium-error';
import { clearDraft, countWords, storeResultContext } from '../model/writing-text';

const AI_ERRORS: Record<string, string> = {
  ESSAY_EMPTY: 'Bài viết đang trống.',
  ESSAY_TOO_SHORT: 'Bài viết còn quá ngắn để chấm.',
  ESSAY_TOO_LONG: 'Bài viết quá dài để chấm.',
  GRADING_UNAVAILABLE: 'Hệ thống chấm bài đang bận, point chưa bị trừ. Hãy thử lại sau.',
  GRADING_IN_PROGRESS: 'Bài này đang được chấm. Hãy đợi trong giây lát.',
  DAILY_LIMIT_REACHED: 'Bạn đã dùng hết số lần chấm bài trong hôm nay.',
  PAYMENT_UNAVAILABLE: 'Chưa thanh toán được point. Hãy thử lại sau.',
  // The grade request waits for the AI; the server keeps grading after the app stops waiting, and a resend of the
  // same essay reuses the request id, so it picks up that grade instead of paying again.
  TIMEOUT: 'AI vẫn đang chấm bài. Đợi vài giây rồi bấm Chấm bài lại, bạn sẽ không bị trừ point hai lần.',
};

const EXAMINER_ERRORS: Record<string, string> = {
  ESSAY_EMPTY: 'Bài viết đang trống.',
  ESSAY_TOO_SHORT: 'Bài viết còn quá ngắn để gửi giáo viên chấm.',
  ESSAY_TOO_LONG: 'Bài viết quá dài để chấm.',
  HUMAN_GRADING_CREDIT_REQUIRED: 'Gói Premium của bạn đã hết lượt giáo viên chấm, hoặc đã hết hạn.',
  EXAMINER_UNAVAILABLE: 'Giáo viên này vừa đủ bài hôm nay, đang tắt nhận bài hoặc tạm chưa nhận bài mới. Hãy chọn giáo viên khác.',
  HUMAN_REVIEW_UNAVAILABLE: 'Chưa gửi được cho giáo viên, lượt chấm của bạn chưa bị trừ. Hãy thử lại sau.',
  USER_SERVICE_UNAVAILABLE: 'Chưa kiểm tra được giáo viên. Hãy thử lại sau.',
  EXAMINER_REVIEW_PENDING: 'Bài này đã gửi giáo viên và đang chờ chấm, nên chưa gửi lại được. Bạn gửi lại được sau khi giáo viên chấm xong; lượt chấm của bạn không bị trừ thêm.',
};

function examinerMessage(cause: unknown) {
  if (!(cause instanceof ApiError)) return 'Chưa gửi được bài cho giáo viên. Hãy thử lại.';
  if (cause.status === 402) return EXAMINER_ERRORS.HUMAN_GRADING_CREDIT_REQUIRED!;
  return EXAMINER_ERRORS[cause.code ?? ''] ?? cause.message;
}

function pendingOf(cause: unknown): string | null {
  if (!(cause instanceof ApiError) || cause.code !== 'EXAMINER_REVIEW_PENDING') return null;
  const id = (cause.body as { submissionId?: unknown } | null)?.submissionId;
  return typeof id === 'string' ? id : null;
}

type Popup = 'method' | 'examiner' | 'confirm' | 'short' | null;
const BENEFITS = ['Band tổng và điểm 4 tiêu chí', 'Bài viết được đánh dấu lỗi ngữ pháp, từ vựng, mạch lạc', 'Gợi ý sửa và việc nên làm trước'];

/**
 * What "Hoàn thành" does on a Writing screen: read the points and Premium credits, then ask who grades. A teacher needs
 * Premium with a credit left and is picked from the examiners who take work; the AI needs enough points and goes through
 * the confirm sheet (or the not-enough-points sheet, which leads to key activation). One request id per essay text, so a
 * resend never pays twice.
 */
export function useWritingGrade({ task, mode, draftKey, essay, seconds, label, beforeLeave }: {
  task: WritingTask; mode: WritingMode; draftKey: string; essay: string;
  /** Reads the seconds spent writing when the grade is stored. */
  seconds: () => number;
  label: string;
  /** Lifts the leave guard before the screen is replaced by the result. */
  beforeLeave: () => void;
}): { start: () => void; checking: boolean; sheets: ReactNode; pendingNotice: ReactNode } {
  const client = useQueryClient();
  const wallet = useWallet();
  const [popup, setPopup] = useState<Popup>(null);
  const [checking, setChecking] = useState(false);
  const [activation, setActivation] = useState<ActivationProduct | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [grading, setGrading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [sending, setSending] = useState(false);
  const [examinerError, setExaminerError] = useState('');
  const [pendingFromError, setPendingFromError] = useState<string | null>(null);
  const aiRequest = useRef<{ essay: string; id: string } | null>(null);
  const examinerRequest = useRef<{ essay: string; id: string } | null>(null);
  // State flips one render late; a second tap in the same frame must not send a parallel request.
  const inFlight = useRef(false);

  const terms = useQuery({ queryKey: ['practice', 'writing-terms'], queryFn: ({ signal }) => getGradingTerms(signal), staleTime: 300_000, retry: 1 });
  const pending = useQuery({ queryKey: ['practice', 'writing-pending', task.questionVersionId], queryFn: ({ signal }) => getPendingExaminerSubmission(task.questionVersionId, signal), staleTime: 30_000, retry: false });
  const pendingId = pendingFromError ?? pending.data ?? null;
  const words = countWords(essay);
  // The server decides the least words an AI grade takes; the sheet shows that same number.
  const minWords = terms.data?.minWords ?? task.minWords ?? 0;
  const canGrade = terms.data != null && words >= terms.data.minWords;
  const options = terms.data ? gradeOptions({ balance: wallet.access.balance, cost: terms.data.pointCost, subscription: wallet.access.subscription, teacherPending: pendingId !== null }) : null;
  const context = `Writing ${task.task === 'TASK_2' ? 'Task 2' : 'Task 1'} · ${task.title} · ${label}`;

  const finish = async (submissionId: string) => {
    // Stop the autosave before the draft is cleared, or a save in flight would bring the sent essay back.
    beforeLeave();
    await storeResultContext(submissionId, { seconds: seconds(), timeLimitSeconds: task.timeLimitSeconds, title: task.title, mode, retryPath: `/practice/writing/${task.packageVersionId}/${task.sectionId}?mode=${mode}` });
    await clearDraft(draftKey);
    void client.invalidateQueries({ queryKey: ['practice'] });
    setPopup(null);
    router.replace(`/practice/writing-result/${submissionId}` as never);
  };

  async function gradeWithAi() {
    if (inFlight.current || !terms.data) return;
    if (aiRequest.current?.essay !== essay) aiRequest.current = { essay, id: createRequestId() };
    inFlight.current = true;
    setGrading(true);
    setAiError('');
    try {
      const result = await submitFreeWriting({ requestId: aiRequest.current.id, packageVersionId: task.packageVersionId, questionVersionId: task.questionVersionId, essayText: essay });
      await finish(result.submissionId);
    } catch (cause) {
      if (isPremiumRequired(cause)) { setPopup(null); setPremiumOpen(true); }
      else if (cause instanceof ApiError && (cause.status === 402 || cause.code === 'INSUFFICIENT_POINTS')) setPopup('short');
      else setAiError(cause instanceof ApiError ? AI_ERRORS[cause.code ?? ''] ?? cause.message : 'Chưa chấm được bài. Hãy thử lại.');
      setGrading(false);
    } finally {
      inFlight.current = false;
    }
  }

  async function sendToExaminer(examinerId: string) {
    if (inFlight.current) return;
    if (examinerRequest.current?.essay !== essay) examinerRequest.current = { essay, id: createRequestId() };
    inFlight.current = true;
    setSending(true);
    setExaminerError('');
    try {
      const result = await submitToExaminer({ requestId: examinerRequest.current.id, packageVersionId: task.packageVersionId, questionVersionId: task.questionVersionId, essayText: essay, examinerId });
      await finish(result.submissionId);
    } catch (cause) {
      if (isPremiumRequired(cause)) { setPopup(null); setPremiumOpen(true); }
      setPendingFromError(pendingOf(cause));
      setExaminerError(examinerMessage(cause));
      setSending(false);
    } finally {
      inFlight.current = false;
    }
  }

  function start() {
    if (checking) return;
    setChecking(true);
    void wallet.checkAccess().then(() => setPopup('method')).finally(() => setChecking(false));
  }

  const sheets = (
    <>
      <TermsSheet visible={popup === 'method' && !terms.data} loading={terms.isFetching} onRetry={() => void terms.refetch()} onClose={() => setPopup(null)} />
      <GradeMethodSheet
        visible={popup === 'method' && Boolean(options)}
        options={options}
        context={context}
        onClose={() => setPopup(null)}
        onTeacher={() => setPopup('examiner')}
        onPremium={() => { setPopup(null); setPremiumOpen(true); }}
        onAi={() => setPopup(options?.ai.enabled ? 'confirm' : 'short')}
      />
      <ExaminerPickSheet
        visible={popup === 'examiner' && Boolean(terms.data)}
        words={words}
        minWords={terms.data?.minWords ?? 0}
        busy={sending}
        error={examinerError}
        onSend={(examinerId) => void sendToExaminer(examinerId)}
        onBack={() => { setExaminerError(''); setPopup('method'); }}
        onClose={() => { setExaminerError(''); setPopup(null); }}
      />
      <GradeConfirmSheet
        visible={popup === 'confirm'}
        busy={grading}
        error={aiError || (canGrade || !terms.data ? '' : `Cần ít nhất ${terms.data.minWords} từ để AI chấm bài.`)}
        canGrade={canGrade}
        onGrade={() => void gradeWithAi()}
        onClose={() => { setAiError(''); setPopup(null); }}
        figures={terms.data && options ? { cost: options.ai.cost, balance: wallet.access.balance, context, benefits: BENEFITS, checks: [{ text: `Số từ: ${words} (tối thiểu ${minWords})`, ok: words >= minWords }] } : null}
      />
      <NotEnoughPointsSheet
        visible={popup === 'short' && Boolean(terms.data)}
        cost={terms.data?.pointCost ?? 0}
        balance={wallet.access.balance}
        onClose={() => setPopup(null)}
        onActivate={() => { setPopup(null); setActivation(POINT_PRODUCTS[0]); }}
      />
      <PremiumPlansSheet visible={premiumOpen} onClose={() => setPremiumOpen(false)} onChoose={(product) => { setPremiumOpen(false); setActivation(product); }} />
      <ActivateKeySheet visible={activation !== null} product={activation} onActivated={wallet.onActivated} onClose={() => setActivation(null)} />
    </>
  );

  const pendingNotice = pendingId ? (
    <Pressable onPress={() => router.push(`/practice/writing-result/${pendingId}` as never)} accessibilityRole="button" className="mx-4 mt-3 flex-row gap-3 rounded-2xl p-3" style={{ backgroundColor: colors.warmSoft }}>
      <Hourglass size={20} color={colors.accentWarm} />
      <View className="flex-1">
        <Text weight="bold" className="text-sm text-ink">Bài này đã gửi giáo viên và đang chờ chấm</Text>
        <Text className="mt-0.5 text-xs leading-4 text-muted">Bạn gửi lại cho giáo viên được sau khi giáo viên chấm xong. Trong lúc chờ, bạn có thể chọn AI chấm.</Text>
        <Text weight="bold" className="mt-1 text-xs" style={{ color: colors.accentDeep }}>Xem bài đang chờ chấm ›</Text>
      </View>
    </Pressable>
  ) : null;

  return { start, checking, sheets, pendingNotice };
}
