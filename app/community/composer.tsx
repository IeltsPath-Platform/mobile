import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { Check, ChevronDown, Hash, ImagePlus, Palette, RefreshCw, SlidersHorizontal, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/src/components/ui/action-sheet';
import { Button } from '@/src/components/ui/button';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { communityApi, type PostBackground, type PostCategory } from '@/src/features/community/api';
import { communityCategoryColor } from '@/src/features/community/community-colors';
import { CommunityAvatar, CommunityImage } from '@/src/features/community/components/community-image';
import { CATEGORY_LABELS } from '@/src/features/community/format';
import { postBackgroundColor } from '@/src/features/community/post-background';
import { haptics } from '@/src/lib/haptics';
import { colors } from '@/src/theme';

type PickedImage = { uri: string; name: string; type: string; size: number; url?: string };

const CATEGORIES = Object.keys(CATEGORY_LABELS) as PostCategory[];

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
const MAX_SOURCE_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_BODY_LENGTH = 5_000;
const MAX_BACKGROUND_LENGTH = 280;
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
  const insets = useSafeAreaInsets();
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
  const [sheet, setSheet] = useState<'none' | 'category' | 'options'>('none');
  const [showBackgrounds, setShowBackgrounds] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [uploadingUris, setUploadingUris] = useState<string[]>([]);
  const [failedUris, setFailedUris] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const hydrated = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const existing = useQuery({
    queryKey: ['community', 'detail', id],
    queryFn: () => communityApi.post(id!),
    enabled: Boolean(id),
  });
  const ownProfile = useQuery({
    queryKey: ['community', 'profile', currentUser.data?.id],
    queryFn: () => communityApi.profile(currentUser.data!.id),
    enabled: Boolean(currentUser.data?.id),
    staleTime: 60_000,
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
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/community' as never);
  };

  // Every way out (X button, Android back, swipe-back) goes through this guard.
  const hasDraft = Boolean(body.trim() || title.trim() || images.length || videoUrl.trim());
  const disablePrevention = usePreventRemove(busy || (dirty.current && hasDraft), ({ repeat }) => {
    if (busy) return;
    Alert.alert('Bỏ bài viết đang soạn?', 'Nội dung bạn vừa nhập sẽ bị xoá.', [
      { text: 'Tiếp tục soạn', style: 'cancel' },
      { text: 'Bỏ bài viết', style: 'destructive', onPress: () => { disablePrevention(); repeat(); } },
    ]);
  });

  const close = () => {
    if (busy) return;
    goBack();
  };

  const pickImages = async () => {
    if (busy || picking) return;
    const available = MAX_IMAGE_COUNT - images.length;
    if (available <= 0) {
      setError('Mỗi bài viết có thể đính kèm tối đa 4 ảnh.');
      return;
    }
    Keyboard.dismiss();
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
        const type = asset.mimeType?.toLowerCase() ?? 'image/jpeg';
        const size = asset.fileSize ?? 0;
        const name = asset.fileName ?? `community-${Date.now()}-${accepted.length}.${type.split('/')[1] ?? 'jpg'}`;
        if (!type.startsWith('image/')) rejected.push(`${name}: tệp đã chọn không phải ảnh.`);
        else if (size > MAX_SOURCE_IMAGE_SIZE) rejected.push(`${name}: ảnh gốc cần nhỏ hơn 20 MB.`);
        else accepted.push({ uri: asset.uri, name, type, size });
      }
      if (accepted.length) {
        markDirty();
        setImages((current) => [...current, ...accepted].slice(0, MAX_IMAGE_COUNT));
        setBackground(undefined);
        setShowBackgrounds(false);
        haptics.tap();
        requestAnimationFrame(() => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true })));
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
    if (images.length >= MAX_IMAGE_COUNT) { setError('Mỗi bài viết có thể đính kèm tối đa 4 ảnh.'); return; }
    if (value.length > 500 || !isAllowedHttpsUrl(value, ALLOWED_IMAGE_HOSTS, true)) {
      setError('Dùng link HTTPS từ images.unsplash.com, i.imgur.com hoặc kho ảnh Supabase.');
      return;
    }
    if (images.some((image) => image.url === value)) { setError('Ảnh này đã được thêm vào bài viết.'); return; }
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
        setFailedUris((current) => current.filter((uri) => uri !== image.uri));
        try {
          const result = await communityApi.uploadImage(image.uri, image.name, image.type);
          if (!result.url) throw new Error('Máy chủ không trả về đường dẫn ảnh.');
          uploadedByUri.set(image.uri, result.url);
          setImages((current) => current.map((item) => item.uri === image.uri ? { ...item, url: result.url } : item));
        } catch (cause) {
          uploadError ??= cause;
          setFailedUris((current) => [...current, image.uri]);
        } finally {
          setUploadingUris((current) => current.filter((uri) => uri !== image.uri));
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(2, pending.length) }, worker));
    if (uploadError) throw uploadError;
    return images.map((image) => image.url ?? uploadedByUri.get(image.uri)).filter((url): url is string => Boolean(url));
  };

  const retryUpload = async (image: PickedImage) => {
    if (busy || uploadingUris.includes(image.uri)) return;
    setError('');
    setFailedUris((current) => current.filter((uri) => uri !== image.uri));
    setUploadingUris((current) => [...current, image.uri]);
    try {
      const result = await communityApi.uploadImage(image.uri, image.name, image.type);
      if (!result.url) throw new Error('Máy chủ không trả về đường dẫn ảnh.');
      setImages((current) => current.map((item) => item.uri === image.uri ? { ...item, url: result.url } : item));
      haptics.success();
    } catch (cause) {
      setFailedUris((current) => [...current, image.uri]);
      setError(cause instanceof Error ? `Không tải được ảnh: ${cause.message}` : 'Không tải được ảnh. Hãy thử lại.');
      haptics.error();
    } finally {
      setUploadingUris((current) => current.filter((uri) => uri !== image.uri));
    }
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
    if (background && (images.length || normalizedVideoUrl || normalizedBody.length > MAX_BACKGROUND_LENGTH)) {
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
      haptics.success();
      // Leave first so the post cannot be submitted twice while caches refresh in the background.
      disablePrevention();
      goBack();
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['community', 'bookmarks'] }),
        queryClient.invalidateQueries({ queryKey: ['community', 'profile-list'] }),
        ...(id ? [queryClient.invalidateQueries({ queryKey: ['community', 'detail', id] })] : []),
      ]);
    } catch (cause) {
      haptics.error();
      setError(cause instanceof Error ? cause.message : 'Không thể đăng bài. Hãy kiểm tra kết nối rồi thử lại.');
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    } finally {
      setBusy(false);
    }
  };

  const canUseBackground = images.length === 0 && !videoUrl.trim() && body.trim().length <= MAX_BACKGROUND_LENGTH;
  const bgColor = background ? postBackgroundColor(background) : undefined;
  const uploadedCount = images.filter((image) => image.url).length;
  const submittingLabel = uploadingUris.length ? `Đang tải ảnh ${Math.min(uploadedCount + 1, images.length)}/${images.length}…` : id ? 'Đang lưu…' : 'Đang đăng…';
  const canPost = Boolean(body.trim()) && !busy && !picking && !(Boolean(id) && (existing.isLoading || existing.isError));
  const palette = communityCategoryColor(category);
  const optionCount = [title.trim(), targetBand.trim(), videoUrl.trim()].filter(Boolean).length;

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={[]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <View className="flex-row items-center border-b border-line bg-surface px-3 pb-2" style={{ paddingTop: Math.max(insets.top, 12) }}>
          <Pressable onPress={close} disabled={busy} className="h-11 w-11 items-center justify-center rounded-full active:bg-tint" accessibilityRole="button" accessibilityLabel="Đóng trình soạn bài">
            <X size={24} color={colors.ink} />
          </Pressable>
          <Text accessibilityRole="header" weight="extrabold" className="flex-1 text-center text-base">{id ? 'Sửa bài viết' : 'Bài viết mới'}</Text>
          <Pressable
            onPress={() => void submit()}
            disabled={!canPost}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            className="min-h-11 min-w-[76px] items-center justify-center rounded-full px-5 active:opacity-80"
            style={{ backgroundColor: canPost ? colors.accent : colors.surfaceTint }}
            accessibilityRole="button"
            accessibilityLabel={busy ? (id ? 'Đang lưu bài viết' : 'Đang đăng bài viết') : (id ? 'Lưu bài viết' : 'Đăng bài viết')}
            accessibilityState={{ disabled: !canPost, busy }}>
            {busy ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Text weight="extrabold" className="text-sm" style={{ color: canPost ? colors.onAccent : colors.muted }}>{id ? 'Lưu' : 'Đăng'}</Text>}
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerClassName="grow px-4 pb-6 pt-4"
          showsVerticalScrollIndicator={false}>
          {id && existing.isLoading ? <View className="items-center py-10"><ActivityIndicator color={colors.accent} /><Text className="mt-3 text-sm text-muted">Đang tải bài viết…</Text></View> : null}
          {id && existing.isError ? (
            <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.dangerSoft }}>
              <Text accessibilityRole="alert" className="text-sm" style={{ color: colors.danger }}>Không tải được bài viết để sửa.</Text>
              <Pressable onPress={() => void existing.refetch()} className="mt-2 min-h-11 justify-center"><Text weight="bold" className="text-accent">Thử lại</Text></Pressable>
            </View>
          ) : null}
          {error ? <Text accessibilityRole="alert" className="mb-4 rounded-xl px-3 py-2.5 text-sm leading-5" style={{ backgroundColor: colors.dangerSoft, color: colors.danger }}>{error}</Text> : null}

          {(!id || existing.data) && !existing.isError ? (
            <>
              <View className="flex-row items-center rounded-3xl border border-line bg-surface p-3.5">
                <CommunityAvatar uri={ownProfile.data?.avatarUrl} name={ownProfile.data?.displayName ?? currentUser.data?.fullName} size={44} />
                <View className="ml-3 flex-1 items-start">
                  <Text weight="bold" className="text-base">{currentUser.data?.fullName ?? 'Bạn'}</Text>
                  <Text className="mt-0.5 text-xs text-muted">Chia sẻ với cộng đồng</Text>
                  <Pressable
                    onPress={() => { Keyboard.dismiss(); setSheet('category'); }}
                    disabled={busy}
                    className="mt-1 min-h-8 flex-row items-center gap-1 rounded-full border px-3 active:opacity-70"
                    style={{ backgroundColor: palette.background, borderColor: palette.border }}
                    accessibilityRole="button"
                    accessibilityLabel={`Chủ đề: ${CATEGORY_LABELS[category]}. Chạm để đổi`}>
                    <Text weight="bold" className="text-xs" style={{ color: palette.foreground }}>{CATEGORY_LABELS[category]}</Text>
                    <ChevronDown size={14} color={palette.foreground} />
                  </Pressable>
                </View>
              </View>

              {bgColor ? (
                <View className="mt-4 min-h-[220px] justify-center rounded-2xl px-6 py-8" style={{ backgroundColor: bgColor }}>
                  <TextInput
                    value={body}
                    onChangeText={(value) => { markDirty(); setBody(value); if (value.trim().length > MAX_BACKGROUND_LENGTH) setBackground(undefined); }}
                    editable={!busy}
                    placeholder="Viết điều bạn muốn chia sẻ…"
                    placeholderTextColor="rgba(255,255,255,0.65)"
                    multiline
                    maxLength={MAX_BODY_LENGTH}
                    accessibilityLabel="Nội dung bài viết"
                    className="text-center text-xl leading-8 text-white"
                    style={{ fontFamily: 'BeVietnamPro_700Bold' }}
                  />
                </View>
              ) : (
                <View className="mt-4 min-h-[300px] rounded-3xl border border-line bg-surface p-4">
                  <View className="flex-row items-center justify-between">
                    <Text weight="bold" className="text-sm">Nội dung bài viết</Text>
                    {body.length > 3_500 ? <Text className="text-xs text-muted">{body.length}/{MAX_BODY_LENGTH}</Text> : null}
                  </View>
                  <TextInput
                    value={body}
                    onChangeText={(value) => { markDirty(); setBody(value); if (background && value.trim().length > MAX_BACKGROUND_LENGTH) setBackground(undefined); }}
                    editable={!busy}
                    autoFocus={!id}
                    placeholder="Chia sẻ điều bạn đang học, đặt câu hỏi hoặc tìm bạn luyện cùng…"
                    placeholderTextColor={colors.muted}
                    multiline
                    textAlignVertical="top"
                    maxLength={MAX_BODY_LENGTH}
                    accessibilityLabel="Nội dung bài viết"
                    className="mt-3 min-h-[220px] text-base leading-7 text-ink"
                    style={{ textAlignVertical: 'top' }}
                  />
                </View>
              )}

              {images.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerClassName="gap-3 pr-2">
                  {images.map((image, index) => (
                    <View key={`${image.uri}-${index}`} className="relative">
                      <CommunityImage uri={image.uri} label={`Ảnh đính kèm ${index + 1}`} className="h-32 w-32 rounded-2xl" />
                      {uploadingUris.includes(image.uri) ? <View className="absolute inset-0 items-center justify-center rounded-2xl bg-black/45"><ActivityIndicator color="white" /></View> : null}
                      {failedUris.includes(image.uri) && !uploadingUris.includes(image.uri) ? (
                        <Pressable onPress={() => void retryUpload(image)} disabled={busy} className="absolute inset-0 items-center justify-center rounded-2xl bg-black/60" accessibilityRole="button" accessibilityLabel={`Tải lại ảnh ${index + 1} bị lỗi`}>
                          <RefreshCw size={20} color="white" /><Text weight="bold" className="mt-1 text-[11px] text-white">Thử lại</Text>
                        </Pressable>
                      ) : null}
                      {image.url && image.size > 0 && !uploadingUris.includes(image.uri) ? <View className="absolute bottom-1.5 left-1.5 h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: colors.success }}><Check size={12} color="white" strokeWidth={3} /></View> : null}
                      <Pressable disabled={busy} onPress={() => { markDirty(); setFailedUris((current) => current.filter((uri) => uri !== image.uri)); setImages((current) => current.filter((_, itemIndex) => itemIndex !== index)); }} className="absolute right-1 top-1 h-9 w-9 items-center justify-center rounded-full bg-black/55" accessibilityRole="button" accessibilityLabel={`Xóa ảnh ${index + 1}`}>
                        <X size={17} color="white" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              {optionCount > 0 ? (
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {title.trim() ? <SummaryChip label={`Tiêu đề: ${title.trim()}`} /> : null}
                  {targetBand.trim() ? <SummaryChip label={`Band ${targetBand.trim()}`} /> : null}
                  {videoUrl.trim() ? <SummaryChip label="Có video" /> : null}
                </View>
              ) : null}

              {busy ? <View className="mt-4 flex-row items-center justify-center gap-2"><ActivityIndicator color={colors.accent} /><Text className="text-sm text-muted">{submittingLabel}</Text></View> : null}
            </>
          ) : null}
        </ScrollView>

        {showBackgrounds ? (
          <View className="border-t border-line bg-surface">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-3 px-4 py-3">
              <Pressable onPress={() => { markDirty(); setBackground(undefined); }} className="items-center" accessibilityRole="button" accessibilityLabel="Không dùng nền màu" accessibilityState={{ selected: !background }}>
                <View className="h-11 w-11 items-center justify-center rounded-full border-2" style={{ borderColor: !background ? colors.accent : colors.line }}><X size={16} color={colors.muted} /></View>
              </Pressable>
              {BACKGROUNDS.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    markDirty();
                    if (!canUseBackground) { setError('Nền màu chỉ dùng cho bài chỉ có chữ, tối đa 280 ký tự.'); haptics.warning(); return; }
                    haptics.select();
                    setBackground(background === item.key ? undefined : item.key);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Nền ${item.label}`}
                  accessibilityState={{ selected: background === item.key }}>
                  <View className="h-11 w-11 rounded-full border-2" style={{ backgroundColor: postBackgroundColor(item.key), borderColor: background === item.key ? colors.accent : 'transparent' }} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View className="min-h-14 flex-row items-center border-t border-line bg-surface px-2" style={{ paddingBottom: Platform.OS === 'ios' && !keyboardVisible ? Math.max(insets.bottom, 12) : 4 }}>
          <ToolButton label={picking ? 'Đang mở thư viện ảnh' : `Thêm ảnh, ${images.length}/${MAX_IMAGE_COUNT}`} disabled={busy || picking || images.length >= MAX_IMAGE_COUNT} onPress={() => void pickImages()}>
            {picking ? <ActivityIndicator color={colors.success} /> : <ImagePlus size={23} color={colors.success} />}
          </ToolButton>
          <ToolButton label="Nền màu cho bài chữ" disabled={busy} active={showBackgrounds} onPress={() => setShowBackgrounds((open) => !open)}>
            <Palette size={23} color={showBackgrounds ? colors.accent : colors.reaction.helpful} />
          </ToolButton>
          <ToolButton label={optionCount ? `Tùy chọn thêm, đã đặt ${optionCount}` : 'Tùy chọn thêm'} disabled={busy} onPress={() => { Keyboard.dismiss(); setSheet('options'); }}>
            <SlidersHorizontal size={22} color={colors.accentDeep} />
            {optionCount ? <View className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.accentWarm }} /> : null}
          </ToolButton>
          <View className="flex-1" />
          <Text className="mr-3 text-xs" style={{ color: body.length > MAX_BODY_LENGTH - 500 ? colors.danger : colors.muted }}>
            {images.length ? `${images.length}/${MAX_IMAGE_COUNT} ảnh · ` : ''}{body.length > 3_500 ? `${body.length}/${MAX_BODY_LENGTH}` : ''}
          </Text>
        </View>
      </KeyboardAvoidingView>

      <ActionSheet
        visible={sheet === 'category'}
        title="Chọn chủ đề"
        items={CATEGORIES.map((key) => ({
          label: CATEGORY_LABELS[key],
          icon: key === category ? Check : Hash,
          onPress: () => { markDirty(); setCategory(key); haptics.select(); },
        }))}
        onClose={() => setSheet('none')}
      />

      <Modal visible={sheet === 'options'} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSheet('none')}>
        <KeyboardAvoidingView className="flex-1 justify-end bg-black/50" behavior={Platform.OS === 'web' ? undefined : 'padding'}>
          <Pressable className="flex-1" onPress={() => setSheet('none')} accessibilityRole="button" accessibilityLabel="Đóng tùy chọn" />
          <View className="rounded-t-[28px] bg-surface px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-line" />
            <Text weight="extrabold" className="text-lg">Tùy chọn thêm</Text>
            <ScrollView keyboardShouldPersistTaps="handled" className="max-h-[420px]" style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
              <Field label="Tiêu đề" hint="Không bắt buộc">
                <TextInput value={title} onChangeText={(value) => { markDirty(); setTitle(value); }} placeholder="Ví dụ: Cách mình tăng Writing 0,5 band" placeholderTextColor={colors.muted} maxLength={200} className="min-h-12 rounded-xl bg-tint px-4 text-base text-ink" accessibilityLabel="Tiêu đề bài viết" />
              </Field>
              <Field label="Band mục tiêu" hint="Từ 0 đến 9, bước 0,5">
                <TextInput value={targetBand} onChangeText={(value) => { markDirty(); setTargetBand(value); }} placeholder="6.5" placeholderTextColor={colors.muted} keyboardType="decimal-pad" className="min-h-12 rounded-xl bg-tint px-4 text-base text-ink" accessibilityLabel="Band mục tiêu" />
              </Field>
              <Field label="Link video" hint="YouTube, Loom hoặc Google Drive (HTTPS)">
                <TextInput value={videoUrl} onChangeText={(value) => { markDirty(); setVideoUrl(value); if (value.trim()) setBackground(undefined); }} placeholder="https://youtu.be/…" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" className="min-h-12 rounded-xl bg-tint px-4 text-base text-ink" accessibilityLabel="Link video" />
              </Field>
              <Field label="Thêm ảnh từ link" hint="images.unsplash.com, i.imgur.com hoặc kho ảnh Supabase">
                <View className="flex-row items-center gap-2">
                  <TextInput value={imageUrlInput} onChangeText={setImageUrlInput} placeholder="https://…" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" className="min-h-12 flex-1 rounded-xl bg-tint px-4 text-base text-ink" accessibilityLabel="Link ảnh" />
                  <Pressable onPress={addImageUrl} disabled={!imageUrlInput.trim()} accessibilityRole="button" className="min-h-12 justify-center rounded-xl px-4 active:opacity-80" style={{ backgroundColor: imageUrlInput.trim() ? colors.accent : colors.surfaceTint }}>
                    <Text weight="bold" className="text-sm" style={{ color: imageUrlInput.trim() ? colors.onAccent : colors.muted }}>Thêm</Text>
                  </Pressable>
                </View>
              </Field>
            </ScrollView>
            <View className="mt-4"><Button label="Xong" onPress={() => setSheet('none')} /></View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function ToolButton({ label, onPress, disabled, active, children }: { label: string; onPress: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(active) }}
      className={`h-12 w-12 items-center justify-center rounded-full active:bg-tint ${disabled ? 'opacity-40' : ''}`}>
      {children}
    </Pressable>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <View className="mt-4">
      <Text weight="bold" className="text-sm">{label}</Text>
      <Text className="mb-2 mt-0.5 text-xs text-muted">{hint}</Text>
      {children}
    </View>
  );
}

function SummaryChip({ label }: { label: string }) {
  return (
    <View className="max-w-full rounded-full px-3 py-1.5" style={{ backgroundColor: colors.accentSoft }}>
      <Text weight="semibold" numberOfLines={1} className="text-xs text-accent-deep">{label}</Text>
    </View>
  );
}
