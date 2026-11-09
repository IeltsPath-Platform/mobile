import { useState, type ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Flame, Users, UserRound } from 'lucide-react-native';

import { Stepper } from '@/src/components/ui/stepper';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { gameTone, type GameKind } from '../game-meta';
import type { PlayerMode } from '../types';
import { ChipRow } from '../ui/game-ui';
import { WordlyPreview } from '../wordly/wordly-preview';
import { WORD_LIMIT_OPTIONS, type GameSetup } from './use-game-setup';

const CEFR_OPTIONS = [null, 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((value) => ({ value, label: value ?? 'Mọi cấp độ' }));

const MODES: { value: PlayerMode; label: string; caption: string; Icon: typeof UserRound }[] = [
  { value: 'SOLO', label: 'Chơi đơn', caption: 'Tự luyện một mình', Icon: UserRound },
  { value: 'MULTIPLAYER', label: 'Cùng bạn', caption: 'Mở phòng bằng mã', Icon: Users },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-5">
      <Text weight="black" className="text-lg">{title}</Text>
      <View className="mt-3">{children}</View>
    </View>
  );
}

/** Collapsed by default: a one-line summary that expands into the full controls. */
function AdvancedPanel({ summary, warning, children }: { summary: string; warning?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mt-5 rounded-3xl bg-surface" style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:opacity-70"
      >
        <View className="flex-1">
          <Text weight="black" className="text-base">Tùy chỉnh ván</Text>
          <Text numberOfLines={2} className="mt-0.5 text-xs" style={{ color: warning ? colors.danger : colors.muted }}>
            {summary}
          </Text>
        </View>
        {open ? <ChevronUp size={20} color={colors.muted} /> : <ChevronDown size={20} color={colors.muted} />}
      </Pressable>
      {open ? <View className="border-t border-line px-4 pb-4 pt-1">{children}</View> : null}
    </View>
  );
}

