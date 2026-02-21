import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { getUserId, clearUserId } from "@/lib/storage";
import { apiGet } from "@/lib/api";
import { colors } from "@/lib/theme";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserIdState] = useState<number | null>(null);

  useEffect(() => {
    getUserId()
      .then(async (id) => {
        if (id) {
          try {
            await apiGet(`/api/users/${id}`);
            setUserIdState(id);
          } catch {
            await clearUserId();
            setUserIdState(null);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (userId) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
