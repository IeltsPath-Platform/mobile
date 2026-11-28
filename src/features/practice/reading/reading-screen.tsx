import { Lightbulb, StickyNote } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { ReadingAttempt } from '../api/attempts';
import { ExamHeader, headerIconColor } from '../components/exam-header';
import { MarkingSheets } from '../components/marking-overlays';
import { SelectionCallout } from '../components/selection-callout';
import { QuestionGridSheet, QuestionStrip } from '../components/question-nav';
import { QuestionGroups } from '../components/question-groups';
import { ReaderSettingsSheet, useReaderPrefs } from '../components/reader-prefs';
import { SnapPanel, type SnapPanelHandle } from '../components/snap-panel';
import { SubmitSheet } from '../components/submit-sheet';
import type { PlacementRun } from '../components/placement-run';
import { KeyboardShell, SectionTabs, TestFooter, closeTest, leaveToCatalog, unsavedAnswersMessage, useLeaveTestGuard } from '../components/test-shell';
import { useAnnotations } from '../hooks/use-annotations';
import { useScrollToItem } from '../hooks/use-scroll-to-item';
import { useStudySession } from '../hooks/use-study-session';
import { useTestRunner } from '../hooks/use-test-runner';
import { useTextMarking } from '../hooks/use-text-marking';
import { blockOrderOf } from '../model/mark-blocks';
import { groupItems, type SavedResponse, type TestSection } from '../model/sections';
import { PassageView } from './passage-view';

const DEFAULT_CATALOG = '/practice/catalog/reading';
const TINT = colors.skill.reading;
const COACH_KEY_SEEN = { current: false };

/**
 * Reading test on a phone: the passage fills the screen, the questions live in a panel dragged between peek / half /
 * full. Long-press words to highlight or note them; in practice mode a tap looks a word up.
 */
