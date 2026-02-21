import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { Redirect } from "expo-router";
import { getUserId } from "@/lib/storage";
import { colors } from "@/lib/theme";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserIdState] = useState<number | null>(null);

  useEffect(() => {
    getUserId()
      .then((id) => {
        console.log("[Aura] Got userId:", id);
        setUserIdState(id);
        setLoading(false);
      })
      .catch((e) => {
        console.log("[Aura] getUserId error:", e);
        setLoading(false);
      });
  }, []);

  console.log("[Aura] Index render, loading:", loading, "userId:", userId);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color="#333" />
      </View>
    );
  }

  if (userId) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
