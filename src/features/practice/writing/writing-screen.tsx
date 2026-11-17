import { BookText, Lightbulb, Save, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { usePracticeSession } from '../api/practice-session';
import type { WritingMode, WritingTask } from '../api/writing';
import { ExamHeader } from '../components/exam-header';
import { ReaderSettingsSheet, useReaderPrefs } from '../components/reader-prefs';
import { Sheet } from '../components/sheet';
import { KeyboardShell, closeTest, useLeaveTestGuard } from '../components/test-shell';
import { WordLookupSheet } from '../components/word-lookup-sheet';
import { useStudySession } from '../hooks/use-study-session';
import { useTicker } from '../hooks/use-ticker';
import { boldRuns, countWords, essaySections, joinSections, loadDraft, saveDraft } from '../model/writing-text';
import { TaskPanel } from './task-panel';
import { useWritingGrade } from './use-writing-grade';

const CATALOG = '/practice/catalog/writing';
type Tab = 'task' | 'answer' | 'dictionary';

/** A draft written before the answer was split in parts holds the whole essay in one text; it goes in the first part. */
function restoreParts(saved: string[] | undefined, count: number) {
  if (!saved?.length) return Array.from({ length: count }, () => '');
  if (saved.length === count) return saved;
  return Array.from({ length: count }, (_, index) => (index === 0 ? saved.join('\n\n') : ''));
}

/** The model answer in the parts of the essay, without its ** marks; when it does not split into those parts it all goes first. */
function sampleParts(sample: string, count: number) {
  const paragraphs = sample.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const parts = paragraphs.length === count ? paragraphs : [sample.trim()];
  return Array.from({ length: count }, (_, index) => boldRuns(parts[index] ?? '').map((run) => run.text).join(''));
}

const TINT = colors.skill.writing;

/**
 * The header with the clock. The ticker lives here so the second-by-second update repaints only the header, not the
 * essay boxes and the grading sheets below it.
 */
function ClockHeader({ read, running, countdown, onZero, ...header }: {
  read: () => number; running: boolean; countdown: boolean; onZero?: () => void;
  title: string; subtitle: string; progress: number; onClose: () => void; onSettings: () => void;
}) {
  const seconds = useTicker(read, { running, onZero });
  return <ExamHeader {...header} seconds={running ? seconds : null} countdown={countdown} tint={TINT} />;
}

/**
 * Writing on a phone: the prompt, the answer and the dictionary are tabs, so the answer gets the whole screen above the
 * keyboard. Practice writes in parts with the guide and a model answer to compare; the exam is one box with a countdown
 * that locks the essay and opens grading when time is up. The draft is saved every 5 s and when the app goes to the
 * background.
 */
export function WritingScreen({ task, mode }: { task: WritingTask; mode: WritingMode }) {
  const exam = mode === 'exam';
  const draftKey = `${task.sectionId}:${mode}`;
  const parts = useMemo(() => (exam ? ['Bài viết'] : essaySections(task.task)), [exam, task.task]);
  const [texts, setTexts] = useState<string[]>(() => parts.map(() => ''));
  const [loaded, setLoaded] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [tab, setTab] = useState<Tab>('task');
  const [savedNotice, setSavedNotice] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  // The clock is read from these refs, never from state, so saving and grading always see the current time.
  const opened = useRef(Date.now());
  const baseSeconds = useRef(0);
  // The latest essay parts: the autosave, the background save and the time-up handler read it outside render.
  const latest = useRef(texts);
  const keepDraft = useRef(true);
  const insets = useSafeAreaInsets();
  const { text: textStyle, paper } = useReaderPrefs();
  const practiceSessionId = usePracticeSession('WRITING');
  const limit = task.timeLimitSeconds;
  const countdown = Boolean(exam && limit);

  useEffect(() => {
    let cancelled = false;
    void loadDraft(draftKey).then((found) => {
      if (cancelled) return;
      if (found) {
        const restored = restoreParts(found.texts, parts.length);
        // Set before `loaded` starts the clock: an exam reopened past its limit fires time-up on the first tick.
        latest.current = restored;
        baseSeconds.current = found.seconds ?? 0;
        setTexts(restored);
      }
      opened.current = Date.now();
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [draftKey, parts.length]);

  const elapsed = useCallback(() => baseSeconds.current + Math.floor((Date.now() - opened.current) / 1000), []);
  /** Seconds spent writing; an exam never counts past its limit. */
  const spent = useCallback(() => (exam && limit ? Math.min(limit, elapsed()) : elapsed()), [exam, limit, elapsed]);
  const readClock = useCallback(() => (exam && limit ? Math.max(0, limit - elapsed()) : elapsed()), [exam, limit, elapsed]);
  const snapshot = useCallback(() => ({ texts: latest.current, seconds: spent() }), [spent]);

  const essay = exam ? texts[0] ?? '' : joinSections(texts);
  const words = countWords(essay);
  const minWords = task.minWords ?? (task.task === 'TASK_2' ? 250 : 150);
  const sample = useMemo(() => (!exam && task.sampleAnswer?.trim() ? sampleParts(task.sampleAnswer, parts.length) : null), [exam, task.sampleAnswer, parts.length]);
  const hasText = texts.some((part) => part.trim());
  const study = useStudySession('WRITING', practiceSessionId ?? '', !timeUp);
  const guardOff = useLeaveTestGuard(hasText, 'Bài viết đã được lưu nháp trên thiết bị này. Bạn có thể quay lại viết tiếp.', 'Tạm rời bài viết?');
  const grade = useWritingGrade({ task, mode, draftKey, essay, seconds: spent, label: exam ? 'Thi thật' : 'Luyện tập', beforeLeave: () => { keepDraft.current = false; guardOff(); } });

  useEffect(() => {
    if (!loaded) return;
    const save = () => { if (keepDraft.current) void saveDraft(draftKey, snapshot()); };
    const timer = setInterval(save, 5000);
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') save(); });
    return () => { clearInterval(timer); subscription.remove(); save(); };
  }, [draftKey, loaded, snapshot]);

  function onTimeUp() {
    // The real test collects the answer sheet: keep what was written and go straight to the grading choice.
    setTimeUp(true);
    void saveDraft(draftKey, snapshot());
    if (countWords(latest.current[0] ?? '') > 0) grade.start();
  }

  const change = (index: number, value: string) => {
    if (showSample || timeUp) return;
    // Typing fires no touch event, so the study clock hears about it here.
    study.markActivity();
    setSavedNotice(false);
    const next = latest.current.map((part, partIndex) => (partIndex === index ? value : part));
    latest.current = next;
    setTexts(next);
  };

  const saveNow = () => { void saveDraft(draftKey, snapshot()); setSavedNotice(true); };
  const finish = () => { if (showSample) return; void saveDraft(draftKey, snapshot()); grade.start(); };

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'task', label: 'Đề bài' },
    { key: 'answer', label: `Bài viết · ${words} từ` },
    ...(!exam ? [{ key: 'dictionary' as const, label: 'Tra từ' }] : []),
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: paper.background }} onTouchStart={study.markActivity}>
      <ClockHeader
        title={`Writing ${task.task === 'TASK_2' ? 'Task 2' : 'Task 1'}`}
        subtitle={`${task.title} · ${exam ? 'Thi thật' : 'Luyện tập'}`}
        read={readClock}
        running={loaded}
        countdown={countdown}
        onZero={countdown ? onTimeUp : undefined}
        progress={Math.min(1, words / minWords)}
        onClose={() => closeTest(CATALOG)}
        onSettings={() => setSettingsOpen(true)}
      />
      <View className="flex-row border-b border-line bg-surface px-3 py-2" style={{ gap: 8 }}>
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable key={item.key} onPress={() => setTab(item.key)} accessibilityRole="tab" accessibilityState={{ selected: active }} className="min-h-11 flex-1 items-center justify-center rounded-xl px-1" style={{ backgroundColor: active ? TINT : colors.canvas, borderWidth: 1.5, borderColor: active ? TINT : colors.line }}>
              <Text weight="bold" numberOfLines={1} className="text-sm" style={{ color: active ? '#ffffff' : colors.muted }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {grade.pendingNotice}

      <KeyboardShell>
        {tab === 'task' ? (
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 32 }}>
            <TaskPanel task={task} showGuide={!exam} exam={exam} />
            <View className="mt-5"><Button label="Bắt đầu viết" icon={<BookText size={18} color={colors.onAccent} />} onPress={() => setTab('answer')} /></View>
          </ScrollView>
        ) : tab === 'dictionary' ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18 }}>
            <Text className="mb-3 text-sm text-muted">Tra nghĩa, phiên âm và ví dụ trong thư viện từ vựng.</Text>
            <View className="min-h-12 flex-row items-center gap-2 rounded-2xl bg-surface px-3" style={{ borderWidth: 2, borderColor: colors.line }}>
              <Search size={18} color={colors.muted} />
              <TextInput value={lookupQuery} onChangeText={setLookupQuery} maxLength={50} autoCapitalize="none" autoCorrect={false} placeholder="Nhập từ cần tra" placeholderTextColor={colors.muted} returnKeyType="search" onSubmitEditing={() => lookupQuery.trim() && setLookupWord(lookupQuery.trim())} accessibilityLabel="Từ cần tra" className="flex-1 text-base text-ink" />
            </View>
            <View className="mt-3"><Button label="Tra từ" disabled={!lookupQuery.trim()} onPress={() => setLookupWord(lookupQuery.trim())} /></View>
          </ScrollView>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
            {sample ? (
              <View className="mb-3 flex-row items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: colors.warmSoft }}>
                <Lightbulb size={18} color={colors.accentWarm} />
                <Text className="flex-1 text-sm text-ink">{showSample ? 'Đang xem bài mẫu (chỉ đọc). Bài của bạn vẫn được giữ.' : 'Bật để so với bài mẫu'}</Text>
                <Switch value={showSample} onValueChange={setShowSample} accessibilityLabel="Bài mẫu" />
              </View>
            ) : null}
            {timeUp ? <Text weight="bold" className="mb-3 text-sm text-danger">Hết giờ. Bài viết đã được khóa.</Text> : null}
            {parts.map((part, index) => (
              <View key={part} className="mb-3">
                {!exam ? <Text weight="bold" className="mb-1 text-sm text-muted">{part}</Text> : null}
                <TextInput
                  value={showSample && sample ? sample[index] ?? '' : texts[index] ?? ''}
                  onChangeText={(value) => change(index, value)}
                  editable={!showSample && !timeUp}
                  multiline
                  scrollEnabled={false}
                  autoCorrect={!exam}
                  spellCheck={!exam}
                  placeholder={exam ? 'Viết bài của bạn ở đây…' : `Viết phần ${part} của bạn ở đây…`}
                  placeholderTextColor={colors.muted}
                  accessibilityLabel={exam ? 'Bài viết của bạn' : `Phần ${part}`}
                  className="rounded-2xl p-3"
                  style={{ ...textStyle, color: paper.text, minHeight: exam ? 320 : 120, textAlignVertical: 'top', borderWidth: 2, borderColor: showSample ? colors.accentWarm : paper.line, backgroundColor: showSample ? colors.warmSoft : paper.background }}
                />
              </View>
            ))}
          </ScrollView>
        )}

        {tab === 'answer' ? (
          <View className="flex-row items-center gap-2 border-t border-line bg-surface px-3 py-2">
            <Text weight="bold" className="flex-1 text-sm" style={{ color: words >= minWords ? colors.success : colors.ink }}>{words}/{minWords} từ</Text>
            <Pressable onPress={() => setPromptOpen(true)} accessibilityRole="button" accessibilityLabel="Xem đề bài" className="min-h-11 flex-row items-center gap-1 rounded-full bg-canvas px-3">
              <BookText size={16} color={colors.ink} /><Text weight="bold" className="text-sm text-ink">Xem đề</Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardShell>

      <View className="flex-row gap-3 border-t border-line bg-surface px-3 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        {!exam ? <View className="flex-1"><Button label={savedNotice ? 'Đã lưu' : 'Lưu nháp'} variant="secondary" icon={<Save size={16} color={colors.accentDeep} />} disabled={showSample || !hasText} onPress={saveNow} /></View> : null}
        <View className="flex-1"><Button label={grade.checking ? 'Đang kiểm tra…' : 'Hoàn thành'} loading={grade.checking} disabled={words === 0 || showSample} onPress={finish} /></View>
      </View>

      <Sheet visible={promptOpen} onClose={() => setPromptOpen(false)} title="Đề bài"><TaskPanel task={task} showGuide={false} exam={exam} /></Sheet>
      <WordLookupSheet text={lookupWord} onClose={() => setLookupWord(null)} />
      <ReaderSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {grade.sheets}
    </View>
  );
}
