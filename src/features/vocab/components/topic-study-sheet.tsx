import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpen, Check, ChevronRight, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';

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

function primarySense(word: VocabularyCatalogWord) {
  return word.senses.find((sense) => sense.vietnameseMeaning || sense.englishDefinition) ?? word.senses[0];
}

function normalizeAnswer(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function TopicStudySheet({ topic, setId, setTitle, visible, initialMode = 'words', onClose }: { topic: VocabularyTopic | null; setId?: string; setTitle?: string; visible: boolean; initialMode?: VocabularyStudyMode; onClose: () => void }) {
  const client = useQueryClient();
  const { authEnabled, status } = useAuth();
  const signedIn = authEnabled && status === 'authenticated';
  const [mode, setMode] = useState<Mode>('words');
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);
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
    queryKey: setId ? ['vocab', 'set-words', setId] : ['vocab', 'topic-words', topic?.id],
    queryFn: ({ pageParam, signal }) => setId
      ? vocabApi.listSetWords(setId, pageParam, PAGE_SIZE, signal)
      : vocabApi.listTopicWords(topic!.id, pageParam, PAGE_SIZE, signal),
    enabled: visible && topic !== null,
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => pages.reduce((count, page) => count + page.items.length, 0) < lastPage.total ? lastPage.page + 1 : undefined,
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
    setMode(initialMode); setExpandedWordId(null); setSavedWordIds(new Set()); setCreatedDeckId(null);
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[92%] rounded-t-[30px] border border-line bg-canvas px-5 pb-8 pt-5">
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text weight="bold" className="text-xs uppercase tracking-widest text-accent-deep">BÀI HỌC TỪ VỰNG</Text>
              <Text weight="black" className="mt-1 text-xl leading-7">{setTitle || topic?.nameVi || topic?.name}</Text>
              {topic ? <Text className="mt-1 text-sm text-muted">{setTitle ? `${topic.nameVi || topic.name} · ${wordsQuery.data?.pages[0]?.total ?? '…'} từ` : `${topic.wordCount} từ · ${topic.name}`}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng chủ đề" onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-surface"><X size={20} color={colors.ink} /></Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="mb-4 gap-2">
            {MODES.map((item) => (
              <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: mode === item.id }} onPress={() => setMode(item.id)} className="min-h-10 justify-center rounded-full px-4" style={{ backgroundColor: mode === item.id ? colors.accent : colors.surface }}>
                <Text weight="bold" className="text-xs" style={{ color: mode === item.id ? '#fff' : colors.muted }}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {wordsQuery.isPending ? <View className="py-10"><ActivityIndicator color={colors.accent} /></View> : null}
          {wordsQuery.isError ? (
            <View className="rounded-2xl bg-surface p-4"><Text className="text-sm text-muted">Chưa tải được từ trong chủ đề này.</Text><Button className="mt-3" variant="secondary" label="Thử lại" onPress={() => void wordsQuery.refetch()} /></View>
          ) : null}
          {wordsQuery.isSuccess && words.length === 0 ? <Text className="py-6 text-sm text-muted">Chủ đề chưa có từ vựng.</Text> : null}

          {mode === 'words' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-2">
              {words.map((word, wordIndex) => {
                const expanded = expandedWordId === word.id;
                const sense = primarySense(word);
                return (
                  <Pressable key={word.id} accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpandedWordId(expanded ? null : word.id)} className="rounded-2xl border border-line bg-surface px-4 py-3 active:opacity-75">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-accent-soft"><BookOpen size={18} color={colors.accentDeep} /></View>
                      <View className="flex-1"><Text weight="extrabold" className="text-base">{word.lemma}</Text><Text className="mt-0.5 text-xs text-muted">{word.ipa || sense?.partOfSpeech || `Từ ${wordIndex + 1}`}</Text></View>
                      <ChevronRight size={17} color={colors.muted} />
                    </View>
                    {sense?.vietnameseMeaning ? <Text className="ml-[52px] mt-2 text-sm">{sense.vietnameseMeaning}</Text> : null}
                    {expanded ? <View className="ml-[52px] mt-3 border-t border-line pt-3">
                      {word.senses.map((item) => <View key={item.id} className="mb-3">
                        {item.partOfSpeech ? <Text weight="bold" className="text-xs text-accent-deep">{item.partOfSpeech}</Text> : null}
                        {item.englishDefinition ? <Text className="mt-1 text-sm text-muted">{item.englishDefinition}</Text> : null}
                        {item.exampleSentence ? <Text className="mt-2 text-sm italic">“{item.exampleSentence}”</Text> : null}
                      </View>)}
                    </View> : null}
                  </Pressable>
                );
              })}
              {wordsQuery.hasNextPage ? <Button className="mt-2" variant="secondary" label={wordsQuery.isFetchingNextPage ? 'Đang tải thêm…' : 'Tải thêm từ'} disabled={wordsQuery.isFetchingNextPage} onPress={() => void wordsQuery.fetchNextPage()} /> : null}
              {wordsQuery.isSuccess ? <Text className="py-2 text-center text-xs text-muted">Đang xem {words.length}/{wordsQuery.data.pages[0]?.total ?? words.length} từ</Text> : null}
            </ScrollView>
          ) : null}

          {mode === 'flashcards' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-2">
              {!signedIn ? <View className="rounded-2xl bg-surface p-4"><Text weight="bold">Đăng nhập để lưu và ôn flashcard</Text><Button className="mt-3" label="Đăng nhập" onPress={() => { onClose(); router.push('/(auth)/login' as never); }} /></View> : null}
              {signedIn && decksQuery.isError ? <View className="rounded-2xl bg-surface p-4"><Text className="text-sm text-danger">{decksQuery.error.message}</Text><Button className="mt-3" variant="secondary" label="Thử lại" onPress={() => void decksQuery.refetch()} /></View> : null}
              {signedIn && decksQuery.isPending ? <ActivityIndicator className="py-6" color={colors.accent} /> : null}
              {deckId ? <View className="mb-2 rounded-2xl bg-accent-soft p-4"><Text weight="bold" className="text-accent-deep">Bộ thẻ chủ đề đã sẵn sàng</Text><Text className="mt-1 text-sm text-muted">{availableDeck?.cardCount ?? savedWordIds.size} thẻ · {deckDueCount} thẻ đến hạn</Text><Button className="mt-3" label="Ôn bộ flashcard này" disabled={deckDueCount === 0} onPress={() => { onClose(); router.push({ pathname: '/flashcards/[deckId]', params: { deckId } }); }} /></View> : null}
              {practiceWords.map(({ word, sense, meaning }) => {
                const saved = savedWordIds.has(word.id) || Boolean(deckItemsQuery.data?.some((item) => item.front.trim().toLocaleLowerCase() === word.lemma.trim().toLocaleLowerCase()));
                return <View key={word.id} className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"><View className="flex-1"><Text weight="bold">{word.lemma}</Text><Text className="mt-1 text-sm text-muted">{meaning}</Text></View><Pressable accessibilityRole="button" accessibilityState={{ disabled: saved || addToFlashcards.isPending }} disabled={saved || addToFlashcards.isPending} onPress={() => addToFlashcards.mutate({ word, sense, meaning })} className="min-h-10 min-w-20 flex-row items-center justify-center gap-1 rounded-xl px-3" style={{ backgroundColor: saved ? colors.successSoft : colors.accent }}><Text weight="bold" className="text-xs" style={{ color: saved ? colors.success : '#fff' }}>{saved ? 'Đã thêm' : addToFlashcards.isPending ? 'Đang thêm…' : 'Thêm thẻ'}</Text></Pressable></View>;
              })}
              {addToFlashcards.isError ? <Text accessibilityRole="alert" className="py-2 text-sm text-danger">{addToFlashcards.error.message}</Text> : null}
              {!wordsQuery.isPending && practiceWords.length === 0 ? <Text className="py-6 text-center text-sm text-muted">Chưa có nghĩa tiếng Việt để tạo thẻ trong trang từ này.</Text> : null}
              {wordsQuery.hasNextPage ? <Button className="mt-2" variant="secondary" label={wordsQuery.isFetchingNextPage ? 'Đang tải thêm…' : 'Tải thêm từ'} disabled={wordsQuery.isFetchingNextPage} onPress={() => void wordsQuery.fetchNextPage()} /> : null}
            </ScrollView>
          ) : null}

          {mode === 'quiz' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3">
              {quizLength === 0 ? <Text className="py-8 text-center text-sm text-muted">Tải danh sách từ có nghĩa tiếng Việt để bắt đầu quiz.</Text> : quizIndex >= quizLength ? <View className="items-center rounded-3xl bg-surface p-6"><Text weight="black" className="text-2xl">Hoàn thành quiz</Text><Text className="mt-2 text-muted">Bạn trả lời đúng {quizScore}/{quizLength} câu.</Text><Text className="mt-1 text-xs text-muted">Kết quả chỉ lưu trong lượt này; chưa cộng XP.</Text><Button className="mt-4" label="Làm lại" onPress={() => { setQuizIndex(0); setQuizScore(0); setQuizFeedback(null); }} /></View> : (
                <View className="gap-3"><Text weight="bold" className="text-xs uppercase tracking-widest text-muted">CÂU {quizIndex + 1}/{quizLength}</Text><View className="rounded-3xl bg-surface p-5"><Text className="text-sm text-muted">Chọn nghĩa tiếng Việt của</Text><Text weight="black" className="mt-2 text-3xl">{quizWord?.lemma}</Text>{quizWord?.ipa ? <Text className="mt-1 text-sm text-muted">{quizWord.ipa}</Text> : null}</View>{quizOptions.map((option) => <Pressable key={option} disabled={quizFeedback !== null} onPress={() => answerQuiz(option)} className="min-h-12 justify-center rounded-2xl border border-line bg-surface px-4"><Text weight="semibold" className="text-sm">{option}</Text></Pressable>)}{quizFeedback !== null ? <View className="rounded-2xl p-4" style={{ backgroundColor: quizFeedback ? colors.successSoft : colors.dangerSoft }}><Text weight="bold" style={{ color: quizFeedback ? colors.success : colors.danger }}>{quizFeedback ? 'Chính xác!' : `Đáp án: ${quizSense?.vietnameseMeaning}`}</Text><Button className="mt-3" label="Câu tiếp theo" onPress={nextQuizQuestion} /></View> : null}</View>
              )}
              {wordsQuery.hasNextPage && quizIndex >= quizLength ? <Button variant="secondary" label="Tải thêm từ" onPress={() => void wordsQuery.fetchNextPage()} /> : null}
            </ScrollView>
          ) : null}

          {mode === 'match' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3">
              {matchWords.length < 2 ? <Text className="py-8 text-center text-sm text-muted">Cần ít nhất hai từ có nghĩa để chơi nối từ.</Text> : <>
                <Text className="text-sm text-muted">Chọn một từ bên trái, rồi chọn nghĩa tương ứng bên phải.</Text>
                <View className="flex-row gap-2"><View className="flex-1 gap-2">{matchWords.map(({ word }) => <Pressable key={word.id} disabled={matchedIds.has(word.id)} onPress={() => chooseMatch(word.id)} className="min-h-12 justify-center rounded-xl border border-line px-3" style={{ backgroundColor: matchedIds.has(word.id) ? colors.successSoft : selectedMatchId === word.id ? colors.accentSoft : colors.surface }}><Text weight="bold" className="text-sm" numberOfLines={2}>{word.lemma}</Text></Pressable>)}</View><View className="flex-1 gap-2">{matchMeanings.map(({ word, meaning }) => <Pressable key={word.id} disabled={matchedIds.has(word.id)} onPress={() => chooseMatch(word.id)} className="min-h-12 justify-center rounded-xl border border-line px-3" style={{ backgroundColor: matchedIds.has(word.id) ? colors.successSoft : colors.surface }}><Text className="text-sm" numberOfLines={2}>{meaning}</Text></Pressable>)}</View></View>
                {matchFeedback ? <Text className="text-center text-sm text-accent-deep">{matchFeedback}</Text> : null}
                {matchedIds.size === matchWords.length ? <View className="items-center rounded-2xl bg-success-soft p-4"><Check color={colors.success} /><Text weight="bold" className="mt-2">Nối xong {matchWords.length} cặp từ.</Text><Button className="mt-2" label="Chơi lại" onPress={() => { setMatchedIds(new Set()); setMatchFeedback(''); }} /></View> : null}
                {wordsQuery.hasNextPage ? <Button variant="secondary" label="Tải thêm từ" onPress={() => void wordsQuery.fetchNextPage()} /> : null}
              </>}
            </ScrollView>
          ) : null}

          {mode === 'fill' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3">
              {practiceWords.length === 0 ? <Text className="py-8 text-center text-sm text-muted">Chưa có nghĩa tiếng Việt để tạo câu điền từ.</Text> : fillIndex >= practiceWords.length ? <View className="items-center rounded-3xl bg-surface p-6"><Text weight="black" className="text-2xl">Hoàn thành</Text><Text className="mt-2 text-muted">Bạn đã luyện hết {practiceWords.length} từ đang tải.</Text><Button className="mt-4" label="Làm lại" onPress={() => { setFillIndex(0); setFillAnswer(''); setFillFeedback(null); }} /></View> : <>
                <Text weight="bold" className="text-xs uppercase tracking-widest text-muted">ĐIỀN TỪ {fillIndex + 1}/{practiceWords.length}</Text>
                <View className="rounded-3xl bg-surface p-5"><Text className="text-sm text-muted">Từ tiếng Anh có nghĩa là</Text><Text weight="black" className="mt-2 text-xl">{fillItem?.meaning}</Text>{fillItem?.sense.exampleSentence ? <Text className="mt-3 text-sm italic text-muted">{fillItem.sense.exampleSentence}</Text> : null}</View>
                <TextInput value={fillAnswer} onChangeText={setFillAnswer} editable={fillFeedback === null} autoCapitalize="none" autoCorrect={false} placeholder="Nhập từ tiếng Anh" placeholderTextColor={colors.muted} className="min-h-12 rounded-2xl border border-line bg-surface px-4 text-base text-ink" onSubmitEditing={submitFill} returnKeyType="done" />
                {fillFeedback === null ? <Button label="Kiểm tra" disabled={!fillAnswer.trim()} onPress={submitFill} /> : <View className="rounded-2xl p-4" style={{ backgroundColor: fillFeedback ? colors.successSoft : colors.dangerSoft }}><Text weight="bold" style={{ color: fillFeedback ? colors.success : colors.danger }}>{fillFeedback ? 'Chính xác!' : `Đáp án: ${fillItem?.word.lemma}`}</Text><Button className="mt-3" label="Từ tiếp theo" onPress={() => { setFillIndex((index) => index + 1); setFillAnswer(''); setFillFeedback(null); }} /></View>}
                {wordsQuery.hasNextPage && fillIndex >= practiceWords.length - 1 ? <Button variant="secondary" label="Tải thêm từ" onPress={() => void wordsQuery.fetchNextPage()} /> : null}
              </>}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