export function ReadingScreen({ attemptId, attempt, sections, saved, placement }: { attemptId: string; attempt: ReadingAttempt; sections: TestSection[]; saved: SavedResponse[]; /** Set when this is one skill of a placement test. */ placement?: PlacementRun }) {
  const CATALOG = placement?.exitHref ?? DEFAULT_CATALOG;
  const runner = useTestRunner({ attemptId, attempt, sections, saved, skill: 'reading', onFinish: placement?.onFinish });
  const insets = useSafeAreaInsets();
  const { paper } = useReaderPrefs();
  const study = useStudySession('ASSESSMENT', attemptId);
  const annotations = useAnnotations(attemptId);
  const section = runner.section;
  const lookupEnabled = !runner.timed;

  const textOf = useCallback((block: string) => {
    if (block.startsWith('p:')) {
      const [, sectionId, index] = block.split(':');
      const owner = sections.find((candidate) => candidate.id === sectionId);
      return owner?.snapshot?.passage?.paragraphs[Number(index)]?.text ?? '';
    }
    if (block.startsWith('q:')) return runner.items.find((entry) => entry.item.id === block.slice(2))?.item.question?.prompt ?? '';
    if (block.startsWith('g:') && section) return groupItems(section).find((group) => group.key === block.slice(2))?.instructions ?? '';
    return '';
  }, [sections, runner.items, section]);
  const blockOrder = useMemo(() => blockOrderOf(section), [section]);
  const marking = useTextMarking({ annotations, sectionId: section?.id ?? '', textOf, blockOrder, lookupEnabled });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [coach, setCoach] = useState(!COACH_KEY_SEEN.current);
  const panel = useRef<SnapPanelHandle>(null);
  const passageScroll = useRef<ScrollViewInstance>(null);
  const questions = useScrollToItem(8);
  const guardOff = useLeaveTestGuard(!runner.submitting && !runner.closed, unsavedAnswersMessage(runner.answers.failed));

  const label = (index: number) => `Passage ${sections[index]?.partNo ?? index + 1}`;
  const sectionLabels = sections.map((_, index) => label(index));
  const current = runner.navQuestions.find((question) => question.id === runner.currentId);

  const select = (itemId: string) => {
    const sameSection = runner.navQuestions.find((question) => question.id === itemId)?.sectionIndex === runner.activeIndex;
    runner.goTo(itemId);
    if (!sameSection) passageScroll.current?.scrollTo({ y: 0, animated: false });
    panel.current?.snapTo(1);
    questions.scrollToItem(itemId, !sameSection);
  };

  // One object for every question, so the memoised question text is not redrawn on each keystroke.
  const markable = useMemo(() => ({ highlights: annotations.highlights, selection: marking.selection, onWordPress: marking.onWordPress, onWordLongPress: marking.onWordLongPress }),
    [annotations.highlights, marking.selection, marking.onWordPress, marking.onWordLongPress]);

  const focusItem = (itemId: string) => {
    runner.setCurrentId(itemId);
    const item = runner.items.find((entry) => entry.item.id === itemId)?.item;
    // Typing needs room above the keyboard: a gap-fill question opens the panel fully.
    if (item?.question && !item.question.options) panel.current?.snapTo(2);
  };

  const submit = async () => {
    guardOff();
    const ok = await runner.submit();
    if (ok) annotations.clearAll();
  };

  if (!section) return null;
  const passage = section.snapshot?.passage ?? { title: '', paragraphs: [] };

  return (
    <View className="flex-1" style={{ backgroundColor: paper.background }} onTouchStart={study.markActivity}>
      <ExamHeader
        title={`Reading · ${label(runner.activeIndex)}`}
        subtitle={placement ? 'Kiểm tra trình độ' : runner.timed ? 'Thi thật' : 'Luyện tập'}
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
      <SectionTabs labels={sectionLabels} progress={runner.sectionProgress} activeIndex={runner.activeIndex} onSelect={(index) => { runner.selectSection(index); passageScroll.current?.scrollTo({ y: 0, animated: false }); }} tint={TINT} />

      <KeyboardShell>
        <View className="flex-1">
          <ScrollView ref={passageScroll} contentContainerStyle={{ padding: 18, paddingBottom: 420 }} onScrollBeginDrag={() => { Keyboard.dismiss(); marking.hideMenu(); }}>
            {coach ? (
              <View className="mb-5 flex-row gap-3 rounded-3xl p-3.5" style={{ backgroundColor: colors.warmSoft }}>
                <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.surface }}><Lightbulb size={18} color={colors.accentWarm} /></View>
                <View className="flex-1">
                  <Text className="text-[13px] leading-5 text-ink">
                    <Text weight="bold">Nhấn giữ</Text> một từ để chọn, rồi chạm từ cuối để chọn cả đoạn và mở menu Highlight, Ghi chú, Dịch.{lookupEnabled ? ' Chạm một từ để tra nghĩa nhanh.' : ''} Chạm vào chữ đã highlight để bỏ cả cụm. Kéo bảng câu hỏi lên xuống để đọc song song.
                  </Text>
                  <Pressable onPress={() => { COACH_KEY_SEEN.current = true; setCoach(false); }} accessibilityRole="button" hitSlop={8} className="mt-1.5 self-start">
                    <Text weight="black" className="text-xs" style={{ color: colors.accentWarm }}>ĐÃ HIỂU</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            <PassageView
              sectionId={section.id}
              tint={TINT}
              title={section.snapshot?.title ?? label(runner.activeIndex)}
              instructions={section.snapshot?.instructions}
              passage={passage}
              highlights={annotations.highlights}
              selection={marking.selection}
              onWordPress={marking.onWordPress}
              onWordLongPress={marking.onWordLongPress}
            />
          </ScrollView>

          <SnapPanel ref={panel} tint={TINT} onSnap={marking.hideMenu} title={current ? `Câu ${current.number} / ${runner.navQuestions.length} · đã làm ${runner.navQuestions.length - runner.unanswered}` : 'Câu hỏi'}>
            <ScrollView ref={questions.scrollRef} keyboardShouldPersistTaps="handled" onScrollBeginDrag={marking.hideMenu} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 + insets.bottom }}>
              <QuestionGroups
                section={section}
                numberByItem={runner.numberByItem}
                answers={runner.answers.answers}
                disabled={runner.submitting}
                flagged={runner.flagged}
                activeId={runner.currentId}
                onChange={runner.answers.setAnswer}
                onBlur={(itemId) => { void runner.answers.saveAnswer(itemId); }}
                onFocusItem={focusItem}
                onToggleFlag={runner.toggleFlag}
                onItemLayout={questions.onItemLayout}
                tint={TINT}
                showTips={!runner.timed}
                markable={markable}
              />
              {runner.answers.failed > 0 ? <Text className="mt-4 text-sm text-danger">{runner.answers.failed} câu chưa lưu được. Ứng dụng sẽ thử lại khi bạn nộp bài.</Text> : null}
            </ScrollView>
          </SnapPanel>
        </View>
      </KeyboardShell>

      <TestFooter tint={TINT} onSubmit={() => setSubmitOpen(true)} unanswered={runner.unanswered} submitting={runner.submitting}>
        <QuestionStrip tint={TINT} questions={runner.navQuestions} currentId={runner.currentId} onSelect={select} onOpenGrid={() => setGridOpen(true)} />
      </TestFooter>

      <ReaderSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <QuestionGridSheet tint={TINT} visible={gridOpen} onClose={() => setGridOpen(false)} questions={runner.navQuestions} sectionLabels={sectionLabels} currentId={runner.currentId} onSelect={select} />
      <SubmitSheet
        visible={submitOpen || runner.expired || runner.closed}
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
        closed={runner.closed}
        onExit={() => leaveToCatalog(CATALOG)}
        note={placement ? 'Sau khi nộp, bạn không sửa được phần này. Kết quả có khi làm xong cả 4 kỹ năng.' : undefined}
      />
      <MarkingSheets marking={marking} annotations={annotations} sectionId={section.id} sectionLabel={label(runner.activeIndex)} />
      <SelectionCallout marking={marking} lookupEnabled={lookupEnabled} />
    </View>
  );
}
