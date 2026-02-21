import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, Pressable, StyleSheet, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Svg, { Path } from "react-native-svg";
import {
  HeartPulse, Activity, Moon, Flame, Droplets, ChevronRight,
  TrendingDown, TrendingUp, Sparkles, Share2, AlertCircle,
  CheckCircle2, Clock, ShieldCheck,
} from "lucide-react-native";
import { colors, fonts, radii } from "@/lib/theme";
import { apiGet } from "@/lib/api";
import { getUserId } from "@/lib/storage";
import { router } from "expo-router";

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  cardiovascular: { icon: HeartPulse, color: colors.rose500, bg: colors.rose50, label: "Cardiovascular" },
  sleep: { icon: Moon, color: colors.indigo500, bg: colors.indigo50, label: "Sleep" },
  recovery: { icon: Droplets, color: colors.blue500, bg: colors.blue50, label: "Recovery" },
  activity: { icon: Flame, color: colors.orange500, bg: colors.orange50, label: "Activity" },
  body_composition: { icon: Activity, color: colors.emerald500, bg: colors.emerald50, label: "Body Composition" },
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"overview" | "trends">("overview");
  const [showInsight, setShowInsight] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

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

  const { data: history } = useQuery({
    queryKey: ["bioage-history", userId],
    queryFn: () => apiGet<any[]>(`/api/users/${userId}/bioage/history`),
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
  const diff = Math.round((bioAgeValue - chronAge) * 10) / 10;
  const bioAgeInt = Math.floor(bioAgeValue);
  const bioAgeDec = Math.round((bioAgeValue - bioAgeInt) * 10);
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
              <View style={[s.paceBadge, { backgroundColor: isYounger ? colors.green50 : colors.amber100 }]}>
                {isYounger ? (
                  <TrendingDown size={12} color={colors.green700} />
                ) : (
                  <TrendingUp size={12} color={colors.amber600} />
                )}
                <Text style={[s.paceBadgeText, { color: isYounger ? colors.green700 : colors.amber600 }]}>
                  Pace of aging: {paceOfAging} yrs/yr
                </Text>
              </View>
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
                <Text style={{ color: diff < 0 ? colors.green600 : colors.destructive, fontFamily: fonts.sansBold }}>
                  {diff > 0 ? "+" : ""}{diff} years
                </Text>
                {" "}vs actual age
              </Text>
              <TouchableOpacity style={s.breakdownBtn} onPress={() => setShowInsight(true)} testID="button-breakdown">
                <Text style={s.breakdownBtnText}>See calculation breakdown</Text>
                <ChevronRight size={16} color={colors.foreground} style={{ opacity: 0.5 }} />
              </TouchableOpacity>
            </View>

            <Text style={s.sectionTitle}>Contributing Factors</Text>
            {bioage?.categories?.map((cat: any) => {
              const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.activity;
              const Icon = config.icon;
              return (
                <View key={cat.category} style={s.categoryCard}>
                  <View style={s.categoryHeader}>
                    <View style={s.categoryLeft}>
                      <View style={[s.categoryIcon, { backgroundColor: config.bg }]}>
                        <Icon size={16} color={config.color} />
                      </View>
                      <Text style={s.categoryName}>{config.label}</Text>
                    </View>
                    <Text
                      style={[s.categoryImpact, { color: cat.impact < 0 ? colors.green600 : colors.destructive }]}
                    >
                      {cat.impact > 0 ? "+" : ""}{cat.impact} yrs
                    </Text>
                  </View>
                  <View style={s.metricsGrid}>
                    {cat.metrics?.map((m: any) => (
                      <View key={m.key} style={s.metricTile}>
                        <View style={s.metricHeader}>
                          <Text style={s.metricLabel}>{m.key.replace(/_/g, " ")}</Text>
                          {m.isOverride ? (
                            <ShieldCheck size={14} color={colors.blue500} />
                          ) : m.fresh ? (
                            <CheckCircle2 size={14} color={colors.green500} />
                          ) : (
                            <AlertCircle size={14} color={colors.orange400} />
                          )}
                        </View>
                        <Text style={s.metricValue}>
                          {m.value}{" "}
                          <Text style={s.metricUnit}>{m.unit}</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

            {bioage?.missingCategories?.map((mc: any) => (
              <View key={mc.category} style={[s.categoryCard, { opacity: 0.6 }]}>
                <View style={s.categoryHeader}>
                  <View style={s.categoryLeft}>
                    <View style={[s.categoryIcon, { backgroundColor: colors.gray100 }]}>
                      <Clock size={16} color={colors.gray600} />
                    </View>
                    <Text style={s.categoryName}>{mc.label}</Text>
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
            <Text style={s.sheetTitle}>Calculation Impact</Text>
            <View style={s.sheetRows}>
              <View style={s.sheetRow}>
                <Text style={s.sheetLabel}>Chronological Age</Text>
                <Text style={s.sheetValue}>{chronAge}</Text>
              </View>
              {bioage?.categories?.map((cat: any) => (
                <View key={cat.category} style={s.sheetRow}>
                  <Text style={s.sheetLabel}>{CATEGORY_CONFIG[cat.category]?.label || cat.category}</Text>
                  <Text style={[s.sheetValue, { color: cat.impact < 0 ? colors.green600 : colors.destructive }]}>
                    {cat.impact > 0 ? "+" : ""}{cat.impact} yrs
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
    borderWidth: 1, borderColor: colors.white, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  logoText: { fontFamily: fonts.serif, fontSize: 18, color: colors.foreground },
  shareButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  tabRow: {
    flexDirection: "row", backgroundColor: "rgba(240,237,232,0.5)", borderRadius: 32,
    padding: 6, marginBottom: 24, gap: 4,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 28,
  },
  tabActive: { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
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
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
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
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  categoryLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  categoryName: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.foreground },
  categoryImpact: { fontFamily: fonts.sansMedium, fontSize: 14 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricTile: {
    flex: 1, minWidth: "45%", backgroundColor: "rgba(240,237,232,0.3)",
    borderRadius: 16, padding: 12,
  },
  metricHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  metricLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, textTransform: "capitalize" },
  metricValue: { fontFamily: fonts.serif, fontSize: 18, color: colors.foreground },
  metricUnit: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground },
  trendSubtitle: { fontFamily: fonts.sans, fontSize: 14, color: colors.mutedForeground, marginTop: -8 },
  trendChart: {
    backgroundColor: colors.card, borderRadius: 36, padding: 24,
    borderWidth: 1, borderColor: colors.white, height: 240, justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  noHistory: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.1)" },
  sheet: {
    backgroundColor: "rgba(255,255,255,0.95)", borderTopLeftRadius: 36, borderTopRightRadius: 36,
    padding: 32, paddingBottom: 40,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
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
});
