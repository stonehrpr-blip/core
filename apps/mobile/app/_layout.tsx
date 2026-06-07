import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DemoStateBar } from "@/components/dev/DemoStateBar";
import { initAuth } from "@/lib/auth-session";
import { useGameStateStore } from "@/stores/game-state-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  // Establish / restore the Supabase session and keep auth-store.userId in sync.
  // Runs alongside the local onboardedAt gate; sync stores no-op until a session.
  useEffect(() => {
    initAuth();
    // Apply passive stat decay once at launch (idempotent within a day) so stats
    // drift even if the profile tab is never opened.
    useGameStateStore.getState().applyStatTick();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#050507" }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#050507" },
              animation: "fade",
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="habit/[id]" options={{ presentation: "card" }} />
            <Stack.Screen
              name="recovery/[habitId]"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen name="scan/physique" options={{ presentation: "card" }} />
          </Stack>
          {__DEV__ && <DemoStateBar />}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
