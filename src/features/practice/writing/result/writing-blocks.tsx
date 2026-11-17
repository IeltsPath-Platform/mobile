import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { WEB_APP_URL, practiseKnowledgePointOnWeb } from '../../api/learning-links';
import { getPracticeSinceEssay } from '../../api/history';
import type { WritingCorrection, WritingDataChecks, WritingErrorGroup, WritingPriority, WritingRevision, WritingTaskChecks } from '../../api/writing';
import { certaintyOf } from '../../model/writing-result-model';
import { buildNextSteps } from '../../model/writing-study-steps';
import type { EssayKnowledgeJudgment, EssayStudyPoint } from '../../model/types';

const CATEGORY: Record<string, { label: string; color: string; soft: string }> = {
  GRAMMAR: { label: 'Ngữ pháp', color: '#e03131', soft: '#ffe3e3' },
  VOCABULARY: { label: 'Từ vựng', color: '#7048e8', soft: '#ede7ff' },
  SPELLING_NUMBER: { label: 'Chính tả & số', color: '#7048e8', soft: '#ede7ff' },
  COHERENCE: { label: 'Mạch lạc', color: '#1c7ed6', soft: '#dbeafe' },
  TASK: { label: 'Nội dung', color: '#e67700', soft: '#fff1dc' },
};
const FALLBACK = { label: 'Khác', color: '#e67700', soft: '#fff1dc' };
export const categoryOf = (category: string | undefined) => CATEGORY[category ?? ''] ?? FALLBACK;

export function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View className="rounded-3xl bg-surface p-4" style={{ borderWidth: 2, borderColor: colors.line }}>
      {title ? <View className="mb-2 flex-row items-center justify-between gap-2"><Text weight="extrabold" className="flex-1 text-base text-ink">{title}</Text>{right}</View> : null}
      {children}
    </View>
  );
}

