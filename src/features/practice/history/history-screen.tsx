import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ban, CheckCircle2, ChevronRight, ExternalLink, History, Hourglass, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { listExaminerReviews } from '../api/examiner-reviews';
import { getMyGradingJobs } from '../api/grading-jobs';
import { WEB_APP_URL, openOnWeb } from '../api/learning-links';
import { countReviews, dateText, joinReviews, sourceText, taskText, viewReviews, type ReviewFilter, type ReviewRow } from '../model/examiner-reviews-view';
import { loadBankHistory, loadCourseHistory, loadFreeHistory, loadKnowledgeHistory, type HistoryPage } from '../model/history-loaders';
import { routeOf, type HistoryRow } from '../model/history-view';
import { SKILL_META, skillInk } from '../model/skill-meta';
import { BandIcon, SkillBand } from '../components/skill-band';

export type HistoryTab = 'practice' | 'course' | 'knowledge' | 'teacher';
type Skill = 'listening' | 'reading' | 'writing' | 'speaking';

const TABS: Array<{ key: HistoryTab; label: string }> = [
  { key: 'practice', label: 'Luyện 4 kỹ năng' },
  { key: 'teacher', label: 'Giáo viên chấm' },
  { key: 'course', label: 'Trong khóa học' },
  { key: 'knowledge', label: 'Theo kiến thức' },
];
const SKILLS: Array<{ key: Skill; label: string }> = [
  { key: 'listening', label: 'Listening' }, { key: 'reading', label: 'Reading' }, { key: 'writing', label: 'Writing' }, { key: 'speaking', label: 'Speaking' },
];
const TONE = { done: colors.success, wait: colors.accentWarm, late: colors.danger } as const;

/** Every submission in one place: the four skills of the practice bank, teacher reviews, course work and knowledge practice. */
export function HistoryScreen({ initialTab = 'practice', initialSkill = 'listening' }: { initialTab?: HistoryTab; initialSkill?: Skill }) {
  const [tab, setTab] = useState<HistoryTab>(initialTab);
  const [skill, setSkill] = useState<Skill>(initialSkill);
  return (
    <View className="flex-1 bg-canvas">
      <SkillBand color={colors.heroStart} title="Lịch sử làm bài" subtitle="Bài đã nộp, điểm và trạng thái chấm" right={<BandIcon><History size={22} color={colors.heroStart} /></BandIcon>}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <Pressable key={item.key} onPress={() => setTab(item.key)} accessibilityRole="tab" accessibilityState={{ selected: active }} className="min-h-10 justify-center rounded-full px-4" style={{ backgroundColor: active ? '#ffffff' : 'rgba(255,255,255,0.18)' }}>
                <Text weight="extrabold" className="text-sm" style={{ color: active ? colors.heroStart : '#ffffff' }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SkillBand>
      {tab === 'practice' ? (
        <View className="flex-1">
          <View className="flex-row gap-2 px-4 pt-4">
            {SKILLS.map((item) => {
              const active = skill === item.key;
              const Icon = SKILL_META[item.key].Icon;
              return (
                <Pressable key={item.key} onPress={() => setSkill(item.key)} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: active }} className="min-h-[52px] flex-1 items-center justify-center gap-0.5 rounded-2xl" style={{ backgroundColor: active ? colors.skill[item.key] : colors.surface, borderWidth: 1.5, borderColor: active ? colors.skill[item.key] : colors.line }}>
                  <Icon size={16} color={active ? '#ffffff' : skillInk(item.key)} />
                  <Text weight="bold" className="text-[11px]" style={{ color: active ? '#ffffff' : colors.muted }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <RowList key={skill} queryKey={['practice', 'history', skill]} load={(page) => (skill === 'writing' || skill === 'speaking' ? loadFreeHistory(skill === 'writing' ? 'WRITING' : 'SPEAKING', page) : loadBankHistory(skill === 'reading' ? 'READING' : 'LISTENING', page))} empty={`Bạn chưa nộp bài ${SKILLS.find((item) => item.key === skill)?.label} nào`} catalog={`/practice/catalog/${skill}`} />
        </View>
      ) : tab === 'course' ? (
        <RowList queryKey={['practice', 'history', 'course']} load={loadCourseHistory} empty="Chưa có bài nộp nào trong khóa học" />
      ) : tab === 'knowledge' ? (
        <RowList queryKey={['practice', 'history', 'knowledge']} load={loadKnowledgeHistory} empty="Chưa có lần luyện theo kiến thức nào" />
      ) : <TeacherReviews />}
    </View>
  );
}

function RowList({ queryKey, load, empty, catalog }: { queryKey: unknown[]; load: (page: number) => Promise<HistoryPage>; empty: string; catalog?: string }) {
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => load(pageParam),
    getNextPageParam: (last, pages) => (last.hasNext ? pages.length : undefined),
  });
  const rows = query.data?.pages.flatMap((page) => page.rows) ?? [];
  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={({ item }) => <HistoryRowCard row={item} />}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
      onEndReachedThreshold={0.4}
      onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
      refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={colors.accent} />}
      ListEmptyComponent={query.isPending ? <ActivityIndicator className="py-8" color={colors.accent} /> : query.isError ? (
        <EmptyState title="Chưa tải được lịch sử" message={query.error.message} mood="oops" action={<Button label="Thử lại" variant="secondary" onPress={() => void query.refetch()} />} />
      ) : <EmptyState title={empty} message="Bài bạn nộp sẽ hiện ở đây." action={catalog ? <Button label="Chọn đề" onPress={() => router.push(catalog as never)} /> : undefined} />}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-4" color={colors.accent} /> : undefined}
    />
  );
}

