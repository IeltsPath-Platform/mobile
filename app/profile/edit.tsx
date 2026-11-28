import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Check, ChevronRight, ImagePlus, Smartphone, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/src/components/navigation/back-header';
import { ActionSheet, type ActionSheetItem } from '@/src/components/ui/action-sheet';
import { StatusBarStrip } from '@/src/components/ui/band-status-bar';
import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { useCurrentUser } from '@/src/features/auth/auth-provider';
import { Sheet } from '@/src/features/practice/components/sheet';
import { profileApi, profileQueryKeys } from '@/src/features/profile/api';
import { BAND_CHOICES, DEFAULT_TIMEZONE, deviceTimezone, parseBand, TIMEZONE_CHOICES, timezoneLabel } from '@/src/features/profile/profile-form';
import { gamificationApi } from '@/src/features/progress/gamification-api';
import { ApiError } from '@/src/lib/api-client';
import { safeErrorMessage } from '@/src/lib/error-message';
import { haptics } from '@/src/lib/haptics';
import { useDiscardGuard } from '@/src/lib/use-discard-guard';
import { colors, fonts } from '@/src/theme';
import { useTheme } from '@/src/theme/app-theme';

const MAX_SOURCE_AVATAR_BYTES = 20 * 1024 * 1024;
const BIO_MAX = 1000;
const AVATAR_SIZE = 96;

