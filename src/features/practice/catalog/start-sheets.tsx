import { BookOpenCheck, Check, Headphones, Mic, MonitorCheck, Timer, Volume2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { PracticeFormatCount, ReadingTestCard } from '../api/attempts';
import { Sheet } from '../components/sheet';
import { formatDuration } from '../model/clock';
import { practiceFormatLabel } from '../model/format-labels';
import type { SkillType } from '../model/types';

export type StartMode = 'practice' | 'exam';

const MODE_COPY: Record<'reading' | 'listening' | 'writing', Record<StartMode, string>> = {
  reading: {
    practice: 'Không giới hạn giờ, có highlight, ghi chú, tra từ và đánh dấu câu. Phù hợp để luyện từng dạng.',
    exam: 'Đồng hồ đếm ngược như thi thật, hết giờ tự nộp bài.',
  },
  listening: {
    practice: 'Tua lại, đổi tốc độ, nghe lại nhiều lần. Phù hợp để luyện nghe kỹ.',
    exam: 'Tự phát và chỉ nghe một lần, không tua, đồng hồ đếm ngược như thi thật.',
  },
  writing: {
    practice: 'Có hướng dẫn và lưu ý của đề, viết theo từng phần và tra từ vựng.',
    exam: 'Đồng hồ đếm ngược, không hướng dẫn, hết giờ tự chuyển sang nộp bài.',
  },
};

type ModeSheetProps = {
  card: ReadingTestCard | null;
  skill: 'reading' | 'listening' | 'writing';
  busy: boolean;
  error: string;
  onStart: (mode: StartMode) => void;
  onClose: () => void;
};

const EXAM_TIPS: Record<'reading' | 'listening' | 'writing', { icon: 'headphones' | 'volume' | 'timer'; text: string }[]> = {
  listening: [
    { icon: 'headphones', text: 'Đeo tai nghe và chỉnh âm lượng vừa nghe trước khi bắt đầu.' },
    { icon: 'volume', text: 'Audio tự phát ngay khi bạn bấm Bắt đầu thi, chỉ phát một lần, không tua và không tạm dừng.' },
    { icon: 'timer', text: 'Đồng hồ đếm ngược chạy ngay. Hết giờ bài tự nộp.' },
  ],
  reading: [
    { icon: 'timer', text: 'Đồng hồ đếm ngược chạy ngay khi bạn bấm Bắt đầu thi.' },
    { icon: 'timer', text: 'Hết giờ bài tự nộp và bạn không sửa được đáp án.' },
  ],
  writing: [
    { icon: 'timer', text: 'Đồng hồ đếm ngược chạy ngay khi bạn bấm Bắt đầu thi.' },
    { icon: 'timer', text: 'Không có hướng dẫn trong lúc viết. Hết giờ bài tự chuyển sang bước nộp.' },
  ],
};

/** "Chọn giao diện làm bài": practice tools or the real-exam simulation, which asks "ready?" first because the clock (and the audio) starts at once. */
export function ModeSheet({ card, skill, busy, error, onStart, onClose }: ModeSheetProps) {
  const [confirming, setConfirming] = useState(false);
  // A different (or closed) card starts over at the mode choice.
  const [shownCard, setShownCard] = useState(card);
  if (card !== shownCard) { setShownCard(card); setConfirming(false); }
  if (confirming) {
    const icons = { headphones: <Headphones size={18} color={colors.accent} />, volume: <Volume2 size={18} color={colors.accent} />, timer: <Timer size={18} color={colors.accent} /> };
    return (
      <Sheet
        visible={card !== null}
        onClose={onClose}
        dismissable={!busy}
        title="Sẵn sàng thi thật?"
        subtitle={card?.title}
        footer={<>
          <Button label="Bắt đầu thi" icon={<Timer size={18} color={colors.onAccent} />} loading={busy} loadingLabel="Đang tạo bài làm…" onPress={() => onStart('exam')} />
          <Button label="Quay lại" variant="secondary" disabled={busy} onPress={() => setConfirming(false)} />
        </>}>
        {card ? (
          <View className="flex-row gap-2">
            <Info label="Số câu" value={String(card.questionCount)} />
            <Info label="Thời gian" value={formatDuration(card.timeLimitSeconds)} />
          </View>
        ) : null}
        <View className="mt-4 gap-3">
          {EXAM_TIPS[skill].map((tip) => <Tip key={tip.text} icon={icons[tip.icon]} text={tip.text} />)}
        </View>
        {error ? <View className="mt-3"><FormAlert message={error} /></View> : null}
      </Sheet>
    );
  }
  return (
    <Sheet visible={card !== null} onClose={onClose} dismissable={!busy} title="Chọn chế độ làm bài" subtitle={card?.title}>
      <View className="gap-3">
        <ModeOption soft={colors.accentSoft} icon={<BookOpenCheck size={24} color={colors.accent} />} title="Luyện tập" text={MODE_COPY[skill].practice} disabled={busy} onPress={() => onStart('practice')} />
        <ModeOption soft={colors.dangerSoft} icon={<Timer size={24} color={colors.danger} />} title="Thi thật" badge="Giống thi máy" text={MODE_COPY[skill].exam} disabled={busy} onPress={() => setConfirming(true)} />
        {busy ? <Text className="text-center text-sm text-muted">Đang tạo bài làm…</Text> : null}
        {error ? <FormAlert message={error} /> : null}
      </View>
    </Sheet>
  );
}

function ModeOption({ icon, soft, title, text, badge, disabled, onPress }: { icon: React.ReactNode; soft: string; title: string; text: string; badge?: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${text}`}
      className="flex-row gap-3 rounded-3xl p-4 active:opacity-80"
      style={{ borderWidth: 1.5, borderBottomWidth: 3.5, borderColor: colors.line, borderBottomColor: colors.edge, backgroundColor: colors.surface, opacity: disabled ? 0.6 : 1 }}>
      <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: soft }}>{icon}</View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text weight="black" className="text-base text-ink">{title}</Text>
          {badge ? <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.successSoft }}><Text weight="bold" className="text-[11px]" style={{ color: colors.success }}>{badge}</Text></View> : null}
        </View>
        <Text className="mt-1 text-sm leading-5 text-muted">{text}</Text>
      </View>
    </Pressable>
  );
}

const SPEAKING_PART_COPY: Record<number, string> = {
  1: 'Giám khảo hỏi những câu chung về chủ đề quen thuộc. Trả lời ngắn gọn, tự nhiên.',
  2: 'Bạn nhận một thẻ gợi ý, có 1 phút chuẩn bị rồi nói liên tục về chủ đề đó.',
  3: 'Thảo luận sâu hơn về chủ đề của Part 2. Nêu quan điểm và giải thích lý do.',
};
const SPEAKING_FULL_COPY = 'Bài thi đủ ba phần: câu hỏi quen thuộc, thẻ gợi ý rồi thảo luận. Làm lần lượt từng phần.';

/** Speaking has one workspace: the learner reads what the part is and confirms the microphone is ready. */
export function SpeakingReadySheet({ card, partNo, onStart, onClose }: { card: ReadingTestCard | null; partNo?: number; onStart: () => void; onClose: () => void }) {
  const full = card?.scope === 'FULL';
  return (
    <Sheet
      visible={card !== null}
      onClose={onClose}
      title="Sẵn sàng nói?"
      subtitle={card?.title}
      footer={<Button label="Bắt đầu" icon={<Mic size={18} color={colors.onAccent} />} onPress={onStart} />}>
      <Text className="text-base leading-6 text-ink">{full ? SPEAKING_FULL_COPY : SPEAKING_PART_COPY[partNo ?? 1] ?? SPEAKING_FULL_COPY}</Text>
      {card ? (
        <View className="mt-3 flex-row gap-2">
          <Info label="Số câu" value={String(card.questionCount)} />
          <Info label="Thời gian" value={formatDuration(card.timeLimitSeconds)} />
        </View>
      ) : null}
      <View className="mt-4 gap-3">
        <Tip icon={<Volume2 size={18} color={colors.accent} />} text="Tìm nơi yên tĩnh, đeo tai nghe có micro nếu có." />
        <Tip icon={<Mic size={18} color={colors.accent} />} text="Ứng dụng sẽ xin quyền dùng micro: hãy chọn Cho phép." />
        <Tip icon={<Headphones size={18} color={colors.accent} />} text="Giám khảo sẽ đọc câu hỏi. Bạn có thể nghe lại và ghi âm lại trước khi gửi." />
      </View>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-canvas px-3 py-2">
      <Text className="text-xs text-muted">{label}</Text>
      <Text weight="extrabold" className="text-base text-ink">{value}</Text>
    </View>
  );
}

function Tip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <View className="flex-row items-start gap-3">{icon}<Text className="flex-1 text-sm leading-5 text-ink">{text}</Text></View>;
}

/** A finished test: open the result of the latest graded answer, or do it again. */
export function CompletedSheet({ card, busy, error, onViewResult, onRedo, onClose }: { card: ReadingTestCard | null; busy: boolean; error: string; onViewResult: () => void; onRedo: () => void; onClose: () => void }) {
  return (
    <Sheet
      visible={card !== null}
      onClose={onClose}
      // The lookup navigates when it ends, so the sheet stays until then rather than opening a result out of nowhere.
      dismissable={!busy}
      title="Bạn đã làm bài này rồi"
      subtitle="Xem lại kết quả để biết mình sai ở đâu, hoặc làm lại để luyện thêm."
      footer={<>
        <Button label="Xem kết quả" icon={<MonitorCheck size={18} color={colors.onAccent} />} loading={busy} loadingLabel="Đang tìm bài làm…" onPress={onViewResult} />
        <Button label="Làm lại" variant="secondary" disabled={busy} onPress={onRedo} />
      </>}>
      <Text weight="bold" className="text-base text-ink">{card?.title}</Text>
      {error ? <View className="mt-3"><FormAlert message={error} /></View> : null}
    </Sheet>
  );
}

/** Question-format filter (Reading/Listening formats, Writing chart and essay types, Speaking topics). */
export function FormatFilterSheet({ visible, skill, formats, selected, onToggle, onClear, onClose }: {
  visible: boolean;
  skill: SkillType;
  formats: PracticeFormatCount[];
  selected: string[];
  onToggle: (code: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const title = skill === 'speaking' ? 'Chủ đề' : skill === 'writing' ? 'Dạng đề' : 'Dạng câu hỏi';
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={<View className="flex-row gap-3">
        <View className="flex-1"><Button label="Bỏ lọc" variant="secondary" disabled={!selected.length} onPress={onClear} /></View>
        <View className="flex-1"><Button label="Xong" onPress={onClose} /></View>
      </View>}>
      {formats.length === 0 ? <Text className="text-sm text-muted">Chưa có dạng nào để lọc.</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        {formats.map((format) => {
          const active = selected.includes(format.code);
          return (
            <Pressable
              key={format.code}
              onPress={() => onToggle(format.code)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              className="min-h-11 flex-row items-center gap-1.5 rounded-full px-3"
              style={{ borderWidth: 2, borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.accentSoft : colors.surface }}>
              {active ? <Check size={14} color={colors.accentDeep} /> : null}
              <Text weight={active ? 'bold' : 'medium'} className="text-sm" style={{ color: active ? colors.accentDeep : colors.ink }}>
                {practiceFormatLabel(format.code)}{format.sectionCount ? ` (${format.sectionCount})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