/** A collapsible block, so the long result reads as a list of headings on a phone. */
export function Collapsible({ title, count, initiallyOpen = false, children }: { title: string; count?: number; initiallyOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View className="overflow-hidden rounded-3xl bg-surface" style={{ borderWidth: 2, borderColor: colors.line }}>
      <Pressable onPress={() => setOpen((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: open }} className="min-h-14 flex-row items-center gap-2 px-4">
        <Text weight="extrabold" className="flex-1 text-base text-ink">{title}{count !== undefined ? <Text className="text-sm text-muted"> ({count})</Text> : null}</Text>
        {open ? <ChevronUp size={20} color={colors.muted} /> : <ChevronDown size={20} color={colors.muted} />}
      </Pressable>
      {open ? <View className="px-4 pb-4">{children}</View> : null}
    </View>
  );
}

/** A quoted excerpt of the essay; tapping it shows that place in the marked essay. */
export function Quote({ text, onShow }: { text: string; onShow?: (excerpt: string) => void }) {
  return (
    <Pressable disabled={!onShow} onPress={() => onShow?.(text)} accessibilityRole={onShow ? 'button' : 'text'} accessibilityHint={onShow ? 'Xem trong bài viết' : undefined} className="mt-1 self-start rounded-lg px-2 py-1" style={{ backgroundColor: colors.canvas }}>
      <Text className="text-sm italic text-ink">“{text}”</Text>
    </Pressable>
  );
}

/** "Luyện lỗi này": free practice on the knowledge point, opened on the website (the app has no learning path yet). */
export function PractiseButton({ knowledgePointId, label = 'Luyện lỗi này' }: { knowledgePointId?: string | null; label?: string }) {
  const [busy, setBusy] = useState(false);
  if (!knowledgePointId || !WEB_APP_URL) return null;
  const open = async () => {
    setBusy(true);
    try { await practiseKnowledgePointOnWeb(knowledgePointId); } catch (cause) { Alert.alert('Chưa mở được bài luyện', cause instanceof Error ? cause.message : 'Hãy thử lại sau.'); } finally { setBusy(false); }
  };
  return (
    <Pressable onPress={() => void open()} disabled={busy} accessibilityRole="link" className="mt-2 min-h-10 flex-row items-center gap-1.5 self-start rounded-full px-3" style={{ backgroundColor: colors.accentSoft, opacity: busy ? 0.6 : 1 }}>
      <ExternalLink size={14} color={colors.accentDeep} />
      <Text weight="bold" className="text-sm" style={{ color: colors.accentDeep }}>{busy ? 'Đang mở…' : `${label} (web)`}</Text>
    </Pressable>
  );
}

export function Priorities({ priorities, onShow }: { priorities: WritingPriority[]; onShow: (excerpt: string) => void }) {
  if (!priorities.length) return null;
  return (
    <Card title={`${priorities.length} vấn đề cần tập trung trước tiên`}>
      <View className="gap-4">
        {priorities.map((priority, index) => (
          <View key={`${priority.title}-${index}`} className="flex-row gap-3">
            <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: colors.accent }}><Text weight="black" className="text-xs" style={{ color: colors.onAccent }}>{index + 1}</Text></View>
            <View className="flex-1">
              <Text weight="bold" className="text-sm text-ink">{priority.title}</Text>
              {priority.explanation ? <Text className="mt-0.5 text-sm leading-5 text-ink">{priority.explanation}</Text> : null}
              {priority.excerpts?.[0] ? <Quote text={priority.excerpts[0]} onShow={onShow} /> : null}
              {priority.action ? <Text className="mt-1 text-sm leading-5 text-ink"><Text weight="bold">Cách sửa: </Text>{priority.action}</Text> : null}
              <PractiseButton knowledgePointId={priority.practiceKnowledgePointId} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function RevisionSummary({ revision, names }: { revision: WritingRevision; names: Map<string, string> }) {
  const label = (code: string) => names.get(code) ?? code;
  const { fixedCodes, repeatedCodes, newCodes } = revision;
  if (fixedCodes.length + repeatedCodes.length + newCodes.length === 0) return null;
  return (
    <Card title="So với bài trước">
      {fixedCodes.length ? <Text className="text-sm" style={{ color: colors.success }}>✓ Đã sửa {fixedCodes.length} dạng lỗi.</Text> : null}
      {repeatedCodes.length ? <Text className="mt-1 text-sm" style={{ color: colors.danger }}>Còn lặp lại: {repeatedCodes.map(label).join(', ')}.</Text> : null}
      {newCodes.length ? <Text className="mt-1 text-sm text-ink">Lỗi mới: {newCodes.map(label).join(', ')}.</Text> : null}
    </Card>
  );
}

function CheckLine({ ok, yes, no }: { ok: boolean | undefined; yes: string; no: string }) {
  if (ok === undefined) return null;
  return <Text className="mt-1 text-sm" style={{ color: ok ? colors.success : colors.danger }}>{ok ? '✓' : '✗'} {ok ? yes : no}</Text>;
}

export function DataChecksView({ checks, onShow }: { checks: WritingDataChecks; onShow: (excerpt: string) => void }) {
  const hasChecklist = [checks.hasOverview, checks.overviewAccurate, checks.hasPersonalOpinion].some((flag) => flag !== undefined);
  if (!checks.wrong.length && checks.correctCount === 0 && !hasChecklist) return null;
  return (
    <Card title="Số liệu trong bài so với biểu đồ">
      {checks.correctCount > 0 ? <Text className="text-sm text-muted">{checks.correctCount} câu số liệu đúng.</Text> : null}
      {checks.wrong.map((figure, index) => (
        <View key={`${figure.excerpt}-${index}`} className="mt-3 rounded-2xl p-3" style={{ backgroundColor: colors.canvas }}>
          <Text weight="bold" className="text-xs uppercase text-muted">Bạn viết</Text>
          <Quote text={figure.excerpt} onShow={onShow} />
          <Text weight="bold" className="mt-2 text-xs uppercase text-muted">Biểu đồ cho thấy</Text>
          <Text className="mt-0.5 text-sm text-ink">{figure.expected}</Text>
        </View>
      ))}
      {hasChecklist ? (
        <View className="mt-2">
          <CheckLine ok={checks.hasOverview} yes="Có đoạn tổng quan" no="Chưa có đoạn tổng quan" />
          {checks.hasOverview !== false ? <CheckLine ok={checks.overviewAccurate} yes="Tổng quan nêu đúng xu hướng chính" no="Tổng quan chưa nêu đúng xu hướng chính" /> : null}
          <CheckLine ok={checks.hasPersonalOpinion === undefined ? undefined : !checks.hasPersonalOpinion} yes="Không có ý kiến cá nhân" no="Có ý kiến cá nhân (Task 1 chỉ mô tả số liệu)" />
        </View>
      ) : null}
    </Card>
  );
}

// Read at render: the theme colours change with dark mode.
const coverageOf = (addressed: string) => (
  addressed === 'FULL' ? { label: 'Đã trả lời đủ', color: colors.success }
    : addressed === 'PARTIAL' ? { label: 'Mới trả lời một phần', color: colors.accentWarm }
      : { label: 'Chưa trả lời', color: colors.danger }
);
const ROLE = { INTRODUCTION: 'Mở bài', BODY: 'Thân bài', CONCLUSION: 'Kết bài' } as const;

export function TaskChecksView({ checks, onShow }: { checks: WritingTaskChecks; onShow: (excerpt: string) => void }) {
  const parts = checks.questionParts ?? [];
  const outline = checks.outline ?? [];
  const position = checks.position;
  const showsPosition = position?.required === true;
  if (!parts.length && !outline.length && !showsPosition && !checks.noConclusion) return null;
  return (
    <Card title="Đề yêu cầu và bài bạn đã làm">
      {parts.map((part, index) => {
        const coverage = coverageOf(part.addressed);
        return (
          <View key={`${part.part}-${index}`} className="mt-2 rounded-2xl p-3" style={{ backgroundColor: colors.canvas }}>
            <Text className="text-sm text-ink">{part.part}</Text>
            <Text weight="bold" className="mt-1 text-xs" style={{ color: coverage.color }}>{coverage.label}</Text>
            {part.excerpt ? <Quote text={part.excerpt} onShow={onShow} /> : null}
          </View>
        );
      })}
      {showsPosition ? (
        <View className="mt-3">
          <Text className="text-sm" style={{ color: position.stated ? colors.success : colors.danger }}>{position.stated ? '✓ Có nêu quan điểm' : '✗ Đề hỏi ý kiến nhưng bài chưa nêu quan điểm rõ ràng'}</Text>
          {position.stated && position.excerpt ? <Quote text={position.excerpt} onShow={onShow} /> : null}
        </View>
      ) : null}
      {checks.inconsistentPosition ? <View className="mt-2"><Text className="text-sm" style={{ color: colors.danger }}>✗ Quan điểm chưa nhất quán giữa các đoạn</Text>{position?.conflictExcerpt ? <Quote text={position.conflictExcerpt} onShow={onShow} /> : null}</View> : null}
      {checks.noConclusion ? <Text className="mt-2 text-sm" style={{ color: colors.danger }}>✗ Chưa có đoạn kết bài</Text> : null}
      {outline.length ? (
        <View className="mt-4">
          <Text weight="extrabold" className="text-sm text-ink">Dàn ý bài của bạn</Text>
          {outline.map((item, index) => (
            <View key={`${item.role}-${index}`} className="mt-2">
              <Text className="text-sm text-ink"><Text weight="bold">{ROLE[item.role] ?? item.role}: </Text>{item.mainIdea}</Text>
              <Text weight="bold" className="text-xs" style={{ color: item.developed ? colors.success : colors.accentWarm }}>{item.developed ? 'Đã triển khai' : 'Chưa triển khai'}</Text>
              {item.excerpt ? <Quote text={item.excerpt} onShow={onShow} /> : null}
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** One correction: what was written, the fix, why, the rule, a similar example and practice. */
export function CorrectionCard({ item, group }: { item: WritingCorrection; group?: WritingErrorGroup }) {
  const look = categoryOf(item.category);
  const suggestion = certaintyOf(item) === 'SUGGESTION';
  const rule = item.fixHint ?? group?.fixHint;
  return (
    <View className="rounded-2xl p-3" style={{ backgroundColor: colors.canvas, borderLeftWidth: 4, borderLeftColor: look.color }}>
      <View className="flex-row flex-wrap items-center gap-1.5">
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: look.soft }}><Text weight="bold" className="text-[11px]" style={{ color: look.color }}>{look.label}</Text></View>
        {suggestion ? <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.surface }}><Text weight="bold" className="text-[11px] text-muted">Gợi ý</Text></View> : null}
        {item.errorName ? <Text weight="bold" className="text-sm text-ink">{item.errorName}</Text> : null}
      </View>
      <Text className="mt-1.5 text-sm text-ink"><Text weight="bold" style={{ color: colors.danger, textDecorationLine: 'line-through' }}>{item.excerpt}</Text>  →  <Text weight="bold" style={{ color: colors.success }}>{item.suggestion}</Text></Text>
      {item.reason ? <Text className="mt-1 text-sm leading-5 text-ink"><Text weight="bold">Tại sao sai? </Text>{item.reason}</Text> : null}
      {rule ? <Text className="mt-1 text-sm leading-5 text-ink"><Text weight="bold">Quy tắc: </Text>{rule}</Text> : null}
      {group?.example ? <Text className="mt-1 text-xs text-muted">Ví dụ tương tự: “{group.example.wrong}” → “{group.example.right}”</Text> : null}
      <PractiseButton knowledgePointId={item.practiceKnowledgePointId ?? group?.practiceKnowledgePointId} />
    </View>
  );
}

/** What to study next from this essay, with how much of it was practised since. */
export function NextSteps({ points, judgments, submissionId }: { points: EssayStudyPoint[]; judgments: EssayKnowledgeJudgment[]; submissionId: string }) {
  const { steps, passed, unassessed } = buildNextSteps(points, judgments);
  const targets = steps.flatMap((step) => (step.target ? [step.target] : []));
  const practised = useQuery({
    queryKey: ['practice', 'practised-since', submissionId, targets.join(',')],
    enabled: targets.length > 0,
    queryFn: ({ signal }) => getPracticeSinceEssay(submissionId, targets, signal),
    select: (rows) => new Map(rows.map((row) => [row.knowledgePointId, row])),
  });
  if (!steps.length && !passed.length && !unassessed.length) return null;
  const practisable = steps.filter((step) => step.target);
  const done = practised.data ? practisable.filter((step) => practised.data.has(step.target!)).length : 0;
  return (
    <Card title="Nên học gì tiếp" right={practised.data && practisable.length ? <Text weight="bold" className="text-xs" style={{ color: colors.accentDeep }}>{done}/{practisable.length} đã luyện</Text> : undefined}>
      <Text className="text-sm text-muted">{steps.length ? 'Xếp theo thứ tự nên làm trước, từ điểm yếu của bài này.' : 'Bài này không có điểm nào cần luyện thêm.'}</Text>
      <View className="mt-2 gap-3">
        {steps.map((step, index) => {
          const since = step.target ? practised.data?.get(step.target) : undefined;
          return (
            <View key={step.key} className="flex-row gap-3">
              <Text weight="black" className="w-5 text-sm text-muted">{index + 1}.</Text>
              <View className="flex-1">
                <Text weight="bold" className="text-sm text-ink">{step.title}</Text>
                {step.meta ? <Text className="text-xs text-muted">{step.meta}</Text> : null}
                {step.excerpt ? <Quote text={step.excerpt} /> : null}
                {step.reasons.map((reason) => <Text key={reason} className="mt-1 text-sm leading-5 text-ink">{reason}</Text>)}
                {since ? <Text className="mt-1 text-xs" style={{ color: colors.success }}>Đã luyện {since.attempts} lần{since.lastTotalCount ? ` · lần gần nhất ${since.lastCorrectCount ?? 0}/${since.lastTotalCount}` : ''}</Text> : null}
                <PractiseButton knowledgePointId={step.target} label="Luyện điểm này" />
              </View>
            </View>
          );
        })}
      </View>
      {passed.length || unassessed.length ? (
        <View className="mt-3 rounded-2xl p-3" style={{ backgroundColor: colors.canvas }}>
          {passed.length ? <Text className="text-sm text-ink"><Text weight="bold">Đã đạt: </Text>{passed.join(', ')}</Text> : null}
          {unassessed.length ? <Text className="mt-1 text-sm text-ink"><Text weight="bold">Chưa đủ bằng chứng để đánh giá: </Text>{unassessed.join(', ')}</Text> : null}
        </View>
      ) : null}
    </Card>
  );
}
