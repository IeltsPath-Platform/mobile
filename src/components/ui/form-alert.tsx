import { View } from 'react-native';
import { CircleAlert, CircleCheck } from 'lucide-react-native';

import { colors } from '@/src/theme';

import { Text } from './text';

type FormAlertProps = {
  message: string;
  tone?: 'error' | 'success';
};

export function FormAlert({ message, tone = 'error' }: FormAlertProps) {
  const isError = tone === 'error';

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      className={`flex-row items-start gap-2 rounded-xl border px-3.5 py-3 ${
        isError ? 'border-danger/20 bg-danger-soft' : 'border-success/20 bg-success-soft'
      }`}>
      {isError ? (
        <CircleAlert size={18} color={colors.danger} />
      ) : (
        <CircleCheck size={18} color={colors.success} />
      )}
      <Text className={`flex-1 text-sm ${isError ? 'text-danger' : 'text-success'}`}>{message}</Text>
    </View>
  );
}
