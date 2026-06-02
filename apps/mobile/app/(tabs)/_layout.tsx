import { Redirect, Tabs } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";

export default function TabsLayout() {
  const onboardedAt = useAuthStore((s) => s.onboardedAt);
  const trialExpired = useAuthStore((s) => s.trialExpired());
  if (!onboardedAt) return <Redirect href="/(auth)" />;
  if (trialExpired) return <Redirect href="/(auth)/trial-expired" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0E0F14",
          borderTopColor: "#2A2E3A",
        },
        tabBarActiveTintColor: "#F5F7FB",
        tabBarInactiveTintColor: "#4A5060",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="habits" options={{ title: "Habits" }} />
      <Tabs.Screen name="coach" options={{ title: "Coach" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="ranks" options={{ title: "Ranks" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
