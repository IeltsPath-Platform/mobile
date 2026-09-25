import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { fonts } from '@/src/theme';

export type TextWeight = keyof typeof fonts;

export type TextProps = RNTextProps & {
  weight?: TextWeight;
  className?: string;
};

// Custom font files carry their own weight, so weight maps to fontFamily instead of fontWeight.
export function Text({ weight = 'regular', className, style, ...props }: TextProps) {
  return (
    <RNText
      className={`text-ink ${className ?? ''}`}
      style={[{ fontFamily: fonts[weight] }, style]}
      maxFontSizeMultiplier={1.6}
      {...props}
    />
  );
}
