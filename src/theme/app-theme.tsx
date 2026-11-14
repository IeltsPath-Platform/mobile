import { DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createContext, Fragment, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme, View } from 'react-native';

import { ThemeSheetHost } from '@/src/features/settings/components/theme-sheet';
import { useAppSettings } from '@/src/features/settings/use-app-settings';

import { darkColors, FONT_SCALE, lightColors, setActivePalette, themeVars } from './runtime';

type ThemeContextValue = {
  isDark: boolean;
  fontScale: number;
  /** NativeWind CSS variables; a Modal renders outside the root View so it must re-apply them. */
  vars: ReturnType<typeof themeVars>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const FALLBACK_THEME: ThemeContextValue = { isDark: false, fontScale: 1, vars: themeVars(lightColors) };

export function useTheme() {
  return useContext(ThemeContext) ?? FALLBACK_THEME;
}

/**
 * `colors` is read at render time, so a screen that does not re-render keeps the old palette in
 * its inline styles. Keying a screen by the theme remounts only that screen (navigation state
 * stays) so every inline colour is read again after the theme changes.
 */
function ThemeKeyed({ children }: { children: ReactNode }) {
  const { isDark } = useTheme();
  return <Fragment key={isDark ? 'dark' : 'light'}>{children}</Fragment>;
}

/** `screenLayout` for navigators whose screens are leaf pages. */
export const themedScreenLayout = ({ children }: { children: ReactNode }) => <ThemeKeyed>{children}</ThemeKeyed>;

const NESTED_NAVIGATORS = new Set(['(tabs)', '(auth)', 'games', 'flashcards']);

/** Root stack variant: nested navigators re-theme their own screens, so they must not be remounted. */
export const rootScreenLayout = ({ route, children }: { route: { name: string }; children: ReactNode }) =>
  NESTED_NAVIGATORS.has(route.name) ? <>{children}</> : <ThemeKeyed>{children}</ThemeKeyed>;

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppSettings();
  const systemScheme = useColorScheme();
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && systemScheme === 'dark');
  const palette = isDark ? darkColors : lightColors;
  // Children read `colors` while rendering, so the palette must be active before they render;
  // memoising keeps this to one assignment per theme change instead of one per render.
  useMemo(() => setActivePalette(palette), [palette]);

  // Native chrome (keyboard, alerts, system sheets) follows the in-app choice. "Theo thiết bị" clears
  // the override so `useColorScheme` keeps reporting the OS value.
  useEffect(() => {
    // NativeWind owns the colour scheme on web and rejects manual overrides.
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(settings.theme === 'system' ? 'unspecified' : settings.theme);
  }, [settings.theme]);

  const fontScale = FONT_SCALE[settings.fontSize] ?? 1;
  const vars = useMemo(() => themeVars(palette, fontScale), [palette, fontScale]);
  const themeValue = useMemo(() => ({ isDark, fontScale, vars }), [isDark, fontScale, vars]);

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
    <ThemeContext.Provider value={themeValue}>
      <View style={[{ flex: 1 }, vars]} className="flex-1 bg-canvas">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
        <ThemeSheetHost />
      </View>
    </ThemeContext.Provider>
  );
}
