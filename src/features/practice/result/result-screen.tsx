import { Redirect, router } from 'expo-router';
import { BookOpenCheck, ChevronRight, Clock, RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { BackHeader } from '@/src/components/navigation/back-header';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { FormAlert } from '@/src/components/ui/form-alert';
import { OwlMascot } from '@/src/components/ui/owl-mascot';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { restartReadingAttempt, type ReadingScope } from '../api/attempts';
import { useResultData } from '../hooks/use-result-data';
import { practiceFormatLabel } from '../model/format-labels';
import { RATING_LABELS, WEAK_BELOW_PERCENT, adviseTime, formatClockTime, formatMinutes, formatTip, mascotMessage, priorityFormats, rateFormats, skippedFormats, weakFormats, type AccuracyRating, type RatedFormat } from '../model/practice-analysis';
import type { ReadingResultView } from '../model/result-view';
import { rememberAttempt } from '../model/resume-store';
import { PRACTICE_SKILL_CONFIG } from '../model/skill-config';
import { skillColor } from '../model/skill-meta';
import { SkillBand } from '../components/skill-band';

const TONE: Record<AccuracyRating, string> = {
  excellent: '#2f9e44', good: '#58a700', average: '#e6a321', weak: '#f08c00', veryWeak: '#e03131', skipped: '#8a94a6',
};

/** The result of a Reading or Listening attempt: score and band, what to practise first, per-format table, time. */
export function ResultScreen({ attemptId, skill }: { attemptId: string; skill: 'reading' | 'listening' }) {
  const data = useResultData(attemptId);
  const config = PRACTICE_SKILL_CONFIG[skill];
  const catalog = `/practice/catalog/${skill}`;
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  if (data.isPending) return <Loading label={`Đang tải kết quả ${config.label}…`} />;
  if (data.isError) {
    return (
      <View className="flex-1 bg-canvas">
        <BackHeader title="Kết quả" fallbackHref={catalog} />
        <EmptyState title="Chưa tải được kết quả" message={data.error.message} mood="oops" action={<Button label="Thử lại" variant="secondary" onPress={() => void data.refetch()} />} />
      </View>
    );
  }
  if (!data.data.ready) return <Redirect href={`/practice/${skill}/${attemptId}` as never} />;
  const { attempt, structure, view } = data.data;
  const rated = rateFormats(view.byFormat);
  const scopeLabel = view.scope === 'PART' ? (view.sections[0]?.title ?? `Một ${config.partLabel.toLowerCase()}`) : `Toàn bộ đề (${view.sections.length} ${config.partLabel.toLowerCase()})`;
  const practiceFormat = (code: string) => router.push({ pathname: '/practice/catalog/[skill]', params: { skill, format: code } } as never);

  async function retry() {
    setRetrying(true);
    setRetryError('');
    try {
      const restarted = await restartReadingAttempt(attempt.packageVersionId ?? '', attempt.scope as ReadingScope, structure.sections.map((section) => section.contentSectionId), attempt.mode === 'TIMED' ? 'exam' : 'practice');
      void rememberAttempt({ attemptId: restarted.id, skill, title: `${config.label} · làm lại` });
      router.replace(`/practice/${skill}/${restarted.id}` as never);
    } catch (cause) {
      setRetryError(cause instanceof Error ? cause.message : 'Không tạo lại được bài làm.');
    } finally {
      setRetrying(false);
    }
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <SkillBand color={skillColor(skill)} title={`Kết quả ${config.label}`} subtitle={scopeLabel} onBack={() => router.replace(catalog as never)}>
          <Hero view={view} />
        </SkillBand>
        <View style={{ padding: 16, gap: 16 }}>
        <Summary view={view} />
        <View className="gap-3">
          <Button label="Xem giải thích từng câu" icon={<BookOpenCheck size={18} color={colors.onAccent} />} onPress={() => router.push({ pathname: '/practice/review/[attemptId]', params: { attemptId, skill } } as never)} />
          <View className="flex-row gap-3">
            <View className="flex-1"><Button label="Làm lại" variant="secondary" loading={retrying} icon={<RotateCcw size={16} color={colors.accentDeep} />} onPress={() => void retry()} /></View>
            <View className="flex-1"><Button label="Đề khác" variant="secondary" onPress={() => router.replace(catalog as never)} /></View>
          </View>
          {retryError ? <FormAlert message={retryError} /> : null}
        </View>
        <PriorityCard rated={rated} answered={view.counts.correct + view.counts.incorrect} total={view.items.length} onPractise={practiceFormat} />
        <FormatCards rated={rated} scopeLabel={scopeLabel} onPractise={practiceFormat} />
        <LossAnalysis rated={rated} onPractise={practiceFormat} />
        <TimeCard view={view} partLabel={config.partLabel} />
        <Text className="text-center text-xs text-muted">Số liệu phân tích được tính từ bài bạn vừa làm; band chỉ là ước tính, không thay thế kết quả thi thật.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Loading({ label }: { label: string }) {
  return <View className="flex-1 items-center justify-center bg-canvas"><ActivityIndicator color={colors.accent} /><Text className="mt-2 text-sm text-muted">{label}</Text></View>;
}

function Hero({ view }: { view: ReadingResultView }) {
  const celebrate = view.percent >= 75;
  return (
    <View className="mt-4 flex-row items-center gap-3 px-4">
      <OwlMascot mood={celebrate ? 'cheer' : view.percent >= 40 ? 'wave' : 'oops'} size={92} />
      <View className="flex-1">
        <Text weight="bold" className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.85)' }}>{view.band !== null ? 'Band ước tính' : 'Tỉ lệ câu đúng'}</Text>
        <Text weight="black" style={{ color: '#ffffff', fontSize: 52, lineHeight: 58 }}>{view.band !== null ? view.band.toFixed(1) : `${Math.round(view.percent)}%`}</Text>
        <Text className="text-sm leading-5" style={{ color: '#ffffff' }}>{mascotMessage(view.percent)}</Text>
        {view.band === null ? <Text className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.75)' }}>Band chỉ được ước tính khi làm trọn đề</Text> : null}
      </View>
    </View>
  );
}

function Summary({ view }: { view: ReadingResultView }) {
  const total = view.counts.correct + view.counts.incorrect + view.counts.blank;
  const share = total ? view.counts.correct / total : 0;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  return (
    <View className="rounded-3xl bg-surface p-4" style={{ borderWidth: 2, borderColor: colors.line }}>
      <View className="flex-row items-center justify-between">
        <Text weight="extrabold" className="text-base text-ink">Kết quả làm bài</Text>
        <View className="flex-row items-center gap-1"><Clock size={14} color={colors.muted} /><Text className="text-sm text-muted">{formatClockTime(view.durationSeconds)}</Text></View>
      </View>
      <View className="mt-3 flex-row items-center gap-5">
        <View accessibilityRole="image" accessibilityLabel={`${view.counts.correct} trên ${total} câu đúng`} style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={110} height={110} viewBox="0 0 110 110" style={{ position: 'absolute' }}>
            <Circle cx={55} cy={55} r={radius} stroke={colors.line} strokeWidth={12} fill="none" />
            <Circle cx={55} cy={55} r={radius} stroke={colors.success} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray={`${circumference * share} ${circumference}`} transform="rotate(-90 55 55)" />
          </Svg>
          <Text weight="black" className="text-xl text-ink">{view.counts.correct}/{total}</Text>
          <Text className="text-[11px] text-muted">câu đúng</Text>
        </View>
        <View className="flex-1 gap-2">
          <Count color={colors.success} label="Đúng" value={view.counts.correct} />
          <Count color={colors.danger} label="Sai" value={view.counts.incorrect} />
          <Count color={colors.muted} label="Bỏ qua" value={view.counts.blank} />
        </View>
      </View>
    </View>
  );
}

function Count({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <Text className="flex-1 text-sm text-ink">{label}</Text>
      <Text weight="extrabold" className="text-sm text-ink">{value} câu</Text>
    </View>
  );
}

function Bar({ percent, tone }: { percent: number; tone: string }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden', flex: 1 }}>
      <View style={{ width: `${Math.max(0, Math.min(100, percent))}%`, height: 8, backgroundColor: tone }} />
    </View>
  );
}

function PriorityCard({ rated, answered, total, onPractise }: { rated: RatedFormat[]; answered: number; total: number; onPractise: (code: string) => void }) {
  const first = priorityFormats(rated, 1);
  const second = priorityFormats(rated, 2);
  const skipped = skippedFormats(rated);
  let body: React.ReactNode;
  let tone = TONE.weak;
  if (first.length) {
    tone = TONE[first[0]!.rating];
    body = (
      <View className="gap-3">
        {[first, second].filter((level) => level.length).map((level, index) => (
          <View key={index}>
            <Text weight="black" className="text-xs uppercase tracking-wider" style={{ color: TONE[level[0]!.rating] }}>Ưu tiên số {index + 1}</Text>
            <View className="mt-1 flex-row flex-wrap gap-2">
              {level.map((format) => (
                <Pressable key={format.formatCode} onPress={() => onPractise(format.formatCode)} accessibilityRole="button" className="min-h-11 justify-center rounded-full px-3 py-1.5" style={{ backgroundColor: colors.surface, borderWidth: 2, borderColor: TONE[format.rating] }}>
                  <Text weight="bold" className="text-sm text-ink">{practiceFormatLabel(format.formatCode)} · {format.percent}%</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  } else if (answered === 0) {
    body = <Text className="text-sm leading-5 text-ink"><Text weight="bold">Bạn chưa trả lời câu nào. </Text>Cả {total} câu đều bỏ trống nên chưa đánh giá được dạng câu hỏi nào. Hãy trả lời đủ các câu: bỏ trống không được điểm, còn đoán thì vẫn có cơ hội đúng.</Text>;
  } else if (skipped.length) {
    const count = skipped.reduce((sum, format) => sum + format.total, 0);
    body = <Text className="text-sm leading-5 text-ink"><Text weight="bold">Bạn chưa làm {count}/{total} câu. </Text>Chưa có câu nào ở: {skipped.map((format) => practiceFormatLabel(format.formatCode)).join(', ')}. Các dạng đã làm không có dạng nào dưới {WEAK_BELOW_PERCENT}%, nên hãy làm hết các câu trước.</Text>;
  } else {
    tone = TONE.excellent;
    body = <Text className="text-sm leading-5 text-ink"><Text weight="bold">Không có dạng nào dưới {WEAK_BELOW_PERCENT}%. </Text>Bạn làm đều tay ở mọi dạng câu hỏi. Hãy thử một đề khó hơn để tiếp tục nâng điểm.</Text>;
  }
  return (
    <View className="rounded-3xl p-4" style={{ borderWidth: 2, borderColor: tone, backgroundColor: colors.surface }}>
      <Text weight="extrabold" className="mb-2 text-base text-ink">{first.length ? 'Cần luyện trước' : skipped.length || answered === 0 ? 'Cần làm trước' : 'Làm tốt lắm'}</Text>
      {body}
    </View>
  );
}

function FormatCards({ rated, scopeLabel, onPractise }: { rated: RatedFormat[]; scopeLabel: string; onPractise: (code: string) => void }) {
  return (
    <View className="gap-2">
      <Text weight="extrabold" className="text-base text-ink">Theo từng dạng câu hỏi <Text className="text-xs text-muted">· {scopeLabel}</Text></Text>
      {rated.map((row) => (
        <View key={row.formatCode} className="rounded-2xl bg-surface p-3" style={{ borderWidth: 2, borderColor: row.priority ? TONE[row.rating] : colors.line }}>
          <View className="flex-row items-center gap-2">
            <Text weight="bold" className="flex-1 text-sm text-ink">{practiceFormatLabel(row.formatCode)}</Text>
            {row.priority ? <Text weight="black" className="text-[11px]" style={{ color: TONE[row.rating] }}>ƯU TIÊN {row.priority}</Text> : null}
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${TONE[row.rating]}22` }}><Text weight="bold" className="text-[11px]" style={{ color: TONE[row.rating] }}>{RATING_LABELS[row.rating]}</Text></View>
          </View>
          <View className="mt-2 flex-row items-center gap-2">
            <Bar percent={row.percent} tone={TONE[row.rating]} />
            <Text weight="extrabold" className="w-11 text-right text-sm" style={{ color: TONE[row.rating] }}>{row.percent}%</Text>
          </View>
          <View className="mt-1.5 flex-row items-center justify-between">
            <Text className="text-xs text-muted">{row.total} câu · đúng {row.correct} · sai {row.incorrect} · bỏ {row.blank}</Text>
            {row.percent < WEAK_BELOW_PERCENT ? (
              <Pressable onPress={() => onPractise(row.formatCode)} accessibilityRole="button" hitSlop={12} className="min-h-8 flex-row items-center">
                <Text weight="bold" className="text-xs" style={{ color: colors.accentDeep }}>Luyện dạng này</Text><ChevronRight size={14} color={colors.accentDeep} />
              </Pressable>
            ) : <Text className="text-xs" style={{ color: colors.success }}>✓ Giữ phong độ</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

function LossAnalysis({ rated, onPractise }: { rated: RatedFormat[]; onPractise: (code: string) => void }) {
  const weak = weakFormats(rated);
  const skipped = skippedFormats(rated);
  const fine = rated.filter((format) => format.rating !== 'skipped' && format.percent >= WEAK_BELOW_PERCENT);
  return (
    <View className="rounded-3xl bg-surface p-4" style={{ borderWidth: 2, borderColor: colors.line }}>
      <Text weight="extrabold" className="text-base text-ink">Vì sao bạn mất điểm?</Text>
      {weak.length ? (
        <View className="mt-2 gap-3">
          <Text className="text-sm text-muted">Các dạng đúng dưới {WEAK_BELOW_PERCENT}%: cần luyện thêm.</Text>
          {weak.map((format) => (
            <View key={format.formatCode} className="rounded-2xl p-3" style={{ backgroundColor: colors.canvas }}>
              <View className="flex-row items-center justify-between">
                <Text weight="bold" className="text-sm text-ink">{practiceFormatLabel(format.formatCode)}</Text>
                <Text weight="bold" className="text-xs" style={{ color: TONE[format.rating] }}>{format.percent}% · {format.correct}/{format.total}</Text>
              </View>
              <Text className="mt-1 text-sm leading-5 text-ink"><Text weight="bold">Cách làm: </Text>{formatTip(format.formatCode)}</Text>
              <Pressable onPress={() => onPractise(format.formatCode)} accessibilityRole="button" className="mt-1 min-h-11 justify-center self-start"><Text weight="bold" className="text-sm" style={{ color: colors.accentDeep }}>Luyện dạng này ›</Text></Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text className="mt-2 text-sm text-muted">
          {skipped.length ? `Chưa có dạng nào bạn làm mà sai nhiều. Điểm đang mất chủ yếu do bỏ trống ${skipped.reduce((sum, format) => sum + format.total, 0)} câu.` : `Không có dạng nào dưới ${WEAK_BELOW_PERCENT}%, bạn chưa mất điểm nặng ở dạng nào.`}
        </Text>
      )}
      {fine.length > 0 && weak.length > 0 ? <Text className="mt-3 text-sm text-ink"><Text weight="bold" style={{ color: colors.success }}>✓ Đang ổn: </Text>{fine.map((format) => practiceFormatLabel(format.formatCode)).join(', ')}</Text> : null}
      {skipped.length > 0 && weak.length > 0 ? <Text className="mt-2 text-sm text-ink"><Text weight="bold">Chưa làm: </Text>{skipped.map((format) => practiceFormatLabel(format.formatCode)).join(', ')}</Text> : null}
    </View>
  );
}

function TimeCard({ view, partLabel }: { view: ReadingResultView; partLabel: string }) {
  const totalQuestions = view.sections.reduce((sum, section) => sum + section.total, 0);
  const sections = view.sections.map((section, index) => ({ ...section, label: `${partLabel} ${section.partNo ?? index + 1}` }));
  const allLimited = sections.every((section) => section.timeLimitSeconds !== null);
  const limit = view.timeLimitSeconds ?? (allLimited ? sections.reduce((sum, section) => sum + (section.timeLimitSeconds ?? 0), 0) : null);
  const advice = adviseTime(view.durationSeconds, limit, totalQuestions);
  const limitMinutes = sections.map((section) => (section.timeLimitSeconds === null ? null : Math.round(section.timeLimitSeconds / 60)));
  return (
    <View className="rounded-3xl bg-surface p-4" style={{ borderWidth: 2, borderColor: colors.line }}>
      <Text weight="extrabold" className="text-base text-ink">Quản lý thời gian</Text>
      <Text weight="black" className="mt-1 text-2xl text-ink">{formatClockTime(view.durationSeconds)}{limit !== null ? <Text className="text-sm text-muted"> / {formatClockTime(limit)}</Text> : null}</Text>
      {advice.message ? <Text className="mt-1 text-sm leading-5 text-muted">{advice.message}</Text> : null}
      <View className="mt-3 gap-3">
        {sections.map((section) => {
          const spent = section.timeSpentSeconds;
          const over = spent !== null && section.timeLimitSeconds !== null && spent > section.timeLimitSeconds;
          return (
            <View key={section.sectionId}>
              <View className="flex-row justify-between">
                <Text className="text-sm text-ink">{section.label} · {section.correct}/{section.total} đúng</Text>
                <Text className="text-xs text-muted">{formatMinutes(spent)}{section.timeLimitSeconds !== null ? ` / ~${formatMinutes(section.timeLimitSeconds)}` : ''}</Text>
              </View>
              <View className="mt-1 flex-row"><Bar percent={spent === null || !section.timeLimitSeconds ? 0 : (spent / section.timeLimitSeconds) * 100} tone={over ? colors.danger : colors.accent} /></View>
            </View>
          );
        })}
      </View>
      {limit !== null && allLimited ? (
        <Text className="mt-3 text-xs text-muted">
          {sections.length > 1 ? `Gợi ý: chia ${Math.round(limit / 60)} phút thành ${limitMinutes.join(' / ')} phút cho ${sections.length} ${partLabel.toLowerCase()}.` : `Gợi ý: dành khoảng ${limitMinutes[0]} phút cho ${partLabel.toLowerCase()} này.`}
        </Text>
      ) : null}
    </View>
  );
}
