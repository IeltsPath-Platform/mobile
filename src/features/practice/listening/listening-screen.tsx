import { StickyNote } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { ReadingAttempt } from '../api/attempts';
import { ExamHeader, headerIconColor } from '../components/exam-header';
import { MarkingSheets } from '../components/marking-overlays';
import { SelectionCallout } from '../components/selection-callout';
import { QuestionGridSheet, QuestionStrip } from '../components/question-nav';
import { QuestionGroups } from '../components/question-groups';
import { ReaderSettingsSheet, useReaderPrefs } from '../components/reader-prefs';
import { SubmitSheet } from '../components/submit-sheet';
import { KeyboardShell, SectionTabs, TestFooter, closeTest, useLeaveTestGuard } from '../components/test-shell';
import { useAnnotations } from '../hooks/use-annotations';
import { useScrollToItem } from '../hooks/use-scroll-to-item';
import { useStudySession } from '../hooks/use-study-session';
import { useTestRunner } from '../hooks/use-test-runner';
import { useTextMarking } from '../hooks/use-text-marking';
import { readPlayedSections, writePlayedSections } from '../model/exam-playback';
import { blockOrderOf } from '../model/mark-blocks';
import { groupItems, type SavedResponse, type TestSection } from '../model/sections';
import { ExamPlayer, PracticePlayer } from './audio-players';
import { SectionHeader } from './section-header';

const CATALOG = '/practice/catalog/listening';
const TINT = colors.skill.listening;

/**
 * Listening test: the recording docked under the header (full controls in practice, play-once in the exam), the
 * questions of the open section below, and the question strip with submit at the bottom.
 */