function HistoryRowCard({ row }: { row: HistoryRow }) {
  const route = row.href ? routeOf(row.href) : null;
  const web = row.href && !route && WEB_APP_URL ? row.href : null;
  const open = () => {
    if (route) router.push(route as never);
    else if (web) void openOnWeb(web).catch(() => Alert.alert('Chưa mở được trang', 'Hãy thử lại sau.'));
  };
  return (
    <Pressable disabled={!route && !web} onPress={open} accessibilityRole="button" accessibilityLabel={`${row.meta}. ${row.title}. ${row.status}`} className="flex-row items-center gap-3 rounded-3xl bg-surface p-3" style={{ borderWidth: 1.5, borderBottomWidth: 3.5, borderColor: colors.line, borderBottomColor: colors.edge }}>
      <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${TONE[row.tone]}1f` }}>
        {row.mark ? <><Text className="text-[10px] text-muted">{row.mark.label}</Text><Text weight="black" className="text-base" style={{ color: TONE[row.tone] }}>{row.mark.value}</Text></>
          : row.tone === 'done' ? <CheckCircle2 size={22} color={TONE.done} /> : row.tone === 'late' ? <TriangleAlert size={22} color={TONE.late} /> : <Hourglass size={22} color={TONE.wait} />}
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-xs text-muted">{row.meta}</Text>
        <Text weight="bold" numberOfLines={2} className="text-sm text-ink">{row.title}</Text>
        <Text numberOfLines={1} className="text-xs text-muted">{row.facts.join(' · ')}</Text>
        <Text weight="bold" className="mt-0.5 text-xs" style={{ color: TONE[row.tone] }}>{row.status}</Text>
      </View>
      {route ? <ChevronRight size={18} color={colors.muted} /> : web ? <ExternalLink size={16} color={colors.muted} /> : null}
    </Pressable>
  );
}

const FILTERS: Array<{ key: ReviewFilter; label: string }> = [{ key: 'ALL', label: 'Tất cả' }, { key: 'DONE', label: 'Đã chấm' }, { key: 'WAITING', label: 'Đang chờ' }];

/** Essays sent to a teacher, joined with how each grading job stands (waiting, late, done, cancelled). */
function TeacherReviews() {
  const [filter, setFilter] = useState<ReviewFilter>('ALL');
  const reviews = useInfiniteQuery({
    queryKey: ['practice', 'examiner-reviews'],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => listExaminerReviews(pageParam, undefined, signal),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  });
  const jobs = useQuery({ queryKey: ['practice', 'grading-jobs'], queryFn: ({ signal }) => getMyGradingJobs(signal) });
  const rows = useMemo(() => joinReviews(reviews.data?.pages.flatMap((page) => page.items) ?? [], jobs.data ?? []), [reviews.data, jobs.data]);
  const counts = countReviews(rows);
  const shown = viewReviews(rows, filter);
  return (
    <FlatList
      data={shown}
      keyExtractor={(row) => row.reviewSubmissionId}
      renderItem={({ item }) => <ReviewCard row={item} />}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
      onEndReachedThreshold={0.4}
      onEndReached={() => { if (reviews.hasNextPage && !reviews.isFetchingNextPage) void reviews.fetchNextPage(); }}
      refreshControl={<RefreshControl refreshing={reviews.isRefetching} onRefresh={() => { void reviews.refetch(); void jobs.refetch(); }} tintColor={colors.accent} />}
      ListHeaderComponent={rows.length ? (
        <View className="mb-1 gap-2">
          <View className="flex-row gap-2">
            {FILTERS.map((item) => (
              <Pressable key={item.key} onPress={() => setFilter(item.key)} accessibilityRole="tab" accessibilityState={{ selected: filter === item.key }} className="min-h-9 flex-row items-center gap-1 rounded-full px-3" style={{ backgroundColor: filter === item.key ? colors.accentSoft : colors.surface, borderWidth: 2, borderColor: filter === item.key ? colors.accent : colors.line }}>
                <Text weight="bold" className="text-xs" style={{ color: filter === item.key ? colors.accentDeep : colors.ink }}>{item.label}</Text>
                <Text className="text-xs text-muted">{counts[item.key]}</Text>
              </Pressable>
            ))}
          </View>
          {jobs.isError ? <Text className="text-xs text-muted">Chưa lấy được trạng thái chấm bài; các bài đang hiện là đang chờ.</Text> : null}
        </View>
      ) : undefined}
      ListEmptyComponent={reviews.isPending ? <ActivityIndicator className="py-8" color={colors.accent} /> : reviews.isError ? (
        <EmptyState title="Chưa tải được danh sách" message={reviews.error.message} mood="oops" action={<Button label="Thử lại" variant="secondary" onPress={() => void reviews.refetch()} />} />
      ) : rows.length ? <Text className="py-6 text-center text-sm text-muted">Không có bài nào ở mục này.</Text> : (
        <EmptyState title="Bạn chưa gửi bài nào cho giáo viên" message="Khi bạn chọn giáo viên chấm một bài Writing, bài đó sẽ hiện ở đây." action={<Button label="Đến danh mục Writing" onPress={() => router.push('/practice/catalog/writing' as never)} />} />
      )}
      ListFooterComponent={reviews.isFetchingNextPage ? <ActivityIndicator className="py-4" color={colors.accent} /> : undefined}
    />
  );
}

function ReviewCard({ row }: { row: ReviewRow }) {
  const kind = row.done ? 'done' : row.cancelled ? 'cancelled' : row.job?.state === 'OVERDUE' ? 'late' : 'wait';
  const color = kind === 'done' ? colors.success : kind === 'late' ? colors.danger : kind === 'cancelled' ? colors.muted : colors.accentWarm;
  const Icon = kind === 'done' ? CheckCircle2 : kind === 'cancelled' ? Ban : kind === 'late' ? TriangleAlert : Hourglass;
  const status = kind === 'done' ? 'Đã chấm' : kind === 'cancelled' ? 'Đã hủy yêu cầu' : kind === 'late' ? 'Quá hạn 48 giờ' : 'Đang chờ chấm';
  return (
    <Pressable onPress={() => router.push(`/practice/writing-result/${row.submissionId}` as never)} accessibilityRole="button" className="flex-row items-center gap-3 rounded-3xl bg-surface p-3" style={{ borderWidth: 1.5, borderBottomWidth: 3.5, borderColor: colors.line, borderBottomColor: colors.edge }}>
      <View className="h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}1f` }}>
        {kind === 'done' && row.band !== null ? <><Text className="text-[10px] text-muted">Band</Text><Text weight="black" className="text-base" style={{ color }}>{row.band.toFixed(1)}</Text></> : <Icon size={22} color={color} />}
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="text-xs text-muted">{taskText(row.task)} · {sourceText(row.source)}</Text>
        <Text weight="bold" numberOfLines={2} className="text-sm text-ink">{row.promptPreview || 'Bài viết của bạn'}</Text>
        <Text numberOfLines={1} className="text-xs text-muted">Gửi {dateText(row.requestedAt)} · {row.wordCount} từ{row.done && row.completedAt ? ` · Chấm ${dateText(row.completedAt)}` : ''}</Text>
        <Text weight="bold" className="mt-0.5 text-xs" style={{ color }}>{status}</Text>
      </View>
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}
