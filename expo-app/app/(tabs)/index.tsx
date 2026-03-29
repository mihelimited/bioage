import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, Pressable, StyleSheet, Dimensions, Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Svg, { Path } from "react-native-svg";
import {
  HeartPulse, Activity, Moon, Zap, Footprints, ChevronRight,
  TrendingDown, TrendingUp, Sparkles, Share2, Clock,
} from "lucide-react-native";
import { colors, fonts, radii } from "@/lib/theme";
import { apiGet } from "@/lib/api";
import { getUserId } from "@/lib/storage";
import { router } from "expo-router";

const DOMAIN_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  fitness: { icon: Activity, color: colors.orange500, bg: colors.orange50, label: "Fitness" },
  autonomic: { icon: HeartPulse, color: colors.rose500, bg: colors.rose50, label: "Heart & Recovery" },
  circadian: { icon: Zap, color: colors.indigo500, bg: colors.indigo50, label: "Rhythm & Routine" },
  sleep: { icon: Moon, color: colors.blue500, bg: colors.blue50, label: "Sleep" },
  mobility: { icon: Footprints, color: colors.emerald500, bg: colors.emerald50, label: "Mobility" },
};

// Reference ranges for metric spectrum (bad → average → excellent)
// Format: [excellent_low, average_low, average_high, bad_high] or inverse
interface MetricRange {
  bad: [number, number];
  average: [number, number];
  excellent: [number, number];
}
const METRIC_RANGES: Record<string, MetricRange> = {
  resting_hr: { excellent: [40, 55], average: [56, 70], bad: [71, 100] },
  hrv: { bad: [0, 25], average: [26, 50], excellent: [51, 150] },
  vo2_max: { bad: [0, 30], average: [31, 42], excellent: [43, 70] },
  sleep_duration: { bad: [0, 6], average: [6.1, 7.5], excellent: [7.6, 10] },
  sleep_efficiency: { bad: [0, 80], average: [81, 89], excellent: [90, 100] },
  sleep_midpoint_std: { excellent: [0, 0.5], average: [0.51, 1.2], bad: [1.21, 5] },
  walking_speed: { bad: [0, 1.0], average: [1.01, 1.3], excellent: [1.31, 3] },
  step_count: { bad: [0, 5000], average: [5001, 8000], excellent: [8001, 30000] },
  active_energy: { bad: [0, 200], average: [201, 400], excellent: [401, 2000] },
  rhythm_score: { bad: [0, 40], average: [41, 65], excellent: [66, 100] },
  routine_stability: { bad: [0, 35], average: [36, 60], excellent: [61, 100] },
};

function getMetricRating(key: string, value: number): "bad" | "average" | "excellent" | null {
  const range = METRIC_RANGES[key];
  if (!range) return null;
  if (value >= range.excellent[0] && value <= range.excellent[1]) return "excellent";
  if (value >= range.average[0] && value <= range.average[1]) return "average";
  if (value >= range.bad[0] && value <= range.bad[1]) return "bad";
  return null;
}

const RATING_CONFIG = {
  bad: { label: "Below avg", color: colors.destructive, bg: "rgba(248,113,113,0.1)" },
  average: { label: "Average", color: colors.amber600, bg: "rgba(217,119,6,0.1)" },
  excellent: { label: "Excellent", color: colors.green600, bg: "rgba(22,163,74,0.1)" },
};

const HIDDEN_METRICS = new Set(["sleep_midpoint_std", "sleep_efficiency"]);

