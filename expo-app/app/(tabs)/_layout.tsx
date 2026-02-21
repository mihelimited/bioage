import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { Activity, MessageCircle, Settings } from "lucide-react-native";
import { colors, fonts } from "@/lib/theme";

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

export default function TabLayout() {
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
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <View style={[s.chatIcon, chatShadow as any]}>
              <MessageCircle size={22} color={colors.white} />
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
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -20,
    backgroundColor: colors.primary,
  },
});
