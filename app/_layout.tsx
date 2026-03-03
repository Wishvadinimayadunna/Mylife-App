import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { isAuthenticated } from "@/services/authService";
import { useAppStore } from "@/store/appStore";

// Disable expo-updates completely
if (__DEV__) {
  try {
    // @ts-ignore
    global.__expo_updates_enabled = false;
  } catch (e) {
    // Ignore
  }
}

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { setAuth, setIsInitialized } = useAppStore();

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();

      if (authenticated) {
        // User is authenticated - restore session
        const AsyncStorage = (
          await import("@react-native-async-storage/async-storage")
        ).default;
        const token = await AsyncStorage.getItem("authToken");
        const userId = await AsyncStorage.getItem("userId");
        if (token && userId) {
          setAuth(token, userId);
        }
      }

      setIsInitialized(true);
    };

    checkAuth();
  }, []);

  // Route protection
  useEffect(() => {
    const checkRoute = async () => {
      const authenticated = await isAuthenticated();
      const inAuthGroup = segments[0] === "auth";

      if (!authenticated && !inAuthGroup && segments[0] !== undefined) {
        // User not authenticated and trying to access protected route
        router.replace("/auth/login");
      } else if (authenticated && inAuthGroup) {
        // User authenticated but on auth screen
        router.replace("/(tabs)");
      }
    };

    checkRoute();
  }, [segments]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
        <Stack.Screen name="family" options={{ title: "Family" }} />
        <Stack.Screen name="finance" options={{ title: "Finance" }} />
        <Stack.Screen name="shopping" options={{ title: "Shopping" }} />
        <Stack.Screen
          name="future-event"
          options={{ title: "Future Events" }}
        />
        <Stack.Screen name="todo" options={{ title: "Todo" }} />
        <Stack.Screen name="health" options={{ title: "Health" }} />
        <Stack.Screen name="utility" options={{ title: "Utility" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
