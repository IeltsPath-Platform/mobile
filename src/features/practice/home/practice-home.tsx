import { router } from 'expo-router';
import { ArrowRight, ChevronRight, Clock, Hourglass, History, Lightbulb, Target, Trophy } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '@/src/components/ui/skeleton';
import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

import { routeOf, type HistoryRow } from '../model/history-view';
import { suggestQuick, type QuickSuggestion } from '../model/quick-suggestions';
import { SKILL_META, skillColor, skillInk } from '../model/skill-meta';
import type { SkillType } from '../model/types';
import { HOME_SKILLS, useHomeData } from './use-home-data';

const TIPS: { skill: SkillType; text: string }[] = [
  { skill: 'listening', text: 'Đọc trước câu hỏi và gạch từ khóa trong lúc chờ băng. Đoán trước loại thông tin cần điền: số, tên hay ngày tháng.' },
  { skill: 'reading', text: 'True/False/Not Given: FALSE là bài nói ngược lại, NOT GIVEN là bài không nhắc tới. Đừng dùng kiến thức bên ngoài.' },
  { skill: 'writing', text: 'Task 1 luôn cần một đoạn Overview nêu xu hướng chính. Thiếu Overview, Task Achievement khó vượt band 5.' },
  { skill: 'speaking', text: 'Part 2: dùng 1 phút chuẩn bị để ghi 3–4 ý theo gợi ý trên thẻ, rồi nói đủ 2 phút, đừng dừng sớm.' },
  { skill: 'reading', text: 'Matching Headings: đọc câu đầu và câu cuối của đoạn để nắm ý chính, loại các heading chỉ trùng từ khóa.' },
  { skill: 'writing', text: 'Task 2: nêu rõ quan điểm ngay mở bài và giữ nhất quán đến kết bài. Mỗi đoạn thân bài chỉ một ý chính.' },
  { skill: 'listening', text: 'Chú ý từ đổi ý như "actually", "but", "sorry": đáp án thường nằm ngay sau đó.' },
];

const GLASS = 'rgba(255,255,255,0.18)';

type Props = {
  signedIn: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

/**
 * The home tab: a coloured hero with the greeting and the one thing to do next, the four skills as bold colour tiles,
 * a row of short sessions to swipe through, then anything waiting to be graded and a tip.
 */
export const PracticeHome = forwardRef<ScrollViewInstance, Props>(function PracticeHome({ signedIn, onScroll }, ref) {
  const insets = useSafeAreaInsets();
  const data = useHomeData(signedIn);
  const open = (path: string) => {
    haptics.tap();
    router.push((signedIn ? path : '/(auth)/login') as never);
  };
  const [tip] = useState(() => TIPS[Math.floor(Date.now() / 86_400_000) % TIPS.length]!);
  // A skill whose result is still loading (or failed to load) is unknown, so the order stays as usual until all four are known.
  const latestRows = Object.fromEntries(HOME_SKILLS.map((skill) => {
    const query = data.latestBySkill[skill];
    return [skill, signedIn && query.data ? query.data[0] ?? null : undefined];
  })) as Parameters<typeof suggestQuick>[0];
  const quick = suggestQuick(latestRows);
  const personal = signedIn && quick.some((item) => item.reason !== null);
  const tried = HOME_SKILLS.filter((skill) => (data.latestBySkill[skill].data?.length ?? 0) > 0).length;

  return (
    <ScrollView
      ref={ref}
      onScroll={onScroll}
      scrollEventThrottle={16}
      className="flex-1 bg-canvas"
      // Clears the floating tab bar (66 high above the bottom inset), like the other tabs.
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 10) + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={signedIn ? <RefreshControl refreshing={data.refreshing} onRefresh={() => void data.refresh()} tintColor="#ffffff" progressViewOffset={insets.top} /> : undefined}>
      <View style={{ backgroundColor: colors.heroStart, paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 22, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -60, top: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: '#ffffff', opacity: 0.08 }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: -50, bottom: -80, width: 170, height: 170, borderRadius: 85, backgroundColor: '#ffffff', opacity: 0.06 }} />
        <View className="flex-row items-center gap-3">
          <Image source={require('@/assets/images/owl/hero-wave.webp')} style={{ width: 60, height: 60 }} contentFit="contain" accessibilityIgnoresInvertColors />
          <View className="flex-1">
            <Text className="text-sm" style={{ color: '#ffffffcc' }} numberOfLines={1}>{data.name ? `Chào ${data.name.split(' ').slice(-1)[0]},` : 'Chào bạn,'}</Text>
            <Text accessibilityRole="header" weight="black" className="text-2xl" style={{ color: '#ffffff' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Hôm nay luyện gì?</Text>
          </View>
          <Pressable onPress={() => open('/practice/history')} accessibilityRole="button" accessibilityLabel="Lịch sử làm bài" className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: GLASS }}>
            <History size={20} color="#ffffff" />
          </Pressable>
        </View>
        {signedIn && (data.targetBand || tried > 0) ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {data.targetBand ? <HeroChip icon={<Target size={14} color="#ffffff" />} text={`Mục tiêu Band ${data.targetBand.toFixed(1)}`} /> : null}
            {tried > 0 ? <HeroChip icon={<Trophy size={14} color="#ffffff" />} text={`Đã thử ${tried}/4 kỹ năng`} /> : null}
          </View>
        ) : null}
        <NextCard signedIn={signedIn} resume={data.resume} suggestion={personal ? quick[0] ?? null : null} onOpen={open} />
      </View>

      <View className="px-4">
        <SectionTitle title="4 kỹ năng IELTS" />
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {HOME_SKILLS.map((skill) => {
            const query = data.latestBySkill[skill];
            return <SkillTile key={skill} skill={skill} signedIn={signedIn} loading={signedIn && query.isPending} error={query.isError} latest={query.data?.[0] ?? null} onPress={() => open(`/practice/catalog/${skill}`)} />;
          })}
        </View>

        <SectionTitle title="Luyện nhanh" note={personal ? 'Theo kết quả của bạn' : 'Vừa giờ nghỉ'} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {quick.map((item) => <QuickCard key={`${item.skill}-${item.part}`} item={item} onPress={() => open(`/practice/catalog/${item.skill}?part=${item.part}`)} />)}
      </ScrollView>

      <View className="px-4">
        {data.pending.length ? (
          <>
            <SectionTitle title="Đang chờ chấm" />
            <View className="gap-2">{data.pending.map((row) => <PendingRow key={row.key} row={row} />)}</View>
          </>
        ) : null}

        <View className="mt-6 flex-row gap-3 rounded-3xl p-4" style={{ backgroundColor: colors.warmSoft }}>
          <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.surface }}><Lightbulb size={20} color={colors.accentWarm} /></View>
          <View className="flex-1">
            <Text weight="black" className="text-xs uppercase tracking-wider" style={{ color: colors.accentWarm }}>Mẹo {SKILL_META[tip.skill].label} hôm nay</Text>
            <Text className="mt-1 text-sm leading-5 text-ink">{tip.text}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
});

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <View className="mb-3 mt-6 flex-row items-end justify-between gap-3">
      <Text accessibilityRole="header" weight="black" className="text-lg text-ink">{title}</Text>
      {note ? <Text className="text-xs text-muted">{note}</Text> : null}
    </View>
  );
}

function HeroChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="min-h-8 flex-row items-center gap-1.5 rounded-full px-3" style={{ backgroundColor: GLASS }}>
      {icon}
      <Text weight="bold" className="text-xs" style={{ color: '#ffffff' }}>{text}</Text>
    </View>
  );
}

/** The one primary action of the screen: continue the test in progress, start a first test, or sign in. */
function NextCard({ signedIn, resume, suggestion, onOpen }: { signedIn: boolean; resume: ReturnType<typeof useHomeData>['resume']; suggestion: QuickSuggestion | null; onOpen: (path: string) => void }) {
  // `color` fills the button; `ink` is the same hue made readable as text on the (possibly dark) card surface.
  const content = !signedIn
    ? { eyebrow: 'Bắt đầu', title: 'Đăng nhập để lưu bài làm và kết quả', action: 'Đăng nhập', path: '/(auth)/login', color: colors.accent, ink: colors.accentDeep }
    : resume
      ? { eyebrow: 'Đang làm dở', title: resume.title || SKILL_META[resume.skill].label, action: 'Làm tiếp', path: `/practice/${resume.skill}/${resume.attemptId}`, color: skillColor(resume.skill), ink: skillInk(resume.skill) }
      : suggestion
        ? { eyebrow: 'Gợi ý cho bạn', title: `${SKILL_META[suggestion.skill].label} ${suggestion.title}, khoảng ${suggestion.minutes} phút`, action: 'Bắt đầu', path: `/practice/catalog/${suggestion.skill}?part=${suggestion.part}`, color: skillColor(suggestion.skill), ink: skillInk(suggestion.skill) }
        : { eyebrow: 'Gợi ý cho bạn', title: 'Bắt đầu với Listening Section 1, chỉ khoảng 10 phút', action: 'Bắt đầu', path: '/practice/catalog/listening?part=1', color: skillColor('listening'), ink: skillInk('listening') };
  return (
    <Pressable onPress={() => onOpen(content.path)} accessibilityRole="button" accessibilityLabel={`${content.eyebrow}: ${content.title}. ${content.action}`} className="mt-4">
      <View className="flex-row items-center gap-3 rounded-3xl p-4" style={{ backgroundColor: colors.surface, borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.18)' }}>
        <View className="flex-1">
          <Text weight="black" className="text-[11px] uppercase tracking-wider" style={{ color: content.ink }}>{content.eyebrow}</Text>
          <Text weight="extrabold" numberOfLines={2} className="mt-0.5 text-base text-ink">{content.title}</Text>
        </View>
        <View className="min-h-11 flex-row items-center gap-1 rounded-full px-4" style={{ backgroundColor: content.color }}>
          <Text weight="extrabold" className="text-sm" style={{ color: '#ffffff' }}>{content.action}</Text>
          <ArrowRight size={16} color="#ffffff" />
        </View>
      </View>
    </Pressable>
  );
}

/** A skill as a bold colour tile: its icon, its name and the latest result, with a large icon as a watermark. */
function SkillTile({ skill, signedIn, loading, error, latest, onPress }: { skill: SkillType; signedIn: boolean; loading: boolean; error: boolean; latest: HistoryRow | null; onPress: () => void }) {
  const meta = SKILL_META[skill];
  const tint = skillColor(skill);
  const result = latest?.mark ? `${latest.mark.label} ${latest.mark.value}` : latest ? latest.status : null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${meta.label}. ${result ? `Gần nhất: ${result}` : 'Chưa làm bài nào'}`} style={{ width: '47.5%', flexGrow: 1 }}>
      <View style={{ borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.22)', paddingBottom: 4 }}>
        <View style={{ borderRadius: 26, backgroundColor: tint, padding: 14, minHeight: 148, overflow: 'hidden', justifyContent: 'space-between' }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: -14, bottom: -14, opacity: 0.2 }}><meta.Icon size={96} color="#ffffff" /></View>
          <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: '#ffffff' }}><meta.Icon size={22} color={tint} /></View>
          <View className="gap-1.5">
            <Text weight="black" className="text-xl" style={{ color: '#ffffff' }}>{meta.label}</Text>
            {loading ? <Skeleton height={22} width="75%" radius={11} />
              : <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
                <Text weight="bold" className="text-xs" style={{ color: '#ffffff' }} numberOfLines={1}>
                  {!signedIn ? 'Bắt đầu luyện' : result ?? (error ? 'Chưa tải được' : 'Làm đề đầu tiên')}
                </Text>
              </View>}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function QuickCard({ item, onPress }: { item: QuickSuggestion; onPress: () => void }) {
  const meta = SKILL_META[item.skill];
  const tint = skillColor(item.skill);
  const ink = skillInk(item.skill);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${meta.label} ${item.title}, khoảng ${item.minutes} phút${item.reason ? `. ${item.reason}` : ''}${item.weakest ? '. Nên luyện nhất' : ''}`} style={{ width: 156 }}>
      <View className="rounded-3xl bg-surface p-3" style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: item.weakest ? tint : colors.edge, height: 140 }}>
        <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tint}26` }}><meta.Icon size={20} color={ink} /></View>
        <Text weight="bold" className="mt-2 text-xs" style={{ color: ink }}>{meta.label}</Text>
        <Text weight="extrabold" numberOfLines={1} className="text-base text-ink">{item.title}</Text>
        {item.reason ? <Text weight="bold" numberOfLines={1} className="mt-0.5 text-[11px]" style={{ color: item.weakest ? ink : colors.muted }}>{item.weakest ? 'Nên luyện · ' : ''}{item.reason}</Text> : null}
        <View className="mt-auto flex-row items-center gap-1"><Clock size={12} color={colors.muted} /><Text className="text-xs text-muted">~{item.minutes} phút</Text></View>
      </View>
    </Pressable>
  );
}

function PendingRow({ row }: { row: HistoryRow }) {
  const route = row.href ? routeOf(row.href) : null;
  return (
    <Pressable disabled={!route} onPress={() => route && router.push(route as never)} accessibilityRole="button" accessibilityLabel={`${row.meta}. ${row.title}. ${row.status}`} className="flex-row items-center gap-3 rounded-3xl bg-surface p-3 active:opacity-80" style={{ borderWidth: 1.5, borderBottomWidth: 3.5, borderColor: colors.line, borderBottomColor: colors.edge }}>
      <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.warmSoft }}><Hourglass size={20} color={colors.accentWarm} /></View>
      <View className="flex-1">
        <Text className="text-xs text-muted" numberOfLines={1}>{row.meta}</Text>
        <Text weight="bold" className="text-sm text-ink" numberOfLines={1}>{row.title}</Text>
        <Text weight="bold" className="text-xs" style={{ color: colors.accentWarm }}>{row.status}</Text>
      </View>
      {route ? <ChevronRight size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}
