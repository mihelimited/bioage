import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Switch, Modal, Pressable, StyleSheet, ActivityIndicator, Platform, Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Target, Bell, ShieldAlert, ChevronRight, Activity, Heart, RefreshCw } from "lucide-react-native";
import { colors, fonts } from "@/lib/theme";
import { apiGet, apiRequest } from "@/lib/api";
import { getUserId, clearAuth } from "@/lib/storage";
import { isHealthKitAvailable, syncHealthData, getLastSyncTime } from "@/lib/healthkit";

function formatTimeSince(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<number | null>(null);
  const [showGoalSheet, setShowGoalSheet] = useState(false);
  const [showOverrideSheet, setShowOverrideSheet] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [vo2Input, setVo2Input] = useState("");
  const [hrInput, setHrInput] = useState("");
  const [hrvInput, setHrvInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const healthKitAvailable = isHealthKitAvailable();

  useEffect(() => {
    getUserId().then((id) => {
      if (!id) router.replace("/onboarding");
      else setUserId(id);
    });
    getLastSyncTime().then(setLastSync);
  }, []);

  const handleHealthSync = async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const metrics = await syncHealthData();
      if (metrics.length === 0) {
        if (Platform.OS !== "ios") {
          Alert.alert("Not Available", "Apple Health sync is only available on iOS devices.");
        } else {
          Alert.alert(
            "No Health Data Found",
            "This could mean:\n\n• Aura doesn't have permission to read Health data — open Settings → Health → Aura and enable all categories\n\n• No recent health data is available (heart rate, HRV, sleep, VO2 max)\n\n• You're running on the Simulator (no real Health data)"
          );
        }
        setSyncing(false);
        return;
      }
      await apiRequest("POST", `/api/users/${userId}/metrics/batch`, { metrics });
      queryClient.invalidateQueries({ queryKey: ["bioage", userId] });
      const syncTime = new Date().toISOString();
      setLastSync(syncTime);
      Alert.alert("Synced", `Successfully synced ${metrics.length} metrics from Apple Health.`);
    } catch (e: any) {
      console.error("Health sync error:", e);
      Alert.alert("Sync Error", e.message || "Failed to sync health data.");
    }
    setSyncing(false);
  };

  const { data: user } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => apiGet<any>(`/api/users/${userId}`),
    enabled: !!userId,
  });

  const handleSaveGoal = async () => {
    if (!goalInput || !userId) return;
    setSavingGoal(true);
    try {
      await apiRequest("PATCH", `/api/users/${userId}/goal`, {
        bioAgeTarget: parseFloat(goalInput),
      });
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      setShowGoalSheet(false);
    } catch (e) {
      console.error(e);
    }
    setSavingGoal(false);
  };

  const handleSaveOverrides = async () => {
    if (!userId) return;
    setSavingOverrides(true);
    try {
      const metrics = [];
      if (vo2Input) metrics.push({ category: "fitness", metricKey: "vo2_max", value: parseFloat(vo2Input), unit: "ml/kg/min", isOverride: true });
      if (hrInput) metrics.push({ category: "autonomic", metricKey: "resting_hr", value: parseFloat(hrInput), unit: "bpm", isOverride: true });
      if (hrvInput) metrics.push({ category: "autonomic", metricKey: "hrv", value: parseFloat(hrvInput), unit: "ms", isOverride: true });
      for (const m of metrics) {
        await apiRequest("POST", `/api/users/${userId}/metrics`, m);
      }
      queryClient.invalidateQueries({ queryKey: ["bioage", userId] });
      setShowOverrideSheet(false);
      setVo2Input("");
      setHrInput("");
      setHrvInput("");
    } catch (e) {
      console.error(e);
    }
    setSavingOverrides(false);
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (!userId) return;
    try {
      await apiRequest("PATCH", `/api/users/${userId}/notifications`, {
        weeklyNotifications: value,
      });
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await clearAuth();
    router.replace("/onboarding");
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Settings</Text>

        <Text style={s.sectionLabel}>YOUR GOAL</Text>
        <TouchableOpacity style={s.card} onPress={() => { setGoalInput(String(user?.bioAgeTarget || "")); setShowGoalSheet(true); }} testID="button-goal">
          <View style={s.cardRow}>
            <View style={[s.iconCircle, { backgroundColor: "rgba(242,191,176,0.15)" }]}>
              <Target size={20} color={colors.primary} />
            </View>
            <View style={s.cardContent}>
              <Text style={s.cardTitle}>BioAge Target</Text>
              <Text style={s.cardSub}>Currently aiming for {user?.bioAgeTarget || "not set"}</Text>
            </View>
            <ChevronRight size={20} color="rgba(0,0,0,0.15)" />
          </View>
        </TouchableOpacity>

        <Text style={s.sectionLabel}>DATA & OVERRIDES</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={[s.cardRow, s.cardRowBorder]}
            onPress={handleHealthSync}
            disabled={syncing}
            testID="button-health-sync"
          >
            <View style={[s.iconCircle, { backgroundColor: colors.red50 }]}>
              <Heart size={20} color={colors.rose500} />
            </View>
            <View style={s.cardContent}>
              <Text style={s.cardTitle}>Apple Health</Text>
              <Text style={s.cardSub}>
                {!healthKitAvailable
                  ? "Available on iOS device"
                  : lastSync
                  ? `Last synced ${formatTimeSince(lastSync)}`
                  : "Tap to sync your health data"}
              </Text>
            </View>
            {syncing ? (
              <ActivityIndicator size="small" color={colors.rose500} />
            ) : (
              <RefreshCw size={18} color="rgba(0,0,0,0.2)" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.cardRow} onPress={() => setShowOverrideSheet(true)} testID="button-overrides">
            <View style={[s.iconCircle, { backgroundColor: colors.orange50 }]}>
              <ShieldAlert size={20} color={colors.orange600} />
            </View>
            <View style={s.cardContent}>
              <Text style={s.cardTitle}>Lab Data Overrides</Text>
              <Text style={s.cardSub}>Input verified VO2 Max, etc.</Text>
            </View>
            <ChevronRight size={20} color="rgba(0,0,0,0.15)" />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLabel}>PREFERENCES</Text>
        <View style={s.card}>
          <View style={s.cardRow}>
            <View style={[s.iconCircle, { backgroundColor: colors.blue50 }]}>
              <Bell size={20} color={colors.blue600} />
            </View>
            <View style={s.cardContent}>
              <Text style={s.cardTitle}>Weekly Summary</Text>
              <Text style={s.cardSub}>Push notifications</Text>
            </View>
            <Switch
              value={user?.weeklyNotifications ?? true}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.white}
              testID="switch-notifications"
            />
          </View>
        </View>

        <TouchableOpacity style={s.logoutButton} onPress={handleLogout} testID="button-logout">
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showGoalSheet} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={s.overlay} onPress={() => setShowGoalSheet(false)}>
            <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>Set BioAge Goal</Text>
              <Text style={s.sheetDesc}>What biological age are you aiming for?</Text>
              <TextInput
                style={s.sheetInput}
                keyboardType="numeric"
                placeholder="e.g. 25"
                placeholderTextColor={colors.mutedForeground}
                value={goalInput}
                onChangeText={setGoalInput}
                testID="input-goal"
              />
              <TouchableOpacity style={s.sheetCta} onPress={handleSaveGoal} disabled={savingGoal}>
                {savingGoal ? <ActivityIndicator color={colors.white} /> : <Text style={s.sheetCtaText}>Save Goal</Text>}
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showOverrideSheet} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={s.overlay} onPress={() => setShowOverrideSheet(false)}>
            <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>Lab Data Overrides</Text>
              <Text style={s.sheetDesc}>Enter lab-verified values to improve accuracy.</Text>
              <View style={s.overrideFields}>
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>VO2 Max (ml/kg/min)</Text>
                  <TextInput style={s.sheetInput} keyboardType="numeric" placeholder="e.g. 45" placeholderTextColor={colors.mutedForeground} value={vo2Input} onChangeText={setVo2Input} testID="input-vo2" />
                </View>
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Resting HR (bpm)</Text>
                  <TextInput style={s.sheetInput} keyboardType="numeric" placeholder="e.g. 54" placeholderTextColor={colors.mutedForeground} value={hrInput} onChangeText={setHrInput} testID="input-hr" />
                </View>
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>HRV (ms)</Text>
                  <TextInput style={s.sheetInput} keyboardType="numeric" placeholder="e.g. 68" placeholderTextColor={colors.mutedForeground} value={hrvInput} onChangeText={setHrvInput} testID="input-hrv" />
                </View>
              </View>
              <TouchableOpacity style={s.sheetCta} onPress={handleSaveOverrides} disabled={savingOverrides}>
                {savingOverrides ? <ActivityIndicator color={colors.white} /> : <Text style={s.sheetCtaText}>Save Overrides</Text>}
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 24, paddingTop: 16 },
  pageTitle: { fontFamily: fonts.serif, fontSize: 28, color: colors.foreground, marginBottom: 24 },
  sectionLabel: {
    fontFamily: fonts.sansMedium, fontSize: 12, color: colors.mutedForeground,
    letterSpacing: 1, marginBottom: 8, marginLeft: 4, marginTop: 8,
  },
  card: {
    backgroundColor: colors.white, borderRadius: 24,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    marginBottom: 16, overflow: "hidden",
  },
  cardRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  cardRowBorder: { borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.05)" },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  cardContent: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.foreground },
  cardSub: { fontFamily: fonts.sans, fontSize: 13, color: colors.mutedForeground },
  logoutButton: {
    backgroundColor: colors.red50, borderRadius: 20, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
  },
  logoutText: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.red500 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.1)" },
  sheet: {
    backgroundColor: "rgba(255,255,255,0.95)", borderTopLeftRadius: 36, borderTopRightRadius: 36,
    padding: 32, paddingBottom: 40,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  sheetHandle: { width: 48, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.1)", alignSelf: "center", marginBottom: 24 },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 24, color: colors.foreground, marginBottom: 8 },
  sheetDesc: { fontFamily: fonts.sans, fontSize: 14, color: colors.mutedForeground, marginBottom: 20 },
  sheetInput: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14,
    fontFamily: fonts.sansMedium, fontSize: 18, color: colors.foreground,
  },
  sheetCta: {
    backgroundColor: colors.foreground, borderRadius: 9999, paddingVertical: 16,
    alignItems: "center", marginTop: 20,
  },
  sheetCtaText: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.white },
  overrideFields: { gap: 16, marginBottom: 8 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.mutedForeground, marginLeft: 4 },
});
