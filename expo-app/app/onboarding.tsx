import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Animated as RNAnimated,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Heart, ChevronRight, Activity } from "lucide-react-native";
import { colors, fonts, radii } from "@/lib/theme";
import { apiRequest } from "@/lib/api";
import { setAuth } from "@/lib/storage";
import { syncHealthData, HealthKitMetric } from "@/lib/healthkit";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const steps = [
  { id: "intro", title: "Welcome to Aura" },
  { id: "basics", title: "The Basics" },
  { id: "metrics", title: "Your Body" },
  { id: "sync", title: "Connect Data" },
];

function parseErrorMessage(e: any): string {
  const raw = e?.message ?? "Something went wrong";

  // Catch JSON parsing failures (server returned HTML instead of JSON)
  if (raw.includes("JSON Parse error") || raw.includes("Unexpected token")) {
    return "Server is temporarily unavailable. Please try again later.";
  }

  // apiRequest throws "STATUS: body" — try to extract JSON error
  const match = raw.match(/^\d+:\s*(.+)/s);
  if (match) {
    const body = match[1];
    // If the body looks like HTML, don't show it
    if (body.trimStart().startsWith("<")) {
      return "Server is temporarily unavailable. Please try again later.";
    }
    try {
      const parsed = JSON.parse(body);
      if (parsed.error) return parsed.error;
    } catch {}
    // Truncate long non-JSON bodies (HTML pages etc)
    return body.length > 200 ? body.slice(0, 200) + "…" : body;
  }
  return raw;
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female">("female");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;

  const useNative = Platform.OS !== "web";

  const animateStep = (next: number) => {
    RNAnimated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: useNative }).start(() => {
      setCurrentStep(next);
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: useNative }).start();
    });
  };

  const seedMetrics: HealthKitMetric[] = [
    { category: "autonomic", metricKey: "resting_hr", value: 58, unit: "bpm" },
    { category: "autonomic", metricKey: "hrv", value: 55, unit: "ms" },
    { category: "fitness", metricKey: "vo2_max", value: 42, unit: "ml/kg/min" },
    { category: "sleep", metricKey: "sleep_duration", value: 7.5, unit: "hrs" },
    { category: "sleep", metricKey: "sleep_efficiency", value: 88, unit: "%" },
    { category: "mobility", metricKey: "walking_speed", value: 1.35, unit: "m/s" },
  ];

  const registerAndPostMetrics = async (metrics: HealthKitMetric[]) => {
    const heightCm = parseFloat(height) || 170;
    const weightKg = parseFloat(weight) || 65;
    const userAge = parseInt(age) || 30;

    const res = await apiRequest("POST", "/api/auth/register", {
      email: email.trim().toLowerCase(),
      password,
      age: userAge,
      sex,
      heightCm,
      weightKg,
      onboardingComplete: true,
    });
    const { user, token } = await res.json();
    await setAuth(user.id, token);

    await apiRequest("POST", `/api/users/${user.id}/metrics/batch`, { metrics });

    router.replace("/(tabs)");
  };

  const handleFinishWithSeedData = async () => {
    setLoading(true);
    setError("");
    try {
      await registerAndPostMetrics(seedMetrics);
    } catch (e: any) {
      const msg = parseErrorMessage(e);
      setError(msg);
      Alert.alert("Couldn't finish setup", msg);
      setLoading(false);
    }
  };

  const handleFinishWithHealthKit = async () => {
    setLoading(true);
    setError("");
    try {
      const realMetrics = await syncHealthData();
      if (realMetrics.length > 0) {
        await registerAndPostMetrics(realMetrics);
      } else {
        // HealthKit returned nothing — tell user, fall back to seed data
        Alert.alert(
          "No Health Data Found",
          "We couldn't read data from Apple Health. This can happen if permissions weren't granted or no data is available yet.\n\nWe'll start you off with sample data — you can sync Apple Health anytime from Settings.",
          [
            {
              text: "Continue with sample data",
              onPress: async () => {
                try {
                  await registerAndPostMetrics(seedMetrics);
                } catch (e2: any) {
                  const msg = parseErrorMessage(e2);
                  setError(msg);
                  Alert.alert("Couldn't finish setup", msg);
                  setLoading(false);
                }
              },
            },
          ],
        );
        setLoading(false);
      }
    } catch (e: any) {
      const msg = parseErrorMessage(e);
      setError(msg);
      Alert.alert("Couldn't finish setup", msg);
      setLoading(false);
    }
  };

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 0: return true; // Intro — always valid
      case 1: // Account: email, password, age required
        return email.trim().length > 0 && password.length >= 8 && age.trim().length > 0;
      case 2: // Body: height and weight required
        return height.trim().length > 0 && weight.trim().length > 0;
      case 3: return true; // Sync — always valid
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateStep(currentStep + 1);
    } else {
      handleFinishWithHealthKit();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={[s.container, { paddingTop: insets.top + 16 }]}>
      <View style={s.progressRow}>
        {steps.map((_, idx) => (
          <View key={idx} style={s.progressTrack}>
            <View style={[s.progressFill, { width: idx <= currentStep ? "100%" : "0%" }]} />
          </View>
        ))}
      </View>

      <RNAnimated.View style={[s.content, { opacity: fadeAnim }]}>
        {currentStep === 0 && (
          <View style={s.centeredContent}>
            <View style={s.introIcon}>
              <Heart size={40} color={colors.white} />
            </View>
            <Text style={s.heroTitle}>{"Discover your\ntrue age."}</Text>
            <Text style={s.heroSubtitle}>
              Aura analyzes your health data to calculate how fast your body is actually aging.
            </Text>
          </View>
        )}

        {currentStep === 1 && (
          <View style={s.formContent}>
            <Text style={s.stepTitle}>Create your account.</Text>
            <Text style={s.stepSubtitle}>We'll use this to keep your data safe.</Text>
            <View style={s.fieldGroup}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                testID="input-email"
              />
            </View>
            <View style={s.fieldGroup}>
              <Text style={s.label}>Password</Text>
              <TextInput
                style={s.input}
                secureTextEntry
                autoComplete="new-password"
                placeholder="8+ characters"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                testID="input-password"
              />
            </View>
            <View style={s.fieldGroup}>
              <Text style={s.label}>Chronological Age</Text>
              <TextInput
                style={s.input}
                keyboardType="number-pad"
                placeholder="e.g. 32"
                placeholderTextColor={colors.mutedForeground}
                value={age}
                onChangeText={setAge}
                testID="input-age"
              />
            </View>
            <View style={s.fieldGroup}>
              <Text style={s.label}>Biological Sex</Text>
              <View style={s.sexRow}>
                <TouchableOpacity
                  style={[s.sexButton, sex === "female" && s.sexButtonActive]}
                  onPress={() => setSex("female")}
                  testID="button-sex-female"
                >
                  <Text style={[s.sexButtonText, sex === "female" && s.sexButtonTextActive]}>Female</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.sexButton, sex === "male" && s.sexButtonActive]}
                  onPress={() => setSex("male")}
                  testID="button-sex-male"
                >
                  <Text style={[s.sexButtonText, sex === "male" && s.sexButtonTextActive]}>Male</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {currentStep === 2 && (
          <View style={s.formContent}>
            <Text style={s.stepTitle}>Your body composition.</Text>
            <Text style={s.stepSubtitle}>For more accurate metabolic estimations.</Text>
            <View style={s.fieldGroup}>
              <Text style={s.label}>Height</Text>
              <View style={s.inputWithUnit}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  keyboardType="number-pad"
                  placeholder="170"
                  placeholderTextColor={colors.mutedForeground}
                  value={height}
                  onChangeText={setHeight}
                  testID="input-height"
                />
                <Text style={s.unitText}>cm</Text>
              </View>
            </View>
            <View style={s.fieldGroup}>
              <Text style={s.label}>Weight</Text>
              <View style={s.inputWithUnit}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  keyboardType="number-pad"
                  placeholder="65"
                  placeholderTextColor={colors.mutedForeground}
                  value={weight}
                  onChangeText={setWeight}
                  testID="input-weight"
                />
                <Text style={s.unitText}>kg</Text>
              </View>
            </View>
          </View>
        )}

        {currentStep === 3 && (
          <View style={s.centeredContent}>
            <View style={s.syncIcon}>
              <Activity size={40} color={colors.white} />
            </View>
            <Text style={s.stepTitle}>Sync Health Data</Text>
            <Text style={[s.stepSubtitle, { textAlign: "center", paddingHorizontal: 16 }]}>
              Aura needs access to your sleep, activity, heart rate, and VO2 max to calculate your pace of aging.
            </Text>
            <View style={s.syncCard}>
              <View style={s.syncRow}>
                <View style={[s.syncDot, { backgroundColor: colors.blue50 }]}>
                  <Activity size={16} color={colors.blue500} />
                </View>
                <Text style={s.syncLabel}>Activity & Workouts</Text>
              </View>
              <View style={s.syncRow}>
                <View style={[s.syncDot, { backgroundColor: colors.red50 }]}>
                  <Heart size={16} color={colors.red500} />
                </View>
                <Text style={s.syncLabel}>Heart Rate & HRV</Text>
              </View>
            </View>
          </View>
        )}
      </RNAnimated.View>

      <View style={[s.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
        {error ? <Text style={s.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[s.ctaButton, (!isStepValid() || loading) && s.ctaButtonDisabled]}
          onPress={handleNext}
          disabled={loading || !isStepValid()}
          activeOpacity={0.85}
          testID="button-next"
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={s.ctaText}>
                {currentStep === 0 ? "Get Started" : currentStep === steps.length - 1 ? "Connect & Finish" : "Continue"}
              </Text>
              <ChevronRight size={16} color={colors.white} style={{ opacity: 0.5 }} />
            </>
          )}
        </TouchableOpacity>
        {currentStep === steps.length - 1 && !loading && (
          <TouchableOpacity
            style={s.skipButton}
            onPress={handleFinishWithSeedData}
            activeOpacity={0.7}
            testID="button-skip"
          >
            <Text style={s.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    </TouchableWithoutFeedback>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  progressRow: { flexDirection: "row", paddingHorizontal: 24, gap: 8, marginBottom: 32 },
  progressTrack: { flex: 1, height: 4, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.foreground, borderRadius: 2 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  centeredContent: { alignItems: "center", gap: 16 },
  formContent: { gap: 24 },
  introIcon: {
    width: 96, height: 96, borderRadius: 32,
    backgroundColor: colors.primary, justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 16, elevation: 8,
    transform: [{ rotate: "3deg" }],
  },
  syncIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: colors.foreground, justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 16, elevation: 8, marginBottom: 8,
  },
  heroTitle: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 44, textAlign: "center", color: colors.foreground },
  heroSubtitle: { fontFamily: fonts.sans, fontSize: 17, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 16, lineHeight: 24 },
  stepTitle: { fontFamily: fonts.serif, fontSize: 28, color: colors.foreground, lineHeight: 36 },
  stepSubtitle: { fontFamily: fonts.sans, fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.mutedForeground, marginLeft: 4 },
  fieldGroup: { gap: 8 },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16,
    fontSize: 20, fontFamily: fonts.sansMedium, color: colors.foreground,
  },
  inputWithUnit: { flexDirection: "row", alignItems: "center", position: "relative" },
  unitText: { position: "absolute", right: 20, fontFamily: fonts.sansMedium, color: colors.mutedForeground, fontSize: 16 },
  sexRow: { flexDirection: "row", gap: 12 },
  sexButton: {
    flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    borderRadius: 16, paddingVertical: 16, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  sexButtonActive: { backgroundColor: "rgba(242,191,176,0.15)", borderColor: "rgba(242,191,176,0.3)" },
  sexButtonText: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.mutedForeground },
  sexButtonTextActive: { color: colors.foreground },
  syncCard: {
    backgroundColor: colors.white, borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", width: "100%", gap: 16, marginTop: 16,
  },
  syncRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  syncDot: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  syncLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.foreground },
  bottomCta: { paddingHorizontal: 24, paddingTop: 8 },
  ctaButton: {
    backgroundColor: colors.foreground, borderRadius: 9999, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  ctaButtonDisabled: { opacity: 0.35 },
  ctaText: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.white },
  errorText: { fontFamily: fonts.sans, fontSize: 14, color: colors.red500, textAlign: "center", marginBottom: 8 },
  skipButton: { alignItems: "center", paddingVertical: 14 },
  skipText: { fontFamily: fonts.sans, fontSize: 14, color: colors.mutedForeground },
});
