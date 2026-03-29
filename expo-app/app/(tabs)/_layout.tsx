import { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, MessageCircle, Settings } from "lucide-react-native";
import { colors, fonts } from "@/lib/theme";
import { isHealthKitAvailable, syncHealthData, getLastSyncTime, hasRequestedPermissions } from "@/lib/healthkit";
import { getUserId } from "@/lib/storage";
import { apiRequest } from "@/lib/api";

const tabBarShadow = Platform.select({
  web: { boxShadow: "0 8px 16px rgba(160,150,140,0.15)" },
  default: {
    shadowColor: "rgba(160,150,140,1)",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});

const chatShadow = Platform.select({
  web: { boxShadow: "0 4px 8px rgba(0,0,0,0.1)" },
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
});

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function TabLayout() {
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        if (!isHealthKitAvailable()) return;
        const requested = await hasRequestedPermissions();
        if (!requested) return; // User hasn't connected Health yet
        const userId = await getUserId();
        if (!userId) return;

        const lastSync = await getLastSyncTime();
        if (lastSync && Date.now() - new Date(lastSync).getTime() < ONE_DAY_MS) return;

        console.log("[AutoSync] Starting daily background sync");
        const metrics = await syncHealthData();
        if (metrics.length > 0) {
          await apiRequest("POST", `/api/users/${userId}/metrics/batch`, { metrics });
          queryClient.invalidateQueries({ queryKey: ["bioage", userId] });
          console.log("[AutoSync] Synced", metrics.length, "metrics");
        }
      } catch (e) {
        console.warn("[AutoSync] Failed:", e);
      }
    })();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(255,255,255,0.9)",
          borderTopWidth: 0,
          height: 88,
          paddingBottom: 24,
          paddingTop: 8,
          borderRadius: 9999,
          marginHorizontal: 24,
          marginBottom: 16,
          position: "absolute" as const,
          ...tabBarShadow,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Activity size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "",
          tabBarIcon: ({ color, size }) => (
            <View style={[s.chatIcon, chatShadow as any]}>
              <MessageCircle size={32} color={colors.white} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  chatIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -12,
    backgroundColor: colors.primary,
  },
});
