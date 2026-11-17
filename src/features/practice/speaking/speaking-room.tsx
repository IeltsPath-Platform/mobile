import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router } from 'expo-router';
import { Check, ChevronLeft, ChevronRight, Info, Mic, Pause, Play, Settings, Square, Volume2, VolumeX } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

import { usePracticeSession } from '../api/practice-session';
import type { SpeakingTask } from '../api/speaking-task';
import { ExamHeader, headerIconColor } from '../components/exam-header';
import { closeTest, useLeaveTestGuard } from '../components/test-shell';
import { useStudySession } from '../hooks/use-study-session';
import { formatClock } from '../model/clock';
import { parseCueCard, spokenPrompt } from '../model/speaking-cue';
import { saveRecording, useSessionRecordings, type SavedRecording } from '../model/speaking-session';
import { useExaminerVoice } from './use-examiner-voice';
import { playFromStart, useRecorder } from './use-recorder';

const CATALOG = '/practice/catalog/speaking';
/** An answer can be stopped only after this long, so a stray tap does not leave an empty answer. */
const MIN_ANSWER_SECONDS = 3;

type Props = {
  task: SpeakingTask;
  /** The sections of a full test in order; a single part passes only its own. */
  parts: string[];
  initialIndex: number;
  /** False when the learner comes back from the review to record one question again. */
  timed: boolean;
};

/**
 * One part of the Speaking test on a phone: the examiner reads the question, a big record button sits under the thumb,
 * the waveform shows the microphone is live. Recordings are kept per test on the device, so moving between questions and
 * parts (or closing the app) does not lose them. The part has a time; when it is over the learner can only move on.
 */
