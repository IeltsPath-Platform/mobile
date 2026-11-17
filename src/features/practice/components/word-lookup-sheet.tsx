import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { BookmarkPlus, Check, Volume2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { notebookApi } from '@/src/features/flashcards/notebook-api';
import { vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

import { lookupWord, type WordEntry } from '../api/word-lookup';
import { bareWord, lookupWords } from '../model/tokens';
import { Sheet } from './sheet';

const PART_OF_SPEECH: Record<string, string> = {
  NOUN: 'danh từ', VERB: 'động từ', ADJECTIVE: 'tính từ', ADVERB: 'trạng từ', PREPOSITION: 'giới từ',
  CONJUNCTION: 'liên từ', IDIOM: 'thành ngữ', PHRASAL_VERB: 'cụm động từ',
};

const shorten = (text: string) => (text.length > 120 ? `${text.slice(0, 117)}…` : text);

/**
 * "Dịch": the meaning of the selected word, or of the words of a selected phrase, from the vocabulary library (IPA,
 * UK/US audio, part of speech, meaning, example). Each meaning can be saved into the notebook of the Flashcards tab.
 */
export function WordLookupSheet({ text, onClose }: { text: string | null; onClose: () => void }) {
  const words = useMemo(() => (text ? lookupWords(text) : []), [text]);
  const many = words.length > 1;
  return (
    <Sheet
      visible={text !== null}
      onClose={onClose}
      title={many ? 'Từ trong đoạn đã chọn' : 'Nghĩa của từ'}
      subtitle={many && text ? `“${shorten(text)}”` : undefined}
      maxHeight={many ? '88%' : '78%'}>
      {words.length === 0 ? <Text className="py-2 text-sm text-muted">Đoạn đã chọn không có từ nào để tra.</Text> : <LookupBody words={words} compact={many} />}
    </Sheet>
  );
}

/** Plays a recording, or reads the word aloud when the library has none. One player serves every card of the sheet. */
function LookupBody({ words, compact }: { words: string[]; compact: boolean }) {
  const player = useAudioPlayer(null);
  const play = (url: string | null, lemma: string) => {
    Speech.stop();
    if (!url) { Speech.speak(lemma, { language: 'en-US' }); return; }
    try { player.replace(url); player.play(); } catch { Speech.speak(lemma, { language: 'en-US' }); }
  };
  return (
    <View className="gap-3">
      {words.map((word) => <WordCard key={word.toLowerCase()} word={word} compact={compact} onPlay={play} />)}
    </View>
  );
}

function WordCard({ word, compact, onPlay }: { word: string; compact: boolean; onPlay: (url: string | null, lemma: string) => void }) {
  const lookup = useQuery({ queryKey: ['practice', 'lookup', word.toLowerCase()], queryFn: ({ signal }) => lookupWord(word, signal), staleTime: Infinity, retry: 1 });
  const entry = lookup.data;
  const notebook = useNotebook(entry);
  const senses = entry ? entry.senses.slice(0, compact ? 1 : 3) : [];

  return (
    <View className="rounded-3xl bg-canvas p-4">
      <View className="flex-row flex-wrap items-center gap-x-3 gap-y-2">
        <Text weight="black" className="text-xl text-ink">{entry?.lemma ?? bareWord(word)}</Text>
        {entry?.ipa ? <Text className="text-sm text-muted">{entry.ipa}</Text> : null}
        {entry ? (
          <View className="flex-row gap-2">
            {entry.audioUk ? <SoundButton label="UK" onPress={() => onPlay(entry.audioUk, entry.lemma)} /> : null}
            {entry.audioUs ? <SoundButton label="US" onPress={() => onPlay(entry.audioUs, entry.lemma)} /> : null}
            {!entry.audioUk && !entry.audioUs ? <SoundButton label="Nghe" onPress={() => onPlay(null, entry.lemma)} /> : null}
          </View>
        ) : null}
      </View>

      {lookup.isPending ? <ActivityIndicator className="py-4" color={colors.accent} /> : null}
      {lookup.isError ? (
        <View className="mt-2 gap-2">
          <Text className="text-sm text-danger">Chưa tra được từ này. Kiểm tra mạng rồi thử lại.</Text>
          <Button label="Thử lại" variant="secondary" onPress={() => void lookup.refetch()} />
        </View>
      ) : null}
      {lookup.isSuccess && !entry ? <Text className="mt-2 text-sm text-muted">Thư viện từ vựng chưa có từ này.</Text> : null}
      {entry && entry.senses.length === 0 ? <Text className="mt-2 text-sm text-muted">Từ này mới có phiên âm, chưa có nghĩa trong thư viện nên chưa lưu được.</Text> : null}

      {senses.map((sense, index) => (
        <View key={index} className="mt-3 rounded-2xl bg-surface p-3">
          {sense.partOfSpeech && !sense.vietnameseMeaning?.startsWith('(')
            ? <Text weight="bold" className="text-xs uppercase text-muted">{PART_OF_SPEECH[sense.partOfSpeech] ?? sense.partOfSpeech.toLowerCase()}</Text> : null}
          {sense.vietnameseMeaning ? <Text weight="bold" className="mt-0.5 text-base text-ink">{sense.vietnameseMeaning}</Text> : null}
          {sense.englishDefinition ? <Text className="mt-1 text-sm text-ink">{sense.englishDefinition}</Text> : null}
          {sense.exampleSentence ? <Text className="mt-1 text-sm italic text-muted">“{sense.exampleSentence}”</Text> : null}
          <SaveButton notebook={notebook} senseId={notebook.ids[index] ?? null} />
        </View>
      ))}
    </View>
  );
}

function SoundButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === 'Nghe' ? 'Nghe phát âm' : `Nghe phát âm ${label}`}
      className="min-h-9 flex-row items-center gap-1.5 rounded-full px-3 active:opacity-70"
      style={{ backgroundColor: colors.accentSoft }}>
      <Volume2 size={16} color={colors.accentDeep} />
      <Text weight="bold" className="text-xs" style={{ color: colors.accentDeep }}>{label}</Text>
    </Pressable>
  );
}

