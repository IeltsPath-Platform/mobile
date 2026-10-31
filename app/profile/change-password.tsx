import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CheckCircle2, ChevronLeft, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/button';
import { Card } from '@/src/components/ui/card';
import { FormAlert } from '@/src/components/ui/form-alert';
import { Text } from '@/src/components/ui/text';
import { TextField } from '@/src/components/ui/text-field';
import { profileApi } from '@/src/features/profile/api';
import { colors } from '@/src/theme';

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!currentPassword) throw new Error('Vui lòng nhập mật khẩu hiện tại.');
      if (newPassword.length < 6) throw new Error('Mật khẩu mới cần có ít nhất 6 ký tự.');
      if (newPassword !== confirmPassword) throw new Error('Mật khẩu xác nhận chưa khớp.');
      if (currentPassword === newPassword) throw new Error('Mật khẩu mới cần khác mật khẩu hiện tại.');
      return profileApi.changePassword({ currentPassword, newPassword });
    },
    onSuccess: () => {
      setFormError('');
      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => setFormError(error.message),
  });

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
              <Text weight="black" className="text-xl">Đổi mật khẩu</Text>
              <Text className="text-xs text-muted">Bảo mật tài khoản của bạn</Text>
            </View>
          </View>

          <View className="rounded-3xl p-5" style={{ backgroundColor: colors.heroStart }}>
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><ShieldCheck size={27} color="#fff" /></View>
              <View className="flex-1">
                <Text weight="extrabold" className="text-base text-white">Tạo mật khẩu an toàn</Text>
                <Text className="mt-1 text-sm leading-5 text-white/75">Mật khẩu mới phải có ít nhất 6 ký tự.</Text>
              </View>
            </View>
          </View>

          {saved ? <View className="mt-4"><FormAlert tone="success" message="Mật khẩu đã được cập nhật thành công." /></View> : null}
          <Card className="mt-4 gap-4 p-4">
            <View className="mb-1 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft"><LockKeyhole size={18} color={colors.accentDeep} /></View>
              <View className="flex-1">
                <Text weight="extrabold" className="text-base">Thông tin mật khẩu</Text>
                <Text className="text-xs text-muted">Nhập mật khẩu hiện tại để xác nhận</Text>
              </View>
            </View>
            <TextField label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} secureToggle autoCapitalize="none" autoCorrect={false} textContentType="password" placeholder="Mật khẩu đang dùng" returnKeyType="next" />
            <TextField label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} secureToggle autoCapitalize="none" autoCorrect={false} textContentType="newPassword" placeholder="Ít nhất 6 ký tự" returnKeyType="next" />
            <TextField label="Nhập lại mật khẩu mới" value={confirmPassword} onChangeText={setConfirmPassword} secureToggle autoCapitalize="none" autoCorrect={false} textContentType="newPassword" placeholder="Xác nhận mật khẩu mới" returnKeyType="done" onSubmitEditing={() => { if (currentPassword && newPassword && confirmPassword && !mutation.isPending) mutation.mutate(); }} />
            {formError ? <FormAlert message={formError} /> : null}
            {saved ? <Button label="Quay về hồ sơ" variant="secondary" icon={<CheckCircle2 size={18} color={colors.success} />} onPress={() => router.back()} /> : null}
          </Card>
        </ScrollView>

        {!saved ? <View className="border-t border-line bg-surface px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <Button label="Cập nhật mật khẩu" loading={mutation.isPending} loadingLabel="Đang cập nhật" disabled={!currentPassword || !newPassword || !confirmPassword} onPress={() => { setSaved(false); setFormError(''); mutation.mutate(); }} />
        </View> : null}
      </View>
    </KeyboardAvoidingView>
  );
}
