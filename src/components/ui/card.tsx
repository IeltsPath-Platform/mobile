import { View, type ViewProps } from 'react-native';

type CardProps = ViewProps & {
  className?: string;
};

export function Card({ className, style, ...props }: CardProps) {
  return (
    <View
      className={`rounded-3xl border border-line border-b-4 border-b-edge bg-surface p-5 ${className ?? ''}`}
      style={[cardShadow, style]}
      {...props}
    />
  );
}

const cardShadow = {
  shadowColor: '#1c1917',
  shadowOpacity: 0.05,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 1,
};
