import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { TextField } from '@/src/components/ui/text-field';
import { authApi } from '@/src/features/auth/api';
import { AuthLink } from '@/src/features/auth/components/auth-link';
import { AuthScreen } from '@/src/features/auth/components/auth-screen';
import { applyApiError } from '@/src/features/auth/form-errors';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/src/features/auth/schemas';

export default function ForgotPasswordScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    setSentMessage(null);
    try {
      const response = await authApi.forgotPassword(email.trim());
      setSentMessage(response.message);
    } catch (error) {
      setFormError(applyApiError(error, setError, ['email']));
    }
  });

  return (
    <AuthScreen
      eyebrow="Khôi phục tài khoản"
      title="Quên mật khẩu"
      description="Nhập email đã đăng ký, chúng tôi sẽ gửi mã đặt lại mật khẩu."
      footer={<AuthLink prompt="Nhớ ra rồi?" label="Đăng nhập" href="/login" />}>
      {formError ? <FormAlert message={formError} /> : null}
      {sentMessage ? <FormAlert tone="success" message={sentMessage} /> : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Email"
            placeholder="ban@email.com"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={onSubmit}
          />
        )}
      />

      <Button label="Gửi mã đặt lại" loadingLabel="Đang gửi…" loading={isSubmitting} onPress={onSubmit} />
      {sentMessage ? (
        <Button variant="secondary" label="Tôi đã có mã" onPress={() => router.push('/reset-password')} />
      ) : null}
    </AuthScreen>
  );
}
