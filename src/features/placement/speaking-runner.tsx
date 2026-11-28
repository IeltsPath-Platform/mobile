import { Mic, Square } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { useAttemptAnswers } from '@/src/features/practice/hooks/use-attempt-answers';
import type { SavedResponse, TestItem, TestSection } from '@/src/features/practice/model/sections';
import type { SavedRecording } from '@/src/features/practice/model/speaking-session';
import { useRecorder } from '@/src/features/practice/speaking/use-recorder';
import { safeErrorMessage } from '@/src/lib/error-message';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

import { placementApi } from './api';
import { questionItems, readSpokenSeconds, spokenAnswer } from './model';

/** The web gives each placement answer one minute; the recording stops by itself there. */
const ANSWER_SECONDS = 60;

/**
 * Speaking of a placement test: one recording per question. Recordings stay on the phone until the skill is handed in;
 * only their length is saved as the answer, so a resumed test knows which questions were answered.
 */
export function PlacementSpeakingRunner({ attemptId, sections, saved, exitHref, onFinish }: {
  attemptId: string;
  sections: TestSection[];
  saved: SavedResponse[];
  exitHref: string;
  onFinish: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const answers = useAttemptAnswers(attemptId, saved);
  const items = sections.flatMap(questionItems);
  const [recordings, setRecordings] = useState<Record<string, SavedRecording>>({});
  /** Storage references of recordings already uploaded, so a retried hand-in does not upload them again. */
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState('');
  /** The one question recording now: the phone has a single microphone, and a take in progress is not an answer yet. */
  const [recordingId, setRecordingId] = useState<string | null>(null);
  // The grader keeps the first recording it receives for each item, so once one is sent the answers are frozen.
  const [sent, setSent] = useState(false);

  const keep = (itemId: string, recording: SavedRecording) => {
    setRecordings((current) => ({ ...current, [itemId]: recording }));
    setUploaded(({ [itemId]: _replaced, ...rest }) => rest);
    answers.setAnswer(itemId, spokenAnswer(recording.durationSeconds));
  };

  const recorded = (itemId: string) => readSpokenSeconds(answers.answers[itemId]) > 0;
  const missing = items.filter((item) => recorded(item.id) && !recordings[item.id] && !uploaded[item.id]);
  const answered = items.filter((item) => recorded(item.id)).length;

  const finish = async () => {
    if (missing.length) {
      setError('Một số câu đã ghi ở lần trước không còn trên máy. Hãy ghi lại các câu đó.');
      return;
    }
    setFinishing(true);
    setError('');
    try {
      if (!(await answers.flushAll())) throw new Error('Chưa lưu được câu trả lời. Kiểm tra kết nối rồi nộp lại.');
      for (const item of items) {
        if (!recorded(item.id)) continue;
        let reference = uploaded[item.id];
        if (!reference) {
          const { mediaReference } = await placementApi.uploadRecording(recordings[item.id].uri);
          reference = mediaReference;
          setUploaded((current) => ({ ...current, [item.id]: mediaReference }));
        }
        await placementApi.submitAnswer({
          attemptItemId: item.id,
          promptSnapshot: JSON.stringify({ stem: item.question?.prompt ?? '' }),
          skill: 'SPEAKING',
          audioReference: reference,
          submissionKey: `placement-speaking-${attemptId}-${item.id}`,
        });
        setSent(true);
      }
      await onFinish();
    } catch (cause) {
      setError(`${safeErrorMessage(cause, 'Chưa nộp được bài nói.').replace(/[.!?]?$/, '.')} Hãy nộp lại.`);
      setFinishing(false);
    }
  };

  return (
    <View className="flex-1 bg-canvas">
      <View className="flex-row items-center gap-3 px-4 pb-2" style={{ paddingTop: Math.max(insets.top, 12) + 4 }}>
        <BackButton fallbackHref={exitHref} />
        <View className="flex-1">
          <Text weight="black" className="text-lg">Speaking</Text>
          <Text className="text-xs text-muted">Mỗi câu trả lời tối đa {ANSWER_SECONDS} giây</Text>
        </View>
      </View>
      <ScrollView contentContainerClassName="gap-3 px-4 pb-6">
        {items.map((item, position) => (
          <QuestionCard
            key={item.id}
            item={item}
            number={position + 1}
            recordedSeconds={readSpokenSeconds(answers.answers[item.id])}
            lost={missing.some((entry) => entry.id === item.id)}
            disabled={finishing || sent || (recordingId !== null && recordingId !== item.id)}
            onRecordingChange={(active) => setRecordingId((current) => (active ? item.id : current === item.id ? null : current))}
            onRecorded={(recording) => keep(item.id, recording)}
          />
        ))}
      </ScrollView>
      <View className="border-t border-line bg-surface px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        {error ? <View className="mb-2"><FormAlert message={error} /></View> : null}
        <Button
          label={answered === items.length ? 'Hoàn thành Speaking' : `Hoàn thành (${answered}/${items.length} câu)`}
          onPress={() => void finish()}
          loading={finishing}
          loadingLabel="Đang gửi bài nói"
          disabled={answered === 0 || recordingId !== null}
        />
      </View>
    </View>
  );
}

function QuestionCard({ item, number, recordedSeconds, lost, disabled, onRecordingChange, onRecorded }: {
  item: TestItem;
  number: number;
  recordedSeconds: number;
  lost: boolean;
  disabled: boolean;
  onRecordingChange: (recording: boolean) => void;
  onRecorded: (recording: SavedRecording) => void;
}) {
  const recorder = useRecorder({ onSaved: onRecorded });
  const recording = recorder.status === 'recording';
  const busy = recorder.status === 'requesting' || recorder.status === 'processing';

  const report = useRef(onRecordingChange);
  useLayoutEffect(() => { report.current = onRecordingChange; });
  useEffect(() => { report.current(recording); }, [recording]);

  // The answer has a fixed length, as on the web.
  const { elapsed, stop } = recorder;
  useEffect(() => {
    if (recording && elapsed >= ANSWER_SECONDS) void stop();
  }, [recording, elapsed, stop]);

  const toggle = () => {
    haptics.tap();
    if (recording) void recorder.stop();
    else void recorder.start();
  };

  const seconds = recording ? recorder.elapsed : recorder.recording?.durationSeconds ?? recordedSeconds;
  return (
    <View className="rounded-2xl bg-surface p-4" style={{ borderWidth: 1.5, borderColor: recording ? colors.danger : colors.line }}>
      <Text weight="extrabold" className="text-xs uppercase tracking-wider text-muted">Câu {number}</Text>
      <Text className="mt-1 text-[15px] leading-6">{item.question?.prompt}</Text>
      <View className="mt-3 flex-row items-center gap-3">
        <Pressable
          onPress={toggle}
          disabled={disabled || busy}
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Dừng ghi âm' : seconds > 0 ? 'Ghi lại câu này' : 'Bắt đầu ghi âm'}
          className="h-14 w-14 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: recording ? colors.danger : colors.accent, opacity: disabled && !recording ? 0.4 : 1 }}>
          {busy ? <ActivityIndicator color="#fff" /> : recording ? <Square size={20} color="#fff" fill="#fff" /> : <Mic size={24} color="#fff" />}
        </Pressable>
        <View className="flex-1">
          <Text weight="bold" className="text-[15px]">
            {recording ? `Đang ghi… ${seconds}s / ${ANSWER_SECONDS}s` : seconds > 0 ? `Đã ghi ${seconds} giây` : 'Chạm để ghi âm câu trả lời'}
          </Text>
          <Text className="text-xs text-muted">
            {recording ? 'Chạm lần nữa để dừng' : lost ? 'Bản ghi không còn trên máy, hãy ghi lại' : seconds > 0 ? 'Chạm để ghi lại' : ''}
          </Text>
        </View>
      </View>
      {recorder.error ? <View className="mt-2"><FormAlert message={recorder.error} /></View> : null}
      {recorder.status === 'denied' ? (
        <Button className="mt-2" variant="secondary" label="Mở cài đặt micro" onPress={recorder.openSettings} />
      ) : null}
    </View>
  );
}
