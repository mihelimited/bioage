import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getQueryFn } from "@/lib/queryClient";
import {
  HeartPulse,
  Activity,
  Moon,
  Flame,
  Droplets,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Share2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  cardiovascular: { icon: HeartPulse, color: "text-rose-500", bg: "bg-rose-500/10" },
  sleep: { icon: Moon, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  recovery: { icon: Droplets, color: "text-blue-500", bg: "bg-blue-500/10" },
  activity: { icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
  body_composition: { icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
};

function formatCategoryLabel(cat: string) {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface BioAgeMetric {
  key: string;
  value: number;
  unit: string;
  impact: number;
  fresh: boolean;
  isOverride: boolean;
}

interface BioAgeCategory {
  category: string;
  impact: number;
  metrics: BioAgeMetric[];
}

interface BioAgeResult {
  bioAge: number;
  chronologicalAge: number;
  paceOfAging: number;
  categories: BioAgeCategory[];
  totalImpact: number;
  missingCategories: { category: string; label: string }[];
  target: number | null;
}

interface BioAgeSnapshot {
  bioAge: number;
  createdAt: string;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [showInsight, setShowInsight] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const userId = typeof window !== "undefined" ? localStorage.getItem("aura_user_id") : null;

  useEffect(() => {
    if (!userId) {
      setLocation("/onboarding");
    }
  }, [userId, setLocation]);

  const { data: result, isLoading: bioageLoading } = useQuery<BioAgeResult>({
    queryKey: [`/api/users/${userId}/bioage`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!userId,
  });

  const { data: history, isLoading: historyLoading } = useQuery<BioAgeSnapshot[]>({
    queryKey: [`/api/users/${userId}/bioage/history`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!userId,
  });

  if (!userId) return null;

  const isLoading = bioageLoading;
  const paceOfAging = result?.paceOfAging ?? 0;
  const isYounger = paceOfAging < 1;
  const bioAge = result?.bioAge ?? 0;
  const bioAgeInt = Math.floor(bioAge);
  const bioAgeDec = (bioAge - bioAgeInt).toFixed(1).slice(1);
  const chronoAge = result?.chronologicalAge ?? 0;
  const diff = bioAge - chronoAge;
  const diffStr = diff < 0 ? `${diff.toFixed(1)} years` : `+${diff.toFixed(1)} years`;

  function renderSkeleton() {
    return (
      <div className="space-y-8 animate-pulse" data-testid="loading-skeleton">
        <div className="space-y-2 px-2">
          <div className="h-6 w-40 bg-secondary/60 rounded-full" />
          <div className="h-10 w-64 bg-secondary/60 rounded-2xl mt-2" />
        </div>
        <div className="bg-card rounded-[36px] p-8 shadow-md border border-white h-56" />
        <div className="space-y-4">
          <div className="h-6 w-40 bg-secondary/60 rounded-2xl" />
          <div className="bg-white rounded-[28px] p-5 h-32 shadow-sm border border-black/5" />
          <div className="bg-white rounded-[28px] p-5 h-32 shadow-sm border border-black/5" />
        </div>
      </div>
    );
  }

  function buildTrendPath(snapshots: BioAgeSnapshot[]) {
    if (!snapshots || snapshots.length < 2) return null;
    const sorted = [...snapshots].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const ages = sorted.map((s) => s.bioAge);
    const minAge = Math.min(...ages) - 1;
    const maxAge = Math.max(...ages) + 1;
    const range = maxAge - minAge || 1;

    const points = sorted.map((s, i) => {
      const x = (i / (sorted.length - 1)) * 100;
      const y = 90 - ((s.bioAge - minAge) / range) * 70;
      return { x, y };
    });

    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) / 3;
      const cpx2 = prev.x + (2 * (curr.x - prev.x)) / 3;
      d += ` C${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`;
    }
    return { d, points, ages: sorted };
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:flex lg:justify-center lg:items-start lg:py-12">
      <div className="w-full lg:max-w-[428px] lg:h-[926px] lg:rounded-[56px] lg:border-[8px] lg:border-white lg:shadow-2xl lg:overflow-hidden relative bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.15)_0%,transparent_50%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.1)_0%,transparent_50%)] pointer-events-none" />

        <div className="h-full overflow-y-auto hide-scrollbar px-6 pt-14 pb-32">
          <header className="flex items-center justify-between mb-8" data-testid="header">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-card shadow-sm flex items-center justify-center border border-white">
                <Sparkles className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
              <span className="font-serif font-medium text-lg tracking-tight text-foreground/90">Aura</span>
            </div>
            <button
              data-testid="button-share"
              onClick={() => setShowShare(true)}
              className="w-10 h-10 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center hover:bg-secondary/80 transition-colors text-foreground"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </header>

          <div className="flex bg-secondary/50 p-1.5 rounded-[32px] mb-8 relative z-10" data-testid="tab-bar">
            {["overview", "trends"].map((tab) => (
              <button
                key={tab}
                data-testid={`tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-1 py-3 px-4 rounded-[28px] text-sm font-medium transition-all duration-300 ${
                  activeTab === tab ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 bg-card rounded-[28px] pill-shadow"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 capitalize flex items-center justify-center gap-2">
                  {tab === "overview" ? <Activity className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {tab}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {isLoading ? (
                    renderSkeleton()
                  ) : result ? (
                    <>
                      <div className="space-y-2 px-2" data-testid="pace-headline">
                        <div
                          data-testid="badge-pace"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-1 ${
                            isYounger
                              ? "bg-green-500/10 text-green-700"
                              : "bg-amber-500/10 text-amber-700"
                          }`}
                        >
                          {isYounger ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          Pace of aging: {paceOfAging.toFixed(2)} yrs/yr
                        </div>
                        <h1 className="font-serif text-4xl leading-[1.15] text-foreground" data-testid="text-headline">
                          {isYounger ? (
                            <>Your body is<br />feeling younger.</>
                          ) : (
                            <>Room for<br />improvement.</>
                          )}
                        </h1>
                      </div>

                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="relative bg-card rounded-[36px] p-8 shadow-md border border-white group"
                        data-testid="card-bioage"
                      >
                        <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-primary/10 to-accent/5 pointer-events-none" />
                        <div className="relative z-10 flex flex-col items-center text-center">
                          <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                            Biological Age
                            <span className="w-2 h-2 rounded-full bg-green-400" title="Data fresh" data-testid="freshness-dot" />
                          </div>
                          <div className="flex items-baseline gap-1 mb-2" data-testid="text-bioage">
                            <span className="font-serif text-[80px] leading-none tracking-tighter text-foreground text-glow">
                              {bioAgeInt}
                            </span>
                            <span className="text-2xl text-muted-foreground font-serif">{bioAgeDec}</span>
                          </div>
                          <div className="text-muted-foreground text-sm font-medium mb-6" data-testid="text-diff">
                            <span className={diff < 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                              {diffStr}
                            </span>{" "}
                            vs actual age
                          </div>
                          <button
                            data-testid="button-breakdown"
                            onClick={() => setShowInsight(true)}
                            className="flex items-center gap-2 text-sm font-medium text-foreground bg-secondary/80 hover:bg-secondary px-5 py-3 rounded-full transition-colors w-full justify-center"
                          >
                            See calculation breakdown
                            <ChevronRight className="w-4 h-4 opacity-50" />
                          </button>
                        </div>
                      </motion.div>

                      <div className="space-y-4">
                        <h2 className="font-serif text-xl px-2 pt-2" data-testid="text-contributing-factors">Contributing Factors</h2>

                        {result.categories.map((cat) => {
                          const cfg = CATEGORY_CONFIG[cat.category] || {
                            icon: Activity,
                            color: "text-gray-500",
                            bg: "bg-gray-500/10",
                          };
                          const Icon = cfg.icon;
                          return (
                            <div
                              key={cat.category}
                              className="bg-white rounded-[28px] p-5 shadow-sm border border-black/5"
                              data-testid={`card-category-${cat.category}`}
                            >
                              <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center ${cfg.color}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium">{formatCategoryLabel(cat.category)}</span>
                                </div>
                                <span
                                  className={`font-medium text-sm ${cat.impact <= 0 ? "text-green-600" : "text-red-600"}`}
                                  data-testid={`text-impact-${cat.category}`}
                                >
                                  {cat.impact <= 0 ? cat.impact.toFixed(1) : `+${cat.impact.toFixed(1)}`} yrs
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {cat.metrics.map((m) => (
                                  <div
                                    key={m.key}
                                    className="bg-secondary/30 rounded-2xl p-3 relative overflow-hidden"
                                    data-testid={`metric-${m.key}`}
                                  >
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="text-xs text-muted-foreground">{m.key}</span>
                                      {m.isOverride ? (
                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                      ) : m.fresh ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                      ) : (
                                        <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                                      )}
                                    </div>
                                    <div className="font-serif text-lg">
                                      {m.value}{" "}
                                      <span className="text-xs text-muted-foreground font-sans">{m.unit}</span>
                                    </div>
                                    {!m.fresh && !m.isOverride && (
                                      <div className="absolute top-0 right-0 p-1">
                                        <div className="bg-orange-100 text-orange-700 text-[10px] px-1.5 rounded-full flex items-center gap-0.5">
                                          <Clock className="w-2.5 h-2.5" /> Stale
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {result.missingCategories.map((mc) => {
                          const cfg = CATEGORY_CONFIG[mc.category] || {
                            icon: Activity,
                            color: "text-gray-500",
                            bg: "bg-gray-500/10",
                          };
                          const Icon = cfg.icon;
                          return (
                            <div
                              key={mc.category}
                              className="bg-white rounded-[28px] p-5 shadow-sm border border-black/5 opacity-75"
                              data-testid={`card-missing-${mc.category}`}
                            >
                              <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center ${cfg.color}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium">{mc.label}</span>
                                </div>
                                <span className="text-muted-foreground font-medium text-sm">Need data</span>
                              </div>
                              <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-2xl flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Wear watch during workouts to track this category.
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {activeTab === "trends" && (
                <div className="space-y-8">
                  {isLoading ? (
                    renderSkeleton()
                  ) : result ? (
                    <>
                      <div className="px-2" data-testid="trends-headline">
                        <div
                          data-testid="badge-pace-trends"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-1 ${
                            isYounger
                              ? "bg-green-500/10 text-green-700"
                              : "bg-amber-500/10 text-amber-700"
                          }`}
                        >
                          {isYounger ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          Pace of aging: {paceOfAging.toFixed(2)}
                        </div>
                        <h1 className="font-serif text-4xl leading-[1.15] text-foreground" data-testid="text-trends-title">
                          {isYounger ? "Pacing well." : "Room to improve."}
                        </h1>
                        <p className="text-muted-foreground text-sm mt-2">
                          {isYounger
                            ? "Your aging pace is consistently below average."
                            : "Your pace suggests some areas need attention."}
                        </p>
                      </div>

                      <div
                        className="bg-card rounded-[36px] p-6 shadow-md border border-white h-64 flex items-center justify-center relative overflow-hidden"
                        data-testid="chart-trends"
                      >
                        {historyLoading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        ) : history && history.length >= 2 ? (
                          <>
                            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/10 to-transparent" />
                            <svg
                              className="absolute inset-0 w-full h-full z-0"
                              fill="none"
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                            >
                              {(() => {
                                const trendData = buildTrendPath(history);
                                if (!trendData) return null;
                                return (
                                  <>
                                    <path
                                      d={trendData.d}
                                      className="stroke-primary"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                    {trendData.points.map((pt, idx) => (
                                      <circle
                                        key={idx}
                                        cx={pt.x}
                                        cy={pt.y}
                                        r="1.5"
                                        className="fill-primary"
                                      />
                                    ))}
                                  </>
                                );
                              })()}
                            </svg>
                            <div className="relative z-10 text-center">
                              <div className="font-serif text-3xl text-foreground">{bioAge.toFixed(1)}</div>
                              <div className="text-xs text-muted-foreground uppercase tracking-widest">Current Bio Age</div>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground font-medium z-10" data-testid="text-no-history">
                            No history yet
                          </p>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <BottomNav />

        <AnimatePresence>
          {showShare && result && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px] z-50"
                onClick={() => setShowShare(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 p-4 z-50"
                data-testid="overlay-share"
              >
                <div className="glass-card rounded-[36px] p-8 pb-10 shadow-2xl relative overflow-hidden text-center">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/10 rounded-full mt-3" />
                  <div className="w-full bg-gradient-to-br from-primary to-accent rounded-[24px] p-8 text-white shadow-inner mb-6 mt-4">
                    <Sparkles className="w-6 h-6 mb-4 opacity-80 mx-auto" />
                    <div className="font-serif text-5xl mb-2" data-testid="text-share-bioage">
                      {bioAge.toFixed(1)}
                    </div>
                    <div className="text-sm font-medium opacity-90 uppercase tracking-widest">Biological Age</div>
                    <div className="mt-6 text-xs opacity-75">via Aura Wellness</div>
                  </div>
                  <button
                    data-testid="button-share-snapshot"
                    onClick={() => setShowShare(false)}
                    className="w-full bg-foreground text-white rounded-full py-4 font-medium text-base hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    Share Snapshot
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showInsight && result && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px] z-50"
                onClick={() => setShowInsight(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 p-4 z-50"
                data-testid="overlay-insight"
              >
                <div className="glass-card rounded-[36px] p-8 pb-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/10 rounded-full mt-3" />
                  <h3 className="font-serif text-2xl mb-4 text-foreground pt-4">Calculation Impact</h3>
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center pb-4 border-b border-black/5" data-testid="insight-chrono-age">
                      <span className="text-muted-foreground">Chronological Age</span>
                      <span className="font-medium">{chronoAge.toFixed(1)}</span>
                    </div>
                    {result.categories.map((cat) => (
                      <div
                        key={cat.category}
                        className="flex justify-between items-center pb-4 border-b border-black/5"
                        data-testid={`insight-category-${cat.category}`}
                      >
                        <span className="text-muted-foreground">{formatCategoryLabel(cat.category)}</span>
                        <span className={`font-medium ${cat.impact <= 0 ? "text-green-600" : "text-red-600"}`}>
                          {cat.impact <= 0 ? cat.impact.toFixed(1) : `+${cat.impact.toFixed(1)}`} yrs
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2" data-testid="insight-bioage-total">
                      <span className="font-medium text-foreground">Biological Age</span>
                      <span className="font-serif text-2xl">{bioAge.toFixed(1)}</span>
                    </div>
                  </div>
                  <button
                    data-testid="button-insight-close"
                    onClick={() => setShowInsight(false)}
                    className="w-full bg-foreground text-white rounded-full py-4 font-medium text-base hover:bg-foreground/90 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
