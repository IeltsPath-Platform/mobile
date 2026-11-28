import { BeVietnamPro_400Regular } from "@expo-google-fonts/be-vietnam-pro/400Regular";
import { BeVietnamPro_500Medium } from "@expo-google-fonts/be-vietnam-pro/500Medium";
import { BeVietnamPro_600SemiBold } from "@expo-google-fonts/be-vietnam-pro/600SemiBold";
import { BeVietnamPro_700Bold } from "@expo-google-fonts/be-vietnam-pro/700Bold";
import { BeVietnamPro_800ExtraBold } from "@expo-google-fonts/be-vietnam-pro/800ExtraBold";
import { BeVietnamPro_900Black } from "@expo-google-fonts/be-vietnam-pro/900Black";
import { QueryClientProvider , focusManager } from "@tanstack/react-query";
import { Stack, type ErrorBoundaryProps, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, Image, View } from "react-native";
import "react-native-reanimated";
import "../global.css";

import { Button } from "@/src/components/ui/button";
import { Text } from "@/src/components/ui/text";
import { AuthProvider, useAuth } from "@/src/features/auth/auth-provider";
import { useOnboarding } from "@/src/features/onboarding/use-onboarding";
import { AUTH_ENABLED } from "@/src/lib/env";
import { queryClient } from "@/src/lib/query-client";
import { ThemeSheetHost } from "@/src/features/settings/components/theme-sheet";
import { AppThemeProvider, rootScreenLayout } from "@/src/theme/app-theme";
import { colors } from "@/src/theme";
import { getNotificationRoute } from "@/src/features/community/push-notifications";
import { unreadQueryKey } from "@/src/features/community/use-unread";

const SPLASH = colors.accent;

// Mobile currently has no notification WebSocket subscription, so keep the native foreground banner visible.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Do not block first paint on fonts — returning null left a blank cream screen on web/SSR.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = {
  anchor: "welcome",
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

  // The app is drawn only once the fonts are in: text measured with the fallback font keeps that narrower width after the
  // real font arrives, and single-line labels come out clipped ("Bắt" for "Bắt đầu"). The splash stays up meanwhile.
  const [fontWaitOver, setFontWaitOver] = useState(false);
  const ready = fontsLoaded || Boolean(fontError) || fontWaitOver;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Fail-safe: never leave the splash up if font loading stalls.
  useEffect(() => {
    const timer = setTimeout(() => setFontWaitOver(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    focusManager.setFocused(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    return () => subscription.remove();
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <ThemeSheetHost />
      </AppThemeProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const router = useRouter();
  const { status } = useAuth();
  const { ready, onboarded } = useOnboarding();
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    // `ready`: on a cold start the navigator is not mounted yet and a push now would be lost.
    if (!isAuthenticated || !ready) return;
    let handledResponseKey: string | undefined;
    const openNotification = (response: Notifications.NotificationResponse) => {
      const responseKey = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handledResponseKey === responseKey) return;
      handledResponseKey = responseKey;
      const data = response.notification.request.content.data as Record<string, unknown>;
      router.push(getNotificationRoute(data) as never);
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    // A push that arrives with the app open refreshes the badge and the list at once, so the count needs no fast polling.
    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: unreadQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["community", "notifications"] });
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openNotification(response);
    }).catch(() => undefined);
    return () => { subscription.remove(); received.remove(); };
  }, [isAuthenticated, ready, router]);

  if (!ready || (AUTH_ENABLED && status === "loading")) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: SPLASH }}
      >
        <StatusBar style="light" />
        <Image
          source={require("@/assets/images/owl/hero-cheer-raster.png")}
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
      <Stack
        screenLayout={rootScreenLayout}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
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
          <Stack.Screen name="achievements" />
          <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
          <Stack.Screen name="profile/change-password" options={{ headerShown: false }} />
          <Stack.Screen name="profile/delete-account" options={{ headerShown: false }} />
          <Stack.Screen name="profile/verify-email" options={{ headerShown: false }} />
          <Stack.Screen name="profile/sessions" options={{ headerShown: false }} />
          <Stack.Screen name="games" />
          <Stack.Screen name="practice" options={{ headerShown: false }} />
          <Stack.Screen name="placement" options={{ headerShown: false }} />
          <Stack.Screen name="flashcards" options={{ headerShown: false }} />
          <Stack.Screen name="community/[postId]" options={{ headerShown: false }} />
          <Stack.Screen name="community/bookmarked" options={{ headerShown: false }} />
          <Stack.Screen name="community/blocked" options={{ headerShown: false }} />
          <Stack.Screen name="community/users/[userId]" options={{ headerShown: false }} />
          <Stack.Screen name="community/notifications" options={{ headerShown: false }} />
          <Stack.Screen name="community/notification-preferences" options={{ headerShown: false }} />
          <Stack.Screen name="community/composer" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        </Stack.Protected>
        <Stack.Screen
          name="+not-found"
          options={{ headerShown: true, title: "Không tìm thấy" }}
        />
      </Stack>
    </>
  );
}
