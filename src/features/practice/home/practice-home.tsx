import { router } from 'expo-router';
import { ArrowRight, ChevronRight, Clock, Flame, Hourglass, History, Lightbulb, PlayCircle, Sparkles, Target } from 'lucide-react-native';
import { forwardRef } from 'react';
import { Pressable, RefreshControl, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '@/src/components/ui/skeleton';
import { Text } from '@/src/components/ui/text';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

import { routeOf, type HistoryRow } from '../model/history-view';
import { SKILL_META, skillColor, skillInk } from '../model/skill-meta';
import type { SkillType } from '../model/types';
import { HOME_SKILLS, useHomeData } from './use-home-data';

/** Short practice sessions: one part of a test, sized for a break. */
const QUICK: Array<{ skill: SkillType; part: string; title: string; minutes: number }> = [
  { skill: 'listening', part: '1', title: 'Section 1', minutes: 10 },
  { skill: 'speaking', part: '1', title: 'Part 1', minutes: 5 },
  { skill: 'reading', part: '1', title: 'Passage 1', minutes: 20 },
  { skill: 'writing', part: '1', title: 'Task 1', minutes: 20 },
  { skill: 'speaking', part: '2', title: 'Part 2 · cue card', minutes: 4 },
  { skill: 'writing', part: '2', title: 'Task 2', minutes: 40 },
];

const TIPS: Array<{ skill: SkillType; text: string }> = [
  { skill: 'listening', text: 'Đọc trước câu hỏi và gạch từ khóa trong lúc chờ băng. Đoán trước loại thông tin cần điền: số, tên hay ngày tháng.' },
  { skill: 'reading', text: 'True/False/Not Given: FALSE là bài nói ngược lại, NOT GIVEN là bài không nhắc tới. Đừng dùng kiến thức bên ngoài.' },
  { skill: 'writing', text: 'Task 1 luôn cần một đoạn Overview nêu xu hướng chính. Thiếu Overview, Task Achievement khó vượt band 5.' },
  { skill: 'speaking', text: 'Part 2: dùng 1 phút chuẩn bị để ghi 3–4 ý theo gợi ý trên thẻ, rồi nói đủ 2 phút, đừng dừng sớm.' },
  { skill: 'reading', text: 'Matching Headings: đọc câu đầu và câu cuối của đoạn để nắm ý chính, loại các heading chỉ trùng từ khóa.' },
  { skill: 'writing', text: 'Task 2: nêu rõ quan điểm ngay mở bài và giữ nhất quán đến kết bài. Mỗi đoạn thân bài chỉ một ý chính.' },
  { skill: 'listening', text: 'Chú ý từ đổi ý như "actually", "but", "sorry": đáp án thường nằm ngay sau đó.' },
];

type Props = {
  signedIn: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

/** The home tab: a coloured greeting with the test to continue, the four skills with their latest result, quick practice and tips. */
export const PracticeHome = forwardRef<ScrollViewInstance, Props>(function PracticeHome({ signedIn, onScroll }, ref) {
  const insets = useSafeAreaInsets();
  const data = useHomeData(signedIn);
  const open = (path: string) => {
    haptics.tap();
    router.push((signedIn ? path : '/(auth)/login') as never);
  };
  const tip = TIPS[Math.floor(Date.now() / 86_400_000) % TIPS.length]!;

  return (
    <ScrollView
      ref={ref}
      onScroll={onScroll}
      scrollEventThrottle={16}
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={signedIn ? <RefreshControl refreshing={data.refreshing} onRefresh={() => void data.refresh()} tintColor="#ffffff" progressViewOffset={insets.top} /> : undefined}>
      {/* Greeting band: runs under the status bar and holds the one thing to do next. */}
      <View style={{ backgroundColor: colors.heroStart, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -60, top: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: '#ffffff', opacity: 0.08 }} />
        <View style={{ position: 'absolute', left: -40, bottom: -70, width: 160, height: 160, borderRadius: 80, backgroundColor: '#ffffff', opacity: 0.06 }} />
        <View className="flex-row items-center gap-3">
          <Image source={require('@/assets/images/owl/hero-wave.webp')} style={{ width: 52, height: 52 }} contentFit="contain" accessibilityIgnoresInvertColors />
          <View className="flex-1">
            <Text className="text-sm" style={{ color: '#ffffffcc' }} numberOfLines={1}>{data.name ? `Chào ${data.name.split(' ').slice(-1)[0]},` : 'Chào bạn,'}</Text>
            <Text accessibilityRole="header" weight="black" className="text-2xl" style={{ color: '#ffffff' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Hôm nay luyện gì?</Text>
          </View>
          <Pressable onPress={() => open('/practice/history')} accessibilityRole="button" accessibilityLabel="Lịch sử làm bài" className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
            <History size={20} color="#ffffff" />
          </Pressable>
        </View>
        {signedIn && (data.streak || data.xp || data.targetBand) ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {data.streak ? (
              <Pressable onPress={() => open('/progress')} accessibilityRole="button" accessibilityLabel={`Chuỗi ${data.streak.currentDays} ngày${data.streak.activeToday ? ', hôm nay đã học' : ', hôm nay chưa học'}`} className="flex-row items-center gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: data.streak.activeToday ? colors.accentWarm : 'rgba(255,255,255,0.16)' }}>
                <Flame size={14} color="#ffffff" fill={data.streak.activeToday ? '#ffffff' : 'transparent'} />
                <Text weight="black" className="text-xs" style={{ color: '#ffffff' }}>{data.streak.currentDays} ngày</Text>
              </Pressable>
            ) : null}
            {data.xp ? (
              <Pressable onPress={() => open('/progress')} accessibilityRole="button" accessibilityLabel={`Cấp ${data.xp.level}, ${data.xp.totalXp} XP`} className="flex-row items-center gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <Sparkles size={14} color="#ffffff" />
                <Text weight="black" className="text-xs" style={{ color: '#ffffff' }}>Cấp {data.xp.level} · {data.xp.totalXp} XP</Text>
              </Pressable>
            ) : null}
            {data.targetBand ? (
              <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <Target size={14} color="#ffffff" />
                <Text weight="bold" className="text-xs" style={{ color: '#ffffff' }}>Mục tiêu {data.targetBand.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <NextCard signedIn={signedIn} resume={data.resume} onOpen={open} />
      </View>

      <View className="px-4 pt-6">
        <SectionTitle title="4 kỹ năng IELTS" />
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {HOME_SKILLS.map((skill) => {
            const query = data.latestBySkill[skill];
            return <SkillTile key={skill} skill={skill} signedIn={signedIn} loading={signedIn && query.isPending} latest={query.data?.[0] ?? null} onPress={() => open(`/practice/catalog/${skill}`)} />;
          })}
        </View>

        <SectionTitle title="Luyện nhanh" note="Một phần đề, vừa giờ nghỉ" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {QUICK.map((item) => {
          const meta = SKILL_META[item.skill];
          const tint = skillColor(item.skill);
          return (
            <Pressable key={`${item.skill}-${item.part}`} onPress={() => open(`/practice/catalog/${item.skill}?part=${item.part}`)} accessibilityRole="button" accessibilityLabel={`${meta.label} ${item.title}, khoảng ${item.minutes} phút`} style={{ width: 148 }}>
              <View className="rounded-3xl bg-surface p-3" style={{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge, height: 132 }}>
                <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${tint}22` }}><meta.Icon size={20} color={skillInk(item.skill)} /></View>
                <Text weight="bold" className="mt-2 text-xs" style={{ color: skillInk(item.skill) }}>{meta.label}</Text>
                <Text weight="extrabold" numberOfLines={1} className="text-base text-ink">{item.title}</Text>
                <View className="mt-auto flex-row items-center gap-1"><Clock size={12} color={colors.muted} /><Text className="text-xs text-muted">~{item.minutes} phút</Text></View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="px-4">
        {data.pending.length ? (
          <>
            <SectionTitle title="Đang chờ chấm" />
            <View className="gap-2">{data.pending.map((row) => <PendingRow key={row.key} row={row} />)}</View>
          </>
        ) : null}

        <View className="mt-6 flex-row gap-3 rounded-3xl p-4" style={{ backgroundColor: colors.warmSoft }}>
          <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: '#ffffff' }}><Lightbulb size={20} color={colors.accentWarm} /></View>
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
    <View className="mb-3 mt-6 flex-row items-end justify-between px-0">
      <Text accessibilityRole="header" weight="black" className="text-lg text-ink">{title}</Text>
      {note ? <Text className="text-xs text-muted">{note}</Text> : null}
    </View>
  );
}

/** The white card inside the greeting band: continue the test in progress, start a first test, or sign in. */
function NextCard({ signedIn, resume, onOpen }: { signedIn: boolean; resume: ReturnType<typeof useHomeData>['resume']; onOpen: (path: string) => void }) {
  const content = !signedIn
    ? { eyebrow: 'Bắt đầu', title: 'Đăng nhập để lưu bài làm và kết quả', action: 'Đăng nhập', path: '/(auth)/login', color: colors.accent }
    : resume
      ? { eyebrow: 'Đang làm dở', title: resume.title || SKILL_META[resume.skill].label, action: 'Làm tiếp', path: `/practice/${resume.skill}/${resume.attemptId}`, color: skillColor(resume.skill) }
      : { eyebrow: 'Gợi ý cho bạn', title: 'Bắt đầu với Listening Section 1, chỉ khoảng 10 phút', action: 'Bắt đầu', path: '/practice/catalog/listening?part=1', color: skillColor('listening') };
  return (
    <Pressable onPress={() => (signedIn ? onOpen(content.path) : router.push('/(auth)/login' as never))} accessibilityRole="button" accessibilityLabel={`${content.eyebrow}: ${content.title}. ${content.action}`} className="mt-4">
      <View className="flex-row items-center gap-3 rounded-3xl p-4" style={{ backgroundColor: colors.surface }}>
        <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${content.color}22` }}>
          <PlayCircle size={26} color={content.color} />
        </View>
        <View className="flex-1">
          <Text weight="black" className="text-[11px] uppercase tracking-wider" style={{ color: content.color }}>{content.eyebrow}</Text>
          <Text weight="extrabold" numberOfLines={2} className="text-base text-ink">{content.title}</Text>
        </View>
        <View className="flex-row items-center gap-1 rounded-full px-3 py-2" style={{ backgroundColor: content.color }}>
          <Text weight="extrabold" className="text-xs" style={{ color: '#ffffff' }}>{content.action}</Text>
          <ArrowRight size={14} color="#ffffff" />
        </View>
      </View>
    </Pressable>
  );
}

/** A skill as a tile: coloured head with the icon, the parts, and the latest result (or a nudge to take the first test). */
function SkillTile({ skill, signedIn, loading, latest, onPress }: { skill: SkillType; signedIn: boolean; loading: boolean; latest: HistoryRow | null; onPress: () => void }) {
  const meta = SKILL_META[skill];
  const tint = skillColor(skill);
  const result = latest?.mark ? `${latest.mark.label} ${latest.mark.value}` : latest ? latest.status : null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${meta.label}. ${result ? `Gần nhất: ${result}` : 'Chưa làm bài nào'}`} style={{ width: '47.5%', flexGrow: 1 }}>
      <View style={{ borderRadius: 24, borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge, backgroundColor: colors.surface, overflow: 'hidden' }}>
        <View style={{ backgroundColor: tint, padding: 14, paddingBottom: 16, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: -24, top: -24, width: 88, height: 88, borderRadius: 44, backgroundColor: '#ffffff', opacity: 0.16 }} />
          <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: '#ffffff' }}><meta.Icon size={22} color={tint} /></View>
          <Text weight="black" className="mt-2 text-lg" style={{ color: '#ffffff' }}>{meta.label}</Text>
        </View>
        <View className="gap-0.5 p-3">
          <Text className="text-[11px] text-muted" numberOfLines={1}>{meta.subtitle}</Text>
          {loading ? <Skeleton height={16} width="70%" radius={6} style={{ marginTop: 4 }} />
            : !signedIn ? <Text weight="bold" className="text-sm" style={{ color: skillInk(skill) }}>Bắt đầu luyện ›</Text>
              : result ? <Text weight="extrabold" className="text-sm text-ink" numberOfLines={1}>Gần nhất: <Text weight="black" style={{ color: skillInk(skill) }}>{result}</Text></Text>
                : <Text weight="bold" className="text-sm" style={{ color: skillInk(skill) }}>Làm đề đầu tiên ›</Text>}
        </View>
      </View>
    </Pressable>
  );
}

function PendingRow({ row }: { row: HistoryRow }) {
  const route = row.href ? routeOf(row.href) : null;
  return (
    <Pressable disabled={!route} onPress={() => route && router.push(route as never)} accessibilityRole="button" className="flex-row items-center gap-3 rounded-2xl bg-surface p-3" style={{ borderWidth: 2, borderColor: colors.line }}>
      <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: colors.warmSoft }}><Hourglass size={20} color={colors.accentWarm} /></View>
      <View className="flex-1">
        <Text className="text-xs text-muted" numberOfLines={1}>{row.meta}</Text>
        <Text weight="bold" className="text-sm text-ink" numberOfLines={1}>{row.title}</Text>
        <Text weight="bold" className="text-xs" style={{ color: colors.accentWarm }}>{row.status}</Text>
      </View>
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}
