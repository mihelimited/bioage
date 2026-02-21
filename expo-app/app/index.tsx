import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { getUserId } from "@/lib/storage";
import { colors } from "@/lib/theme";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    getUserId().then((id) => {
      setUserId(id);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!userId) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
