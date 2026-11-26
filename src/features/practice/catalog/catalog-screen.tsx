import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Text } from '@/src/components/ui/text';
import { useDebouncedSearch } from '@/src/features/flashcards/queries';
import { ApiError } from '@/src/lib/api-client';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

import { findSubmittedAttemptId, getCatalogProgress, getPracticeFormats, searchReadingTests, startReadingAttempt, type ReadingTestCard } from '../api/attempts';
import { progressKey, submissionsByKey, toCatalogKeyFilter, type ProgressTab } from '../model/progress-keys';
import { rememberAttempt } from '../model/resume-store';
import { PRACTICE_SKILL_CONFIG, defaultPracticePart, toScopeAndPart, type PracticePart } from '../model/skill-config';
import { SKILL_META, skillColor, skillInk } from '../model/skill-meta';
import type { SkillType } from '../model/types';
import { BandIcon, SkillBand } from '../components/skill-band';
import { usePremiumStatus, usePremiumUpgrade } from '../grading/use-premium-upgrade';
import { isPremiumRequired } from '../api/premium-error';
import { CompletedSheet, FormatFilterSheet, ModeSheet, SpeakingReadySheet, type StartMode } from './start-sheets';
import { TestCard } from './test-card';
import { catalogQueryState, isCompletedUnknown } from './catalog-query-state';

const PAGE_SIZE = 9;

function errorMessage(cause: unknown, fallback = 'Không tải được thư viện đề. Vui lòng thử lại.') {
  return cause instanceof ApiError || cause instanceof Error ? cause.message || fallback : fallback;
}

function doneKey(card: ReadingTestCard) {
  return progressKey(card.packageId, card.scope === 'FULL' ? null : (card.parts[0]?.partNo ?? null));
}

