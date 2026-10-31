import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowRight, BookOpen, BookOpenCheck, Check, Share2, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Share, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useAuth } from '@/src/features/auth/auth-provider';
import { listActiveDecks, listAllDeckItems, normalizeDeckList, vocabApi, type VocabularyCatalogWord, type VocabularyTopic } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

const PAGE_SIZE = 30;
const MODES = [
  { id: 'words', label: 'Từ vựng' },
  { id: 'flashcards', label: 'Flashcard' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'match', label: 'Nối từ' },
  { id: 'fill', label: 'Điền từ' },
] as const;
type Mode = (typeof MODES)[number]['id'];
export type VocabularyStudyMode = Mode;
const LESSON_STEPS = MODES.filter((item) => item.id !== 'flashcards');

function primarySense(word: VocabularyCatalogWord) {
  return word.senses.find((sense) => sense.vietnameseMeaning || sense.englishDefinition) ?? word.senses[0];
}

function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function TopicStudySheet({ topic, setId, setTitle, topicPage, topicPageSize, visible, initialMode = 'words', onClose, onComplete }: { topic: VocabularyTopic | null; setId?: string; setTitle?: string; topicPage?: number; topicPageSize?: number; visible: boolean; initialMode?: VocabularyStudyMode; onClose: () => void; onComplete?: () => Promise<void> | void }) {
  const client = useQueryClient();
  const { authEnabled, status } = useAuth();
  const signedIn = authEnabled && status === 'authenticated';
  const [mode, setMode] = useState<Mode>('words');
  const [lessonStarted, setLessonStarted] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  const [previousMode, setPreviousMode] = useState<Mode>('words');
  const [lessonComplete, setLessonComplete] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [completionError, setCompletionError] = useState('');
  const [savedWordIds, setSavedWordIds] = useState<Set<string>>(() => new Set());
  const [createdDeckId, setCreatedDeckId] = useState<string | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<boolean | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(() => new Set());
  const [matchFeedback, setMatchFeedback] = useState('');
  const [fillAnswer, setFillAnswer] = useState('');
  const [fillFeedback, setFillFeedback] = useState<boolean | null>(null);
  const [fillIndex, setFillIndex] = useState(0);

  const wordsQuery = useInfiniteQuery({
    queryKey: setId ? ['vocab', 'set-words', setId] : ['vocab', 'topic-words', topic?.id, topicPage],
    queryFn: ({ pageParam, signal }) => setId
      ? vocabApi.listSetWords(setId, pageParam, PAGE_SIZE, signal)
      : vocabApi.listTopicWords(topic!.id, topicPage ?? pageParam, topicPage === undefined ? PAGE_SIZE : (topicPageSize ?? PAGE_SIZE), signal),
    enabled: visible && topic !== null,
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => topicPage === undefined && pages.reduce((count, page) => count + page.items.length, 0) < lastPage.total ? lastPage.page + 1 : undefined,
  });
  const decksQuery = useQuery({
    queryKey: ['flashcards', 'decks'],
    queryFn: listActiveDecks,
    select: normalizeDeckList,
    enabled: visible && signedIn,
    staleTime: 30_000,
  });
  const words = useMemo(() => wordsQuery.data?.pages.flatMap((page) => page.items) ?? [], [wordsQuery.data]);
  const practiceWords = useMemo(() => words.flatMap((word) => {
    const sense = primarySense(word);
    return sense?.vietnameseMeaning ? [{ word, sense, meaning: sense.vietnameseMeaning }] : [];
  }), [words]);
  const topicDeckName = topic ? `Từ vựng · ${topic.nameVi || topic.name}`.slice(0, 150) : '';
  const availableDeck = createdDeckId
    ? decksQuery.data?.find((deck) => deck.id === createdDeckId)
    : decksQuery.data?.find((deck) => deck.name === topicDeckName);
  const deckId = createdDeckId ?? availableDeck?.id ?? null;
  const deckItemsQuery = useQuery({
    queryKey: ['flashcards', 'deck-items', deckId],
    queryFn: () => listAllDeckItems(deckId!),
    enabled: visible && signedIn && Boolean(deckId),
    staleTime: 30_000,
  });
  const deckDueCount = availableDeck?.dueCount ?? 0;
  const quizLength = Math.min(10, practiceWords.length);
  const quizWord = practiceWords[quizIndex]?.word;
  const quizSense = practiceWords[quizIndex]?.sense;
  const quizOptions = useMemo(() => {
    if (!quizWord || !quizSense?.vietnameseMeaning) return [];
    const distractors = [...new Set(practiceWords.filter((item) => item.word.id !== quizWord.id).map((item) => item.meaning).filter((value) => value !== quizSense.vietnameseMeaning))];
    const rotated = [...distractors.slice(quizIndex), ...distractors.slice(0, quizIndex)].slice(0, 3);
    return [quizSense.vietnameseMeaning, ...rotated].sort(() => Math.random() - 0.5);
  }, [practiceWords, quizIndex, quizSense?.vietnameseMeaning, quizWord?.id]);
  const matchWords = practiceWords.slice(0, 4);
  const matchMeanings = useMemo(() => [...matchWords].reverse(), [matchWords]);
  const fillItem = practiceWords[fillIndex];

  useEffect(() => {
    if (!visible) return;
    setMode(initialMode); setLessonStarted(false); setStudyIndex(0); setPreviousMode('words'); setLessonComplete(false); setSavingCompletion(false); setCompletionError(''); setSavedWordIds(new Set()); setCreatedDeckId(null);
    setQuizIndex(0); setQuizScore(0); setQuizFeedback(null); setSelectedMatchId(null); setMatchedIds(new Set()); setMatchFeedback('');
    setFillAnswer(''); setFillFeedback(null); setFillIndex(0);
  }, [initialMode, topic?.id, visible]);

  const addToFlashcards = useMutation({
    mutationFn: async ({ word, sense, meaning }: { word: VocabularyCatalogWord; sense: VocabularyCatalogWord['senses'][number]; meaning: string }) => {
      if (!signedIn) throw new Error('Đăng nhập để lưu từ vào Flashcards.');
      const deck = availableDeck ?? await vocabApi.createDeck({ name: topicDeckName, description: `Từ vựng chủ đề ${topic?.nameVi || topic?.name}.` });
      setCreatedDeckId(deck.id);
      const card = await vocabApi.createCard({
        sourceType: 'VOCABULARY_SENSE',
        vocabularySenseId: sense.id,
        front: word.lemma,
        back: meaning,
        exampleSentence: sense.exampleSentence,
      });
      try {
        await vocabApi.addDeckItem(deck.id, card.id);
      } catch {
        await client.invalidateQueries({ queryKey: ['flashcards'] });
        throw new Error('Thẻ đã được tạo trong thư viện nhưng chưa thêm được vào bộ chủ đề. Mở bộ thẻ để thử thêm lại.');
      }
      await client.invalidateQueries({ queryKey: ['flashcards', 'deck-items', deck.id] });
      return deck.id;
    },
    onSuccess: async (id, variables) => {
      setCreatedDeckId(id);
      setSavedWordIds((current) => new Set(current).add(variables.word.id));
      await client.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });

  const answerQuiz = (answer: string) => {
    if (quizFeedback !== null || !quizSense?.vietnameseMeaning) return;
    const correct = answer === quizSense.vietnameseMeaning;
    if (correct) setQuizScore((score) => score + 1);
    setQuizFeedback(correct);
  };
  const nextQuizQuestion = () => { setQuizIndex((index) => index + 1); setQuizFeedback(null); };
  const chooseMatch = (wordId: string) => {
    if (!selectedMatchId) { setSelectedMatchId(wordId); setMatchFeedback('Chọn nghĩa tiếng Việt tương ứng.'); return; }
    if (selectedMatchId === wordId) {
      setMatchedIds((current) => new Set(current).add(wordId)); setMatchFeedback('Nối đúng rồi!');
    } else setMatchFeedback('Chưa khớp, thử lại nhé.');
    setSelectedMatchId(null);
  };
  const submitFill = () => {
    if (fillFeedback !== null || !fillItem) return;
    setFillFeedback(normalizeAnswer(fillAnswer) === normalizeAnswer(fillItem.word.lemma));
  };
  const canContinue = mode === 'words'
    ? wordsQuery.isSuccess && words.length > 0
    : mode === 'quiz'
      ? quizLength > 0 && quizIndex >= quizLength
      : mode === 'match'
        ? matchWords.length < 2 || matchedIds.size === matchWords.length
        : mode === 'fill'
          ? practiceWords.length > 0 && fillIndex >= practiceWords.length
          : true;
  const continueLesson = async () => {
    if (!lessonStarted) { setLessonStarted(true); return; }
    if (mode === 'words' && studyIndex + 1 < practiceWords.length) setStudyIndex((index) => index + 1);
    else if (mode === 'words') setMode('quiz');
    else if (mode === 'quiz') setMode('match');
    else if (mode === 'match') setMode('fill');
    else if (mode === 'fill') {
      setCompletionError('');
      setSavingCompletion(true);
      try {
        await onComplete?.();
        setLessonComplete(true);
      } catch {
        setCompletionError('Chưa lưu được tiến độ bài học. Hãy thử lại.');
      } finally {
        setSavingCompletion(false);
      }
    }
    else setMode(previousMode);
  };

  return (
    <Modal visible={visible} transparent={false} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View className="flex-1 bg-canvas px-5 pt-12">
        <View className="mb-2 h-10 flex-row items-center justify-between">
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng bài học" onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full"><X size={29} color={colors.ink} /></Pressable>
          <Text weight="black" className="text-sm tracking-[1.3px] text-accent-deep">IELTSPATH</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Lưu từ trong bài" onPress={() => { setLessonComplete(false); if (mode === 'flashcards') setMode(previousMode); else { setPreviousMode(mode); setMode('flashcards'); } }} className="h-10 w-10 items-center justify-center rounded-full"><BookOpenCheck size={20} color={colors.accentDeep} /></Pressable>
        </View>

        {lessonStarted ? <View className="mb-2 flex-row gap-1.5">{LESSON_STEPS.map((item, index) => { const currentIndex = LESSON_STEPS.findIndex((step) => step.id === mode); const complete = lessonComplete || (currentIndex >= 0 && index < currentIndex); const active = item.id === mode; return <View key={item.id} accessibilityLabel={`Bước ${index + 1}: ${item.label}${complete ? ', hoàn thành' : active ? ', hiện tại' : ', đang chờ'}`} className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: complete || active ? colors.accent : colors.line }} />; })}</View> : <View className="mb-2 h-1.5 rounded-full bg-line" />}
        {lessonStarted ? <Text className="mb-1 text-center text-[11px] text-muted">{mode === 'flashcards' ? 'Ôn tập thêm' : `BƯỚC ${Math.max(LESSON_STEPS.findIndex((item) => item.id === mode) + 1, 1)} / ${LESSON_STEPS.length} · ${LESSON_STEPS.find((item) => item.id === mode)?.label}`}</Text> : null}

        {wordsQuery.isPending ? <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang chuẩn bị bài học…</Text></View> : null}
        {wordsQuery.isError ? <View className="flex-1 items-center justify-center"><Text className="text-center text-base">Chưa tải được từ trong chủ đề này.</Text><Button className="mt-4" label="Thử lại" onPress={() => void wordsQuery.refetch()} /></View> : null}
        {wordsQuery.isSuccess && words.length === 0 ? <View className="flex-1 items-center justify-center"><Text className="text-center text-base">Chủ đề chưa có từ vựng.</Text></View> : null}

        {wordsQuery.isSuccess && words.length > 0 && !lessonStarted ? <View className="flex-1 items-center justify-center pb-8">
          <Image source={require('@/assets/images/owl/hero-cheer.webp')} resizeMode="contain" accessibilityLabel="Cú IELTSPath chào bạn vào bài học" className="h-[40%] w-full" />
          <Text weight="black" className="mt-5 text-center text-[27px] leading-9 text-ink">{setTitle || topic?.nameVi || topic?.name || 'Bài học mới'}</Text>
          <Text className="mt-3 max-w-[320px] text-center text-base leading-7 text-muted">Cùng học từ vựng và luyện cách sử dụng chúng trong tình huống thực tế nhé.</Text>
          <View className="mt-5 flex-row items-center gap-2 rounded-full bg-surface px-4 py-2"><BookOpen size={16} color={colors.accentDeep} /><Text weight="bold" className="text-sm">{practiceWords.length} từ · 4 dạng luyện tập</Text></View>
        </View> : null}

        {lessonStarted && lessonComplete ? <ScrollView className="flex-1" contentContainerClassName="flex-grow items-center justify-center py-6">
          <Image source={require('@/assets/images/owl/hero-cheer.webp')} resizeMode="contain" className="h-[36%] w-full" />
          <Text weight="black" className="mt-4 text-center text-[30px] leading-10 text-ink">Bạn làm tốt lắm!</Text>
          <Text className="mt-2 text-center text-base leading-7 text-muted">Đã hoàn thành bài “{setTitle || topic?.nameVi || topic?.name}”. Tiếp tục bài kế tiếp trong chủ đề nhé.</Text>
          <View className="mt-6 w-full flex-row gap-3"><View className="flex-1 items-center rounded-2xl bg-success-soft p-4"><Text weight="black" className="text-2xl" style={{ color: colors.success }}>{quizScore}/{quizLength}</Text><Text className="mt-1 text-xs text-muted">Câu đúng</Text></View><View className="flex-1 items-center rounded-2xl bg-accent-soft p-4"><Text weight="black" className="text-2xl text-accent-deep">{practiceWords.length}</Text><Text className="mt-1 text-xs text-muted">Từ đã luyện</Text></View></View>
        </ScrollView> : null}

        {lessonStarted && !lessonComplete && wordsQuery.isSuccess && words.length > 0 ? <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="flex-grow justify-center gap-4 py-4">
          {mode === 'words' ? (() => {
            const item = practiceWords[studyIndex];
            if (!item) return <View className="items-center rounded-[30px] border-2 border-accent bg-surface px-6 py-10"><Text weight="black" className="text-center text-2xl">Bạn đã xem hết từ mới!</Text><Text className="mt-3 text-center text-base text-muted">Tiếp tục để bắt đầu phần luyện tập.</Text></View>;
            return <View className="rounded-[30px] border-[3px] border-accent bg-surface px-6 py-8">
              <View className="mb-6 flex-row items-center justify-center gap-3"><View className="h-px flex-1 bg-line"/><Text weight="bold" className="text-xs uppercase tracking-[2px] text-muted">{item.sense.partOfSpeech || 'TỪ VỰNG'}</Text><View className="h-px flex-1 bg-line"/></View>
              <Text weight="black" className="text-center text-[34px] text-accent-deep">{item.word.lemma}</Text>
              {item.word.ipa ? <Text className="mt-1 text-center text-base text-muted">/{item.word.ipa}/</Text> : null}
              <Text className="mt-7 text-center text-[20px] leading-9 text-ink"><Text weight="black" className="text-accent-deep">{item.word.lemma}</Text> có nghĩa là “{item.meaning}”.</Text>
              {item.sense.englishDefinition ? <Text className="mt-5 text-center text-sm leading-6 text-muted">{item.sense.englishDefinition}</Text> : null}
              {item.sense.exampleSentence ? <Text className="mt-5 text-center text-sm italic leading-6 text-muted">“{item.sense.exampleSentence}”</Text> : null}
              <Text className="mt-6 text-center text-xs text-muted">Từ {studyIndex + 1} / {practiceWords.length}</Text>
            </View>;
          })() : null}

          {mode === 'quiz' ? quizLength === 0 ? <Text className="py-8 text-center text-base text-muted">Chưa có nghĩa tiếng Việt để bắt đầu quiz.</Text> : quizIndex >= quizLength ? <View className="items-center rounded-[30px] border border-line bg-surface p-6"><Check size={34} color={colors.success}/><Text weight="black" className="mt-3 text-2xl">Hoàn thành phần trắc nghiệm</Text><Text className="mt-2 text-center text-muted">Bạn trả lời đúng {quizScore}/{quizLength} câu.</Text></View> : <View className="gap-3"><Image source={require('@/assets/images/owl/nav-owl-stand.webp')} resizeMode="contain" className="h-[110px] w-full"/><Text weight="bold" className="text-center text-base text-accent-deep">Chọn nghĩa tiếng Việt</Text><Text weight="black" className="mb-2 text-center text-[29px]">{quizWord?.lemma}</Text>{quizOptions.map((option) => { const isRight = option === quizSense?.vietnameseMeaning; return <Pressable key={option} disabled={quizFeedback !== null} onPress={() => answerQuiz(option)} className="min-h-[62px] items-center justify-center rounded-2xl border border-line bg-surface px-4" style={quizFeedback !== null && isRight ? { backgroundColor: colors.successSoft, borderColor: colors.success } : undefined}><Text weight="bold" className="text-center text-lg">{option}</Text></Pressable>; })}{quizFeedback !== null ? <View className="mt-1 flex-row items-center justify-between"><Text weight="bold" className="text-base" style={{ color: quizFeedback ? colors.success : colors.danger }}>{quizFeedback ? 'Chính xác!' : `Đáp án: ${quizSense?.vietnameseMeaning}`}</Text><Pressable onPress={nextQuizQuestion} className="rounded-xl bg-accent px-4 py-3"><Text weight="bold" style={{ color: colors.canvas }}>Câu tiếp theo</Text></Pressable></View> : null}</View> : null}

          {mode === 'match' ? matchWords.length < 2 ? <Text className="py-8 text-center text-base text-muted">Bài này chưa đủ từ để chơi nối.</Text> : <View className="gap-4"><Image source={require('@/assets/images/owl/nav-owl-stand.webp')} resizeMode="contain" className="h-[100px] w-full"/><Text weight="bold" className="text-center text-lg text-accent-deep">Ghép các mục sau</Text><View className="flex-row gap-3"><View className="flex-1 gap-3">{matchWords.map(({ word }) => <Pressable key={word.id} disabled={matchedIds.has(word.id)} onPress={() => chooseMatch(word.id)} className="min-h-[58px] items-center justify-center rounded-2xl border border-line bg-surface px-2" style={matchedIds.has(word.id) ? { backgroundColor: colors.successSoft, borderColor: colors.success } : selectedMatchId === word.id ? { backgroundColor: colors.accentSoft, borderColor: colors.accent } : undefined}><Text weight="bold" className="text-center text-sm">{word.lemma}</Text></Pressable>)}</View><View className="flex-1 gap-3">{matchMeanings.map(({ word, meaning }) => <Pressable key={word.id} disabled={matchedIds.has(word.id)} onPress={() => chooseMatch(word.id)} className="min-h-[58px] items-center justify-center rounded-2xl border border-line bg-surface px-2" style={matchedIds.has(word.id) ? { backgroundColor: colors.successSoft, borderColor: colors.success } : undefined}><Text className="text-center text-sm">{meaning}</Text></Pressable>)}</View></View>{matchFeedback ? <Text className="text-center text-sm" style={{ color: matchFeedback.includes('đúng') ? colors.success : colors.muted }}>{matchFeedback}</Text> : null}</View> : null}

          {mode === 'fill' ? practiceWords.length === 0 ? <Text className="py-8 text-center text-base text-muted">Chưa có từ để luyện điền.</Text> : fillIndex >= practiceWords.length ? <View className="items-center rounded-[30px] border border-line bg-surface p-6"><Check size={34} color={colors.success}/><Text weight="black" className="mt-3 text-2xl">Đã luyện xong tất cả từ</Text><Text className="mt-2 text-center text-muted">Hoàn thành bài để mở bài kế tiếp.</Text></View> : <View className="gap-4"><Image source={require('@/assets/images/owl/nav-owl-stand.webp')} resizeMode="contain" className="h-[100px] w-full"/><Text weight="bold" className="text-center text-lg text-accent-deep">Điền từ còn thiếu</Text><Text className="text-center text-[21px] leading-8">Nghĩa tiếng Việt: {fillItem?.meaning}</Text>{fillItem?.sense.exampleSentence ? <Text className="text-center text-sm italic leading-6 text-muted">{fillItem.sense.exampleSentence}</Text> : null}<TextInput value={fillAnswer} onChangeText={setFillAnswer} editable={fillFeedback === null} autoCapitalize="none" autoCorrect={false} placeholder="Nhập từ tiếng Anh" placeholderTextColor={colors.muted} className="min-h-[60px] rounded-2xl border border-line bg-surface px-4 text-center text-xl text-ink" onSubmitEditing={submitFill} returnKeyType="done" />{fillFeedback === null ? <Pressable disabled={!fillAnswer.trim()} onPress={submitFill} className="items-center rounded-xl bg-accent py-4"><Text weight="black" style={{ color: colors.canvas }}>Kiểm tra</Text></Pressable> : <View className="flex-row items-center justify-between"><Text weight="bold" className="text-base" style={{ color: fillFeedback ? colors.success : colors.danger }}>{fillFeedback ? 'Chính xác!' : `Đáp án: ${fillItem?.word.lemma}`}</Text><Pressable onPress={() => { setFillIndex((index) => index + 1); setFillAnswer(''); setFillFeedback(null); }} className="rounded-xl bg-accent px-4 py-3"><Text weight="bold" style={{ color: colors.canvas }}>Tiếp theo</Text></Pressable></View>}</View> : null}

          {mode === 'flashcards' ? <View className="gap-3">{!signedIn ? <View className="rounded-2xl bg-surface p-4"><Text weight="bold">Đăng nhập để lưu và ôn flashcard</Text><Button className="mt-3" label="Đăng nhập" onPress={() => { onClose(); router.push('/(auth)/login' as never); }} /></View> : null}{signedIn && decksQuery.isError ? <Text className="text-sm text-danger">{decksQuery.error.message}</Text> : null}{signedIn && decksQuery.isPending ? <ActivityIndicator color={colors.accent} /> : null}{deckId ? <View className="rounded-2xl bg-success-soft p-4"><Text weight="bold" style={{ color: colors.success }}>Bộ thẻ chủ đề đã sẵn sàng</Text><Text className="mt-1 text-sm text-muted">{availableDeck?.cardCount ?? savedWordIds.size} thẻ · {deckDueCount} thẻ đến hạn</Text><Button className="mt-3" label="Ôn bộ flashcard này" disabled={deckDueCount === 0} onPress={() => { onClose(); router.push({ pathname: '/flashcards/[deckId]', params: { deckId } }); }} /></View> : null}{practiceWords.map(({ word, sense, meaning }) => { const saved = savedWordIds.has(word.id) || Boolean(deckItemsQuery.data?.some((item) => item.front.trim().toLocaleLowerCase() === word.lemma.trim().toLocaleLowerCase())); return <View key={word.id} className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"><View className="flex-1"><Text weight="bold">{word.lemma}</Text><Text className="mt-1 text-sm text-muted">{meaning}</Text></View><Pressable disabled={saved || addToFlashcards.isPending} onPress={() => addToFlashcards.mutate({ word, sense, meaning })} className="rounded-xl px-3 py-2" style={{ backgroundColor: saved ? colors.successSoft : colors.accent }}><Text weight="bold" className="text-xs" style={{ color: saved ? colors.success : colors.canvas }}>{saved ? 'Đã thêm' : addToFlashcards.isPending ? 'Đang thêm…' : 'Thêm thẻ'}</Text></Pressable></View>; })}{addToFlashcards.isError ? <Text className="text-sm text-danger">{addToFlashcards.error.message}</Text> : null}</View> : null}
          {completionError ? <Text accessibilityRole="alert" className="text-center text-sm text-danger">{completionError}</Text> : null}
        </ScrollView> : null}

        <View className="pb-8 pt-2">
          {lessonStarted && !lessonComplete && mode !== 'flashcards' ? <View className="mb-3 h-1.5 overflow-hidden rounded-full bg-line"><View className="h-full rounded-full bg-accent" style={{ width: `${Math.max(5, (LESSON_STEPS.findIndex((item) => item.id === mode) / LESSON_STEPS.length) * 100)}%` }} /></View> : null}
          <View className="flex-row items-center justify-between">
            {lessonStarted && !lessonComplete && mode !== 'flashcards' ? <Pressable accessibilityRole="button" accessibilityLabel="Chia sẻ bài học" onPress={() => void Share.share({ message: `Mình đang học chủ đề ${topic?.nameVi || topic?.name || 'từ vựng'} trên IELTSPath!` })} className="h-[58px] w-[58px] items-center justify-center rounded-2xl border-2 border-accent"><Share2 size={21} color={colors.accentDeep} /></Pressable> : <View className="h-[58px] w-[58px]" />}
            <Pressable accessibilityRole="button" disabled={savingCompletion || (!lessonStarted && (!wordsQuery.isSuccess || words.length === 0)) || (lessonStarted && mode !== 'flashcards' && !lessonComplete && !canContinue)} onPress={() => lessonComplete ? onClose() : void continueLesson()} className="min-h-[58px] min-w-[150px] flex-row items-center justify-center gap-2 rounded-2xl px-6" style={{ backgroundColor: savingCompletion || (!lessonStarted && (!wordsQuery.isSuccess || words.length === 0)) || (lessonStarted && mode !== 'flashcards' && !lessonComplete && !canContinue) ? colors.surfaceTint : colors.accent, opacity: savingCompletion ? 0.7 : 1 }}>
              {savingCompletion ? <ActivityIndicator color={colors.canvas} /> : <Text weight="black" className="text-lg" style={{ color: colors.canvas }}>{!lessonStarted ? 'Bắt đầu học' : lessonComplete ? 'Đóng bài học' : mode === 'flashcards' ? 'Quay lại' : mode === 'fill' && canContinue ? 'Hoàn thành' : 'Tiếp theo'}</Text>}
              {!savingCompletion && !lessonComplete && mode !== 'flashcards' ? <ArrowRight size={20} color={colors.canvas} /> : null}
            </Pressable>
            {lessonComplete ? <Pressable onPress={onClose} className="absolute inset-0" pointerEvents="none" /> : null}
          </View>
          {lessonComplete ? <Pressable onPress={onClose} className="mt-2 items-center py-2"><Text weight="bold" className="text-sm text-accent-deep">Quay lại lộ trình</Text></Pressable> : null}
        </View>
      </View>
    </Modal>
  );
}
