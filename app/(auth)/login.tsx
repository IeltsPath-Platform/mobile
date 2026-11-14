import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View, type TextInputInstance } from 'react-native';

import { ApiError } from '@/src/lib/api-client';
import { haptics } from '@/src/lib/haptics';
import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { TextField } from '@/src/components/ui/text-field';
import { useAuth } from '@/src/features/auth/auth-provider';
import { AuthLink } from '@/src/features/auth/components/auth-link';
import { AuthScreen } from '@/src/features/auth/components/auth-screen';
import { GoogleSignInButton } from '@/src/features/auth/components/google-sign-in-button';
import { applyApiError } from '@/src/features/auth/form-errors';
import { loginSchema, type LoginInput } from '@/src/features/auth/schemas';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const passwordRef = useRef<TextInputInstance>(null);

  // A 429 carries Retry-After; disable the button until it elapses instead of letting the user hammer the endpoint.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values);
    } catch (error) {
      haptics.error();
      if (error instanceof ApiError && error.status === 429 && error.retryAfterSeconds) setCooldown(error.retryAfterSeconds);
      setFormError(applyApiError(error, setError, ['email', 'password']));
    }
  });

  return (
    <AuthScreen
      title="Đăng nhập"
      footer={<AuthLink prompt="Chưa có tài khoản?" label="Đăng ký" href="/register" />}>
      {formError ? <FormAlert message={formError} /> : null}

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
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            ref={passwordRef}
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            secureToggle
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void onSubmit()}
          />
        )}
      />

      <View className="items-end">
        <AuthLink label="Quên mật khẩu?" href="/forgot-password" replace={false} />
      </View>

      <Button
        label={cooldown > 0 ? `Thử lại sau ${cooldown}s` : 'Đăng nhập'}
        loadingLabel="Đang vào học…"
        loading={isSubmitting}
        disabled={cooldown > 0}
        onPress={() => void onSubmit()}
      />
      <GoogleSignInButton />
    </AuthScreen>
  );
}
