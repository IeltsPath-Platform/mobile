import { useQuery } from '@tanstack/react-query';
import { useAudioPlayer } from 'expo-audio';
import { Volume2 } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { colors } from '@/src/theme';

import { lookupWord } from '../api/word-lookup';
import { Sheet } from './sheet';

/** The meaning of a tapped word from the vocabulary library: IPA, UK/US audio, part of speech, meaning and example. */
export function WordLookupSheet({ word, onClose }: { word: string | null; onClose: () => void }) {
  const lookup = useQuery({ queryKey: ['practice', 'lookup', word?.toLowerCase()], queryFn: ({ signal }) => lookupWord(word!, signal), enabled: Boolean(word), staleTime: Infinity, retry: 1 });
  const entry = lookup.data;
  return (
    <Sheet visible={word !== null} onClose={onClose} title={entry?.lemma ?? word ?? ''} subtitle={entry?.ipa ?? undefined} maxHeight="70%">
      {lookup.isPending ? <ActivityIndicator className="py-6" color={colors.accent} /> : null}
      {lookup.isError ? (
        <View className="gap-3 py-2">
          <Text className="text-sm text-danger">Chưa tra được từ này. Kiểm tra mạng rồi thử lại.</Text>
          <Button label="Thử lại" variant="secondary" onPress={() => void lookup.refetch()} />
        </View>
      ) : null}
      {lookup.isSuccess && !entry ? <Text className="py-2 text-sm text-muted">Thư viện từ vựng chưa có từ “{word}”.</Text> : null}
      {entry ? (
        <View className="gap-3">
          {entry.audioUk || entry.audioUs ? (
            <View className="flex-row gap-2">
              {entry.audioUk ? <SoundButton label="UK" src={entry.audioUk} /> : null}
              {entry.audioUs ? <SoundButton label="US" src={entry.audioUs} /> : null}
            </View>
          ) : null}
          {entry.senses.map((sense, index) => (
            <View key={index} className="rounded-2xl bg-canvas p-3">
              {sense.partOfSpeech ? <Text weight="bold" className="text-xs uppercase text-muted">{sense.partOfSpeech}</Text> : null}
              {sense.vietnameseMeaning ? <Text weight="bold" className="mt-0.5 text-base text-ink">{sense.vietnameseMeaning}</Text> : null}
              {sense.englishDefinition ? <Text className="mt-1 text-sm text-ink">{sense.englishDefinition}</Text> : null}
              {sense.exampleSentence ? <Text className="mt-1 text-sm italic text-muted">{sense.exampleSentence}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}

function SoundButton({ label, src }: { label: string; src: string }) {
  const player = useAudioPlayer(src);
  return (
    <Pressable
      onPress={() => { void player.seekTo(0); player.play(); }}
      accessibilityRole="button"
      accessibilityLabel={`Nghe phát âm ${label}`}
      className="min-h-11 flex-row items-center gap-2 rounded-full px-4"
      style={{ backgroundColor: colors.accentSoft }}>
      <Volume2 size={18} color={colors.accentDeep} />
      <Text weight="bold" style={{ color: colors.accentDeep }}>{label}</Text>
    </Pressable>
  );
}
