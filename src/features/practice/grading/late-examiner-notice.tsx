import AsyncStorage from '@react-native-async-storage/async-storage';
import { TriangleAlert } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { cancelRequest, cancelRequestMessage, changeExaminer, changeExaminerMessage, type MyGradingJob } from '../api/grading-jobs';
import { Sheet } from '../components/sheet';
import { ChangeExaminerSheet } from './grading-sheets';

/** Whether the learner chose to keep waiting, per job and per examiner (a new examiner starts a new deadline). */
const keptKey = (job: Pick<MyGradingJob, 'id' | 'requestedAt'>) => `grading-keep-waiting:${job.id}:${job.requestedAt ?? ''}`;

/**
 * Once the chosen examiner is 48 hours late: keep waiting, or ask for another examiner (at most twice, no extra credit).
 * When no change is left the learner may cancel and take the credit back. Nothing shows while the examiner still has time.
 */
export function LateExaminerNotice(props: { job: MyGradingJob; examinerName?: string | null; onChanged: () => void }) {
  return props.job.state === 'OVERDUE' ? <LateNotice key={keptKey(props.job)} {...props} /> : null;
}

function LateNotice({ job, examinerName, onChanged }: { job: MyGradingJob; examinerName?: string | null; onChanged: () => void }) {
  const [kept, setKept] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const who = examinerName ?? 'giáo viên hiện tại';
  const reviewId = job.reviewSubmissionId ?? null;

  useEffect(() => { void AsyncStorage.getItem(keptKey(job)).then((value) => setKept(value === '1')).catch(() => undefined); }, [job]);

  const keepWaiting = () => { setKept(true); void AsyncStorage.setItem(keptKey(job), '1').catch(() => undefined); };

  async function cancel() {
    if (!reviewId) return;
    setBusy(true);
    setError('');
    try { await cancelRequest(reviewId); setCancelling(false); onChanged(); } catch (cause) { setError(cancelRequestMessage(cause)); } finally { setBusy(false); }
  }

  async function change(examinerId: string) {
    setBusy(true);
    setError('');
    try { await changeExaminer(job.id, examinerId); setChoosing(false); onChanged(); } catch (cause) { setError(changeExaminerMessage(cause)); } finally { setBusy(false); }
  }

  return (
    <View className="gap-3 rounded-3xl p-4" style={{ backgroundColor: colors.warmSoft, borderWidth: 2, borderColor: colors.accentWarm }}>
      <View className="flex-row items-center gap-2">
        <TriangleAlert size={20} color={colors.accentWarm} />
        <Text weight="extrabold" className="flex-1 text-base text-ink">Giáo viên chưa chấm xong trong 48 giờ</Text>
      </View>
      <Text className="text-sm leading-5 text-ink">
        {kept ? `Bạn đang tiếp tục chờ ${who}. Kết quả sẽ hiện ở đây khi giáo viên chấm xong.` : `Bạn có thể tiếp tục chờ ${who}, hoặc đổi sang một giáo viên khác. Đổi giáo viên không mất thêm lượt chấm.`}
      </Text>
      {!kept ? <Button label={`Tiếp tục chờ ${who}`} variant="secondary" onPress={keepWaiting} /> : null}
      {job.canChoose
        ? (!kept ? <><Button label="Yêu cầu đổi giáo viên" onPress={() => { setError(''); setChoosing(true); }} /><Text className="text-xs text-muted">Còn {job.changesLeft} lần đổi cho bài này.</Text></> : null)
        : <Text className="text-sm text-muted">Bạn đã dùng hết {2 - job.changesLeft} lần đổi giáo viên cho bài này.{job.canCancel && reviewId ? ' Nếu không muốn chờ nữa, bạn có thể hủy yêu cầu và nhận lại lượt chấm.' : ' Hãy tiếp tục chờ.'}</Text>}
      {job.canCancel && reviewId ? <Button label="Hủy yêu cầu và nhận lại lượt" variant="danger" onPress={() => { setError(''); setCancelling(true); }} /> : null}

      <ChangeExaminerSheet visible={choosing} currentExaminerId={job.examinerId ?? null} changesLeft={job.changesLeft} busy={busy} error={error} onChange={(id) => void change(id)} onClose={() => { setChoosing(false); setError(''); }} />
      <Sheet
        visible={cancelling}
        onClose={() => { setCancelling(false); setError(''); }}
        dismissable={!busy}
        title="Hủy yêu cầu chấm bài?"
        subtitle="Giáo viên sẽ không chấm bài này nữa và lượt giáo viên chấm được hoàn lại cho bạn."
        footer={<>
          <Button label={busy ? 'Đang hủy…' : 'Hủy và nhận lại lượt'} variant="danger" loading={busy} onPress={() => void cancel()} />
          <Button label="Giữ yêu cầu" variant="secondary" disabled={busy} onPress={() => setCancelling(false)} />
        </>}>
        {error ? <FormAlert message={error} /> : null}
      </Sheet>
    </View>
  );
}
