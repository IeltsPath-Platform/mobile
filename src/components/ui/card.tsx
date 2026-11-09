import { View, type ViewProps } from 'react-native';
import { colors } from '@/src/theme';

type CardProps = ViewProps & {
  className?: string;
};

/** Tile with a 2px border and a thicker bottom edge, matching the chunky buttons. */
export function Card({ className, style, ...props }: CardProps) {
  return (
    <View
      className={`rounded-3xl bg-surface p-5 ${className ?? ''}`}
      style={[{ borderWidth: 2, borderBottomWidth: 4, borderColor: colors.line, borderBottomColor: colors.edge }, style]}
      {...props}
    />
  );
}