export function ListeningScreen({ attemptId, attempt, sections, saved }: { attemptId: string; attempt: ReadingAttempt; sections: TestSection[]; saved: SavedResponse[] }) {
  const runner = useTestRunner({ attemptId, attempt, sections, saved, skill: 'listening' });
  const { paper } = useReaderPrefs();
  const study = useStudySession('ASSESSMENT', attemptId);
  const annotations = useAnnotations(attemptId);
  const section = runner.section;
  const textOf = useCallback((block: string) => {
    if (block.startsWith('q:')) return runner.items.find((entry) => entry.item.id === block.slice(2))?.item.question?.prompt ?? '';
    if (block.startsWith('g:') && section) return groupItems(section).find((group) => group.key === block.slice(2))?.instructions ?? '';
    return '';
  }, [runner.items, section]);
  // As on the web, Listening has Highlight and Notes but no word lookup.
  const lookupEnabled = false;
  const blockOrder = useMemo(() => blockOrderOf(section), [section]);
  const marking = useTextMarking({ annotations, sectionId: section?.id ?? '', textOf, blockOrder, lookupEnabled });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [played, setPlayed] = useState<ReadonlySet<string> | null>(runner.timed ? null : new Set());
  const questions = useScrollToItem(12);
  const scroll = questions.scrollRef;
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardOff = useLeaveTestGuard(!runner.submitting);

  useEffect(() => { if (runner.timed) void readPlayedSections(attemptId).then(setPlayed); }, [attemptId, runner.timed]);
  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, [runner.activeIndex]);

  const label = (index: number) => `${runner.timed ? 'Part' : 'Section'} ${sections[index]?.partNo ?? index + 1}`;
  const sectionLabels = sections.map((_, index) => label(index));

  const select = (itemId: string) => {
    const sameSection = runner.navQuestions.find((question) => question.id === itemId)?.sectionIndex === runner.activeIndex;
    runner.goTo(itemId);
    questions.scrollToItem(itemId, !sameSection);
  };

  // One object for every question, so the memoised question text is not redrawn on each keystroke.
  const markable = useMemo(() => ({ highlights: annotations.highlights, selection: marking.selection, onWordPress: marking.onWordPress, onWordLongPress: marking.onWordLongPress }),
    [annotations.highlights, marking.selection, marking.onWordPress, marking.onWordLongPress]);

  const markPlayed = useCallback((sectionId: string) => {
    setPlayed((current) => {
      const next = new Set(current ?? []).add(sectionId);
      void writePlayedSections(attemptId, next);
      return next;
    });
  }, [attemptId]);

  /** The recording of a part is over: after a short pause the next part opens and its recording starts. */
  const audioEnded = useCallback((endedIndex: number) => {
    const next = endedIndex + 1;
    if (next >= sections.length) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => { runner.selectSection(next); scroll.current?.scrollTo({ y: 0, animated: false }); }, 2000);
  }, [sections.length, runner.selectSection, scroll]);

  const submit = async () => {
    guardOff();
    const ok = await runner.submit();
    if (ok) annotations.clearAll();
  };

  if (!section) return null;
  const audio = section.snapshot?.audio;
  const sectionQuestions = runner.navQuestions.filter((question) => question.sectionIndex === runner.activeIndex);
  const numbers = sectionQuestions.map((question) => question.number);

  return (
    <View className="flex-1" style={{ backgroundColor: paper.background }} onTouchStart={study.markActivity}>
      <ExamHeader
        title={`Listening · ${label(runner.activeIndex)}`}
        subtitle={runner.timed ? 'Thi thật · nghe một lần' : 'Luyện tập'}
        readClock={runner.readClock}
        countdown={runner.timed}
        tint={TINT}
        progress={runner.navQuestions.length ? (runner.navQuestions.length - runner.unanswered) / runner.navQuestions.length : 0}
        onClose={() => closeTest(CATALOG)}
        onSettings={() => setSettingsOpen(true)}
        right={
          <Pressable onPress={marking.openNotes} accessibilityRole="button" accessibilityLabel={`Ghi chú, ${annotations.notes.filter((note) => note.sectionId === section.id).length} ghi chú`} hitSlop={6} className="h-11 w-9 items-center justify-center">
            <StickyNote size={20} color={headerIconColor(TINT)} />
          </Pressable>
        }
      />
      <SectionTabs labels={sectionLabels} progress={runner.sectionProgress} activeIndex={runner.activeIndex} onSelect={(index) => { runner.selectSection(index); scroll.current?.scrollTo({ y: 0, animated: false }); }} tint={TINT} />
      <View>
        {!audio ? <Text className="px-4 py-3 text-sm text-danger">Phần này chưa có bài nghe.</Text>
          : runner.timed ? (played ? (
            <ExamPlayer key={section.id} label={`Bài nghe ${label(runner.activeIndex)}`} src={audio.mediaUrl} alreadyPlayed={played.has(section.id)} onStarted={() => markPlayed(section.id)} onEnded={() => audioEnded(runner.activeIndex)} onPlayingChange={study.setMediaActive} />
          ) : null)
          : <PracticePlayer key={section.id} label={`Bài nghe ${label(runner.activeIndex)}`} src={audio.mediaUrl} durationHint={audio.durationSeconds} onPlayingChange={study.setMediaActive} />}
      </View>

      <KeyboardShell>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" onScrollBeginDrag={marking.hideMenu} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 32 }}>
          {runner.timed
            ? (numbers.length ? <Text weight="bold" className="mb-3 px-1 text-xs uppercase tracking-wider text-muted">Nghe và trả lời câu {numbers[0]}–{numbers[numbers.length - 1]}</Text> : null)
            : <SectionHeader label={label(runner.activeIndex)} title={section.snapshot?.title ?? label(runner.activeIndex)} instructions={section.snapshot?.instructions ?? null} numbers={numbers} answered={sectionQuestions.filter((question) => question.answered).length} />}
          <QuestionGroups
            section={section}
            numberByItem={runner.numberByItem}
            answers={runner.answers.answers}
            disabled={runner.submitting}
            flagged={runner.flagged}
            activeId={runner.currentId}
            onChange={runner.answers.setAnswer}
            onBlur={(itemId) => { void runner.answers.saveAnswer(itemId); }}
            onFocusItem={runner.setCurrentId}
            onToggleFlag={runner.toggleFlag}
            onItemLayout={questions.onItemLayout}
            tint={TINT}
            markable={markable}
          />
          {runner.answers.failed > 0 ? <Text className="mt-4 text-sm text-danger">{runner.answers.failed} câu chưa lưu được. Ứng dụng sẽ thử lại khi bạn nộp bài.</Text> : null}
        </ScrollView>
      </KeyboardShell>

      <TestFooter tint={TINT} onSubmit={() => setSubmitOpen(true)} unanswered={runner.unanswered} submitting={runner.submitting}>
        <QuestionStrip tint={TINT} questions={runner.navQuestions} currentId={runner.currentId} onSelect={select} onOpenGrid={() => setGridOpen(true)} />
      </TestFooter>

      <ReaderSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <QuestionGridSheet tint={TINT} visible={gridOpen} onClose={() => setGridOpen(false)} questions={runner.navQuestions} sectionLabels={sectionLabels} currentId={runner.currentId} onSelect={select} />
      <SubmitSheet
        visible={submitOpen || runner.expired}
        onClose={() => setSubmitOpen(false)}
        onSubmit={() => void submit()}
        total={runner.navQuestions.length}
        unanswered={runner.unanswered}
        flagged={runner.flagged.size}
        unsaved={runner.answers.failed}
        submitting={runner.submitting}
        error={runner.submitError}
        timed={runner.timed}
        expired={runner.expired}
      />
      <MarkingSheets marking={marking} annotations={annotations} sectionId={section.id} sectionLabel={label(runner.activeIndex)} />
      <SelectionCallout marking={marking} lookupEnabled={lookupEnabled} />
    </View>
  );
}

