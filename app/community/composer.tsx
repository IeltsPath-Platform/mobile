import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { ChevronDown, ImagePlus, SlidersHorizontal, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi, type PostBackground, type PostCategory } from '@/src/features/community/api';
import { communityCategoryColor } from '@/src/features/community/community-colors';
import { postBackgroundColor } from '@/src/features/community/post-background';
import { CommunityAvatar, CommunityImage } from '@/src/features/community/components/community-image';
import { colors } from '@/src/theme';

type PickedImage = { uri: string; name: string; type: string; size: number; url?: string };

const CATEGORIES: { key: PostCategory; label: string }[] = [
  { key: 'GENERAL', label: 'Chung' },
  { key: 'QUESTION', label: 'Hỏi đáp' },
  { key: 'DISCUSSION', label: 'Thảo luận' },
  { key: 'WRITING_SHARING', label: 'Chia sẻ Writing' },
  { key: 'SPEAKING_PARTNER', label: 'Tìm bạn Speaking' },
  { key: 'RESOURCE_TIPS', label: 'Tài nguyên & mẹo' },
];

const BACKGROUNDS: { key: PostBackground; label: string }[] = [
  { key: 'VIOLET', label: 'Tím' },
  { key: 'CRIMSON', label: 'Đỏ' },
  { key: 'MIDNIGHT', label: 'Đêm' },
  { key: 'SUNSET', label: 'Hoàng hôn' },
  { key: 'OCEAN', label: 'Đại dương' },
  { key: 'FOREST', label: 'Rừng' },
  { key: 'ROSE', label: 'Hồng' },
  { key: 'AURORA', label: 'Cực quang' },
];

const MAX_IMAGE_COUNT = 4;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_BODY_LENGTH = 5_000;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_IMAGE_HOSTS = ['images.unsplash.com', 'i.imgur.com', 'supabase.co'];
const ALLOWED_VIDEO_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'loom.com', 'www.loom.com', 'drive.google.com'];
const FEED_QUERY_KEY = ['community', 'feed'] as const;

function isAllowedHttpsUrl(value: string, hosts: readonly string[], includeSubdomains = false) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
      && hosts.some((host) => hostname === host || (includeSubdomains && hostname.endsWith(`.${host}`)));
  } catch {
    return false;
  }
}