/**
 * The ids of the meanings of a looked-up word and whether each is in the notebook. The lookup answers without ids, so
 * they come from a search of the same lemma; a meaning is matched by its text, then by its place in the list.
 */
function useNotebook(entry: WordEntry | null | undefined) {
  const client = useQueryClient();
  const lemma = entry?.lemma.toLowerCase() ?? '';
  const search = useQuery({
    queryKey: ['practice', 'lookup-ids', lemma],
    queryFn: ({ signal }) => vocabApi.search(entry!.lemma, signal),
    enabled: Boolean(entry && entry.senses.length > 0),
    staleTime: Infinity,
    retry: 1,
  });
  const ids = useMemo(() => {
    const item = search.data?.find((candidate) => candidate.normalizedLemma === lemma || candidate.lemma.toLowerCase() === lemma);
    return (entry?.senses ?? []).map((sense, index) =>
      item?.senses.find((candidate) => candidate.vietnameseMeaning === sense.vietnameseMeaning && candidate.englishDefinition === sense.englishDefinition)?.id
      ?? item?.senses[index]?.id ?? null);
  }, [search.data, entry, lemma]);
  const known = useMemo(() => ids.filter((id): id is string => id !== null), [ids]);
  const saved = useQuery({
    queryKey: ['flashcards', 'notebook', 'saved', known],
    queryFn: ({ signal }) => notebookApi.saved(known, signal),
    enabled: known.length > 0,
    staleTime: 30_000,
  });
  const add = useMutation({
    mutationFn: notebookApi.add,
    onSuccess: () => client.invalidateQueries({ queryKey: ['flashcards'] }),
  });
  return { ids, saved, add, preparing: Boolean(entry && entry.senses.length > 0) && (search.isPending || search.isFetching) };
}

type Notebook = ReturnType<typeof useNotebook>;

function SaveButton({ notebook, senseId }: { notebook: Notebook; senseId: string | null }) {
  const { saved, add, preparing } = notebook;
  if (preparing) return <View className="mt-3 h-12 items-center justify-center"><ActivityIndicator color={colors.muted} /></View>;
  // A meaning the library cannot name by id cannot be saved: show nothing rather than a button that fails.
  if (!senseId) return null;
  const isSaved = saved.data?.includes(senseId) ?? false;
  const saving = add.isPending && add.variables === senseId;
  return (
    <View className="mt-3 gap-1.5">
      <Button
        variant={isSaved ? 'secondary' : 'primary'}
        label={isSaved ? 'Đã lưu vào sổ từ' : 'Lưu vào sổ từ'}
        icon={isSaved ? <Check size={17} color={colors.success} strokeWidth={3} /> : <BookmarkPlus size={17} color={colors.onAccent} />}
        disabled={isSaved || saved.isPending || saved.isError}
        loading={saving}
        onPress={() => add.mutate(senseId)}
        accessibilityLabel={isSaved ? 'Đã lưu nghĩa này vào sổ từ' : 'Lưu nghĩa này vào sổ từ'}
      />
      {add.isError && add.variables === senseId ? <Text className="text-xs text-danger">Chưa lưu được. Hãy thử lại.</Text> : null}
      {saved.isError ? <Text className="text-xs text-muted">Chưa kiểm tra được sổ từ lúc này.</Text> : null}
    </View>
  );
}
