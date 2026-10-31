import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, ChevronLeft, Clock3, ImagePlus, Trash2, UserRound } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { TextField } from '@/src/components/ui/text-field';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { profileApi, profileQueryKeys } from '@/src/features/profile/api';
import { colors, fonts } from '@/src/theme';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function EditProfileScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const learner = useQuery({ queryKey: profileQueryKeys.learner, queryFn: profileApi.getLearnerProfile });
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [band, setBand] = useState('');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [formError, setFormError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (user.data) {
      setFullName(user.data.fullName);
      setPhoneNumber(user.data.phoneNumber ?? '');
    }
  }, [user.data]);

  useEffect(() => {
    if (learner.data) {
      setDisplayName(learner.data.displayName ?? user.data?.fullName ?? '');
      setBio(learner.data.bio ?? '');
      setBand(learner.data.selfReportedBand == null ? '' : String(learner.data.selfReportedBand));
      setTimezone(learner.data.timezone || 'Asia/Ho_Chi_Minh');
      setVisibility(learner.data.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC');
    }
  }, [learner.data, user.data?.fullName]);

  const avatarMutation = useMutation({
    mutationFn: profileApi.deleteAvatar,
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileQueryKeys.learner, profile);
      setAvatarError('');
    },
    onError: (error: Error) => setAvatarError(error.message),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsedBand = band.trim() ? Number(band.replace(',', '.')) : null;
      if (parsedBand != null && (!Number.isFinite(parsedBand) || parsedBand < 0 || parsedBand > 9)) {
        throw new Error('Band tự đánh giá phải nằm trong khoảng 0 đến 9.');
      }
      if (!timezone.trim()) throw new Error('Vui lòng nhập múi giờ.');

      await profileApi.updateAccount({ fullName: fullName.trim(), phoneNumber: phoneNumber.trim() || null });
      try {
        return await profileApi.updateLearnerProfile({
          displayName: (displayName.trim() || fullName.trim()),
          bio: bio.trim() || null,
          selfReportedBand: parsedBand,
          timezone: timezone.trim(),
          visibility,
        });
      } catch (error) {
        throw new Error(`Thông tin tài khoản đã lưu, nhưng hồ sơ học viên chưa lưu được: ${error instanceof Error ? error.message : 'Vui lòng thử lại.'}`);
      }
    },
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileQueryKeys.learner, profile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileQueryKeys.user }),
        queryClient.invalidateQueries({ queryKey: profileQueryKeys.learner }),
      ]);
      router.back();
    },
    onError: (error: Error) => setFormError(error.message),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: profileQueryKeys.user });
    },
  });

  const avatar = learner.data?.avatarReference;
  const initial = useMemo(() => (displayName || fullName || '?').trim().charAt(0).toUpperCase(), [displayName, fullName]);
  const loading = user.isPending || learner.isPending;

  const pickAvatar = async () => {
    if (avatarUploading || avatarMutation.isPending) return;
    setAvatarUploading(true);
    setAvatarError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setAvatarError('Hãy cấp quyền truy cập thư viện ảnh để chọn avatar.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.72,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled) return;

      const image = result.assets[0];
      if (image.fileSize && image.fileSize > MAX_AVATAR_BYTES) {
        setAvatarError('Ảnh đại diện cần nhỏ hơn 2 MB.');
        return;
      }
      const type = image.mimeType?.toLowerCase() ?? 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) {
        setAvatarError('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.');
        return;
      }
      const profile = await profileApi.uploadAvatar({
        uri: image.uri,
        name: image.fileName ?? `avatar-${Date.now()}.${type.split('/')[1] ?? 'jpg'}`,
        type,
      });
      queryClient.setQueryData(profileQueryKeys.learner, profile);
      await queryClient.invalidateQueries({ queryKey: profileQueryKeys.learner });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Không tải được ảnh đại diện.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const confirmDeleteAvatar = () => {
    const remove = () => avatarMutation.mutate();
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm('Xóa ảnh đại diện hiện tại?')) remove();
      return;
    }
    Alert.alert('Xóa ảnh đại diện', 'Bạn có muốn xóa ảnh hiện tại không?', [
      { text: 'Để sau', style: 'cancel' },
      { text: 'Xóa ảnh', style: 'destructive', onPress: remove },
    ]);
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="flex-1 bg-canvas">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerClassName="px-5 pb-6"
          contentContainerStyle={{ paddingTop: Math.max(insets.top, 12) + 8 }}>
          <View className="mb-5 flex-row items-center gap-3">
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={8} className="h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface">
              <ChevronLeft size={22} color={colors.ink} />
            </Pressable>
            <View className="flex-1">
              <Text weight="black" className="text-xl">Chỉnh sửa hồ sơ</Text>
              <Text className="text-xs text-muted">Thông tin và ảnh đại diện</Text>
            </View>
          </View>

          {loading ? <View className="mt-14 items-center gap-3"><ActivityIndicator color={colors.accent} /><Text className="text-sm text-muted">Đang tải hồ sơ…</Text></View> : null}
          {user.isError || learner.isError ? (
            <View className="mt-5 gap-3">
              <FormAlert message={(user.error ?? learner.error)?.message ?? 'Không tải được hồ sơ.'} />
              <Button label="Thử tải lại" variant="secondary" onPress={() => { void user.refetch(); void learner.refetch(); }} />
            </View>
          ) : null}

          {!loading && !user.isError && !learner.isError ? <>
            <View className="overflow-hidden rounded-3xl p-5" style={{ backgroundColor: colors.heroStart }}>
              <View className="flex-row items-center gap-4">
                <Pressable onPress={() => void pickAvatar()} accessibilityRole="button" accessibilityLabel="Thay ảnh đại diện" className="relative">
                  <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/80 bg-accent">
                    {avatar ? <Image source={{ uri: avatar }} className="h-full w-full" resizeMode="cover" /> : <Text weight="black" className="text-3xl text-white">{initial}</Text>}
                  </View>
                  <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-accent">
                    {avatarMutation.isPending || avatarUploading ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={17} color="#fff" />}
                  </View>
                </Pressable>
                <View className="flex-1">
                  <Text weight="black" className="text-lg text-white">{displayName || fullName}</Text>
                  <Text className="mt-1 text-sm text-white/75">Ảnh vuông, rõ mặt sẽ dễ nhận ra hơn.</Text>
                  <Pressable onPress={() => void pickAvatar()} accessibilityRole="button" accessibilityLabel="Chọn ảnh đại diện" disabled={avatarUploading || avatarMutation.isPending} className="mt-3 min-h-11 flex-row items-center gap-2 self-start rounded-xl bg-white/15 px-3">
                    <ImagePlus size={17} color="#fff" />
                    <Text weight="bold" className="text-sm text-white">{avatarUploading ? 'Đang tải ảnh…' : 'Chọn ảnh'}</Text>
                  </Pressable>
                </View>
              </View>
              {avatar ? <Pressable onPress={confirmDeleteAvatar} disabled={avatarUploading || avatarMutation.isPending} accessibilityRole="button" className="mt-4 min-h-11 flex-row items-center justify-center gap-2 rounded-xl border border-white/20">
                {avatarMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Trash2 size={16} color="#fff" />}
                <Text weight="semibold" className="text-sm text-white">Xóa ảnh hiện tại</Text>
              </Pressable> : null}
              <Text className="mt-3 text-xs text-white/70">JPEG, PNG hoặc WebP · tối đa 2 MB</Text>
              {avatarError ? <View className="mt-3"><FormAlert message={avatarError} /></View> : null}
            </View>

            <Card className="mt-4 gap-4 p-4">
              <SectionHeading icon={<UserRound size={18} color={colors.accentDeep} />} title="Tài khoản" subtitle="Tên thật và thông tin liên hệ" />
              <TextField label="Họ và tên" value={fullName} onChangeText={setFullName} autoCapitalize="words" maxLength={150} placeholder="Tên của bạn" />
              <View className="rounded-2xl border border-line bg-canvas px-4 py-3">
                <Text weight="semibold" className="text-sm">Email</Text>
                <Text className="mt-1 text-sm text-muted">{user.data?.email ?? '—'}</Text>
                <Text className="mt-0.5 text-xs text-muted">Email không thể thay đổi tại đây</Text>
              </View>
              <TextField label="Số điện thoại" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" maxLength={30} placeholder="Thêm số điện thoại" />
            </Card>

            <Card className="mt-4 gap-4 p-4">
              <SectionHeading icon={<Check size={18} color={colors.accentDeep} />} title="Hồ sơ học viên" subtitle="Thông tin xuất hiện trong cộng đồng" />
              <TextField label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} maxLength={100} placeholder="Tên mọi người sẽ nhìn thấy" />
              <View className="gap-1.5">
                <Text weight="semibold" className="text-sm">Giới thiệu</Text>
                <TextInput value={bio} onChangeText={setBio} multiline numberOfLines={4} maxLength={1000} placeholder="Chia sẻ một chút về bạn" placeholderTextColor={colors.muted} textAlignVertical="top" accessibilityLabel="Giới thiệu" className="min-h-28 rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink" style={{ fontFamily: fonts.regular }} />
                <Text className="text-xs text-muted">{bio.length}/1.000 ký tự</Text>
              </View>
              <TextField label="Band tự đánh giá" value={band} onChangeText={setBand} keyboardType="decimal-pad" maxLength={3} placeholder="Ví dụ: 6.5" hint="Từ 0 đến 9 · có thể để trống" />
              <View>
                <Text weight="semibold" className="mb-2 text-sm">Quyền riêng tư</Text>
                <View className="flex-row gap-2">
                  {(['PUBLIC', 'PRIVATE'] as const).map((value) => {
                    const selected = visibility === value;
                    return <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setVisibility(value)} className="min-h-12 flex-1 items-center justify-center rounded-2xl border px-2" style={{ borderColor: selected ? colors.accent : colors.line, backgroundColor: selected ? colors.accentSoft : colors.surface }}>
                      <Text weight="bold" className="text-sm" style={{ color: selected ? colors.accentDeep : colors.ink }}>{value === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}</Text>
                    </Pressable>;
                  })}
                </View>
                <Text className="mt-2 text-xs leading-5 text-muted">Công khai cho phép người học khác xem hồ sơ cộng đồng của bạn.</Text>
              </View>
            </Card>

            <Card className="mt-4 gap-3 p-4">
              <SectionHeading icon={<Clock3 size={18} color={colors.accentDeep} />} title="Thiết lập học tập" subtitle="Múi giờ dùng để tính ngày học và streak" />
              <TextField label="Múi giờ" value={timezone} onChangeText={setTimezone} autoCapitalize="none" maxLength={50} placeholder="Asia/Ho_Chi_Minh" hint="Dùng tên múi giờ IANA, ví dụ Asia/Ho_Chi_Minh" />
            </Card>
            {formError ? <View className="mt-4"><FormAlert message={formError} /></View> : null}
          </> : null}
        </ScrollView>

        {!loading && !user.isError && !learner.isError ? <View className="border-t border-line bg-surface px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Button label="Lưu thay đổi" loading={saveMutation.isPending} loadingLabel="Đang lưu hồ sơ" disabled={!fullName.trim() || !displayName.trim() || avatarUploading || avatarMutation.isPending} onPress={() => { setFormError(''); saveMutation.mutate(); }} />
        </View> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function SectionHeading({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft">{icon}</View>
      <View className="flex-1">
        <Text weight="extrabold" className="text-base">{title}</Text>
        <Text className="text-xs text-muted">{subtitle}</Text>
      </View>
    </View>
  );
}
