import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { Text } from '@/src/components/ui/text';
import { vocabApi, listAllDeckItems } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';
export default function AddCardsScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>(); const client = useQueryClient(); const [selected, setSelected] = useState<string[]>([]); const [error, setError] = useState('');
  const cards = useQuery({ queryKey: ['flashcards', 'cards', 'ACTIVE'], queryFn: async () => (await vocabApi.listCards(0, 100)).items });
  const items = useQuery({ queryKey: ['flashcards', 'deck-items', deckId], queryFn: () => listAllDeckItems(deckId) });
  const existing = new Set(items.data?.map((item) => item.flashcardId) ?? []);
  const add = useMutation({ mutationFn: async () => { for (const id of selected) await vocabApi.addDeckItem(deckId, id); }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['flashcards'] }); router.back(); }, onError: (e: Error) => setError(e.message) });
  const available = cards.data?.filter((card) => !existing.has(card.id)) ?? [];
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-12 pt-5"><Pressable onPress={() => router.back()} className="mb-5 h-11 w-11 items-center justify-center rounded-full bg-surface"><ChevronLeft color={colors.ink}/></Pressable><Text className="text-2xl" weight="black">Thêm thẻ vào bộ</Text><Text className="mt-2 text-sm text-muted">Chọn các thẻ trong thư viện của bạn.</Text>{cards.isPending || items.isPending ? <ActivityIndicator className="py-8" color={colors.accent}/> : null}{cards.isError || items.isError ? <Text className="mt-4 text-danger">{cards.error?.message ?? items.error?.message}</Text> : null}{available.map((card) => { const checked = selected.includes(card.id); return <Pressable key={card.id} onPress={() => setSelected((prev) => checked ? prev.filter((id) => id !== card.id) : [...prev, card.id])} className="mt-3"><Card className="flex-row items-center gap-3 border-b-0 bg-surface p-4"><View className="flex-1"><Text weight="bold">{card.front}</Text><Text className="mt-1 text-sm text-muted">{card.back}</Text></View><View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: checked ? colors.accent : colors.canvas }}>{checked ? <Check size={17} color="white"/> : null}</View></Card></Pressable>; })}{cards.isSuccess && !available.length ? <Card className="mt-4 items-center border-b-0 bg-surface p-6"><Text weight="bold">Không còn thẻ để thêm</Text><Text className="mt-1 text-sm text-muted">Bạn có thể tạo thẻ mới trong thư viện.</Text></Card> : null}{error ? <Text className="mt-3 text-sm text-danger">{error}</Text> : null}<Button className="mt-5" label={`Thêm ${selected.length} thẻ`} loading={add.isPending} disabled={!selected.length} onPress={() => add.mutate()}/></ScrollView>;
}