export default function EditProfileScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const learner = useQuery({ queryKey: profileQueryKeys.learner, queryFn: profileApi.getLearnerProfile });
  const gamificationSettings = useQuery({
    queryKey: ['gamification', 'settings'],
    queryFn: gamificationApi.settings,
    enabled: Boolean(user.data),
    staleTime: 5 * 60_000,
  });
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [band, setBand] = useState('');
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [formError, setFormError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const [timezonePicker, setTimezonePicker] = useState(false);
  const [bandPicker, setBandPicker] = useState(false);
  const refreshCommunityAvatar = () => {
    if (!user.data?.id) return Promise.resolve();
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['community', 'profile', user.data.id] }),
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] }),
      queryClient.invalidateQueries({ queryKey: ['community', 'profile-list'] }),
    ]);
  };

  // Hydrate each source once so background refetches never wipe typed input.
  const userHydrated = useRef(false);
  const learnerHydrated = useRef(false);
  const timezoneHydrated = useRef(false);

  useEffect(() => {
    if (user.data && !userHydrated.current) {
      userHydrated.current = true;
      setFullName(user.data.fullName);
      setPhoneNumber(user.data.phoneNumber ?? '');
    }
  }, [user.data]);

  useEffect(() => {
    if (learner.data && !learnerHydrated.current) {
      learnerHydrated.current = true;
      setDisplayName(learner.data.displayName ?? user.data?.fullName ?? '');
      setBio(learner.data.bio ?? '');
      setBand(learner.data.selfReportedBand == null ? '' : String(learner.data.selfReportedBand));
      if (!timezoneHydrated.current) setTimezone(learner.data.timezone || DEFAULT_TIMEZONE);
      setVisibility(learner.data.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC');
    }
  }, [learner.data, user.data?.fullName]);

  useEffect(() => {
    if (gamificationSettings.data?.timezone && !timezoneHydrated.current) {
      timezoneHydrated.current = true;
      setTimezone(gamificationSettings.data.timezone);
    }
  }, [gamificationSettings.data?.timezone]);

  const avatarMutation = useMutation({
    mutationFn: profileApi.deleteAvatar,
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileQueryKeys.learner, profile);
      setAvatarError('');
      await refreshCommunityAvatar();
    },
    onError: (error: Error) => setAvatarError(safeErrorMessage(error, 'Không thể cập nhật ảnh đại diện.')),
  });

  // Compared with what was loaded, so typing something and undoing it does not ask.
  const dirty = Boolean(user.data && learner.data) && (
    fullName !== user.data!.fullName
    || phoneNumber !== (user.data!.phoneNumber ?? '')
    || displayName !== (learner.data!.displayName ?? user.data!.fullName ?? '')
    || bio !== (learner.data!.bio ?? '')
    || parseBand(band) !== (learner.data!.selfReportedBand ?? null)
    || timezone !== (gamificationSettings.data?.timezone || learner.data!.timezone || DEFAULT_TIMEZONE)
    || visibility !== (learner.data!.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC')
  );
  const allowLeave = useDiscardGuard(dirty);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsedBand = parseBand(band);
      await profileApi.updateAccount({ fullName: fullName.trim(), phoneNumber: phoneNumber.trim() || null });
      const profile = await profileApi.updateLearnerProfile({
        displayName: (displayName.trim() || fullName.trim()),
        bio: bio.trim() || null,
        selfReportedBand: parsedBand,
        timezone,
        visibility,
      }).catch((error: unknown) => {
        throw new Error(`Thông tin tài khoản đã lưu, nhưng hồ sơ học viên chưa lưu được: ${error instanceof Error ? error.message : 'Vui lòng thử lại.'}`);
      });
      try {
        await gamificationApi.updateSettings(timezone);
      } catch (error) {
        throw new Error(`Hồ sơ đã lưu nhưng múi giờ học chưa đồng bộ: ${error instanceof Error ? error.message : 'Vui lòng thử lại.'}`);
      }
      return profile;
    },
    onSuccess: async (profile) => {
      haptics.success();
      queryClient.setQueryData(profileQueryKeys.learner, profile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileQueryKeys.user }),
        queryClient.invalidateQueries({ queryKey: profileQueryKeys.learner }),
        queryClient.invalidateQueries({ queryKey: ['gamification', 'settings'] }),
        refreshCommunityAvatar(),
      ]);
      allowLeave();
      router.back();
    },
    // The server names the field that is wrong ("Số điện thoại không hợp lệ"); its general message does not.
    onError: (error: Error) => {
      haptics.error();
      const field = error instanceof ApiError ? error.details.fullName ?? error.details.phoneNumber : undefined;
      setFormError(safeErrorMessage(field ? new Error(field) : error));
      // The account part may have been stored before a later step failed.
      void queryClient.invalidateQueries({ queryKey: profileQueryKeys.user });
    },
  });

  const avatar = learner.data?.avatarReference;
  const initial = useMemo(() => (displayName || fullName || '?').trim().charAt(0).toUpperCase(), [displayName, fullName]);
  const loading = user.isPending || learner.isPending;
  const avatarBusy = avatarUploading || avatarMutation.isPending;
  const canSave = dirty && Boolean(fullName.trim()) && Boolean(displayName.trim()) && !avatarBusy && !saveMutation.isPending;
  const save = () => {
    if (!canSave) return;
    setFormError('');
    saveMutation.mutate();
  };

  const pickAvatar = async () => {
    if (avatarBusy) return;
    setAvatarUploading(true);
    setAvatarError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setAvatarError('Hãy cấp quyền truy cập thư viện ảnh để chọn ảnh đại diện.');
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
      if (image.fileSize && image.fileSize > MAX_SOURCE_AVATAR_BYTES) {
        setAvatarError('Ảnh gốc cần nhỏ hơn 20 MB.');
        return;
      }
      const type = image.mimeType?.toLowerCase() ?? 'image/jpeg';
      if (!type.startsWith('image/')) {
        setAvatarError('Tệp đã chọn không phải ảnh.');
        return;
      }
      const profile = await profileApi.uploadAvatar({
        uri: image.uri,
        name: image.fileName ?? `avatar-${Date.now()}.${type.split('/')[1] ?? 'jpg'}`,
        type,
      });
      queryClient.setQueryData(profileQueryKeys.learner, profile);
      await queryClient.invalidateQueries({ queryKey: profileQueryKeys.learner });
      await refreshCommunityAvatar();
      haptics.success();
    } catch (error) {
      setAvatarError(safeErrorMessage(error, 'Không tải được ảnh đại diện.'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const bandValue = parseBand(band);

  const avatarActions: ActionSheetItem[] = [
    { label: avatar ? 'Chọn ảnh khác' : 'Chọn ảnh từ thư viện', icon: ImagePlus, onPress: () => { setTimeout(() => void pickAvatar(), 280); } },
    ...(avatar ? [{ label: 'Xóa ảnh hiện tại', icon: Trash2, destructive: true, onPress: () => avatarMutation.mutate() }] : []),
  ];

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <View className="flex-1 bg-canvas">
        <View className="flex-row items-center gap-2 px-4 pb-2" style={{ paddingTop: Math.max(insets.top, 12) + 4 }}>
          <BackButton fallbackHref="/(tabs)/account" />
          <Text accessibilityRole="header" weight="black" className="flex-1 text-center text-lg">Sửa hồ sơ</Text>
          <Pressable
            onPress={save}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel="Lưu thay đổi"
            accessibilityState={{ disabled: !canSave, busy: saveMutation.isPending }}
            className="min-h-11 min-w-16 items-center justify-center rounded-full px-4 active:opacity-70"
            style={{ backgroundColor: canSave ? colors.accent : 'transparent' }}>
            {saveMutation.isPending
              ? <ActivityIndicator size="small" color={colors.onAccent} />
              : <Text weight="extrabold" className="text-[15px]" style={{ color: canSave ? colors.onAccent : colors.muted }}>Lưu</Text>}
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerClassName="px-4 pb-10"
          showsVerticalScrollIndicator={false}>
          {loading ? <View className="mt-20 items-center gap-3"><ActivityIndicator color={colors.accent} /><Text className="text-sm text-muted">Đang tải hồ sơ…</Text></View> : null}
          {!loading && (!user.data || !learner.data) ? (
            <View className="mt-5 gap-3">
              <FormAlert message={(user.error ?? learner.error)?.message ?? 'Không tải được hồ sơ.'} />
              <Button label="Thử tải lại" variant="secondary" onPress={() => { void user.refetch(); void learner.refetch(); }} />
            </View>
          ) : null}

          {!loading && user.data && learner.data ? <>
            <Pressable
              onPress={() => setAvatarMenu(true)}
              disabled={avatarBusy}
              accessibilityRole="button"
              accessibilityLabel="Đổi ảnh đại diện"
              className="items-center pb-6 pt-4 active:opacity-80">
              <View className="items-center justify-center overflow-hidden rounded-full bg-accent" style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
                {avatar
                  ? <Image source={{ uri: avatar }} accessibilityIgnoresInvertColors contentFit="cover" style={{ width: '100%', height: '100%' }} />
                  : <Text weight="black" style={{ fontSize: 38, color: colors.onAccent }}>{initial}</Text>}
                {avatarBusy ? <View className="absolute inset-0 items-center justify-center bg-black/40"><ActivityIndicator color="#fff" /></View> : null}
              </View>
              <Text weight="bold" className="mt-3 text-[15px]" style={{ color: colors.accentDeep }}>{avatar ? 'Đổi ảnh' : 'Thêm ảnh'}</Text>
            </Pressable>
            {avatarError ? <View className="mb-4"><FormAlert message={avatarError} /></View> : null}

            <Card>
              <InputRow label="Tên" value={displayName} onChangeText={setDisplayName} maxLength={100} placeholder="Tên hiển thị" />
              <Divider />
              <InputRow label="Giới thiệu" value={bio} onChangeText={setBio} maxLength={BIO_MAX} placeholder="Thêm giới thiệu" multiline />
              <Divider />
              <LinkRow label="Band" value={bandValue == null ? 'Chưa chọn' : bandValue.toFixed(1)} muted={bandValue == null} onPress={() => setBandPicker(true)} />
              <Divider />
              <LinkRow label="Kiểm tra" value="Làm bài kiểm tra trình độ" onPress={() => router.push('/placement' as never)} />
              <Divider />
              <LinkRow label="Múi giờ" value={timezoneLabel(timezone)} onPress={() => setTimezonePicker(true)} />
            </Card>

            <Card>
              <InputRow label="Họ tên" value={fullName} onChangeText={setFullName} autoCapitalize="words" maxLength={150} placeholder="Tên thật" />
              <Divider />
              <View className="min-h-14 flex-row items-center px-4">
                <Text className="w-28 text-[15px] text-muted">Email</Text>
                <Text className="flex-1 text-[15px]" numberOfLines={1} style={{ color: colors.muted }}>{user.data.email}</Text>
              </View>
              <Divider />
              <InputRow label="Điện thoại" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" maxLength={30} placeholder="Thêm số" />
            </Card>

            <Card>
              <View className="min-h-14 flex-row items-center gap-3 px-4 py-2">
                <Text className="flex-1 text-[15px]">Hồ sơ công khai</Text>
                <Switch
                  value={visibility === 'PUBLIC'}
                  onValueChange={(on) => { haptics.select(); setVisibility(on ? 'PUBLIC' : 'PRIVATE'); }}
                  accessibilityLabel="Hồ sơ công khai"
                  trackColor={{ false: colors.line, true: colors.accent }}
                  thumbColor={colors.surface}
                />
              </View>
            </Card>
            <Text className="mt-2 px-1 text-[13px] leading-5 text-muted">
              {visibility === 'PUBLIC' ? 'Người học khác xem được hồ sơ và bài viết của bạn.' : 'Chỉ bạn xem được hồ sơ của mình.'}
            </Text>

            {formError ? <View className="mt-4"><FormAlert message={formError} /></View> : null}
          </> : null}
        </ScrollView>
        <StatusBarStrip color={colors.canvas} />
      </View>

      <ActionSheet visible={avatarMenu} items={avatarActions} onClose={() => setAvatarMenu(false)} />

      <Sheet visible={bandPicker} title="Band hiện tại" subtitle="Dùng để gợi ý bài vừa sức." onClose={() => setBandPicker(false)}>
        <View className="flex-row flex-wrap pb-2" style={{ marginHorizontal: -4 }}>
          {[null, ...BAND_CHOICES].map((value) => {
            const selected = bandValue === value;
            return (
              <View key={String(value)} style={{ width: '25%', padding: 4 }}>
                <Pressable
                  onPress={() => { haptics.select(); setBand(value == null ? '' : String(value)); setBandPicker(false); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={value == null ? 'Chưa rõ band' : `Band ${value.toFixed(1)}`}
                  className="min-h-12 items-center justify-center rounded-2xl active:opacity-70"
                  style={{ borderWidth: 1.5, borderColor: selected ? colors.accent : colors.line, backgroundColor: selected ? colors.accent : 'transparent' }}>
                  <Text weight="bold" className="text-base" style={{ color: selected ? colors.onAccent : colors.ink }}>{value == null ? 'Chưa rõ' : value.toFixed(1)}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </Sheet>

      <TimezoneSheet
        visible={timezonePicker}
        current={timezone}
        onPick={(zone) => { setTimezone(zone); setTimezonePicker(false); }}
        onClose={() => setTimezonePicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <View className="mt-3 overflow-hidden rounded-2xl bg-surface" style={{ borderWidth: 1.5, borderColor: colors.line }}>{children}</View>;
}

function Divider() {
  return <View className="ml-4 h-px" style={{ backgroundColor: colors.line }} />;
}

/** One line per field: the label on the left, what you type on the right. */
function InputRow({ label, multiline, ...input }: TextInputProps & { label: string }) {
  const { fontScale } = useTheme();
  return (
    <View className="min-h-14 flex-row px-4" style={{ alignItems: multiline ? 'flex-start' : 'center', paddingVertical: multiline ? 15 : 0 }}>
      <Text className="w-28 text-[15px] text-muted">{label}</Text>
      <TextInput
        {...input}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accentDeep}
        className="flex-1 text-ink"
        style={{ fontFamily: fonts.medium ?? fonts.regular, fontSize: Math.round(15 * fontScale), padding: 0, textAlignVertical: multiline ? 'top' : 'center' }}
      />
    </View>
  );
}

function LinkRow({ label, value, muted = false, onPress }: { label: string; value: string; muted?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} className="min-h-14 flex-row items-center px-4 active:opacity-60">
      <Text className="w-28 text-[15px] text-muted">{label}</Text>
      <Text className="flex-1 text-[15px]" numberOfLines={1} style={{ color: muted ? colors.muted : colors.ink }}>{value}</Text>
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}

function TimezoneSheet({ visible, current, onPick, onClose }: { visible: boolean; current: string; onPick: (zone: string) => void; onClose: () => void }) {
  const device = deviceTimezone();
  const listed = TIMEZONE_CHOICES.some((zone) => zone.id === current);
  const rows = [
    ...(device ? [{ id: device, label: 'Theo điện thoại', hint: timezoneLabel(device), icon: true }] : []),
    ...(!listed ? [{ id: current, label: current, hint: 'Đang dùng', icon: false }] : []),
    ...TIMEZONE_CHOICES.map((zone) => ({ id: zone.id, label: zone.label, hint: zone.id, icon: false })),
  ];
  return (
    <Sheet visible={visible} title="Chọn múi giờ" onClose={onClose}>
      <View className="pb-2">
        {rows.map((row, index) => {
          // The device row is "selected" only when it is the explicit choice; the same zone further down shows the tick.
          const selected = row.id === current && (row.icon ? !rows.slice(1).some((other) => other.id === current) : true);
          return (
            <Pressable
              key={`${row.label}-${index}`}
              onPress={() => { haptics.select(); onPick(row.id); }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              className="min-h-14 flex-row items-center gap-3 rounded-2xl px-3 active:bg-canvas">
              {row.icon ? <Smartphone size={20} color={colors.accentDeep} /> : null}
              <View className="flex-1">
                <Text weight={selected ? 'extrabold' : 'semibold'} className="text-base" style={{ color: selected ? colors.accentDeep : colors.ink }}>{row.label}</Text>
                <Text className="text-xs text-muted">{row.hint}</Text>
              </View>
              {selected ? <Check size={20} color={colors.accentDeep} strokeWidth={3} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
