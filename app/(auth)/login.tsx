import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/button';
import { FormAlert } from '@/src/components/ui/form-alert';
import { TextField } from '@/src/components/ui/text-field';
import { useAuth } from '@/src/features/auth/auth-provider';
import { AuthLink } from '@/src/features/auth/components/auth-link';
import { AuthScreen } from '@/src/features/auth/components/auth-screen';
import { applyApiError } from '@/src/features/auth/form-errors';
import { loginSchema, type LoginInput } from '@/src/features/auth/schemas';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

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
      setFormError(applyApiError(error, setError, ['email', 'password']));
    }
  });

  return (
    <AuthScreen
      showIntro
      eyebrow="Chào mừng trở lại"
      title="Tiếp tục lộ trình của bạn"
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
            onSubmitEditing={onSubmit}
          />
        )}
      />

      <View className="items-end">
        <AuthLink label="Quên mật khẩu?" href="/forgot-password" replace={false} />
      </View>

      <Button label="Vào không gian học" loadingLabel="Đang vào học…" loading={isSubmitting} onPress={onSubmit} />
    </AuthScreen>
  );
}
