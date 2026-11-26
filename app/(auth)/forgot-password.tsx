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
import { ApiError } from '@/src/lib/api-client';

// Same text whether or not the email is registered, so the screen never confirms which accounts exist.
const RESET_SENT_MESSAGE = 'Nếu email này đã đăng ký, mã đặt lại mật khẩu sẽ được gửi tới hộp thư của bạn trong vài phút.';

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
      await authApi.forgotPassword(email.trim());
      setSentMessage(RESET_SENT_MESSAGE);
    } catch (error) {
      // The backend answers 404 for an unknown email; treat it like a sent request.
      if (error instanceof ApiError && error.status === 404) setSentMessage(RESET_SENT_MESSAGE);
      else setFormError(applyApiError(error, setError, ['email']));
    }
  });

  return (
    <AuthScreen
      title="Quên mật khẩu"
      description="Nhập email đã đăng ký."
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
            onSubmitEditing={() => void onSubmit()}
          />
        )}
      />

      <Button label="Gửi mã đặt lại" loadingLabel="Đang gửi…" loading={isSubmitting} onPress={() => void onSubmit()} />
      {sentMessage ? (
        <Button variant="secondary" label="Tôi đã có mã" onPress={() => router.push('/reset-password')} />
      ) : null}
    </AuthScreen>
  );
}