export function SpeakingRoom({ task, parts, initialIndex, timed }: Props) {
  const insets = useSafeAreaInsets();
  const total = task.questions.length;
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(total - 1, 0)));
  const question = task.questions[index];
  const cue = parseCueCard(question?.prompt ?? '');
  const [micLive, setMicLive] = useState(false);
  const voice = useExaminerVoice(question ? spokenPrompt(question.prompt) : '', micLive);
  const sessionId = task.packageVersionId;
  const recordings = useSessionRecordings(sessionId);
  const practiceSessionId = usePracticeSession('SPEAKING');
  const study = useStudySession('SPEAKING', practiceSessionId ?? '');
  const { setMediaActive } = study;
  const onActive = useCallback((active: boolean) => { setMediaActive(active); setMicLive(active); }, [setMediaActive]);
  const [opened] = useState(Date.now);
  const limit = timed && task.timeLimitSeconds ? task.timeLimitSeconds : null;
  // The clock ticks inside the header only; the room re-renders once, when the time is up.
  const readRemaining = useCallback(() => (limit ? Math.max(0, limit - Math.floor((Date.now() - opened) / 1000)) : 0), [limit, opened]);
  const [expired, setExpired] = useState(() => limit !== null && readRemaining() <= 0);
  useEffect(() => {
    if (limit === null || expired) return;
    const timer = setTimeout(() => setExpired(true), readRemaining() * 1000);
    return () => clearTimeout(timer);
  }, [limit, expired, readRemaining]);
  const position = parts.indexOf(task.sectionId);
  const nextPart = position >= 0 ? parts[position + 1] : undefined;
  const isLast = index >= total - 1;
  const partLabel = task.partNo ? `Part ${task.partNo}` : 'Speaking';
  // Opened from the review to record again, going back only returns to that review, which keeps its own guard.
  const guardOff = useLeaveTestGuard(timed && recordings.size > 0, 'Các bản ghi được giữ trên thiết bị này. Bạn có thể quay lại để nộp bài sau.', 'Tạm rời bài Speaking?');
  const answered = task.questions.filter((item) => recordings.has(item.questionVersionId)).length;
  const tint = colors.skill.speaking;

  const reviewParams = { packageVersionId: task.packageVersionId, parts: (parts.includes(task.sectionId) ? parts : [task.sectionId]).join(',') };
  const finish = () => {
    voice.stop();
    guardOff();
    // Opened from the review to record one question again: go back to that review instead of stacking another. At the
    // end of the test the review takes the room's place, so its back button leaves the test rather than reopening a part.
    if (!timed && router.canGoBack()) router.back();
    else router.replace({ pathname: '/practice/speaking-review/[packageVersionId]', params: reviewParams } as never);
  };
  const goNextPart = () => {
    if (!nextPart) return;
    voice.stop();
    guardOff();
    router.replace({ pathname: '/practice/speaking/[packageVersionId]/[sectionId]', params: { packageVersionId: task.packageVersionId, sectionId: nextPart, parts: parts.join(',') } } as never);
  };
  const exit = () => closeTest(CATALOG);

  return (
    <View className="flex-1 bg-canvas" onTouchStart={study.markActivity}>
      <ExamHeader
        title={`Speaking · ${partLabel}`}
        subtitle={task.title}
        readClock={limit !== null ? readRemaining : undefined}
        countdown
        onClose={exit}
        tint={tint}
        progress={total ? answered / total : undefined}
        right={
          <Pressable onPress={() => voice.setAutoRead(!voice.autoRead)} accessibilityRole="switch" accessibilityState={{ checked: voice.autoRead }} accessibilityLabel="Tự đọc câu hỏi" className="h-11 w-11 items-center justify-center">
            {voice.autoRead ? <Volume2 size={20} color={headerIconColor(tint)} /> : <VolumeX size={20} color={headerIconColor(tint)} />}
          </Pressable>
        }
      />
      {question ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {expired ? <Text weight="bold" className="mb-3 rounded-2xl p-3 text-sm" style={{ backgroundColor: colors.dangerSoft, color: colors.danger }}>Đã hết thời gian của phần này. Bản ghi của bạn được giữ lại, hãy chuyển sang bước tiếp theo.</Text> : null}
          <View className="rounded-3xl bg-surface p-5" style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge }}>
            <View className="flex-row items-center justify-between">
              <View className="rounded-full px-3 py-1" style={{ backgroundColor: colors.skill.speaking }}><Text weight="black" className="text-xs" style={{ color: '#ffffff' }}>{partLabel}</Text></View>
              {total > 1 ? <Text weight="bold" className="text-xs text-muted">Question {index + 1} / {total}</Text> : null}
            </View>
            {total > 1 ? (
              <View className="mt-3 flex-row gap-1.5">
                {task.questions.map((item, step) => (
                  <View key={item.questionVersionId} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: step === index ? colors.skill.speaking : recordings.has(item.questionVersionId) ? colors.success : colors.line }} />
                ))}
              </View>
            ) : null}
            <Text weight="black" className="mt-4 text-center text-2xl leading-8 text-ink" accessibilityRole="header">{cue.topic}</Text>
            {cue.points.length ? (
              <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: colors.canvas }}>
                <Text weight="bold" className="text-sm text-muted">You should say:</Text>
                {cue.points.map((point) => <Text key={point} className="mt-1 text-base leading-6 text-ink">•  {point}</Text>)}
              </View>
            ) : null}
            <View className="mt-4 flex-row justify-center">
              <Pressable onPress={voice.speaking ? voice.stop : voice.replay} disabled={micLive} accessibilityRole="button" accessibilityState={{ disabled: micLive }} className="min-h-11 flex-row items-center gap-2 rounded-full px-4" style={{ backgroundColor: colors.accentSoft, opacity: micLive ? 0.5 : 1 }}>
                {voice.speaking ? <Square size={14} color={colors.accentDeep} fill={colors.accentDeep} /> : <Volume2 size={17} color={colors.accentDeep} />}
                <Text weight="bold" style={{ color: colors.accentDeep }}>{voice.speaking ? 'Dừng đọc' : 'Nghe câu hỏi'}</Text>
              </Pressable>
            </View>
            {task.instructions ? <View className="mt-3 flex-row gap-2"><Info size={15} color={colors.muted} /><Text className="flex-1 text-xs leading-4 text-muted">{task.instructions}</Text></View> : null}
          </View>

          <RecorderCard
            key={question.questionVersionId}
            locked={expired}
            saved={recordings.get(question.questionVersionId) ?? null}
            onSaved={(recording) => saveRecording(sessionId, question.questionVersionId, recording)}
            onStart={voice.stop}
            onActive={onActive}
            maxSeconds={question.durationSeconds}
          />
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center p-8"><Text weight="bold" className="text-lg text-ink">Phần này chưa có câu hỏi</Text></View>
      )}

      <View className="flex-row gap-3 border-t border-line bg-surface px-3 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        {total > 1 ? <View className="flex-1"><Button label="Câu trước" variant="secondary" disabled={index === 0} icon={<ChevronLeft size={18} color={index === 0 ? colors.muted : colors.accentDeep} />} onPress={() => setIndex((current) => current - 1)} /></View> : null}
        <View className="flex-1">
          {!timed ? <Button label="Về xem lại" variant="success" icon={<Check size={18} color={colors.onAccent} />} onPress={finish} />
            : !isLast ? <Button label="Câu sau" icon={<ChevronRight size={18} color={colors.onAccent} />} onPress={() => setIndex((current) => current + 1)} />
            : nextPart ? <Button label="Phần tiếp" icon={<ChevronRight size={18} color={colors.onAccent} />} onPress={goNextPart} />
              : <Button label="Hoàn thành" variant="success" icon={<Check size={18} color={colors.onAccent} />} onPress={finish} />}
        </View>
      </View>
    </View>
  );
}