const METRIC_LABELS: Record<string, string> = {
  resting_hr: "Resting HR",
  hrv: "HRV",
  hrv_cv: "HRV Consistency",
  vo2_max: "VO2 Max",
  vo2_slope: "VO2 Trend",
  step_count: "Daily Steps",
  active_energy: "Active Energy",
  sleep_duration: "Sleep Duration",
  sleep_efficiency: "Sleep Efficiency",
  sleep_midpoint_std: "Sleep Consistency",
  walking_speed: "Walking Speed",
  rhythm_score: "Rhythm Score",
  routine_stability: "Routine Stability",
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"overview" | "trends">("overview");
  const [showInsight, setShowInsight] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const animatedAge = useRef(new Animated.Value(0)).current;
  const [displayAge, setDisplayAge] = useState<number | null>(null);
  const [spectrumMetric, setSpectrumMetric] = useState<{ key: string; value: number } | null>(null);
  const [showProjection, setShowProjection] = useState(false);

  useEffect(() => {
    getUserId().then((id) => {
      if (!id) router.replace("/onboarding");
      else setUserId(id);
    });
  }, []);

  const { data: bioage, isLoading } = useQuery({
    queryKey: ["bioage", userId],
    queryFn: () => apiGet<any>(`/api/users/${userId}/bioage`),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!bioage?.bioAge) return;
    const newAge = bioage.bioAge;
    (async () => {
      const stored = await AsyncStorage.getItem("aura_last_bioage");
      const oldAge = stored ? parseFloat(stored) : newAge;
      animatedAge.setValue(oldAge);
      Animated.timing(animatedAge, {
        toValue: newAge,
        duration: 1500,
        useNativeDriver: false,
      }).start();
      const listenerId = animatedAge.addListener(({ value }) => setDisplayAge(Math.round(value * 10) / 10));
      await AsyncStorage.setItem("aura_last_bioage", String(newAge));
      return () => animatedAge.removeListener(listenerId);
    })();
  }, [bioage?.bioAge]);

  const { data: history } = useQuery({
    queryKey: ["bioage-history", userId],
    queryFn: () => apiGet<any[]>(`/api/users/${userId}/bioage/history`),
    enabled: !!userId,
  });

  const { data: metricAverages } = useQuery({
    queryKey: ["metric-averages", userId],
    queryFn: () => apiGet<Record<string, { week: number | null; month: number | null; sixMonth: number | null }>>(`/api/users/${userId}/metrics/averages`),
    enabled: !!userId,
  });

  if (!userId || isLoading) {
    return (
      <View style={[s.loadingContainer, { paddingTop: insets.top }]}>
        <View style={s.skeletonHero}>
          <View style={s.skeletonBadge} />
          <View style={s.skeletonTitle} />
          <View style={s.skeletonCard} />
        </View>
      </View>
    );
  }

  const paceOfAging = bioage?.paceOfAging ?? 1;
  const bioAgeValue = bioage?.bioAge ?? 0;
  const chronAge = bioage?.chronologicalAge ?? 0;
  const ageGap = bioage?.ageGap ?? 0;
  const shownAge = displayAge ?? bioAgeValue;
  const bioAgeInt = Math.floor(shownAge);
  const bioAgeDec = Math.round((shownAge - bioAgeInt) * 10);
  const isYounger = paceOfAging < 1;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View style={s.logoRow}>
            <View style={s.logoBox}>
              <Sparkles size={16} color={colors.primary} />
            </View>
            <Text style={s.logoText}>Aura</Text>
          </View>
          <TouchableOpacity style={s.shareButton} onPress={() => setShowShare(true)} testID="button-share">
            <Share2 size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={s.tabRow}>
          {(["overview", "trends"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
              testID={`tab-${tab}`}
            >
              {tab === "overview" ? (
                <Activity size={16} color={activeTab === tab ? colors.foreground : colors.mutedForeground} />
              ) : (
                <TrendingDown size={16} color={activeTab === tab ? colors.foreground : colors.mutedForeground} />
              )}
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "overview" && (
          <View style={s.section}>
            <View style={s.paceRow}>
              <TouchableOpacity
                style={[s.paceBadge, { backgroundColor: isYounger ? colors.green50 : colors.amber100 }]}
                onPress={() => setShowProjection(true)}
                activeOpacity={0.7}
              >
                {isYounger ? (
                  <TrendingDown size={12} color={colors.green700} />
                ) : (
                  <TrendingUp size={12} color={colors.amber600} />
                )}
                <Text style={[s.paceBadgeText, { color: isYounger ? colors.green700 : colors.amber600 }]}>
                  Pace of aging: {paceOfAging} yrs/yr
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={s.headline} testID="text-headline">
              {isYounger ? "Your body is\nfeeling younger." : "Room for\nimprovement."}
            </Text>

            <View style={s.heroCard}>
              <Text style={s.heroLabel}>BIOLOGICAL AGE</Text>
              <View style={s.heroRow}>
                <Text style={s.heroAge}>{bioAgeInt}</Text>
                <Text style={s.heroAgeDec}>.{bioAgeDec}</Text>
              </View>
              <Text style={s.heroDiff}>
                <Text style={{ color: ageGap < 0 ? colors.green600 : colors.destructive, fontFamily: fonts.sansBold }}>
                  {ageGap > 0 ? "+" : ""}{ageGap} years
                </Text>
                {" "}vs actual age
              </Text>
              <TouchableOpacity style={s.breakdownBtn} onPress={() => setShowInsight(true)} testID="button-breakdown">
                <Text style={s.breakdownBtnText}>See calculation breakdown</Text>
                <ChevronRight size={16} color={colors.foreground} style={{ opacity: 0.5 }} />
              </TouchableOpacity>
            </View>

            <Text style={s.sectionTitle}>Health Breakdown</Text>
            {bioage?.domains?.map((dom: any) => {
              const config = DOMAIN_CONFIG[dom.domain] || DOMAIN_CONFIG.fitness;
              const Icon = config.icon;
              return (
                <View key={dom.domain} style={s.categoryCard}>
                  <View style={s.categoryHeader}>
                    <View style={s.categoryLeft}>
                      <View style={[s.categoryIcon, { backgroundColor: config.bg }]}>
                        <Icon size={16} color={config.color} />
                      </View>
                      <Text style={s.categoryName}>{config.label}</Text>
                    </View>
                    <Text
                      style={[s.categoryImpact, { color: dom.gap < 0 ? colors.green600 : dom.gap > 0 ? colors.destructive : colors.mutedForeground }]}
                    >
                      {dom.gap > 0 ? "+" : ""}{dom.gap} yrs
                    </Text>
                  </View>
                  <View style={s.metricsGrid}>
                    {dom.metrics?.filter((m: any) => !HIDDEN_METRICS.has(m.key)).map((m: any) => {
                      const rating = getMetricRating(m.key, parseFloat(m.value));
                      const ratingCfg = rating ? RATING_CONFIG[rating] : null;
                      const avgs = metricAverages?.[m.key];
                      return (
                        <View key={m.key} style={s.metricTile}>
                          <Text style={s.metricLabel}>{METRIC_LABELS[m.key] || m.key.replace(/_/g, " ")}</Text>
                          <Text style={s.metricValue}>
                            {m.value}{" "}
                            <Text style={s.metricUnit}>{m.unit}</Text>
                          </Text>
                          {ratingCfg && (
                            <TouchableOpacity
                              style={[s.ratingBadge, { backgroundColor: ratingCfg.bg }]}
                              onPress={() => setSpectrumMetric({ key: m.key, value: parseFloat(m.value) })}
                              activeOpacity={0.7}
                            >
                              <Text style={[s.ratingText, { color: ratingCfg.color }]}>{ratingCfg.label}</Text>
                            </TouchableOpacity>
                          )}
                          {avgs && (avgs.week !== null || avgs.month !== null || avgs.sixMonth !== null) && (
                            <Text style={s.avgText}>
                              {avgs.week !== null ? `1w: ${avgs.week}` : ""}
                              {avgs.month !== null ? `${avgs.week !== null ? " | " : ""}1m: ${avgs.month}` : ""}
                              {avgs.sixMonth !== null ? `${(avgs.week !== null || avgs.month !== null) ? " | " : ""}6m: ${avgs.sixMonth}` : ""}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {bioage?.missingDomains?.map((md: any) => (
              <View key={md.domain} style={[s.categoryCard, { opacity: 0.6 }]}>
                <View style={s.categoryHeader}>
                  <View style={s.categoryLeft}>
                    <View style={[s.categoryIcon, { backgroundColor: colors.gray100 }]}>
                      <Clock size={16} color={colors.gray600} />
                    </View>
                    <Text style={s.categoryName}>{md.label}</Text>
                  </View>
                  <Text style={[s.categoryImpact, { color: colors.mutedForeground }]}>Need data</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === "trends" && (
          <View style={s.section}>
            <View style={s.paceRow}>
              <View style={[s.paceBadge, { backgroundColor: isYounger ? colors.green50 : colors.amber100 }]}>
                {isYounger ? <TrendingDown size={12} color={colors.green700} /> : <TrendingUp size={12} color={colors.amber600} />}
                <Text style={[s.paceBadgeText, { color: isYounger ? colors.green700 : colors.amber600 }]}>
                  Pace of aging: {paceOfAging}
                </Text>
              </View>
            </View>
            <Text style={s.headline}>Pacing well.</Text>
            <Text style={s.trendSubtitle}>Your aging pace over recent calculations.</Text>

            <View style={s.trendChart}>
              {history && history.length >= 2 ? (
                <Svg width="100%" height={200} viewBox="0 0 300 200">
                  {(() => {
                    const points = history.slice(0, 20).reverse();
                    const ages = points.map((p: any) => p.bioAge);
                    const minAge = Math.min(...ages) - 1;
                    const maxAge = Math.max(...ages) + 1;
                    const range = maxAge - minAge || 1;
                    const coords = points.map((p: any, i: number) => ({
                      x: 20 + (i / (points.length - 1)) * 260,
                      y: 180 - ((p.bioAge - minAge) / range) * 160,
                    }));
                    const d = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
                    return <Path d={d} stroke={colors.primary} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
                  })()}
                </Svg>
              ) : (
                <Text style={s.noHistory}>No history yet. Check back after more calculations.</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={showInsight} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowInsight(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Impact by Area</Text>
            <View style={s.sheetRows}>
              <View style={s.sheetRow}>
                <Text style={s.sheetLabel}>Chronological Age</Text>
                <Text style={s.sheetValue}>{chronAge}</Text>
              </View>
              {bioage?.domains?.map((dom: any) => (
                <View key={dom.domain} style={s.sheetRow}>
                  <Text style={s.sheetLabel}>{DOMAIN_CONFIG[dom.domain]?.label || dom.domain}</Text>
                  <Text style={[s.sheetValue, { color: dom.gap < 0 ? colors.green600 : dom.gap > 0 ? colors.destructive : colors.foreground }]}>
                    {dom.gap > 0 ? "+" : ""}{dom.gap} yrs
                  </Text>
                </View>
              ))}
              <View style={[s.sheetRow, { borderTopWidth: 2, borderColor: colors.border, paddingTop: 16, marginTop: 8 }]}>
                <Text style={[s.sheetLabel, { fontFamily: fonts.sansMedium, color: colors.foreground }]}>Biological Age</Text>
                <Text style={[s.sheetValue, { fontFamily: fonts.serifBold, fontSize: 24 }]}>{bioAgeValue}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.sheetCta} onPress={() => setShowInsight(false)}>
              <Text style={s.sheetCtaText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showShare} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowShare(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <View style={s.shareCard}>
              <Sparkles size={24} color="rgba(255,255,255,0.8)" />
              <Text style={s.shareAge}>{bioAgeValue}</Text>
              <Text style={s.shareLabel}>BIOLOGICAL AGE</Text>
              <Text style={s.shareVia}>via Aura Wellness</Text>
            </View>
            <TouchableOpacity style={s.sheetCta} onPress={() => setShowShare(false)}>
              <Share2 size={20} color={colors.white} />
              <Text style={s.sheetCtaText}>Share Snapshot</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!spectrumMetric} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setSpectrumMetric(null)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            {spectrumMetric && (() => {
              const range = METRIC_RANGES[spectrumMetric.key];
              if (!range) return null;
              const label = METRIC_LABELS[spectrumMetric.key] || spectrumMetric.key.replace(/_/g, " ");
              const rating = getMetricRating(spectrumMetric.key, spectrumMetric.value);
              const allValues = [range.bad[0], range.bad[1], range.average[0], range.average[1], range.excellent[0], range.excellent[1]];
              const min = Math.min(...allValues);
              const max = Math.max(...allValues);
              const total = max - min || 1;
              const zones = [
                { ...range.bad, color: "rgba(248,113,113,0.25)", label: "Below avg" },
                { ...range.average, color: "rgba(217,119,6,0.2)", label: "Average" },
                { ...range.excellent, color: "rgba(22,163,74,0.2)", label: "Excellent" },
              ].sort((a, b) => a[0] - b[0]);
              const markerPos = Math.max(0, Math.min(1, (spectrumMetric.value - min) / total));

              return (
                <View style={{ gap: 16 }}>
                  <Text style={s.sheetTitle}>{label}</Text>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 32, color: colors.foreground }}>
                    {spectrumMetric.value}
                    {rating && (
                      <Text style={{ fontFamily: fonts.sansMedium, fontSize: 14, color: RATING_CONFIG[rating].color }}>
                        {"  "}{RATING_CONFIG[rating].label}
                      </Text>
                    )}
                  </Text>
                  <View style={s.spectrumBar}>
                    {zones.map((z, i) => (
                      <View
                        key={i}
                        style={{
                          flex: (z[1] - z[0]) / total,
                          backgroundColor: z.color,
                          height: 12,
                          borderTopLeftRadius: i === 0 ? 6 : 0,
                          borderBottomLeftRadius: i === 0 ? 6 : 0,
                          borderTopRightRadius: i === zones.length - 1 ? 6 : 0,
                          borderBottomRightRadius: i === zones.length - 1 ? 6 : 0,
                        }}
                      />
                    ))}
                    <View style={[s.spectrumMarker, { left: `${markerPos * 100}%` }]} />
                  </View>
                  <View style={s.spectrumLabels}>
                    {zones.map((z, i) => (
                      <View key={i} style={{ flex: (z[1] - z[0]) / total, alignItems: i === 0 ? "flex-start" : i === zones.length - 1 ? "flex-end" : "center" }}>
                        <Text style={s.spectrumZoneLabel}>{z.label}</Text>
                        <Text style={s.spectrumZoneRange}>{z[0]} - {z[1]}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
            <TouchableOpacity style={[s.sheetCta, { marginTop: 24 }]} onPress={() => setSpectrumMetric(null)}>
              <Text style={s.sheetCtaText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showProjection} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowProjection(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Age Projection</Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.mutedForeground, marginBottom: 16 }}>
              At your current pace of {paceOfAging} yrs/yr, here's how your body will age:
            </Text>
            <View style={s.sheetRows}>
              {(() => {
                const currentChronAge = Math.floor(chronAge);
                const milestones = [10, 20, 30, 40].map(offset => currentChronAge + offset).filter(a => a <= 100);
                return milestones.map(futureAge => {
                  const yearsFromNow = futureAge - chronAge;
                  const projectedBioAge = Math.round((bioAgeValue + yearsFromNow * paceOfAging) * 10) / 10;
                  const diff = Math.round((projectedBioAge - futureAge) * 10) / 10;
                  return (
                    <View key={futureAge} style={s.sheetRow}>
                      <View>
                        <Text style={[s.sheetLabel, { color: colors.foreground, fontFamily: fonts.sansMedium }]}>
                          At age {futureAge}
                        </Text>
                        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground }}>
                          in {Math.round(yearsFromNow)} years
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[s.sheetValue, { fontFamily: fonts.serif, fontSize: 20 }]}>
                          {projectedBioAge}
                        </Text>
                        <Text style={{ fontFamily: fonts.sansMedium, fontSize: 12, color: diff < 0 ? colors.green600 : diff > 0 ? colors.destructive : colors.mutedForeground }}>
                          {diff > 0 ? "+" : ""}{diff} yrs
                        </Text>
                      </View>
                    </View>
                  );
                });
              })()}
            </View>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, textAlign: "center", marginTop: 8 }}>
              Improving your metrics can slow your pace of aging
            </Text>
            <TouchableOpacity style={[s.sheetCta, { marginTop: 16 }]} onPress={() => setShowProjection(false)}>
              <Text style={s.sheetCtaText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
  skeletonHero: { paddingTop: 60, gap: 16 },
  skeletonBadge: { width: 180, height: 28, borderRadius: 14, backgroundColor: colors.muted },
  skeletonTitle: { width: "80%", height: 48, borderRadius: 8, backgroundColor: colors.muted },
  skeletonCard: { width: "100%", height: 200, borderRadius: 36, backgroundColor: colors.muted, marginTop: 8 },
  scroll: { paddingHorizontal: 24, paddingTop: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoBox: {
    width: 32, height: 32, borderRadius: 12, backgroundColor: colors.card,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: colors.white,
  },
  logoText: { fontFamily: fonts.serif, fontSize: 18, color: colors.foreground },
  shareButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    justifyContent: "center", alignItems: "center",
  },
  tabRow: {
    flexDirection: "row", backgroundColor: "rgba(240,237,232,0.5)", borderRadius: 32,
    padding: 6, marginBottom: 24, gap: 4,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 28,
  },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.mutedForeground },
  tabTextActive: { color: colors.foreground },
  section: { gap: 16 },
  paceRow: { marginBottom: 4 },
  paceBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, alignSelf: "flex-start",
  },
  paceBadgeText: { fontFamily: fonts.sansMedium, fontSize: 12 },
  headline: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, color: colors.foreground, marginBottom: 8 },
  heroCard: {
    backgroundColor: colors.card, borderRadius: 36, padding: 32, alignItems: "center",
    borderWidth: 1, borderColor: colors.white,
  },
  heroLabel: {
    fontFamily: fonts.sansMedium, fontSize: 12, color: colors.mutedForeground,
    letterSpacing: 3, marginBottom: 8,
  },
  heroRow: { flexDirection: "row", alignItems: "baseline" },
  heroAge: { fontFamily: fonts.serif, fontSize: 80, color: colors.foreground, lineHeight: 80 },
  heroAgeDec: { fontFamily: fonts.serif, fontSize: 24, color: colors.mutedForeground },
  heroDiff: { fontFamily: fonts.sans, fontSize: 14, color: colors.mutedForeground, marginTop: 8, marginBottom: 24 },
  breakdownBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(240,237,232,0.8)", borderRadius: 9999,
    paddingHorizontal: 20, paddingVertical: 12, width: "100%",
  },
  breakdownBtnText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.foreground },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 20, color: colors.foreground, marginTop: 8 },
  categoryCard: {
    backgroundColor: colors.white, borderRadius: 28, padding: 20,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
  },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  categoryLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  categoryName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.foreground },
  categoryImpact: { fontFamily: fonts.sansMedium, fontSize: 14 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricTile: {
    flex: 1, minWidth: "45%", backgroundColor: "rgba(240,237,232,0.3)",
    borderRadius: 16, padding: 12, justifyContent: "flex-start",
  },
  metricLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, textTransform: "capitalize", marginBottom: 4, lineHeight: 16 },
  metricValue: { fontFamily: fonts.serif, fontSize: 18, color: colors.foreground },
  metricUnit: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  ratingBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  ratingText: { fontFamily: fonts.sansMedium, fontSize: 11 },
  avgText: { fontFamily: fonts.sans, fontSize: 10, color: colors.mutedForeground, marginTop: 4, opacity: 0.8 },
  trendSubtitle: { fontFamily: fonts.sans, fontSize: 14, color: colors.mutedForeground, marginTop: -8 },
  trendChart: {
    backgroundColor: colors.card, borderRadius: 36, padding: 24,
    borderWidth: 1, borderColor: colors.white, height: 240, justifyContent: "center",
  },
  noHistory: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.1)" },
  sheet: {
    backgroundColor: "rgba(255,255,255,0.95)", borderTopLeftRadius: 36, borderTopRightRadius: 36,
    padding: 32, paddingBottom: 40,
  },
  sheetHandle: {
    width: 48, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.1)",
    alignSelf: "center", marginBottom: 24,
  },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 24, color: colors.foreground, marginBottom: 16 },
  sheetRows: { gap: 12, marginBottom: 24 },
  sheetRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingBottom: 12, borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.05)",
  },
  sheetLabel: { fontFamily: fonts.sans, fontSize: 15, color: colors.mutedForeground },
  sheetValue: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.foreground },
  sheetCta: {
    backgroundColor: colors.foreground, borderRadius: 9999, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  sheetCtaText: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.white },
  shareCard: {
    backgroundColor: colors.primary, borderRadius: 24, padding: 32,
    alignItems: "center", marginBottom: 24,
  },
  shareAge: { fontFamily: fonts.serif, fontSize: 48, color: colors.white, marginTop: 16 },
  shareLabel: {
    fontFamily: fonts.sansMedium, fontSize: 12, color: "rgba(255,255,255,0.9)",
    letterSpacing: 3,
  },
  shareVia: { fontFamily: fonts.sans, fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 24 },
  spectrumBar: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", position: "relative" },
  spectrumMarker: {
    position: "absolute", top: -4, width: 4, height: 20, borderRadius: 2,
    backgroundColor: colors.foreground, marginLeft: -2,
  },
  spectrumLabels: { flexDirection: "row", marginTop: 4 },
  spectrumZoneLabel: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.mutedForeground },
  spectrumZoneRange: { fontFamily: fonts.sans, fontSize: 10, color: colors.mutedForeground, opacity: 0.7 },
});
