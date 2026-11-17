import { router } from 'expo-router';
import { Check, ChevronDown, ChevronUp, Highlighter, Settings2, X } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

import { ReaderSettingsSheet, useReaderPrefs } from '../components/reader-prefs';
import { SkillBand } from '../components/skill-band';
import { SectionTabs } from '../components/test-shell';
import { useResultData } from '../hooks/use-result-data';
import { useScrollToItem } from '../hooks/use-scroll-to-item';
import { PracticePlayer } from '../listening/audio-players';
import { locateEvidence, parseEvidence, type EvidenceRef } from '../model/evidence';
import { parseExplanation } from '../model/explanation-steps';
import { formatClockTime } from '../model/practice-analysis';
import type { ReadingResultItem } from '../model/result-view';
import { groupItems, rangeLabel, type TestSection } from '../model/sections';
import { scriptRows } from '../model/script-line';
import { PRACTICE_SKILL_CONFIG } from '../model/skill-config';
import { skillColor, skillInk } from '../model/skill-meta';
import type { Question } from '../model/types';

// The colours of the speakers of a script, as on the web; lighter on the dark theme.
const TONE_INK_LIGHT = ['#1d4ed8', '#c2410c', '#047857', '#6d28d9'];
const TONE_INK_DARK = ['#8fb0ff', '#ffad7a', '#5fd3a0', '#c4a8ff'];

type Verdict = 'correct' | 'wrong' | 'blank';
const verdictOf = (item: ReadingResultItem): Verdict => (item.yourAnswer === null ? 'blank' : item.correct === true ? 'correct' : 'wrong');
const VERDICT_LABEL: Record<Verdict, string> = { correct: 'đúng', wrong: 'sai', blank: 'bỏ trống' };
const sameAnswer = (a: string | null | undefined, b: string | null | undefined) => a != null && b != null && a.trim().toLowerCase() === b.trim().toLowerCase();
type ActiveEvidence = EvidenceRef & { itemId: string; source: string };

/**
 * Review of a submitted Reading/Listening attempt. On a phone the passage (or script) and the questions are two tabs;
 * "Xem trong bài" on an explanation switches to the passage and scrolls to the quoted sentence.
 */