/** The recording studio of one question: waveform, speaking time, the big record button and playback. */
function RecorderCard({ saved, onSaved, onStart, onActive, locked, maxSeconds }: { saved: SavedRecording | null; onSaved: (recording: SavedRecording) => void; onStart: () => void; onActive: (active: boolean) => void; locked: boolean; maxSeconds: number | null }) {
  const recorder = useRecorder({ saved, onSaved });
  const recording = recorder.status === 'recording';
  const busy = recorder.status === 'requesting' || recorder.status === 'processing';
  const wait = recording && !locked ? Math.max(0, MIN_ANSWER_SECONDS - recorder.elapsed) : 0;
  const { stop } = recorder;

  useEffect(() => { onActive(recording); }, [recording, onActive]);
  useEffect(() => () => { onActive(false); }, [onActive]);
  useEffect(() => { if (locked && recording) void stop(); }, [locked, recording, stop]);
  useEffect(() => { if (recording && maxSeconds && recorder.elapsed >= maxSeconds) void stop(); }, [recording, maxSeconds, recorder.elapsed, stop]);

  const hint = recorder.status === 'requesting' ? 'Đang xin quyền dùng micro…'
    : recorder.status === 'processing' ? 'Đang lưu bản ghi…'
      : recording ? 'Chạm nút để dừng khi trả lời xong'
        : locked ? 'Đã hết thời gian của phần này'
          : recorder.status === 'recorded' ? 'Nghe lại, hoặc chạm nút để ghi lại'
            : 'Chạm vào micro để bắt đầu ghi âm';

  return (
    <View className="mt-4 items-center rounded-3xl bg-surface p-5" style={{ borderWidth: 2, borderColor: recording ? colors.danger : colors.line }}>
      <Waveform levels={recorder.levels} active={recording} />
      <Text weight="black" className="mt-2 text-3xl text-ink" style={{ fontVariant: ['tabular-nums'] }} accessibilityLabel={`Thời gian nói ${formatClock(recorder.elapsed)}`}>{formatClock(recorder.elapsed)}</Text>
      <Text className="text-xs text-muted">Speaking time{maxSeconds ? ` · tối đa ${formatClock(maxSeconds)}` : ''}</Text>
      {wait > 0 ? <Text className="mt-2 text-sm text-muted">Vui lòng đợi <Text weight="bold">{wait}</Text> giây để hoàn thành</Text> : null}
      <RecordButton
        recording={recording}
        busy={busy}
        disabled={busy || wait > 0 || (locked && !recording)}
        label={recording ? 'Dừng ghi âm' : recorder.status === 'recorded' ? 'Ghi lại' : 'Bắt đầu ghi âm'}
        onPress={() => {
          haptics.hold();
          if (recording) void recorder.stop();
          else { onStart(); void recorder.start(); }
        }}
      />
      <Text className="mt-1 text-center text-sm text-muted">{hint}</Text>
      {/* Busy too: playback must be silent before the microphone opens, or it is recorded into the answer. */}
      {recorder.recording ? <Playback uri={recorder.recording.uri} disabled={recording || busy} /> : null}
      {recorder.recording?.silent && recorder.status === 'recorded' ? <Text className="mt-3 text-center text-sm" style={{ color: colors.danger }}>Không thu được tiếng nói trong bản ghi này. Hãy kiểm tra micro (và bỏ tắt tiếng) rồi ghi lại.</Text> : null}
      {recorder.status === 'denied' ? (
        <View className="mt-3 items-center gap-2">
          <Text className="text-center text-sm" style={{ color: colors.danger }}>Ứng dụng chưa được phép dùng micro.</Text>
          <Button label="Mở Cài đặt" variant="secondary" icon={<Settings size={16} color={colors.accentDeep} />} onPress={recorder.openSettings} />
        </View>
      ) : null}
      {recorder.error ? <Text className="mt-3 text-center text-sm" style={{ color: colors.danger }}>{recorder.error}</Text> : null}
      <Text className="mt-3 text-center text-[11px] text-muted">Bản ghi chỉ lưu trên thiết bị này và chưa được gửi đi.</Text>
    </View>
  );
}

