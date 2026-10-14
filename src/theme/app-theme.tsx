import { DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { View } from 'react-native';

import { useAppSettings } from '@/src/features/settings/use-app-settings';

import { darkColors, FONT_SCALE, lightColors, setActivePalette, themeVars } from './runtime';

type ThemeContextValue = {
  isDark: boolean;
  fontScale: number;
};

const ThemeContext = createContext<ThemeContextValue>({ isDark: false, fontScale: 1 });

export function useTheme() {
  return useContext(ThemeContext);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppSettings();
  const isDark = settings.theme === 'dark';
  const palette = isDark ? darkColors : lightColors;
  setActivePalette(palette);

  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: isDark,
      colors: {
        ...DefaultTheme.colors,
        primary: palette.accentDeep,
        background: palette.canvas,
        card: palette.surface,
        text: palette.ink,
        border: palette.line,
      },
    }),
    [isDark, palette],
  );

  return (
    <ThemeContext.Provider value={{ isDark, fontScale: FONT_SCALE[settings.fontSize] ?? 1 }}>
      <View style={[{ flex: 1 }, themeVars(palette, FONT_SCALE[settings.fontSize] ?? 1)]} className="flex-1 bg-canvas">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
      </View>
    </ThemeContext.Provider>
  );
}
