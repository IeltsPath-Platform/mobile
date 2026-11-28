import { Check, ChevronRight, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { Sheet } from '@/src/features/practice/components/sheet';
import { openOnWeb, WEB_APP_URL } from '@/src/features/practice/api/learning-links';
import { colors } from '@/src/theme';

import type { CourseSummary, LearningGoal, PlacementReportSection, PlacementResult, PlacementSkill } from './api';
import { SKILL_LABEL } from './model';
import { CRITERION_NAMES, daysUntil, feasibility, formatExamMonth, hoursPerWeek, SPEAKING_REVIEW } from './report';

const SKILLS: PlacementSkill[] = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];
const SPEAKING_CRITERIA: Record<string, string> = { FC: 'Fluency & Coherence', LR: 'Lexical Resource', GRA: 'Grammatical Range & Accuracy', PR: 'Pronunciation' };

/** The band of each skill: the grade when there is one, else the mean of the graded essays (graded after the overall band). */
export function skillBands(result: PlacementResult) {
  const bands = new Map(result.skills.map((entry) => [entry.skill, entry.band]));
  if (!bands.has('WRITING')) {
    const essays = result.sections.flatMap((section) => section.essays).map((essay) => essay.band).filter((band): band is number => band != null);
    if (essays.length) bands.set('WRITING', essays.reduce((sum, band) => sum + band, 0) / essays.length);
  }
  return bands;
}

/* ---------- Scoreboard ---------- */

