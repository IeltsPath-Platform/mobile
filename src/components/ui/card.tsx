import { View, type ViewProps } from 'react-native';

type CardProps = ViewProps & {
  className?: string;
};

export function Card({ className, style, ...props }: CardProps) {
  return (
    <View
      className={`rounded-3xl border border-line bg-surface p-5 ${className ?? ''}`}
      style={[cardShadow, style]}
      {...props}
    />
  );
}

const cardShadow = {
  shadowColor: '#273858',
  shadowOpacity: 0.045,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 5 },
  elevation: 1,
};
