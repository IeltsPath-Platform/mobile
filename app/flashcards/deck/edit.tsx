import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, ImagePlus, Layers3, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { vocabApi } from '@/src/features/vocab/api';
import { colors } from '@/src/theme';

const input = 'mt-2 min-h-12 rounded-2xl border border-line bg-surface px-4 py-3 text-base text-ink';
export default function EditDeckScreen() {
  const { deckId } = useLocalSearchParams<{ deckId?: string }>(); const client = useQueryClient();
  const existing = useQuery({ queryKey: ['flashcards', 'deck', deckId], queryFn: () => vocabApi.getDeck(deckId!), enabled: !!deckId });
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [coverKey, setCoverKey] = useState<string | null>(null); const [coverUrl, setCoverUrl] = useState(''); const [uploadingCover, setUploadingCover] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (existing.data) { setName(existing.data.name); setDescription(existing.data.description ?? ''); setCoverKey(existing.data.coverImageKey ?? null); setCoverUrl(existing.data.coverImageUrl ?? ''); } }, [existing.data]);
  const mutation = useMutation({ mutationFn: () => deckId ? vocabApi.updateDeck(deckId, { name: name.trim(), description: description.trim() || null, coverImageKey: coverKey }) : vocabApi.createDeck({ name: name.trim(), description: description.trim() || null, coverImageKey: coverKey }), onSuccess: (deck) => { void client.invalidateQueries({ queryKey: ['flashcards'] }); router.replace({ pathname: '/flashcards/deck/[deckId]', params: { deckId: deck.id } }); }, onError: (e: Error) => setError(e.message) });
  const pickCover = async () => {
    try {
      setError('');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError('Cần quyền truy cập thư viện ảnh để chọn ảnh.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.82, preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible });
      if (result.canceled) return;
      const file = result.assets[0];
      const type = file.mimeType?.toLowerCase() ?? 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) { setError('Ảnh cần ở định dạng JPG, PNG hoặc WebP.'); return; }
      if ((file.fileSize ?? 0) > 2 * 1024 * 1024) { setError('Ảnh cần nhỏ hơn 2 MB.'); return; }
      setUploadingCover(true);
      const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
      const baseName = file.fileName?.replace(/\.[^.]+$/, '') || `deck-cover-${Date.now()}`;
      const uploaded = await vocabApi.uploadImage({ uri: file.uri, name: `${baseName}.${extension}`, type });
      setCoverKey(uploaded.key); setCoverUrl(uploaded.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được ảnh.');
    } finally {
      setUploadingCover(false);
    }
  };
  const loadingDeck = Boolean(deckId && existing.isPending);
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="px-5 pb-12 pt-3" showsVerticalScrollIndicator={false}>
    <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-surface"><ArrowLeft color={colors.ink}/></Pressable>
    <View className="mb-5 rounded-[28px] p-5" style={{ backgroundColor: colors.heroStart }}>
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><Layers3 size={22} color="white"/></View>
      <Text className="mt-4 text-2xl text-white" weight="black">{deckId ? 'Chỉnh sửa bộ thẻ' : 'Tạo bộ thẻ mới'}</Text>
      <Text className="mt-2 text-sm leading-5 text-white/75">Gom những từ bạn muốn nhớ lâu vào một bộ học riêng.</Text>
    </View>
    {existing.isError ? <View className="mb-4"><FormAlert tone="error" message={existing.error.message}/></View> : null}
    <View className="rounded-3xl border border-line bg-surface p-4">
      <Text className="text-sm" weight="bold">Tên bộ thẻ</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Ví dụ: Từ vựng du lịch" placeholderTextColor={colors.muted} maxLength={150} returnKeyType="next" className={input}/>
      <Text className="mt-5 text-sm" weight="bold">Mô tả <Text className="text-muted">· không bắt buộc</Text></Text>
      <TextInput value={description} onChangeText={setDescription} placeholder="Bạn muốn ôn tập điều gì?" placeholderTextColor={colors.muted} multiline maxLength={2000} textAlignVertical="top" className={`${input} min-h-24`}/>
      <Text className="mt-5 text-sm" weight="bold">Ảnh bìa <Text className="text-muted">· không bắt buộc</Text></Text>
      {coverUrl ? <View className="mt-2 overflow-hidden rounded-2xl"><Image source={{ uri: coverUrl }} accessibilityLabel="Ảnh bìa bộ thẻ" className="h-40 w-full" resizeMode="cover"/><Pressable accessibilityRole="button" accessibilityLabel="Xóa ảnh bìa" onPress={() => { setCoverKey(null); setCoverUrl(''); }} className="absolute right-2 top-2 h-10 w-10 items-center justify-center rounded-full bg-black/60"><X color="white" size={19}/></Pressable></View> : <Pressable disabled={uploadingCover} onPress={() => void pickCover()} className="mt-2 min-h-[58px] flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-accent bg-accentSoft">{uploadingCover ? <ActivityIndicator color={colors.accent}/> : <ImagePlus size={19} color={colors.accent}/>}<Text weight="bold" className="text-accent">{uploadingCover ? 'Đang tải ảnh…' : 'Thêm ảnh bìa'}</Text></Pressable>}
      {error ? <View className="mt-4"><FormAlert tone="error" message={error}/></View> : null}
      <Button className="mt-6" label={deckId ? 'Lưu bộ thẻ' : 'Tạo bộ thẻ'} loading={mutation.isPending || loadingDeck} disabled={!name.trim() || uploadingCover || loadingDeck} onPress={() => { setError(''); mutation.mutate(); }}/>
    </View>
  </ScrollView>;
}