/** The catalog of one skill: part, formats, search, not-done / done, and starting or reopening a test. */
export function CatalogScreen({ skill, initialPart, initialFormat }: { skill: SkillType; initialPart?: string; initialFormat?: string }) {
  const config = PRACTICE_SKILL_CONFIG[skill];
  const insets = useSafeAreaInsets();
  const tint = skillColor(skill);
  const [part, setPart] = useState<PracticePart>(() => {
    if (initialPart === 'full' && config.hasFull) return 'full';
    const number = Number(initialPart);
    return config.parts.includes(number) ? number : defaultPracticePart(config);
  });
  const [tab, setTab] = useState<ProgressTab>('uncompleted');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedSearch(query).slice(0, 100);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(() => (initialFormat ?? '').split(',').filter((code) => /^[A-Z][A-Z_]{0,39}$/.test(code)).slice(0, 10));
  const [filterOpen, setFilterOpen] = useState(false);
  const [modeCard, setModeCard] = useState<ReadingTestCard | null>(null);
  const [readyCard, setReadyCard] = useState<ReadingTestCard | null>(null);
  const [doneCard, setDoneCard] = useState<ReadingTestCard | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [findingResult, setFindingResult] = useState(false);
  const [doneError, setDoneError] = useState('');
  const { scope, partNo } = toScopeAndPart(part);
  // One start or result per tap: state lands a frame late, so a quick double tap could create two attempts or push two
  // screens. Released on failure, and when the learner comes back to this screen.
  const busyRef = useRef(false);
  useFocusEffect(useCallback(() => { busyRef.current = false; }, []));

  const formats = useQuery({ queryKey: ['practice', 'formats', config.apiSkill], queryFn: ({ signal }) => getPracticeFormats(config.apiSkill, signal), staleTime: 300_000, retry: 1 });
  const progress = useQuery({ queryKey: ['practice', 'progress', config.apiSkill, scope], queryFn: ({ signal }) => getCatalogProgress(scope, signal, config.apiSkill), staleTime: 30_000, retry: 1 });
  const completed = useMemo(() => progress.data?.completed ?? [], [progress.data]);
  // Same reference while the progress data is unchanged (structural sharing), so the catalog key is stable on refetch.
  const doneList = useMemo(() => completed.map(({ packageId, partNo: donePart }) => ({ packageId, partNo: donePart })), [completed]);
  const completedUnknown = isCompletedUnknown(progress);
  const activeTab: ProgressTab = completedUnknown ? 'uncompleted' : tab;
  const doneSubmissions = useMemo(() => submissionsByKey(completed), [completed]);
  const doneKeys = useMemo(() => new Set(completed.map((item) => progressKey(item.packageId, item.partNo))), [completed]);
  // Without the formats endpoint the backend cannot filter, so the chosen formats are applied to the loaded cards.
  const formatsUnavailable = formats.isError;

  const tests = useInfiniteQuery({
    queryKey: ['practice', 'catalog', config.apiSkill, scope, partNo ?? null, activeTab, debouncedQuery, formatsUnavailable ? [] : selectedFormats, doneList],
    // Waits for the finished-test list; a failed one still lists every test.
    enabled: !progress.isPending,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const keyFilter = toCatalogKeyFilter(activeTab, doneList);
      if (keyFilter === 'EMPTY') return Promise.resolve({ totalElements: 0, page: 0, size: PAGE_SIZE, items: [] as ReadingTestCard[] });
      return searchReadingTests({
        skill: config.apiSkill,
        scope,
        ...(scope === 'PART' && partNo ? { partNo } : {}),
        ...(!formatsUnavailable && selectedFormats.length ? { formats: selectedFormats } : {}),
        ...(debouncedQuery ? { query: debouncedQuery } : {}),
        ...keyFilter,
        page: pageParam,
        size: PAGE_SIZE,
      }, signal);
    },
    getNextPageParam: (last) => ((last.page + 1) * PAGE_SIZE < last.totalElements ? last.page + 1 : undefined),
  });

  const cards = useMemo(() => {
    const all = tests.data?.pages.flatMap((page) => page.items) ?? [];
    return formatsUnavailable && selectedFormats.length ? all.filter((card) => card.formats.some((code) => selectedFormats.includes(code))) : all;
  }, [tests.data, formatsUnavailable, selectedFormats]);
  const formatOptions = useMemo(() => {
    if (!formatsUnavailable) return formats.data ?? [];
    const seen = new Set((tests.data?.pages ?? []).flatMap((page) => page.items.flatMap((card) => card.formats)));
    return [...seen].map((code) => ({ code, sectionCount: 0 }));
  }, [formats.data, formatsUnavailable, tests.data]);
  const total = tests.data?.pages[0]?.totalElements ?? 0;
  // The server total does not know a filter applied on the device, so it is hidden then.
  const localFilter = formatsUnavailable && selectedFormats.length > 0;

  const premium = usePremiumStatus();
  const upgrade = usePremiumUpgrade();
  const openUpgrade = upgrade.open;
  // Unknown Premium status does not lock anything: the server refuses and the same plans open then.
  const isLocked = useCallback((card: ReadingTestCard) => Boolean(card.requiredFeatureKey) && premium === false, [premium]);

  const openCard = useCallback((card: ReadingTestCard) => {
    setStartError('');
    // A finished test still opens: its result stays readable without Premium.
    if (activeTab === 'completed') { setDoneError(''); setDoneCard(card); return; }
    if (isLocked(card)) { openUpgrade(); return; }
    if (skill === 'speaking') setReadyCard(card);
    else setModeCard(card);
  }, [activeTab, skill, isLocked, openUpgrade]);

  function sectionOf(card: ReadingTestCard) {
    return card.parts.find((item) => item.partNo === partNo) ?? card.parts[0];
  }

  function start(card: ReadingTestCard, mode: StartMode) {
    if (busyRef.current) return;
    if (skill === 'writing') {
      const target = sectionOf(card);
      setModeCard(null);
      if (!target) return;
      busyRef.current = true;
      router.push({ pathname: '/practice/writing/[packageVersionId]/[sectionId]', params: { packageVersionId: card.packageVersionId, sectionId: target.sectionId, mode } } as never);
      return;
    }
    busyRef.current = true;
    setStarting(true);
    setStartError('');
    startReadingAttempt(card, mode, card.scope === 'PART' ? partNo : undefined).then((attempt) => {
      setModeCard(null);
      void rememberAttempt({ attemptId: attempt.id, skill: skill as 'reading' | 'listening', title: card.title });
      router.push(`/practice/${skill}/${attempt.id}` as never);
    }).catch((cause: unknown) => {
      busyRef.current = false;
      if (isPremiumRequired(cause)) { setModeCard(null); upgrade.open(); return; }
      setStartError(errorMessage(cause, 'Chưa bắt đầu được bài làm. Vui lòng thử lại.'));
    }).finally(() => setStarting(false));
  }

  function startSpeaking(card: ReadingTestCard) {
    const ordered = [...card.parts].sort((a, b) => (a.partNo ?? 0) - (b.partNo ?? 0));
    const target = card.scope === 'PART' ? ordered.find((item) => item.partNo === partNo) ?? ordered[0] : ordered[0];
    setReadyCard(null);
    if (!target || busyRef.current) return;
    busyRef.current = true;
    router.push({
      pathname: '/practice/speaking/[packageVersionId]/[sectionId]',
      params: { packageVersionId: card.packageVersionId, sectionId: target.sectionId, ...(card.scope === 'PART' ? {} : { parts: ordered.map((item) => item.sectionId).join(',') }) },
    } as never);
  }

  function viewResult(card: ReadingTestCard) {
    if (busyRef.current) return;
    setDoneError('');
    if (skill === 'speaking' || skill === 'writing') {
      const submissionId = doneSubmissions.get(doneKey(card));
      if (!submissionId) { setDoneError('Không tìm thấy bài làm đã chấm của đề này.'); return; }
      busyRef.current = true;
      setDoneCard(null);
      router.push(`/practice/${skill}-result/${submissionId}` as never);
      return;
    }
    busyRef.current = true;
    setFindingResult(true);
    findSubmittedAttemptId(config.apiSkill, card, card.scope === 'PART' ? partNo : undefined).then((attemptId) => {
      if (!attemptId) { busyRef.current = false; setDoneError('Không tìm thấy bài làm đã nộp của đề này.'); return; }
      setDoneCard(null);
      router.push({ pathname: '/practice/result/[attemptId]', params: { attemptId, skill } } as never);
    }).catch((cause: unknown) => {
      busyRef.current = false;
      setDoneError(errorMessage(cause));
    }).finally(() => setFindingResult(false));
  }

  function redo(card: ReadingTestCard) {
    setDoneCard(null);
    setStartError('');
    if (isLocked(card)) { upgrade.open(); return; }
    if (skill === 'speaking') setReadyCard(card);
    else setModeCard(card);
  }

  const partOptions: PracticePart[] = [...config.parts, ...(config.hasFull ? ['full' as const] : [])];
  const { loading, error: loadError } = catalogQueryState(progress, tests);

  async function refreshCatalog() {
    const before = progress.data;
    const refreshed = await progress.refetch();
    // A changed finished-test list moves the catalog to a new key, which loads by itself.
    if (refreshed.data === before) await tests.refetch();
  }

  const meta = SKILL_META[skill];
  const band = (
    <SkillBand color={tint} title={meta.label} subtitle={meta.subtitle} right={<BandIcon><meta.Icon size={24} color={tint} /></BandIcon>}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {partOptions.map((option) => {
          const active = option === part;
          const label = option === 'full' ? 'Full đề' : `${config.partLabel} ${option}`;
          return (
              <Pressable key={String(option)} onPress={() => { haptics.tap(); setPart(option); }} accessibilityRole="tab" accessibilityState={{ selected: active }} className="min-h-11 justify-center rounded-full px-4" style={{ backgroundColor: active ? '#ffffff' : 'rgba(255,255,255,0.18)' }}>
              <Text weight="extrabold" className="text-sm" style={{ color: active ? tint : '#ffffff' }}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SkillBand>
  );

  const header = (
    <View className="gap-3 pb-3">
      <View className="flex-row gap-2">
        <View className="min-h-12 flex-1 flex-row items-center gap-2 rounded-2xl bg-surface px-3" style={{ borderWidth: 1.5, borderColor: colors.line }}>
          <Search size={18} color={colors.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Tìm đề theo tên" placeholderTextColor={colors.muted} returnKeyType="search" accessibilityLabel="Tìm đề" className="flex-1 text-[15px] text-ink" />
          {query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Xoá tìm kiếm" hitSlop={8}><X size={18} color={colors.muted} /></Pressable> : null}
        </View>
        <Pressable onPress={() => setFilterOpen(true)} accessibilityRole="button" accessibilityLabel={`Lọc dạng câu hỏi${selectedFormats.length ? `, đang chọn ${selectedFormats.length}` : ''}`} className="min-h-12 w-12 items-center justify-center rounded-2xl" style={{ borderWidth: 1.5, borderColor: selectedFormats.length ? tint : colors.line, backgroundColor: selectedFormats.length ? `${tint}1f` : colors.surface }}>
          <SlidersHorizontal size={19} color={selectedFormats.length ? skillInk(skill) : colors.ink} />
          {selectedFormats.length ? (
            <View style={{ position: 'absolute', right: -4, top: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text weight="black" className="text-[10px]" style={{ color: '#ffffff' }}>{selectedFormats.length}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row gap-5">
          {(['uncompleted', 'completed'] as const).map((value) => {
            const active = activeTab === value;
            const disabled = value === 'completed' && completedUnknown;
            return (
              <Pressable key={value} disabled={disabled} onPress={() => setTab(value)} accessibilityRole="tab" accessibilityState={{ selected: active, disabled }} className="min-h-11 justify-center" style={{ opacity: disabled ? 0.45 : 1 }} hitSlop={6}>
                <Text weight={active ? 'black' : 'bold'} className="text-[15px]" style={{ color: active ? colors.ink : colors.muted }}>
                  {value === 'uncompleted' ? 'Chưa làm' : `Đã làm${completed.length ? ` · ${completed.length}` : ''}`}
                </Text>
                <View style={{ height: 3, borderRadius: 2, marginTop: 4, backgroundColor: active ? tint : 'transparent' }} />
              </Pressable>
            );
          })}
        </View>
        {!loading && !loadError && !localFilter ? <Text className="text-xs text-muted">{total} đề</Text> : null}
      </View>
      {completedUnknown ? (
        <View className="flex-row items-center gap-2 rounded-2xl px-3 py-1" style={{ backgroundColor: colors.warmSoft }}>
          <Text className="flex-1 text-xs leading-4 text-ink">Chưa tải được danh sách đề đã làm, nên mọi đề đều hiện ở đây.</Text>
          <Pressable onPress={() => void refreshCatalog()} accessibilityRole="button" accessibilityLabel="Tải lại danh sách đề đã làm" className="min-h-11 justify-center px-2">
            <Text weight="extrabold" className="text-xs" style={{ color: colors.accentWarm }}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-canvas">
      {band}
      <FlatList
        data={loading || loadError ? [] : cards}
        keyExtractor={(card) => `${card.packageId}:${card.scope}:${card.parts[0]?.partNo ?? 'full'}`}
        renderItem={({ item }) => <TestCard card={item} skill={skill} config={config} partNo={partNo} done={doneKeys.has(doneKey(item))} locked={isLocked(item)} tint={tint} onPress={openCard} />}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.4}
        // Not during a refresh: a page fetched then is overwritten when the refetch of the loaded pages lands.
        onEndReached={() => { if (tests.hasNextPage && !tests.isFetching) void tests.fetchNextPage(); }}
        refreshControl={<RefreshControl refreshing={progress.isRefetching || (tests.isRefetching && !tests.isFetchingNextPage)} onRefresh={() => void refreshCatalog()} tintColor={colors.accent} />}
        ListEmptyComponent={loading ? (
          <View className="gap-3">{[0, 1, 2, 3].map((index) => <Skeleton key={index} height={112} radius={22} />)}</View>
        ) : loadError ? (
          <EmptyState title="Chưa tải được danh sách đề" message={errorMessage(loadError)} mood="oops" action={<Button label="Thử lại" variant="secondary" onPress={() => void refreshCatalog()} />} />
        ) : (
          <EmptyState
            title={activeTab === 'completed' ? 'Bạn chưa hoàn thành đề nào ở mục này' : query || selectedFormats.length ? 'Không có đề phù hợp' : 'Bạn đã làm hết đề ở mục này'}
            message={activeTab === 'completed' ? 'Làm một đề ở tab Chưa làm, bài đã nộp sẽ hiện ở đây.' : 'Thử bỏ bớt bộ lọc hoặc chọn phần khác.'}
          />
        )}
        ListFooterComponent={tests.isFetchingNextPage ? <ActivityIndicator className="py-4" color={colors.accent} /> : undefined}
      />

      <FormatFilterSheet
        visible={filterOpen}
        skill={skill}
        formats={formatOptions}
        selected={selectedFormats}
        onToggle={(code) => setSelectedFormats((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code].slice(0, 10))}
        onClear={() => setSelectedFormats([])}
        onClose={() => setFilterOpen(false)}
      />
      {skill !== 'speaking' ? (
        <ModeSheet card={modeCard} skill={skill} busy={starting} error={startError} onStart={(mode) => modeCard && start(modeCard, mode)} onClose={() => setModeCard(null)} />
      ) : null}
      <SpeakingReadySheet card={readyCard} partNo={partNo} onStart={() => readyCard && startSpeaking(readyCard)} onClose={() => setReadyCard(null)} />
      <CompletedSheet card={doneCard} busy={findingResult} error={doneError} onViewResult={() => doneCard && viewResult(doneCard)} onRedo={() => doneCard && redo(doneCard)} onClose={() => setDoneCard(null)} />
      {upgrade.sheets}
    </View>
  );
}
