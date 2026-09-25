import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TextInput } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { TextField } from '@/src/components/ui/text-field';
import { authApi } from '@/src/features/auth/api';
import { AuthLink } from '@/src/features/auth/components/auth-link';
import { AuthScreen } from '@/src/features/auth/components/auth-screen';
import { applyApiError } from '@/src/features/auth/form-errors';
import { resetPasswordSchema, type ResetPasswordInput } from '@/src/features/auth/schemas';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [formError, setFormError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: params.token ?? '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ token, newPassword }) => {
    setFormError(null);
    try {
      const response = await authApi.resetPassword({ token: token.trim(), newPassword });
      setDoneMessage(response.message);
    } catch (error) {
      setFormError(applyApiError(error, setError, ['token', 'newPassword']));
    }
  });

  return (
    <AuthScreen
      eyebrow="Khôi phục tài khoản"
      title="Đặt lại mật khẩu"
      description="Dán mã đặt lại bạn nhận được và chọn mật khẩu mới."
      footer={<AuthLink label="Quay lại đăng nhập" href="/login" />}>
      {formError ? <FormAlert message={formError} /> : null}
      {doneMessage ? <FormAlert tone="success" message={doneMessage} /> : null}

      <Controller
        control={control}
        name="token"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Mã đặt lại"
            placeholder="Dán mã token"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.token?.message}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        )}
      />

      <Controller
        control={control}
        name="newPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            ref={passwordRef}
            label="Mật khẩu mới"
            placeholder="Tối thiểu 6 ký tự"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.newPassword?.message}
            secureToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            ref={confirmRef}
            label="Nhập lại mật khẩu mới"
            placeholder="Nhập lại mật khẩu"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirmPassword?.message}
            secureToggle
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        )}
      />

      {doneMessage ? (
        <Button label="Đăng nhập với mật khẩu mới" onPress={() => router.replace('/login')} />
      ) : (
        <Button label="Đặt lại mật khẩu" loadingLabel="Đang cập nhật…" loading={isSubmitting} onPress={onSubmit} />
      )}
    </AuthScreen>
  );
}
