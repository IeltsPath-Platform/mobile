import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, BookOpenCheck, ChevronDown, ImagePlus, Search, Sparkles, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

const field = 'mt-2 min-h-12 rounded-2xl border border-line bg-surface px-4 py-3 text-base text-ink';
export default function EditCardScreen() {
  const { cardId, deckId } = useLocalSearchParams<{ cardId?: string; deckId?: string }>(); const client = useQueryClient();
  const card = useQuery({ queryKey: ['flashcards', 'card', cardId], queryFn: () => vocabApi.getCard(cardId!), enabled: !!cardId });
  const [front, setFront] = useState(''); const [back, setBack] = useState(''); const [example, setExample] = useState(''); const [imageKey, setImageKey] = useState<string | null>(null); const [imageUrl, setImageUrl] = useState(''); const [uploadingImage, setUploadingImage] = useState(false); const [wordQuery, setWordQuery] = useState(''); const [sense, setSense] = useState<{ id: string; lemma: string; meaning: string; example: string | null } | null>(null); const [error, setError] = useState(''); const [showExtra, setShowExtra] = useState(false);
  const search = useQuery({ queryKey: ['vocabulary', 'search', wordQuery.trim()], queryFn: ({ signal }) => vocabApi.search(wordQuery.trim(), signal), enabled: wordQuery.trim().length >= 2 && !cardId, staleTime: 60_000 });
  useEffect(() => { if (card.data) { setFront(card.data.front); setBack(card.data.back); setExample(card.data.exampleSentence ?? ''); setImageUrl(card.data.imageUrl ?? ''); setImageKey(card.data.imageKey ?? null); } }, [card.data]);
  const mutation = useMutation({ mutationFn: async () => {
    const draft = { front: front.trim(), back: back.trim(), exampleSentence: example.trim() || null, imageKey };
    if (card.data) return { card: await vocabApi.updateCard(card.data, draft), deckAddFailed: false };
    const created = await vocabApi.createCard({ sourceType: sense ? 'VOCABULARY_SENSE' : 'MANUAL', vocabularySenseId: sense?.id, front: draft.front, back: draft.back, exampleSentence: draft.exampleSentence, imageKey });
    if (deckId) { try { await vocabApi.addDeckItem(deckId, created.id); } catch { return { card: created, deckAddFailed: true }; } }
    return { card: created, deckAddFailed: false };
  }, onSuccess: (result) => { void client.invalidateQueries({ queryKey: ['flashcards'] }); if (result.deckAddFailed) Alert.alert('Đã tạo thẻ', 'Thẻ đã được lưu trong thư viện nhưng chưa thêm được vào bộ. Bạn có thể thêm lại từ màn chi tiết bộ thẻ.'); router.back(); }, onError: (e: Error) => setError(e.message) });
  const pickImage = async () => {
    try {
      setError('');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError('Cần quyền truy cập thư viện ảnh để chọn ảnh.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.82, preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible });
      if (result.canceled) return;
      const asset = result.assets[0];
      const type = asset.mimeType?.toLowerCase() ?? 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) { setError('Ảnh cần ở định dạng JPG, PNG hoặc WebP.'); return; }
      if ((asset.fileSize ?? 0) > 2 * 1024 * 1024) { setError('Ảnh cần nhỏ hơn 2 MB.'); return; }
      setUploadingImage(true);
      const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
      const baseName = asset.fileName?.replace(/\.[^.]+$/, '') || `flashcard-${Date.now()}`;
      const uploaded = await vocabApi.uploadImage({ uri: asset.uri, name: `${baseName}.${extension}`, type });
      setImageKey(uploaded.key);
      setImageUrl(uploaded.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được ảnh.');
    } finally {
      setUploadingImage(false);
    }
  };
  const remove = () => Alert.alert('Xóa thẻ?', 'Thẻ sẽ bị xóa khỏi thư viện của bạn.', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa thẻ', style: 'destructive', onPress: async () => { await vocabApi.deleteCard(cardId!); await client.invalidateQueries({ queryKey: ['flashcards'] }); router.back(); } }]);
  const loadingCard = Boolean(cardId && card.isPending);
  return <ScrollView className="flex-1 bg-canvas" keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-12 pt-3" showsVerticalScrollIndicator={false}>
    <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-surface"><ArrowLeft color={colors.ink}/></Pressable>
    <View className="mb-5 rounded-[28px] p-5" style={{ backgroundColor: colors.heroStart }}>
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><BookOpenCheck size={21} color="white"/></View>
      <Text className="mt-4 text-2xl text-white" weight="black">{cardId ? 'Chỉnh sửa thẻ' : 'Tạo thẻ mới'}</Text>
      <Text className="mt-2 text-sm leading-5 text-white/75">Một mặt gợi nhớ, mặt kia giúp bạn kiểm tra kiến thức.</Text>
    </View>
    {card.isError ? <View className="mb-4"><FormAlert tone="error" message={card.error.message}/></View> : null}
    {!cardId ? <View className="mb-4 rounded-3xl border border-line bg-surface p-4">
      <View className="mb-3 flex-row items-center gap-2"><Sparkles size={17} color={colors.accent}/><Text weight="bold">Chọn từ có sẵn</Text><Text className="text-xs text-muted">· nhanh hơn</Text></View>
      <View className="flex-row items-center rounded-2xl border border-line bg-canvas px-3"><Search size={18} color={colors.muted}/><TextInput value={wordQuery} onChangeText={setWordQuery} placeholder="Tìm từ vựng tiếng Anh" placeholderTextColor={colors.muted} autoCapitalize="none" returnKeyType="search" className="min-h-12 flex-1 px-2 text-base text-ink"/></View>
      {search.isFetching ? <View className="flex-row items-center gap-2 py-3"><ActivityIndicator size="small" color={colors.accent}/><Text className="text-xs text-muted">Đang tìm từ…</Text></View> : null}
      {search.isError ? <Text className="mt-2 text-xs text-danger">Chưa tìm được từ. Bạn vẫn có thể nhập thẻ thủ công bên dưới.</Text> : null}
      {search.data?.slice(0, 4).map((item) => <View key={item.id}>{item.senses.slice(0, 2).map((s) => <Pressable key={s.id} accessibilityRole="button" onPress={() => { setSense({ id: s.id, lemma: item.lemma, meaning: s.vietnameseMeaning ?? s.englishDefinition ?? '', example: s.exampleSentence }); setFront(item.lemma); setBack(s.vietnameseMeaning ?? s.englishDefinition ?? ''); setExample(s.exampleSentence ?? ''); setWordQuery(''); }} className="mt-2 rounded-2xl bg-canvas p-3"><Text weight="bold">{item.lemma} <Text className="text-xs text-muted">{item.ipa}</Text></Text><Text numberOfLines={2} className="mt-1 text-sm text-muted">{s.vietnameseMeaning ?? s.englishDefinition}</Text></Pressable>)}</View>)}
      {sense ? <Pressable accessibilityRole="button" onPress={() => setSense(null)} className="mt-3 flex-row items-center gap-2"><Text className="text-sm text-success" weight="bold">Đã chọn từ trong kho</Text><X size={15} color={colors.success}/></Pressable> : null}
    </View> : null}
    <View className="mb-4 rounded-3xl border border-line bg-surface p-4">
      <Text className="mb-3 text-base" weight="black">Nội dung thẻ</Text>
      <Text className="text-xs uppercase tracking-wider text-muted" weight="bold">Mặt trước</Text>
      <TextInput value={front} onChangeText={setFront} placeholder="Từ hoặc câu hỏi" placeholderTextColor={colors.muted} maxLength={1000} returnKeyType="next" className={field}/>
      <Text className="mb-1 mt-5 text-xs uppercase tracking-wider text-muted" weight="bold">Mặt sau</Text>
      <TextInput value={back} onChangeText={setBack} placeholder="Nghĩa hoặc câu trả lời" placeholderTextColor={colors.muted} multiline maxLength={4000} textAlignVertical="top" className={`${field} min-h-24`}/>
      <Text className="mt-2 text-right text-[11px] text-muted">{front.length}/1000 · {back.length}/4000</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: showExtra }} onPress={() => setShowExtra((value) => !value)} className="min-h-[58px] flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4">
      <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.accentSoft }}><ImagePlus size={18} color={colors.accentDeep}/></View>
      <View className="flex-1"><Text weight="bold">Thêm ví dụ hoặc hình ảnh</Text><Text className="mt-0.5 text-xs text-muted">Không bắt buộc</Text></View><ChevronDown size={19} color={colors.muted} style={{ transform: [{ rotate: showExtra ? '180deg' : '0deg' }] }}/>
    </Pressable>
    {showExtra ? <View className="mt-3 rounded-3xl border border-line bg-surface p-4">
      <Text className="text-sm" weight="bold">Câu ví dụ</Text><TextInput value={example} onChangeText={setExample} placeholder="Đặt từ vào ngữ cảnh" placeholderTextColor={colors.muted} multiline maxLength={2000} textAlignVertical="top" className={`${field} min-h-20`}/>
      <Text className="mt-5 text-sm" weight="bold">Hình minh họa</Text>
      {imageUrl ? <View className="mt-2 overflow-hidden rounded-2xl"><Image source={{ uri: imageUrl }} accessibilityLabel="Ảnh minh họa thẻ" className="h-48 w-full" resizeMode="cover"/><Pressable accessibilityRole="button" accessibilityLabel="Xóa ảnh minh họa" onPress={() => { setImageKey(null); setImageUrl(''); }} className="absolute right-2 top-2 h-10 w-10 items-center justify-center rounded-full bg-black/60"><X color="white" size={19}/></Pressable></View> : <Pressable disabled={uploadingImage} onPress={() => void pickImage()} className="mt-2 min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-accent bg-accentSoft">{uploadingImage ? <ActivityIndicator color={colors.accent}/>: <ImagePlus size={19} color={colors.accent}/>}<Text weight="bold" className="text-accent">{uploadingImage ? 'Đang tải ảnh…' : 'Chọn ảnh (tối đa 2 MB)'}</Text></Pressable>}
    </View> : null}
    {error ? <View className="mt-4"><FormAlert tone="error" message={error}/></View> : null}
    <Button className="mt-5" label={cardId ? 'Lưu thẻ' : deckId ? 'Tạo và thêm vào bộ' : 'Tạo thẻ'} loading={mutation.isPending || loadingCard} disabled={!front.trim() || !back.trim() || uploadingImage || loadingCard} onPress={() => { setError(''); mutation.mutate();}}/>
    {cardId ? <Pressable onPress={remove} className="mt-3 min-h-12 items-center justify-center"><Text className="text-danger" weight="bold">Xóa thẻ</Text></Pressable> : null}
  </ScrollView>;
}