export default function ComposerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [category, setCategory] = useState<PostCategory>('GENERAL');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [targetBand, setTargetBand] = useState('');
  const [background, setBackground] = useState<PostBackground>();
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [uploadingUris, setUploadingUris] = useState<string[]>([]);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollViewInstance>(null);
  const hydrated = useRef(false);
  const dirty = useRef(false);

  const existing = useQuery({
    queryKey: ['community', 'detail', id],
    queryFn: () => communityApi.post(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!existing.data || hydrated.current || dirty.current) return;
    hydrated.current = true;
    setCategory(existing.data.category);
    setTitle(existing.data.title ?? '');
    setBody(existing.data.body);
    setVideoUrl(existing.data.videoUrl ?? '');
    setTargetBand(existing.data.targetBand == null ? '' : String(existing.data.targetBand));
    setBackground(existing.data.background ?? undefined);
    setImages((existing.data.imageUrls ?? []).map((url, index) => ({
      uri: url,
      name: `existing-${index}`,
      type: 'image/jpeg',
      size: 0,
      url,
    })));
  }, [existing.data]);

  const markDirty = () => { dirty.current = true; };

  const close = () => {
    if (busy) return;
    const goBack = () => {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/community' as never);
    };
    if (dirty.current && (body.trim() || title.trim() || images.length || videoUrl.trim())) {
      Alert.alert('Bỏ bài viết đang soạn?', 'Nội dung bạn vừa nhập sẽ bị xoá.', [
        { text: 'Tiếp tục soạn', style: 'cancel' },
        { text: 'Bỏ bài viết', style: 'destructive', onPress: goBack },
      ]);
      return;
    }
    goBack();
  };

  const pickImages = async () => {
    if (busy || picking) return;
    const available = MAX_IMAGE_COUNT - images.length;
    if (available <= 0) {
      setError('Mỗi bài viết có thể đính kèm tối đa 4 ảnh.');
      return;
    }
    setPicking(true);
    setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Hãy cấp quyền truy cập thư viện ảnh để đính kèm ảnh.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: available,
        quality: 0.72,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled) return;

      const accepted: PickedImage[] = [];
      const rejected: string[] = [];
      for (const asset of result.assets) {
        const type = asset.mimeType ?? 'image/jpeg';
        const size = asset.fileSize ?? 0;
        const name = asset.fileName ?? `community-${Date.now()}-${accepted.length}.${type.split('/')[1] ?? 'jpg'}`;
        if (!ALLOWED_IMAGE_TYPES.has(type)) {
          rejected.push(`${name}: chỉ hỗ trợ JPG, PNG, WebP hoặc GIF.`);
        } else if (size > MAX_IMAGE_SIZE) {
          rejected.push(`${name}: dung lượng tối đa là 5 MB.`);
        } else {
          accepted.push({ uri: asset.uri, name, type, size });
        }
      }
      if (accepted.length) {
        markDirty();
        setImages((current) => [...current, ...accepted].slice(0, MAX_IMAGE_COUNT));
        setBackground(undefined);
      }
      setError(rejected.join('\n'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không mở được thư viện ảnh. Hãy thử lại.');
    } finally {
      setPicking(false);
    }
  };

  const addImageUrl = () => {
    const value = imageUrlInput.trim();
    setError('');
    if (images.length >= MAX_IMAGE_COUNT) {
      setError('Mỗi bài viết có thể đính kèm tối đa 4 ảnh.');
      return;
    }
    if (value.length > 500 || !isAllowedHttpsUrl(value, ALLOWED_IMAGE_HOSTS, true)) {
      setError('Dùng link HTTPS từ images.unsplash.com, i.imgur.com hoặc kho ảnh Supabase.');
      return;
    }
    if (images.some((image) => image.url === value)) {
      setError('Ảnh này đã được thêm vào bài viết.');
      return;
    }
    markDirty();
    setImages((current) => [...current, { uri: value, url: value, name: 'image-url', type: 'image/jpeg', size: 0 }]);
    setBackground(undefined);
    setImageUrlInput('');
  };

  const addImagesToPost = async () => {
    const uploadedByUri = new Map<string, string>();
    const pending = images.filter((image) => !image.url);
    let index = 0;
    let uploadError: unknown;

    const worker = async () => {
      while (index < pending.length) {
        const image = pending[index++];
        setUploadingUris((current) => [...current, image.uri]);
        try {
          const result = await communityApi.uploadImage(image.uri, image.name, image.type);
          if (!result.url) throw new Error('Máy chủ không trả về đường dẫn ảnh.');
          uploadedByUri.set(image.uri, result.url);
          setImages((current) => current.map((item) => item.uri === image.uri ? { ...item, url: result.url } : item));
        } catch (cause) {
          uploadError ??= cause;
        } finally {
          setUploadingUris((current) => current.filter((uri) => uri !== image.uri));
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(2, pending.length) }, worker));
    if (uploadError) throw uploadError;
    return images.map((image) => image.url ?? uploadedByUri.get(image.uri)).filter((url): url is string => Boolean(url));
  };

  const submit = async () => {
    const normalizedBody = body.trim();
    const band = targetBand.trim() ? Number(targetBand.replace(',', '.')) : undefined;
    const normalizedVideoUrl = videoUrl.trim();
    if (!normalizedBody) return setError('Hãy viết nội dung trước khi đăng.');
    if (normalizedBody.length > MAX_BODY_LENGTH) return setError('Nội dung tối đa 5.000 ký tự.');
    if (title.trim().length > 200) return setError('Tiêu đề tối đa 200 ký tự.');
    if (band !== undefined && (!Number.isFinite(band) || band < 0 || band > 9 || (band * 2) % 1 !== 0)) {
      return setError('Band mục tiêu phải từ 0 đến 9, theo bước 0,5.');
    }
    if (normalizedVideoUrl && (normalizedVideoUrl.length > 500 || !isAllowedHttpsUrl(normalizedVideoUrl, ALLOWED_VIDEO_HOSTS))) {
      return setError('Link video phải là HTTPS từ YouTube, Loom hoặc Google Drive.');
    }
    if (background && (images.length || normalizedVideoUrl || normalizedBody.length > 280)) {
      return setError('Bài nền màu chỉ hỗ trợ nội dung chữ tối đa 280 ký tự.');
    }

    setBusy(true);
    setError('');
    try {
      const imageUrls = await addImagesToPost();
      const input = {
        category,
        title: title.trim() || undefined,
        body: normalizedBody,
        imageUrls,
        videoUrl: normalizedVideoUrl || undefined,
        targetBand: band,
        background: background ?? null,
      };
      if (id) await communityApi.update(id, input);
      else await communityApi.create(input);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['community', 'bookmarks'] }),
        queryClient.invalidateQueries({ queryKey: ['community', 'profile-list'] }),
        ...(id ? [queryClient.invalidateQueries({ queryKey: ['community', 'detail', id] })] : []),
      ]);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/community' as never);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đăng bài. Hãy kiểm tra kết nối rồi thử lại.');
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    } finally {
      setBusy(false);
    }
  };

  const canUseBackground = images.length === 0 && !videoUrl.trim() && body.trim().length <= 280;
  const submittingLabel = uploadingUris.length ? `Đang tải ${uploadingUris.length} ảnh…` : id ? 'Đang lưu…' : 'Đang đăng…';

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center justify-between border-b border-line bg-surface px-4 py-2.5">
          <Pressable onPress={close} disabled={busy} className="h-11 min-w-16 justify-center" accessibilityRole="button" accessibilityLabel="Đóng trình soạn bài">
            <Text weight="semibold" className="text-sm text-muted">Hủy</Text>
          </Pressable>
          <View className="items-center">
            <Text weight="black" className="text-base">{id ? 'Chỉnh sửa bài' : 'Bài viết mới'}</Text>
            <Text className="text-[10px] text-muted">Chia sẻ cùng IELTSPath</Text>
          </View>
          <Pressable onPress={() => void submit()} disabled={busy || picking || !body.trim() || (Boolean(id) && (existing.isLoading || existing.isError))} className={`min-h-10 min-w-[72px] items-center justify-center rounded-full px-4 ${busy || picking || !body.trim() ? 'bg-accent/40' : 'bg-accent'}`} accessibilityRole="button" accessibilityState={{ disabled: busy || picking || !body.trim(), busy }}>
            <Text weight="bold" className="text-sm text-white">{busy ? 'Đang đăng…' : id ? 'Lưu bài' : 'Đăng'}</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerClassName="grow px-4 pb-8 pt-3"
          showsVerticalScrollIndicator={false}>
          {id && existing.isLoading ? <View className="items-center py-10"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải bài viết…</Text></View> : null}
          {id && existing.isError ? <View className="mb-4 rounded-2xl border border-danger/30 bg-danger-soft p-4"><Text accessibilityRole="alert" className="text-sm text-danger">Không tải được bài viết để sửa.</Text><Pressable onPress={() => void existing.refetch()} className="mt-3 min-h-11 justify-center"><Text weight="bold" className="text-accent">Thử lại</Text></Pressable></View> : null}
          {error ? <Text accessibilityRole="alert" className="mb-4 rounded-xl bg-danger-soft px-3 py-2 text-sm leading-5 text-danger">{error}</Text> : null}

          {(!id || existing.data) && !existing.isError ? <>
            <View className="mb-4 flex-row items-center">
              <CommunityAvatar name={currentUser.data?.fullName} size={44} />
              <View className="ml-3 flex-1">
                <Text weight="bold" className="text-sm">{currentUser.data?.fullName ?? 'Bạn'}</Text>
                <Pressable onPress={() => setShowCategories(true)} disabled={busy} className="mt-1 min-h-8 flex-row items-center self-start rounded-full border px-3" style={{ backgroundColor: communityCategoryColor(category).background, borderColor: communityCategoryColor(category).border }} accessibilityRole="button" accessibilityLabel={`Chủ đề: ${CATEGORIES.find((item) => item.key === category)?.label}. Chạm để đổi`}>
                  <Text weight="semibold" className="text-xs" style={{ color: communityCategoryColor(category).foreground }}>{CATEGORIES.find((item) => item.key === category)?.label ?? 'Chung'}</Text>
                  <ChevronDown size={14} color={communityCategoryColor(category).foreground} />
                </Pressable>
              </View>
            </View>

            <TextInput
              value={body}
              onChangeText={(value) => { markDirty(); setBody(value); if (background && value.trim().length > 280) setBackground(undefined); }}
              editable={!busy}
              placeholder="Bạn đang nghĩ gì?"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              className="min-h-[168px] rounded-[26px] border border-line bg-surface px-4 py-4 text-base leading-7 text-ink"
              maxLength={MAX_BODY_LENGTH}
              accessibilityLabel="Nội dung bài viết"
            />
            {body.length > 4_500 ? <Text className="mb-3 text-right text-xs text-muted">{body.length}/{MAX_BODY_LENGTH}</Text> : null}

            {images.length ? <View className="mb-4 mt-2 flex-row flex-wrap gap-2">
              {images.map((image, index) => <View key={`${image.uri}-${index}`} className="relative">
                <CommunityImage uri={image.uri} label={`Ảnh đính kèm ${index + 1}`} className="h-28 w-28 rounded-2xl" />
                {uploadingUris.includes(image.uri) ? <View className="absolute inset-0 items-center justify-center rounded-2xl bg-black/40"><ActivityIndicator color="white" /></View> : null}
                <Pressable disabled={busy} onPress={() => { markDirty(); setImages((current) => current.filter((_, itemIndex) => itemIndex !== index)); }} className="absolute right-1 top-1 h-8 w-8 items-center justify-center rounded-full bg-surface/95" accessibilityRole="button" accessibilityLabel={`Xóa ảnh ${index + 1}`}><X size={18} color={colors.ink} /></Pressable>
              </View>)}
            </View> : null}

            <View className="mt-3 rounded-[26px] border border-line bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <Text weight="bold" className="text-sm">Thêm vào bài viết</Text>
                <Text className="text-xs text-muted">{images.length}/{MAX_IMAGE_COUNT} ảnh</Text>
              </View>
              {images.some((image) => !image.url) ? <Text className="mt-1 text-xs leading-5 text-muted">Ảnh sẽ tải lên khi bạn nhấn Đăng bài.</Text> : null}
              <View className="mt-2 flex-row items-center gap-2">
                <Pressable onPress={() => void pickImages()} disabled={busy || picking || images.length >= MAX_IMAGE_COUNT} className="h-12 w-12 items-center justify-center rounded-xl bg-success-soft" accessibilityRole="button" accessibilityLabel="Thêm ảnh">
                  {picking ? <ActivityIndicator color={colors.success} /> : <ImagePlus size={22} color={colors.success} />}
                </Pressable>
                <Pressable onPress={() => setShowOptions((value) => !value)} disabled={busy} className="min-h-11 flex-row items-center gap-2 rounded-xl bg-canvas px-3" accessibilityRole="button" accessibilityState={{ expanded: showOptions }}>
                  <SlidersHorizontal size={16} color={colors.muted} />
                  <Text weight="semibold" className="text-sm text-muted">{showOptions ? 'Ẩn tuỳ chọn' : 'Tuỳ chọn thêm'}</Text>
                </Pressable>
              </View>

              {showOptions ? <View className="mt-3 gap-3 border-t border-line pt-3">
                <TextInput value={title} onChangeText={(value) => { markDirty(); setTitle(value); }} editable={!busy} placeholder="Tiêu đề (không bắt buộc)" placeholderTextColor={colors.muted} maxLength={200} className="min-h-11 rounded-xl border border-line bg-canvas px-3 text-base text-ink" accessibilityLabel="Tiêu đề bài viết" />
                <TextInput value={imageUrlInput} onChangeText={setImageUrlInput} editable={!busy} placeholder="Dán link ảnh HTTPS" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" className="min-h-11 rounded-xl border border-line bg-canvas px-3 text-sm text-ink" accessibilityLabel="Link ảnh" />
                <Pressable onPress={addImageUrl} disabled={busy || !imageUrlInput.trim()} className="min-h-10 self-start justify-center rounded-full bg-accent-soft px-4"><Text weight="bold" className="text-sm text-accent">Thêm ảnh từ link</Text></Pressable>
                <View className="flex-row gap-3">
                  <TextInput value={targetBand} onChangeText={(value) => { markDirty(); setTargetBand(value); }} editable={!busy} placeholder="Band mục tiêu" placeholderTextColor={colors.muted} keyboardType="decimal-pad" className="min-h-11 flex-1 rounded-xl border border-line bg-canvas px-3 text-sm text-ink" accessibilityLabel="Band mục tiêu từ 0 đến 9 theo bước 0,5" />
                  <TextInput value={videoUrl} onChangeText={(value) => { markDirty(); setVideoUrl(value); if (value.trim()) setBackground(undefined); }} editable={!busy} placeholder="Link YouTube, Loom…" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" className="min-h-11 flex-1 rounded-xl border border-line bg-canvas px-3 text-sm text-ink" accessibilityLabel="Link video HTTPS từ YouTube, Loom hoặc Google Drive" />
                </View>
                <View>
                  <View className="flex-row items-center justify-between"><Text weight="bold" className="text-sm">Nền bài viết</Text><Text className="text-xs text-muted">Chỉ dùng cho bài chữ ngắn</Text></View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2" contentContainerClassName="gap-3 pb-1">
                    <Pressable onPress={() => { markDirty(); setBackground(undefined); }} className="items-center" accessibilityRole="button" accessibilityState={{ selected: !background }}><View className="h-10 w-10 items-center justify-center rounded-full border border-line bg-surface"><Text>×</Text></View><Text className="mt-1 text-[10px] text-muted">Trắng</Text></Pressable>
                    {BACKGROUNDS.map((item) => <Pressable key={item.key} onPress={() => { markDirty(); if (canUseBackground) setBackground(background === item.key ? undefined : item.key); else setError('Nền màu chỉ dùng cho bài chữ tối đa 280 ký tự.'); }} className="items-center" accessibilityRole="button" accessibilityState={{ selected: background === item.key }}><View className="h-10 w-10 rounded-full border-2" style={{ backgroundColor: postBackgroundColor(item.key), borderColor: background === item.key ? colors.accent : colors.line }} /><Text className="mt-1 text-[10px] text-muted">{item.label}</Text></Pressable>)}
                  </ScrollView>
                  {background ? <View className="mt-2 rounded-xl p-4" style={{ backgroundColor: postBackgroundColor(background) }}><Text className="text-center text-white">{body.trim() || 'Bài viết của bạn'}</Text></View> : null}
                </View>
              </View> : null}
            </View>
          </> : null}

          {busy ? <View className="mt-4 flex-row items-center justify-center gap-2"><ActivityIndicator color={colors.accent} /><Text className="text-sm text-muted">{submittingLabel}</Text></View> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCategories} transparent animationType="slide" onRequestClose={() => setShowCategories(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setShowCategories(false)}>
          <Pressable className="rounded-t-3xl bg-surface px-5 pb-8 pt-3" onPress={(event) => event.stopPropagation()}>
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-line" />
            <Text weight="black" className="mb-2 text-lg">Chọn chủ đề</Text>
            {CATEGORIES.map((item) => { const palette = communityCategoryColor(item.key); return <Pressable key={item.key} disabled={busy} onPress={() => { markDirty(); setCategory(item.key); setShowCategories(false); }} className="min-h-12 flex-row items-center justify-between border-b border-line">
              <View className="flex-row items-center gap-3"><View className="h-3 w-3 rounded-full" style={{ backgroundColor: palette.foreground }} /><Text weight={category === item.key ? 'bold' : 'regular'} style={{ color: category === item.key ? palette.foreground : colors.ink }}>{item.label}</Text></View>
              {category === item.key ? <Text weight="bold" style={{ color: palette.foreground }}>✓</Text> : null}
            </Pressable>; })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
