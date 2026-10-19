import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { ChevronDown, ChevronUp, ImagePlus, SlidersHorizontal } from 'lucide-react-native';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { communityApi, type PostBackground, type PostCategory } from '@/src/features/community/api';
import { CommunityImage } from '@/src/features/community/components/community-image';
import { colors } from '@/src/theme';

type Picked = { uri: string; name: string; type: string; size: number; url?: string };
const categories: { key: PostCategory; label: string }[] = [
  { key: 'GENERAL', label: 'Chung' }, { key: 'QUESTION', label: 'Hỏi đáp' }, { key: 'DISCUSSION', label: 'Thảo luận' },
  { key: 'WRITING_SHARING', label: 'Chia sẻ Writing' }, { key: 'SPEAKING_PARTNER', label: 'Tìm bạn Speaking' }, { key: 'RESOURCE_TIPS', label: 'Tài nguyên & mẹo' },
];
const backgrounds: { key: PostBackground; label: string; color: string }[] = [
  { key: 'VIOLET', label: 'Tím', color: '#5b21b6' }, { key: 'CRIMSON', label: 'Đỏ', color: '#9f1239' }, { key: 'MIDNIGHT', label: 'Đêm', color: '#0f172a' },
  { key: 'SUNSET', label: 'Hoàng hôn', color: '#9a3412' }, { key: 'OCEAN', label: 'Đại dương', color: '#075985' }, { key: 'FOREST', label: 'Rừng', color: '#065f46' },
  { key: 'ROSE', label: 'Hồng', color: '#86198f' }, { key: 'AURORA', label: 'Cực quang', color: '#115e59' },
];
const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export default function ComposerScreen() {
  const router = useRouter(); const queryClient = useQueryClient(); const { id } = useLocalSearchParams<{ id?: string }>();
  const [category, setCategory] = useState<PostCategory>('GENERAL'); const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const [images, setImages] = useState<Picked[]>([]); const [videoUrl, setVideoUrl] = useState(''); const [targetBand, setTargetBand] = useState(''); const [background, setBackground] = useState<PostBackground | undefined>();
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState<string>(); const [error, setError] = useState('');
  const existing = useQuery({ queryKey: ['community', 'detail', id], queryFn: () => communityApi.post(id!), enabled: Boolean(id) });
  useEffect(() => { if (existing.data) { setCategory(existing.data.category); setTitle(existing.data.title ?? ''); setBody(existing.data.body); setVideoUrl(existing.data.videoUrl ?? ''); setTargetBand(existing.data.targetBand == null ? '' : String(existing.data.targetBand)); setBackground(existing.data.background ?? undefined); setImages((existing.data.imageUrls ?? []).map((url, index) => ({ uri: url, name: `existing-${index}`, type: 'image/jpeg', size: 0, url }))); } }, [existing.data]);
  const pick = async () => {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Cần cho phép truy cập thư viện ảnh để đính kèm ảnh.'); return; }
    const available = MAX_IMAGE_COUNT - images.length;
    if (available < 1) { setError('Bài viết đính kèm tối đa 4 ảnh.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: available, quality: 0.85, preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible });
    if (result.canceled) return;
    const valid: Picked[] = []; const rejected: string[] = [];
    for (const asset of result.assets) {
      const type = asset.mimeType ?? 'image/jpeg'; const size = asset.fileSize ?? 0;
      if (!allowedTypes.has(type)) { rejected.push(`${asset.fileName ?? 'Ảnh'}: chỉ hỗ trợ JPG, PNG, WebP hoặc GIF.`); continue; }
      if (size > MAX_IMAGE_SIZE) { rejected.push(`${asset.fileName ?? 'Ảnh'}: dung lượng vượt quá 5 MB.`); continue; }
      valid.push({ uri: asset.uri, name: asset.fileName ?? `community-${Date.now()}-${valid.length}.${type.split('/')[1] ?? 'jpg'}`, type, size });
    }
    if (valid.length) setImages((current) => [...current, ...valid].slice(0, MAX_IMAGE_COUNT));
    if (rejected.length) setError(rejected.join('\n'));
    else if (valid.length === 0) setError('Không tìm thấy ảnh phù hợp để thêm vào bài viết.');
  };
  const submit = async () => {
    if (!body.trim()) { setError('Hãy nhập nội dung bài viết.'); return; }
    if (body.trim().length > 5000) { setError('Nội dung không được dài quá 5.000 ký tự.'); return; }
    const band = targetBand.trim() ? Number(targetBand.replace(',', '.')) : undefined;
    if (band !== undefined && (!Number.isFinite(band) || band < 0 || band > 9)) { setError('Band mục tiêu phải nằm trong khoảng 0 đến 9.'); return; }
    if (background && (images.length || videoUrl.trim() || body.trim().length > 280)) { setError('Nền màu chỉ dùng cho bài chữ tối đa 280 ký tự, không kèm ảnh hoặc video.'); return; }
    setBusy(true); setError('');
    try {
      const uploaded: string[] = [];
      for (const image of images) {
        if (image.url) { uploaded.push(image.url); continue; }
        setUploading(image.uri);
        const result = await communityApi.uploadImage(image.uri, image.name, image.type);
        if (!result.url) throw new Error('Máy chủ không trả về đường dẫn ảnh.');
        uploaded.push(result.url);
      }
      setUploading(undefined);
      const input = { category, title: title.trim() || undefined, body: body.trim(), imageUrls: uploaded, videoUrl: videoUrl.trim() || undefined, targetBand: band, background: background ?? null };
      if (id) await communityApi.update(id, input); else await communityApi.create(input);
      await queryClient.invalidateQueries({ queryKey: ['community'] });
      router.replace('/(tabs)/community' as never);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đăng bài. Hãy kiểm tra kết nối và thử lại.'); }
    finally { setBusy(false); setUploading(undefined); }
  };
  const addImageUrl = () => {
    const value = imageUrlInput.trim(); setError('');
    if (images.length >= MAX_IMAGE_COUNT) { setError('Bài viết đính kèm tối đa 4 ảnh.'); return; }
    if (value.length > 500) { setError('Đường dẫn ảnh tối đa 500 ký tự.'); return; }
    let parsed: URL;
    try { parsed = new URL(value); } catch { setError('Đường dẫn ảnh không hợp lệ.'); return; }
    const host = parsed.hostname.toLowerCase();
    const allowed = parsed.protocol === 'https:' && ['images.unsplash.com', 'i.imgur.com', 'supabase.co'].some((domain) => host === domain || host.endsWith(`.${domain}`));
    if (!allowed) { setError('Dùng ảnh HTTPS từ images.unsplash.com, i.imgur.com hoặc kho ảnh Supabase.'); return; }
    if (images.some((image) => image.url === value)) { setError('Ảnh này đã có trong bài viết.'); return; }
    setImages((current) => [...current, { uri: value, url: value, name: 'image-url', type: 'image/jpeg', size: 0 }]); setImageUrlInput('');
  };
  const canUseBackground = images.length === 0 && !videoUrl.trim() && body.trim().length <= 280;
  return <View className="flex-1 bg-canvas">
    <ScrollView contentContainerClassName="px-4 pb-10 pt-4">
      <View className="mb-5 flex-row items-center justify-between"><Pressable onPress={() => router.back()} className="min-h-11 justify-center"><Text weight="semibold" className="text-accent">Hủy</Text></Pressable><Text weight="black" className="text-xl">{id ? 'Sửa bài viết' : 'Tạo bài viết'}</Text><View className="w-8" /></View>
      {existing.isLoading ? <ActivityIndicator color={colors.accent} /> : null}
      <View className="rounded-2xl border border-line bg-white p-4">
        <Text weight="bold" className="mb-2 text-sm">Chủ đề</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1" contentContainerClassName="pb-1">{categories.map((item) => <Pressable key={item.key} onPress={() => setCategory(item.key)} className="mr-2 min-h-11 justify-center rounded-full border px-3" style={{ backgroundColor: category === item.key ? '#eef3ff' : 'white', borderColor: category === item.key ? '#bdccf5' : '#e3e7ef' }}><Text weight="semibold" className="text-xs" style={{ color: category === item.key ? colors.accent : colors.muted }}>{item.label}</Text></Pressable>)}</ScrollView>
        <TextInput value={body} onChangeText={(value) => { setBody(value); if (background && value.trim().length > 280) setBackground(undefined); }} placeholder="Bạn muốn chia sẻ điều gì?" placeholderTextColor={colors.muted} multiline textAlignVertical="top" className="mt-3 min-h-44 rounded-xl border border-line px-3 py-3 text-ink" maxLength={5000} accessibilityLabel="Nội dung bài viết" />
        <Text className="mt-1 text-right text-xs text-muted">{body.length}/5000</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Tiêu đề (không bắt buộc)" placeholderTextColor={colors.muted} className="mt-3 min-h-11 rounded-xl border border-line px-3 text-ink" maxLength={200} accessibilityLabel="Tiêu đề bài viết" />
        <Pressable onPress={() => void pick()} disabled={busy} className="mt-3 min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-line bg-slate-50"><ImagePlus size={18} color={colors.success} /><Text weight="bold" className="text-sm text-ink">Thêm ảnh ({images.length}/{MAX_IMAGE_COUNT})</Text></Pressable>
        <View className="mt-2 flex-row gap-2"><TextInput value={imageUrlInput} onChangeText={setImageUrlInput} placeholder="Hoặc dán link ảnh HTTPS" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" className="min-h-11 flex-1 rounded-xl border border-line px-3 text-xs text-ink"/><Pressable onPress={addImageUrl} className="min-h-11 items-center justify-center rounded-xl border border-line px-4"><Text weight="bold" className="text-xs text-accent">Thêm link</Text></Pressable></View>
        <View className="mt-3 flex-row flex-wrap gap-2">{images.map((image, index) => <View key={`${image.uri}-${index}`} className="relative"><CommunityImage uri={image.uri} label={`Ảnh đính kèm ${index + 1}`} className="h-24 w-24 rounded-xl" />{uploading === image.uri ? <View className="absolute inset-0 items-center justify-center rounded-xl bg-black/40"><ActivityIndicator color="white" /></View> : null}<Pressable disabled={busy} onPress={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 h-8 w-8 items-center justify-center rounded-full bg-white/90"><Text weight="bold">×</Text></Pressable></View>)}</View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showMoreOptions }} onPress={() => setShowMoreOptions((value) => !value)} className="mt-3 min-h-11 flex-row items-center justify-center gap-2 rounded-xl"><SlidersHorizontal size={16} color={colors.muted} /><Text weight="semibold" className="text-sm text-muted">Tuỳ chọn thêm</Text>{showMoreOptions ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}</Pressable>
        {showMoreOptions ? <View className="mt-2 rounded-xl bg-slate-50 p-3">
          <Text className="mb-2 text-xs text-muted">Band mục tiêu, video và nền cho bài viết.</Text>
          <View className="flex-row gap-2"><TextInput value={targetBand} onChangeText={setTargetBand} placeholder="Band mục tiêu (0–9)" placeholderTextColor={colors.muted} keyboardType="decimal-pad" className="min-h-11 flex-1 rounded-xl border border-line bg-white px-3 text-ink" /><TextInput value={videoUrl} onChangeText={(value) => { setVideoUrl(value); if (value.trim()) setBackground(undefined); }} placeholder="Link video" placeholderTextColor={colors.muted} autoCapitalize="none" className="min-h-11 flex-1 rounded-xl border border-line bg-white px-3 text-ink" /></View>
          <View className="mt-4"><View className="flex-row items-center justify-between"><Text weight="bold" className="text-sm">Nền bài viết</Text><Text className="text-xs text-muted">Chữ ngắn, tối đa 280 ký tự</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2" contentContainerClassName="pb-1"><Pressable onPress={() => setBackground(undefined)} className="mr-2 items-center"><View className="h-9 w-9 items-center justify-center rounded-full border border-line bg-white"><Text>×</Text></View><Text className="mt-1 text-[10px] text-muted">Không</Text></Pressable>{backgrounds.map((item) => <Pressable key={item.key} onPress={() => canUseBackground ? setBackground(background === item.key ? undefined : item.key) : setError('Nền màu chỉ dùng khi bài không có ảnh/video và tối đa 280 ký tự.')} className="mr-2 items-center"><View className="h-9 w-9 rounded-full border-2" style={{ backgroundColor: item.color, borderColor: background === item.key ? colors.accent : 'white' }} /><Text className="mt-1 text-[10px] text-muted">{item.label}</Text></Pressable>)}</ScrollView>{background ? <View className="mt-2 rounded-xl p-4" style={{ backgroundColor: backgrounds.find((item) => item.key === background)?.color }}><Text className="text-center text-white">{body.trim() || 'Bài viết của bạn'}</Text></View> : null}</View>
        </View> : null}
        {busy ? <View className="mt-4 flex-row items-center justify-center gap-2"><ActivityIndicator color={colors.accent} /><Text className="text-xs text-muted">{uploading ? 'Đang tải ảnh…' : 'Đang đăng bài…'}</Text></View> : null}
        {error ? <Text accessibilityRole="alert" className="mt-3 text-sm leading-5 text-red-600">{error}</Text> : null}
        <View className="mt-5"><Button label={busy ? 'Đang đăng…' : id ? 'Lưu thay đổi' : 'Đăng bài'} disabled={!body.trim() || busy || existing.isLoading} onPress={() => void submit()} /></View>
      </View>
    </ScrollView>
  </View>;
}