export function ReviewScreen({ attemptId, skill }: { attemptId: string; skill: 'reading' | 'listening' }) {
  const data = useResultData(attemptId);
  const config = PRACTICE_SKILL_CONFIG[skill];
  const insets = useSafeAreaInsets();
  const { text, paper } = useReaderPrefs();
  const [activeIndex, setActiveIndex] = useState(0);
  const [tab, setTab] = useState<'questions' | 'passage'>('questions');
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<ActiveEvidence | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const questions = useScrollToItem(12);
  const passageScroll = useRef<ScrollViewInstance>(null);
  // Item layouts are relative to their group; the scroll offset is the group's y plus the item's y.
  const groupY = useRef(new Map<string, number>());
  const itemY = useRef(new Map<string, { group: string; y: number }>());
  const paragraphY = useRef<Record<number, number>>({});
  const pendingParagraph = useRef<number | null>(null);
  const tint = skillColor(skill);
  const ink = skillInk(skill);
  const dark = useTheme().isDark;

  const ready = data.data?.ready ? data.data : null;
  const sections = ready?.sections ?? [];
  const section: TestSection | undefined = sections[activeIndex];
  const itemById = useMemo(() => new Map((ready?.view.items ?? []).map((item) => [item.itemId, item])), [ready]);
  const parts = useMemo(() => {
    if (!section) return [];
    if (skill === 'listening') return (ready?.transcripts.get(section.id) ?? '').split('\n').filter(Boolean).map((line) => ({ label: null as string | null, text: line }));
    return (section.snapshot?.passage?.paragraphs ?? []).map((paragraph) => ({ label: paragraph.label ?? null, text: paragraph.text }));
  }, [section, skill, ready]);
  const rows = useMemo(() => (skill === 'listening' ? scriptRows(parts.map((part) => part.text)) : []), [parts, skill]);
  const activeEvidence = evidence && evidence.itemId === openItem ? evidence : null;
  const spot = useMemo(() => (activeEvidence ? locateEvidence(parts, activeEvidence) : null), [activeEvidence, parts]);

  if (data.isPending) return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent} /></View>;
  if (data.isError || !ready || !section) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Xem lại" fallbackHref={`/practice/catalog/${skill}`} />
        <EmptyState title="Chưa có nội dung để xem lại" message={data.error?.message} mood="oops" action={<Button label="Thử lại" variant="secondary" onPress={() => void data.refetch()} />} />
      </View>
    );
  }
  const view = ready.view;

  const publishItem = (id: string) => {
    const item = itemY.current.get(id);
    const offset = item ? groupY.current.get(item.group) : undefined;
    if (item && offset !== undefined) questions.onItemLayout(id, offset + item.y);
  };
  const scrollToParagraph = (index: number) => {
    const y = paragraphY.current[index];
    if (y === undefined) return false;
    passageScroll.current?.scrollTo({ y: Math.max(0, y - 40), animated: true });
    return true;
  };
  const backToResult = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/practice/result/[attemptId]', params: { attemptId, skill } } as never));

  const progress = sections.map((candidate) => {
    const own = candidate.items.flatMap((entry) => { const item = itemById.get(entry.id); return item ? [item] : []; });
    return { answered: own.filter((item) => item.correct === true).length, total: own.length };
  });

  const goTo = (item: ReadingResultItem) => {
    const target = sections.findIndex((candidate) => candidate.items.some((entry) => entry.id === item.itemId));
    const relayout = (target >= 0 && target !== activeIndex) || tab !== 'questions';
    if (target >= 0 && target !== activeIndex) setActiveIndex(target);
    setTab('questions');
    setOpenItem(item.itemId);
    questions.scrollToItem(item.itemId, relayout);
  };

  const showEvidence = (next: ActiveEvidence) => {
    setEvidence(next);
    const found = locateEvidence(parts, next);
    // From the questions tab the passage mounts first; its paragraph layout then performs the scroll.
    pendingParagraph.current = found ? found.index : null;
    if (found && tab === 'passage') requestAnimationFrame(() => { if (scrollToParagraph(found.index)) pendingParagraph.current = null; });
    setTab('passage');
  };

  const sectionLabel = (index: number) => `${config.partLabel} ${sections[index]?.partNo ?? index + 1}`;

  return (
    <View className="flex-1" style={{ backgroundColor: paper.background }}>
      <SkillBand
        color={tint}
        title={`Xem lại ${config.label}`}
        subtitle={`${view.counts.correct}/${view.items.length} câu đúng · ${formatClockTime(view.durationSeconds)}`}
        onBack={backToResult}
        right={
          <Pressable onPress={() => setSettingsOpen(true)} accessibilityRole="button" accessibilityLabel="Cài đặt hiển thị" className="h-11 w-11 items-center justify-center rounded-full active:opacity-70" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <Settings2 size={20} color="#ffffff" />
          </Pressable>
        }
      />
      <SectionTabs labels={sections.map((_, index) => sectionLabel(index))} progress={progress} countLabel="đúng" activeIndex={activeIndex} onSelect={(index) => { setActiveIndex(index); setEvidence(null); }} tint={tint} />
      <View className="flex-row border-b border-line bg-surface px-3 py-2" style={{ gap: 8 }}>
        {(['questions', 'passage'] as const).map((value) => (
          <Pressable key={value} onPress={() => setTab(value)} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} className="min-h-11 flex-1 items-center justify-center rounded-xl" style={{ backgroundColor: tab === value ? `${tint}1f` : colors.canvas, borderWidth: 1.5, borderColor: tab === value ? tint : 'transparent' }}>
            <Text weight="bold" style={{ color: tab === value ? ink : colors.muted }}>{value === 'questions' ? 'Câu hỏi & đáp án' : skill === 'listening' ? 'Transcript' : 'Bài đọc'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'passage' ? (
        <View className="flex-1">
          {skill === 'listening' && section.snapshot?.audio ? <View><PracticePlayer key={section.id} src={section.snapshot.audio.mediaUrl} durationHint={section.snapshot.audio.durationSeconds} compact /></View> : null}
          <ScrollView ref={passageScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text weight="extrabold" className="mb-3" style={{ fontSize: text.fontSize + 2, color: paper.text }}>{section.snapshot?.title ?? sectionLabel(activeIndex)}</Text>
            {parts.length === 0 ? <Text className="text-sm text-muted">{skill === 'listening' ? 'Section này chưa có transcript.' : 'Passage này chưa có nội dung.'}</Text> : null}
            {parts.map((part, index) => {
              const row = rows[index];
              const offset = row?.offset ?? 0;
              const body = part.text.slice(offset);
              const mark = spot && spot.index === index ? { start: Math.max(0, spot.start - offset), end: Math.max(0, spot.end - offset) } : null;
              // Each speaker of a recording has a colour; the name shows when the speaker changes and the words sit in a bubble.
              const toneInk = row && row.tone !== null ? (dark ? TONE_INK_DARK : TONE_INK_LIGHT)[row.tone] : null;
              return (
                <View key={index} className={row?.showName && index > 0 ? 'mb-1.5 mt-3' : 'mb-1.5'} onLayout={(event) => {
                  paragraphY.current[index] = event.nativeEvent.layout.y;
                  if (pendingParagraph.current === index) requestAnimationFrame(() => { if (pendingParagraph.current === index && scrollToParagraph(index)) pendingParagraph.current = null; });
                }}>
                  {row?.showName && row.speaker ? <Text weight="black" className="mb-1 ml-1 text-xs uppercase tracking-wider" style={{ color: toneInk ?? ink }}>{row.speaker}</Text> : null}
                  <View className={toneInk ? 'self-start rounded-2xl px-3 py-2' : undefined} style={toneInk ? { backgroundColor: `${toneInk}1f`, maxWidth: '94%' } : undefined}>
                    <Text style={{ ...text, color: paper.text }}>
                      {part.label ? <Text weight="extrabold">{part.label}. </Text> : null}
                      {mark ? <>{body.slice(0, mark.start)}<Text style={{ backgroundColor: colors.successSoft, textDecorationLine: 'underline' }}>{body.slice(mark.start, mark.end)}</Text>{body.slice(mark.end)}</> : body}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <ScrollView ref={questions.scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 20 }}>
          {groupItems(section).map((group) => (
            <View key={group.key} className="gap-3" onLayout={(event) => { groupY.current.set(group.key, event.nativeEvent.layout.y); group.items.forEach((entry) => publishItem(entry.id)); }}>
              <View>
                <Text weight="extrabold" style={{ fontSize: text.fontSize, color: paper.text }}>{rangeLabel(group.items.map((entry) => itemById.get(entry.id)?.number ?? 0))}</Text>
                {group.instructions ? <Text className="mt-1 text-sm" style={{ color: paper.text, opacity: 0.85 }}>{group.instructions}</Text> : null}
              </View>
              {group.items.map((entry) => {
                const item = itemById.get(entry.id);
                if (!item || !entry.question) return null;
                return (
                  <View key={entry.id} onLayout={(event) => { itemY.current.set(entry.id, { group: group.key, y: event.nativeEvent.layout.y }); publishItem(entry.id); }}>
                    <ReviewQuestion
                      item={item}
                      question={entry.question}
                      open={openItem === entry.id}
                      onToggle={() => setOpenItem((current) => (current === entry.id ? null : entry.id))}
                      activeSource={activeEvidence?.itemId === entry.id ? activeEvidence.source : null}
                      onEvidence={(ref, source) => showEvidence({ ...ref, itemId: entry.id, source })}
                      sourceLabel={skill === 'listening' ? 'Xem trong transcript' : 'Xem trong bài đọc'}
                      ink={ink}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      <View className="border-t border-line bg-surface" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 8 }}>
          {view.items.map((item) => {
            const verdict = verdictOf(item);
            const tone = verdict === 'correct' ? colors.success : verdict === 'wrong' ? colors.danger : colors.muted;
            return (
              <Pressable key={item.itemId} onPress={() => goTo(item)} accessibilityRole="button" accessibilityLabel={`Câu ${item.number}, ${VERDICT_LABEL[verdict]}`} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: verdict === 'blank' ? colors.surface : tone, borderWidth: 2, borderColor: openItem === item.itemId ? colors.ink : tone }}>
                <Text weight="extrabold" className="text-sm" style={{ color: verdict === 'blank' ? colors.ink : '#ffffff' }}>{item.number}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View className="flex-row gap-3 px-3">
          <View className="flex-1"><Button label="Kết quả" variant="secondary" onPress={backToResult} /></View>
          <View className="flex-1"><Button label="Bài khác" onPress={() => router.replace(`/practice/catalog/${skill}` as never)} /></View>
        </View>
      </View>
      <ReaderSettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

function ReviewQuestion({ item, question, open, onToggle, activeSource, onEvidence, sourceLabel, ink }: {
  item: ReadingResultItem;
  question: Question;
  open: boolean;
  onToggle: () => void;
  activeSource: string | null;
  onEvidence: (ref: EvidenceRef, source: string) => void;
  sourceLabel: string;
  /** Skill colour readable on the surface, for the explanation toggle. */
  ink: string;
}) {
  const { text, paper } = useReaderPrefs();
  const verdict = verdictOf(item);
  const tone = verdict === 'correct' ? colors.success : verdict === 'wrong' ? colors.danger : colors.muted;
  const hasKey = item.correctAnswer !== undefined;
  const parsed = open ? parseExplanation(item.explanation) : null;
  return (
    <View className="rounded-2xl p-3" style={{ borderWidth: 2, borderColor: tone, backgroundColor: paper.background }}>
      <View className="flex-row items-start gap-2">
        <View className="mt-0.5 h-7 min-w-7 items-center justify-center rounded-full px-1.5" style={{ backgroundColor: tone }}>
          <Text weight="extrabold" className="text-xs" style={{ color: '#ffffff' }} accessibilityLabel={`Câu ${item.number}, ${VERDICT_LABEL[verdict]}`}>{item.number}</Text>
        </View>
        <Text className="flex-1" style={{ ...text, color: paper.text }}>{question.prompt}</Text>
      </View>
      {question.options ? (
        <View className="mt-3 gap-1.5">
          {question.options.map((option) => {
            const chosen = sameAnswer(item.yourAnswer, option.value);
            const right = sameAnswer(item.correctAnswer, option.value);
            const color = right ? colors.success : chosen ? colors.danger : paper.line;
            return (
              <View key={option.value} className="min-h-11 flex-row items-center gap-2 rounded-xl px-3 py-2" style={{ borderWidth: 1.5, borderColor: color, backgroundColor: right ? colors.successSoft : chosen ? colors.dangerSoft : 'transparent' }}>
                {option.label !== option.value && option.value.length <= 2 ? <Text weight="extrabold" className="text-sm text-ink">{option.value}</Text> : null}
                <Text className="flex-1 text-sm" style={{ color: paper.text }}>{option.label}</Text>
                {chosen ? (right ? <Check size={16} color={colors.success} /> : <X size={16} color={colors.danger} />) : right ? <Text weight="bold" className="text-[11px]" style={{ color: colors.success }}>Đáp án</Text> : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View className="mt-3 gap-1">
          <Text className="text-sm text-ink">Bạn điền: <Text weight="bold" style={{ color: tone }}>{item.yourAnswer ?? '(bỏ trống)'}</Text></Text>
          {hasKey && verdict !== 'correct' ? <Text className="text-sm text-ink">Đáp án đúng: <Text weight="bold" style={{ color: colors.success }}>{item.correctAnswer}</Text></Text> : null}
        </View>
      )}
      {item.explanation || hasKey ? (
        <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} className="mt-2 min-h-11 flex-row items-center gap-1 self-start">
          <Text weight="bold" className="text-sm" style={{ color: ink }}>{open ? 'Ẩn giải thích' : 'Xem giải thích'}</Text>
          {open ? <ChevronUp size={16} color={ink} /> : <ChevronDown size={16} color={ink} />}
        </Pressable>
      ) : null}
      {parsed ? (
        <View className="mt-1 gap-3 rounded-xl p-3" style={{ backgroundColor: colors.canvas }}>
          <Text className="text-sm text-ink">
            {verdict === 'blank' ? 'Bạn đã bỏ trống câu này.' : <>Bạn chọn: <Text weight="bold">{item.yourAnswer}</Text></>}
            {hasKey ? <> · Đáp án đúng: <Text weight="bold" style={{ color: colors.success }}>{item.correctAnswer}</Text></> : null}
          </Text>
          {parsed.steps.map((step) => (
            <View key={step.number} className="gap-1">
              <Text weight="extrabold" className="text-sm text-ink">Bước {step.number} · {step.title}</Text>
              {step.lines.map((line) => {
                if (line.kind === 'bullet') return <Text key={line.text} className="text-sm leading-5 text-ink">• {line.text}</Text>;
                const reference = line.kind === 'evidence' ? parseEvidence(line.text) : null;
                if (!reference) return <Text key={line.text} className="text-sm leading-5 text-ink">{line.text}</Text>;
                const active = activeSource === line.text;
                return (
                  <View key={line.text} className="gap-1">
                    <Text className="text-sm italic leading-5 text-ink">{line.text}</Text>
                    <Pressable onPress={() => onEvidence(reference, line.text)} accessibilityRole="button" className="min-h-11 flex-row items-center gap-1.5 self-start rounded-full px-3" style={{ backgroundColor: active ? colors.successSoft : colors.surface, borderWidth: 1.5, borderColor: colors.success }}>
                      <Highlighter size={14} color={colors.success} />
                      <Text weight="bold" className="text-xs" style={{ color: colors.success }}>{sourceLabel}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
          {!parsed.steps.length ? <Text className="text-sm leading-5 text-ink">{parsed.plain || 'Câu này chưa có phần giải thích.'}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