/** One line per skill: its name, a bar out of band 9 and the band. Ungraded skills say so instead of showing 0. */
export function SkillBars({ bands }: { bands: Map<PlacementSkill, number> }) {
  return (
    <View className="gap-3.5">
      {SKILLS.map((skill) => {
        const band = bands.get(skill);
        return (
          <View key={skill} className="flex-row items-center gap-3" accessible accessibilityLabel={`${SKILL_LABEL[skill]}: ${band == null ? 'chưa chấm' : `band ${band.toFixed(1)}`}`}>
            <Text className="w-20 text-[15px]">{SKILL_LABEL[skill]}</Text>
            <View className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: colors.line }}>
              {band != null ? <View className="h-full rounded-full" style={{ width: `${Math.max(3, (band / 9) * 100)}%`, backgroundColor: colors.accent }} /> : null}
            </View>
            <Text weight="extrabold" className="w-12 text-right text-[15px]" style={{ color: band == null ? colors.muted : colors.ink }}>
              {band == null ? '–' : band.toFixed(1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ---------- Grouped rows ---------- */

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-8">
      <Text weight="bold" className="mb-2 px-1 text-[13px] uppercase tracking-wider text-muted">{title}</Text>
      <View className="overflow-hidden rounded-2xl bg-surface" style={{ borderWidth: 1, borderColor: colors.line }}>{children}</View>
    </View>
  );
}

function Row({ title, detail, trailing, onPress, last = false }: { title: string; detail?: string; trailing?: ReactNode; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="min-h-16 flex-row items-center gap-3 px-4 py-3 active:bg-canvas"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <View className="flex-1">
        <Text weight="bold" className="text-[15px]">{title}</Text>
        {detail ? <Text className="mt-0.5 text-[13px] text-muted" numberOfLines={1}>{detail}</Text> : null}
      </View>
      {trailing}
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}

function Pill({ label, tone }: { label: string; tone: 'good' | 'warn' | 'plain' }) {
  const color = tone === 'good' ? colors.success : tone === 'warn' ? colors.warning : colors.muted;
  return (
    <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: tone === 'plain' ? colors.surfaceTint : `${color}22` }}>
      <Text weight="bold" className="text-xs" style={{ color }}>{label}</Text>
    </View>
  );
}

/* ---------- Goal ---------- */

export function GoalRow({ overall, goal, onSetGoal }: { overall: number; goal: LearningGoal | null; onSetGoal: () => void }) {
  const [open, setOpen] = useState(false);
  const plan = feasibility(overall, goal);
  const days = goal ? daysUntil(goal.examDate) : null;
  const pill = plan.tone === 'done' ? <Pill label="Đã đạt" tone="good" /> : plan.tone === 'tight' ? <Pill label="Khá gấp" tone="warn" /> : plan.tone === 'ok' ? <Pill label="Kịp" tone="good" /> : null;

  return (
    <>
      <Group title="Mục tiêu">
        {goal ? (
          <Row
            title={`Band ${goal.targetBand.toFixed(1)}`}
            detail={`${days === null ? formatExamMonth(goal.examDate) : `Còn ${days} ngày`} · ${hoursPerWeek(goal.availableMinutesPerDay)} giờ/tuần`}
            trailing={pill}
            onPress={() => setOpen(true)}
            last
          />
        ) : (
          <Row title="Đặt mục tiêu band" detail="Để biết bạn cần học bao lâu" onPress={onSetGoal} last />
        )}
      </Group>

      <Sheet visible={open} title="Bạn có kịp mục tiêu?" onClose={() => setOpen(false)} footer={<Button variant="secondary" label="Sửa mục tiêu" onPress={() => { setOpen(false); onSetGoal(); }} />}>
        <Text className="text-[15px] leading-6">{plan.text}</Text>
        <Text weight="bold" className="mt-4 text-[13px] uppercase tracking-wider text-muted">Gợi ý</Text>
        <Text className="mt-1 text-[15px] leading-6">{plan.tip}</Text>
      </Sheet>
    </>
  );
}

/* ---------- Skills ---------- */

export function SkillRows({ result, bands }: { result: PlacementResult; bands: Map<PlacementSkill, number> }) {
  const [openSkill, setOpenSkill] = useState<PlacementSkill | null>(null);
  const present = SKILLS.filter((skill) => result.sections.some((section) => section.skill === skill));
  const sectionsOf = (skill: PlacementSkill) => result.sections.filter((section) => section.skill === skill);

  const detail = (skill: PlacementSkill) => {
    if (skill === 'WRITING') {
      const essays = sectionsOf(skill).flatMap((section) => section.essays);
      return essays.length ? `${essays.length} bài viết` : 'Không có bài';
    }
    if (skill === 'SPEAKING') return result.speakingFeedback ? 'Có nhận xét bài nói' : 'Gợi ý luyện tập';
    const questions = sectionsOf(skill).flatMap((section) => section.questions);
    return `Đúng ${questions.filter((question) => question.correct).length}/${questions.length} câu`;
  };

  if (!present.length) return null;
  return (
    <>
      <Group title="Chi tiết từng kỹ năng">
        {present.map((skill, index) => (
          <Row key={skill} title={SKILL_LABEL[skill]} detail={detail(skill)} onPress={() => setOpenSkill(skill)} last={index === present.length - 1}
            trailing={<Text weight="extrabold" className="text-[15px]">{bands.get(skill)?.toFixed(1) ?? '–'}</Text>} />
        ))}
      </Group>

      <Sheet visible={openSkill !== null} title={openSkill ? SKILL_LABEL[openSkill] : ''} subtitle={openSkill ? detail(openSkill) : undefined} onClose={() => setOpenSkill(null)}>
        {openSkill === 'WRITING' ? <WritingDetail sections={sectionsOf('WRITING')} />
          : openSkill === 'SPEAKING' ? <SpeakingDetail feedback={result.speakingFeedback ?? null} />
            : openSkill ? <QuestionsDetail sections={sectionsOf(openSkill)} /> : null}
      </Sheet>
    </>
  );
}

function QuestionsDetail({ sections }: { sections: PlacementReportSection[] }) {
  const [onlyWrong, setOnlyWrong] = useState(true);
  // Each part numbers its questions from 1, so a question is told apart by its part as well.
  const all = sections.flatMap((section, part) => section.questions.map((question) => ({ ...question, key: `${part}-${question.number}`, part })));
  const wrong = all.filter((question) => !question.correct).length;
  return (
    <View className="pb-2">
      <View className="mb-3 flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceTint }}>
        {[{ value: true, label: `Câu sai (${wrong})` }, { value: false, label: `Tất cả (${all.length})` }].map((tab) => (
          <Pressable key={tab.label} onPress={() => setOnlyWrong(tab.value)} accessibilityRole="tab" accessibilityState={{ selected: onlyWrong === tab.value }}
            className="min-h-10 flex-1 items-center justify-center rounded-lg" style={{ backgroundColor: onlyWrong === tab.value ? colors.surface : 'transparent' }}>
            <Text weight="bold" className="text-sm" style={{ color: onlyWrong === tab.value ? colors.ink : colors.muted }}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
      {all.filter((question) => !onlyWrong || !question.correct).map((question, index, shown) => (
        <View key={question.key}>
        {sections.length > 1 && (index === 0 || shown[index - 1].part !== question.part) ? (
          <Text weight="bold" className="mt-3 text-xs uppercase tracking-wider text-muted">Phần {question.part + 1}</Text>
        ) : null}
        <View className="flex-row gap-3 py-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: question.correct ? colors.successSoft : colors.dangerSoft }}>
            {question.correct ? <Check size={14} color={colors.success} strokeWidth={3} /> : <X size={14} color={colors.danger} strokeWidth={3} />}
          </View>
          <View className="flex-1">
            <Text className="text-[15px] leading-6"><Text weight="bold">{question.number}. </Text>{question.prompt}</Text>
            <Text className="mt-1 text-[13px] leading-5" style={{ color: question.correct ? colors.success : colors.danger }}>
              {question.learnerAnswer ? `Bạn chọn: ${question.learnerAnswer}` : 'Bạn bỏ trống'}
            </Text>
            {!question.correct ? <Text weight="bold" className="text-[13px] leading-5">Đáp án: {question.correctAnswer ?? '–'}</Text> : null}
            {!question.correct && question.explanation ? <Text className="mt-1 text-[13px] leading-5 text-muted">{question.explanation}</Text> : null}
          </View>
        </View>
        </View>
      ))}
      {onlyWrong && wrong === 0 ? <Text className="py-6 text-center text-sm text-muted">Bạn không sai câu nào.</Text> : null}
    </View>
  );
}

function CriteriaList({ criteria }: { criteria: { name: string; band: number | null; comment: string | null }[] }) {
  return (
    <View className="mt-3">
      {criteria.map((criterion) => (
        <View key={criterion.name} className="py-3" style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
          <View className="flex-row items-center justify-between gap-3">
            <Text weight="bold" className="flex-1 text-[14px]">{criterion.name}</Text>
            {criterion.band != null ? <Text weight="extrabold" className="text-[14px]">{criterion.band.toFixed(1)}</Text> : null}
          </View>
          {criterion.comment ? <Text className="mt-1 text-[13px] leading-5 text-muted">{criterion.comment}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function WritingDetail({ sections }: { sections: PlacementReportSection[] }) {
  const essays = sections.flatMap((section) => section.essays);
  if (!essays.length) return <Text className="py-4 text-sm text-muted">Phần này không có bài viết.</Text>;
  return (
    <View className="gap-6 pb-2">
      {essays.map((essay, index) => (
        <View key={index}>
          <View className="flex-row items-center justify-between">
            <Text weight="extrabold" className="text-base">{essay.task === 'TASK_1' ? 'Task 1' : essay.task === 'TASK_2' ? 'Task 2' : `Bài ${index + 1}`}</Text>
            {essay.band != null ? <Text weight="black" className="text-lg" style={{ color: colors.accentDeep }}>{essay.band.toFixed(1)}</Text> : null}
          </View>
          {!essay.submitted ? <Text className="mt-1 text-sm text-muted">Bạn nộp phần này mà chưa viết bài nên được tính 0 điểm.</Text>
            : essay.band === null ? <Text className="mt-1 text-sm text-muted">Đang chấm, nhận xét sẽ có sau ít phút.</Text>
              : !essay.feedback ? <Text className="mt-1 text-sm text-muted">Bài đã có band nhưng chưa có nhận xét chi tiết.</Text>
                : (
                  <>
                    {essay.feedback.summary ? <Text className="mt-2 text-[15px] leading-6">{essay.feedback.summary}</Text> : null}
                    <CriteriaList criteria={essay.feedback.criteria.map((criterion) => ({ name: CRITERION_NAMES[criterion.code] ?? criterion.code, band: criterion.band, comment: criterion.comment }))} />
                    {essay.feedback.focus.length ? (
                      <>
                        <Text weight="bold" className="mt-2 text-[13px] uppercase tracking-wider text-muted">Nên học tiếp</Text>
                        {essay.feedback.focus.map((item) => <Text key={item} className="mt-1 text-[14px] leading-5">• {item}</Text>)}
                      </>
                    ) : null}
                  </>
                )}
        </View>
      ))}
    </View>
  );
}

function SpeakingDetail({ feedback }: { feedback: PlacementResult['speakingFeedback'] | null }) {
  if (feedback) {
    return (
      <View className="pb-2">
        {feedback.summary ? <Text className="text-[15px] leading-6">{feedback.summary}</Text> : null}
        <CriteriaList criteria={feedback.criteria.map((criterion) => ({ name: SPEAKING_CRITERIA[criterion.code] ?? criterion.code, band: criterion.band, comment: criterion.comment }))} />
      </View>
    );
  }
  return (
    <View className="pb-2">
      <Text className="text-[13px] leading-5 text-muted">Bài nói chưa có nhận xét riêng. Đây là những điểm người học ở trình độ này thường cần luyện:</Text>
      <CriteriaList criteria={SPEAKING_REVIEW.map((row) => ({ name: row.criterion, band: null, comment: row.comment }))} />
    </View>
  );
}

/* ---------- Courses ---------- */

export function CourseRow({ courses }: { courses: CourseSummary[] }) {
  const [open, setOpen] = useState(false);
  if (!courses.length) return null;
  const sorted = [...courses].sort((a, b) => a.bandLevel - b.bandLevel);
  const recommended = sorted.find((course) => course.recommended) ?? sorted[0];
  const openCourse = (course: CourseSummary) => { if (WEB_APP_URL) void openOnWeb(`/learn/courses/${course.courseId}`); };

  return (
    <>
      <Group title="Nên học tiếp">
        <Row title={recommended.name} detail={`Band ${Number(recommended.bandLevel).toFixed(1)} · ${recommended.topicCount} chủ đề`} onPress={() => openCourse(recommended)}
          trailing={<Pill label="Hợp với bạn" tone="good" />} />
        <Row title="Xem cả lộ trình" detail={`${sorted.length} khóa từ band ${Number(sorted[0].bandLevel).toFixed(1)}`} onPress={() => setOpen(true)} last />
      </Group>

      <Sheet visible={open} title="Lộ trình khóa học" subtitle={WEB_APP_URL ? undefined : 'Học các khóa này trên website IELTSPath.'} onClose={() => setOpen(false)}>
        {sorted.map((course) => (
          <Pressable key={course.courseId} disabled={!WEB_APP_URL} onPress={() => openCourse(course)} className="flex-row items-center gap-3 py-3 active:opacity-70" style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <Text weight="black" className="w-10 text-[15px]" style={{ color: course.recommended ? colors.accentDeep : colors.muted }}>{Number(course.bandLevel).toFixed(1)}</Text>
            <View className="flex-1">
              <Text weight="bold" className="text-[15px]">{course.name}</Text>
              <Text className="text-[13px] text-muted">{course.topicCount} chủ đề</Text>
            </View>
            {course.recommended ? <Pill label="Hợp với bạn" tone="good" /> : null}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}
