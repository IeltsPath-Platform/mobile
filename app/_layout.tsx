import { BeVietnamPro_400Regular } from "@expo-google-fonts/be-vietnam-pro/400Regular";
import { BeVietnamPro_500Medium } from "@expo-google-fonts/be-vietnam-pro/500Medium";
import { BeVietnamPro_600SemiBold } from "@expo-google-fonts/be-vietnam-pro/600SemiBold";
import { BeVietnamPro_700Bold } from "@expo-google-fonts/be-vietnam-pro/700Bold";
import { BeVietnamPro_800ExtraBold } from "@expo-google-fonts/be-vietnam-pro/800ExtraBold";
import { BeVietnamPro_900Black } from "@expo-google-fonts/be-vietnam-pro/900Black";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, Image, View } from "react-native";
import { focusManager } from "@tanstack/react-query";
import "react-native-reanimated";
import "../global.css";

import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import { AuthProvider, useAuth } from "@/src/features/auth/auth-provider";
import { useOnboarding } from "@/src/features/onboarding/use-onboarding";
import { AUTH_ENABLED } from "@/src/lib/env";
import { queryClient } from "@/src/lib/query-client";
import { AppThemeProvider } from "@/src/theme/app-theme";
import { colors } from "@/src/theme";

const SPLASH = colors.accent;

// Do not block first paint on fonts — returning null left a blank cream screen on web/SSR.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = {
  initialRouteName: "welcome",
};

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-canvas px-6">
      <Text weight="extrabold" className="text-center text-xl">
        Không thể tải không gian học tập
      </Text>
      <Button label="Tải lại" onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    BeVietnamPro_800ExtraBold,
    BeVietnamPro_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  // Fail-safe: never leave the splash up if font loading stalls.
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    focusManager.setFocused(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const { ready, onboarded } = useOnboarding();
  const isAuthenticated = status === "authenticated";

  if (!ready || (AUTH_ENABLED && status === "loading")) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: SPLASH }}
      >
        <StatusBar style="light" />
        <Image
          source={require("@/assets/images/owl/hero-cheer.png")}
          style={{ width: 220, height: 220 }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Text
          weight="black"
          className="mt-1 text-4xl"
          style={{ color: "#ffffff", letterSpacing: -1 }}
        >
          ieltspath
        </Text>
      </View>
    );
  }

  const enterApp =
    (AUTH_ENABLED && isAuthenticated) || (!AUTH_ENABLED && onboarded);

  return (
    <>
      <StatusBar style={enterApp ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Protected guard={!enterApp}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={enterApp}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="progress" />
          <Stack.Screen name="games" />
          <Stack.Screen name="learn" options={{ headerShown: false }} />
          <Stack.Screen name="flashcards" options={{ headerShown: false }} />
          <Stack.Screen name="community/[postId]" options={{ headerShown: false }} />
          <Stack.Screen name="community/bookmarked" options={{ headerShown: false }} />
          <Stack.Screen name="community/users/[userId]" options={{ headerShown: false }} />
          <Stack.Screen name="community/notifications" options={{ headerShown: false }} />
          <Stack.Screen name="community/notification-preferences" options={{ headerShown: false }} />
          <Stack.Screen name="community/composer" options={{ headerShown: false, presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Screen
          name="+not-found"
          options={{ headerShown: true, title: "Không tìm thấy" }}
        />
      </Stack>
    </>
  );
}