function Waveform({ levels, active }: { levels: number[]; active: boolean }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="h-14 w-full flex-row items-center justify-center" style={{ gap: 3 }}>
      {levels.map((level, index) => (
        <View key={index} style={{ width: 5, borderRadius: 3, height: Math.max(4, (active ? level : 0.05) * 56), backgroundColor: active ? colors.danger : colors.line }} />
      ))}
    </View>
  );
}

function RecordButton({ recording, busy, disabled, label, onPress }: { recording: boolean; busy: boolean; disabled: boolean; label: string; onPress: () => void }) {
  const reduce = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = recording && !reduce ? withRepeat(withTiming(1.12, { duration: 700 }), -1, true) : withTiming(1, { duration: 150 });
  }, [recording, reduce, pulse]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const tone = recording ? colors.danger : colors.skill.speaking;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} className="mt-4 items-center justify-center" style={{ width: 120, height: 120, opacity: disabled && !recording ? 0.5 : 1 }}>
      <Animated.View style={[{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: tone, opacity: 0.18 }, ring]} />
      <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: tone, alignItems: 'center', justifyContent: 'center' }}>
        {busy ? <ActivityIndicator color="#ffffff" /> : recording ? <Square size={30} color="#ffffff" fill="#ffffff" /> : <Mic size={38} color="#ffffff" />}
      </View>
    </Pressable>
  );
}

function Playback({ uri, disabled }: { uri: string; disabled: boolean }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  useEffect(() => { if (status.didJustFinish) void player.seekTo(0); }, [status.didJustFinish, player]);
  useEffect(() => { if (disabled && status.playing) player.pause(); }, [disabled, status.playing, player]);
  return (
    <Pressable
      disabled={disabled}
      onPress={() => { if (status.playing) player.pause(); else void playFromStart(player); }}
      accessibilityRole="button"
      className="mt-3 min-h-11 flex-row items-center gap-2 rounded-full px-5"
      style={{ borderWidth: 2, borderColor: colors.line, opacity: disabled ? 0.5 : 1 }}>
      {status.playing ? <Pause size={16} color={colors.ink} /> : <Play size={16} color={colors.ink} />}
      <Text weight="bold" className="text-ink">{status.playing ? 'Dừng phát' : 'Nghe lại'}</Text>
    </Pressable>
  );
}

