import { Image } from 'expo-image';
import { Check, ChevronRight, Clock, Crown, ListChecks, Lock } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import type { ReadingTestCard } from '../api/attempts';
import { formatDuration } from '../model/clock';
import { practiceFormatLabel } from '../model/format-labels';
import type { PracticeSkillConfig } from '../model/skill-config';
import { partBadge } from '../model/skill-config';
import { SKILL_META, skillInk } from '../model/skill-meta';
import type { SkillType } from '../model/types';

type TestCardProps = {
  card: ReadingTestCard;
  skill: SkillType;
  config: PracticeSkillConfig;
  partNo?: number;
  done: boolean;
  /** A Premium test the learner cannot open yet. */
  locked?: boolean;
  tint: string;
  onPress: (card: ReadingTestCard) => void;
};

const THUMB = 84;

/** "Section 1: Booking a class" → "Booking a class"; the part is already on the badge. */
function shortTitle(title: string) {
  return title.replace(/^(Section|Passage|Part|Task)\s*\d+\s*[:.\-–]\s*/i, '').trim() || title;
}

/** One test of the catalog: a square cover, the part, title, source, question formats, size and time. */
export const TestCard = memo(function TestCard({ card, skill, config, partNo, done, locked, tint, onPress }: TestCardProps) {
  const badge = partBadge(config, card.scope, card.parts[0]?.partNo ?? partNo);
  const formats = card.formats.slice(0, 2).map(practiceFormatLabel);
  const more = card.formats.length - formats.length;
  const Icon = SKILL_META[skill].Icon;
  const ink = skillInk(skill);
  return (
    <Pressable
      onPress={() => onPress(card)}
      accessibilityRole="button"
      accessibilityLabel={`${card.title}, ${badge}, ${card.questionCount} ${config.unit}, ${formatDuration(card.timeLimitSeconds)}${done ? ', đã làm' : ''}${card.requiredFeatureKey ? (locked ? ', cần gói Premium' : ', đề Premium') : ''}`}
      className="mb-3 active:opacity-80">
      <View className="flex-row items-center gap-3 rounded-3xl bg-surface p-3" style={{ borderWidth: 1.5, borderBottomWidth: 3.5, borderColor: colors.line, borderBottomColor: colors.edge }}>
        {/* Fixed square so a tall cover image can never stretch the card. */}
        <View style={{ width: THUMB, height: THUMB, borderRadius: 18, overflow: 'hidden', backgroundColor: `${tint}22`, alignItems: 'center', justifyContent: 'center' }}>
          {/* The icon stays underneath, so a cover that cannot load does not leave an empty square. */}
          <Icon size={30} color={ink} />
          {card.coverUrl
            ? <Image source={card.coverUrl} contentFit="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} transition={150} accessibilityIgnoresInvertColors />
            : null}
          {done ? (
            <View style={{ position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' }}>
              <Check size={12} color="#ffffff" strokeWidth={3.5} />
            </View>
          ) : null}
        </View>

        <View className="min-w-0 flex-1">
          <Text weight="black" className="text-[11px] uppercase tracking-wider" style={{ color: ink }} numberOfLines={1}>
            {badge}{card.source ? <Text className="text-[11px] normal-case tracking-normal text-muted">{`  ·  ${card.source.name}`}</Text> : null}
          </Text>
          <Text weight="extrabold" numberOfLines={2} className="mt-0.5 text-[15px] leading-5 text-ink">{shortTitle(card.title)}</Text>
          {card.requiredFeatureKey ? (
            <View className="mt-1 flex-row items-center gap-1 self-start rounded-lg px-2 py-0.5" style={{ backgroundColor: colors.warmSoft }}>
              <Crown size={12} color={colors.accentWarm} />
              <Text weight="black" className="text-[11px] text-ink">Premium</Text>
            </View>
          ) : null}
          <View className="mt-1.5 flex-row flex-wrap items-center gap-x-3 gap-y-1">
            <View className="flex-row items-center gap-1"><ListChecks size={13} color={colors.muted} /><Text className="text-xs text-muted">{card.questionCount} {config.unit}</Text></View>
            <View className="flex-row items-center gap-1"><Clock size={13} color={colors.muted} /><Text className="text-xs text-muted">{formatDuration(card.timeLimitSeconds)}</Text></View>
          </View>
          {formats.length ? (
            <View className="mt-1.5 flex-row flex-wrap gap-1">
              {formats.map((label) => (
                <View key={label} className="rounded-lg px-2 py-0.5" style={{ backgroundColor: `${tint}18` }}>
                  <Text weight="bold" className="text-[11px]" style={{ color: ink }} numberOfLines={1}>{label}</Text>
                </View>
              ))}
              {more > 0 ? <View className="rounded-lg bg-canvas px-2 py-0.5"><Text weight="bold" className="text-[11px] text-muted">+{more}</Text></View> : null}
            </View>
          ) : null}
        </View>
        {locked ? <Lock size={18} color={colors.accentWarm} /> : <ChevronRight size={20} color={colors.muted} />}
      </View>
    </Pressable>
  );
});