export function SetupForm({ setup, kind }: { setup: GameSetup; kind: GameKind }) {
  const tone = gameTone(kind);
  const { filters } = setup;
  const multiplayer = setup.mode === 'MULTIPLAYER';
  const chip = { accent: tone.solid, soft: tone.soft };

  const questionOptions = (multiplayer ? [5, 10, 15, 20] : [3, 5, 10, 15, 20]).map((value) => ({ value, label: `${value}` }));
  const topicOptions = filters.data
    ? [
        { value: null as string | null, label: 'Mọi chủ đề' },
        ...filters.data.topics.map((topic) => ({ value: topic.id as string | null, label: topic.nameVi || topic.name })),
      ]
    : [];
  const lengthOptions = [...WORD_LIMIT_OPTIONS.map((value) => ({ value: String(value), label: `${value} từ` })), { value: 'ENDLESS', label: 'Vô hạn' }];
  const lengthValue = setup.playMode === 'ENDLESS' ? 'ENDLESS' : String(setup.wordLimit);

  const topic = filters.data?.topics.find((item) => item.id === setup.topicId);
  const rules =
    kind === 'WORDLY'
      ? [`${setup.lives} mạng`, multiplayer ? '' : setup.timeEnabled ? 'Có giờ' : 'Không giới hạn giờ']
      : multiplayer
        ? [`${setup.lives} mạng`, `${setup.seconds}s/câu`]
        : ['4 mạng', '15s/câu'];
  const summary = setup.insufficientWords
    ? `Chỉ có ${setup.availableWords ?? 0} từ phù hợp, chưa đủ cho ván này. Mở để đổi bộ lọc.`
    : [
        setup.cefrLevel ?? 'Mọi cấp độ',
        setup.topicId ? topic?.nameVi || topic?.name || 'Chủ đề đã chọn' : 'Mọi chủ đề',
        ...rules,
        setup.availableWords !== undefined ? `${setup.availableWords} từ trong kho` : '',
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <View>
      {kind === 'WORDLY' ? (
        <View className="mt-4">
          <WordlyPreview />
        </View>
      ) : null}

      <View className="mt-5 flex-row gap-3">
        {MODES.map(({ value, label, caption, Icon }) => {
          const selected = setup.mode === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setup.setMode(value)}
              className="flex-1 rounded-2xl p-4 active:opacity-80"
              style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: selected ? tone.solid : colors.line, borderBottomColor: selected ? tone.solid : colors.edge, backgroundColor: selected ? tone.soft : colors.surface }}
            >
              <Icon size={26} color={selected ? tone.solid : colors.muted} />
              <Text weight="black" className="mt-2 text-lg">{label}</Text>
              <Text className="text-xs text-muted">{caption}</Text>
            </Pressable>
          );
        })}
      </View>

      <Section title={kind === 'WORDLY' ? 'Độ dài ván' : 'Số câu hỏi'}>
        {kind === 'WORDLY' ? (
          <ChipRow
            options={lengthOptions}
            value={lengthValue}
            onChange={(next) => {
              if (next === 'ENDLESS') {
                setup.setPlayMode('ENDLESS');
              } else {
                setup.setPlayMode('FINITE');
                setup.setWordLimit(Number(next));
              }
            }}
            {...chip}
          />
        ) : (
          <ChipRow options={questionOptions} value={setup.questionCount} onChange={setup.setQuestionCount} {...chip} />
        )}
      </Section>

      <AdvancedPanel summary={summary} warning={setup.insufficientWords}>
        <Section title="Cấp độ">
          {filters.data ? <ChipRow scroll options={CEFR_OPTIONS} value={setup.cefrLevel} onChange={setup.setCefrLevel} {...chip} /> : null}
          {filters.isError ? (
            <Pressable onPress={() => void filters.refetch()} className="min-h-11 justify-center">
              <Text className="text-xs text-danger">Không tải được bộ lọc · Chạm để thử lại</Text>
            </Pressable>
          ) : null}
        </Section>
        {filters.data ? (
          <Section title="Chủ đề">
            <ChipRow scroll options={topicOptions} value={setup.topicId} onChange={setup.setTopicId} {...chip} />
            <View className="mt-3 flex-row items-center gap-1.5">
              {setup.insufficientWords ? <AlertTriangle size={14} color={colors.danger} /> : <CheckCircle2 size={14} color={colors.success} />}
              <Text className="text-xs" style={{ color: setup.insufficientWords ? colors.danger : colors.muted }}>
                {setup.availableWords ?? 0} từ phù hợp trong kho
              </Text>
            </View>
          </Section>
        ) : null}
        {kind === 'WORDLY' || multiplayer ? (
          <Stepper label={kind === 'WORDLY' ? 'Mạng' : 'Mạng mỗi người'} unit="mạng" value={setup.lives} min={3} max={6} onChange={setup.setLives} />
        ) : null}
        {kind === 'WORDLY' && !multiplayer ? (
          <View className="mt-3 min-h-12 flex-row items-center justify-between">
            <Text className="text-sm">Giới hạn thời gian mỗi từ</Text>
            <Switch accessibilityLabel="Bật giới hạn thời gian" value={setup.timeEnabled} onValueChange={setup.setTimeEnabled} trackColor={{ true: tone.solid }} />
          </View>
        ) : null}
        {kind === 'ROCKET' && multiplayer ? (
          <Section title="Thời gian mỗi câu">
            <ChipRow options={[10, 15, 20].map((value) => ({ value, label: `${value} giây` }))} value={setup.seconds} onChange={setup.setSeconds} {...chip} />
          </Section>
        ) : null}
        {kind === 'ROCKET' && !multiplayer ? (
          <View className="mt-4 flex-row items-center gap-2 rounded-2xl p-3" style={{ backgroundColor: colors.warmSoft }}>
            <Flame size={16} color={colors.accentWarm} />
            <Text className="flex-1 text-xs leading-5" style={{ color: colors.xpDeep }}>Chơi đơn có 4 mạng và 15 giây mỗi câu.</Text>
          </View>
        ) : null}
      </AdvancedPanel>
    </View>
  );
}
