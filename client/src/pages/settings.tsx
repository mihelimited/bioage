import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/layout/BottomNav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Bell, Target, Apple, ShieldAlert, ChevronRight, X, Check, Loader2 } from "lucide-react";

export default function Settings() {
  const [, navigate] = useLocation();
  const userId = localStorage.getItem("aura_user_id");

  useEffect(() => {
    if (!userId) {
      navigate("/onboarding");
    }
  }, [userId, navigate]);

  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [labSheetOpen, setLabSheetOpen] = useState(false);
  const [targetAge, setTargetAge] = useState("");
  const [vo2Max, setVo2Max] = useState("");
  const [restingHR, setRestingHR] = useState("");
  const [hrv, setHrv] = useState("");

  const { data: user, isLoading } = useQuery<any>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
  });

  const goalMutation = useMutation({
    mutationFn: async (bioAgeTarget: number) => {
      await apiRequest("PATCH", `/api/users/${userId}/goal`, { bioAgeTarget });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      setGoalSheetOpen(false);
      setTargetAge("");
    },
  });

  const notificationsMutation = useMutation({
    mutationFn: async (weeklyNotifications: boolean) => {
      await apiRequest("PATCH", `/api/users/${userId}/notifications`, { weeklyNotifications });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
    },
  });

  const metricsMutation = useMutation({
    mutationFn: async (metric: { metricName: string; value: number; unit: string }) => {
      await apiRequest("POST", `/api/users/${userId}/metrics`, {
        ...metric,
        isOverride: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
    },
  });

  const handleSaveGoal = () => {
    const val = parseFloat(targetAge);
    if (!isNaN(val) && val > 0) {
      goalMutation.mutate(val);
    }
  };

  const handleSaveLabOverrides = async () => {
    const promises: Promise<void>[] = [];
    if (vo2Max.trim()) {
      const val = parseFloat(vo2Max);
      if (!isNaN(val)) promises.push(metricsMutation.mutateAsync({ metricName: "vo2Max", value: val, unit: "ml/kg/min" }));
    }
    if (restingHR.trim()) {
      const val = parseFloat(restingHR);
      if (!isNaN(val)) promises.push(metricsMutation.mutateAsync({ metricName: "restingHR", value: val, unit: "bpm" }));
    }
    if (hrv.trim()) {
      const val = parseFloat(hrv);
      if (!isNaN(val)) promises.push(metricsMutation.mutateAsync({ metricName: "hrv", value: val, unit: "ms" }));
    }
    if (promises.length > 0) {
      await Promise.all(promises);
      setLabSheetOpen(false);
      setVo2Max("");
      setRestingHR("");
      setHrv("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("aura_user_id");
    navigate("/onboarding");
  };

  const weeklyNotifications = user?.weeklyNotifications ?? false;

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:flex lg:justify-center lg:items-start lg:py-12">
      <div className="w-full lg:max-w-[428px] lg:h-[926px] lg:rounded-[56px] lg:border-[8px] lg:border-white lg:shadow-2xl lg:overflow-hidden relative bg-background">

        <div className="h-full overflow-y-auto hide-scrollbar px-6 pt-14 pb-32">

          <header className="mb-8">
            <h1 className="font-serif text-3xl text-foreground" data-testid="text-settings-title">Settings</h1>
          </header>

          {isLoading ? (
            <div className="flex items-center justify-center py-20" data-testid="loading-settings">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-8">

              <section>
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-3 ml-2">Your Goal</h2>
                <div
                  className="bg-white rounded-[24px] border border-black/5 shadow-sm p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => {
                    setTargetAge(user?.bioAgeTarget?.toString() ?? "");
                    setGoalSheetOpen(true);
                  }}
                  data-testid="button-open-goal"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">BioAge Target</div>
                        <div className="text-sm text-muted-foreground" data-testid="text-current-goal">
                          Currently aiming for {user?.bioAgeTarget ?? "—"}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-black/20" />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-3 ml-2">Data & Overrides</h2>
                <div className="bg-white rounded-[24px] border border-black/5 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-black/5 flex items-center justify-between" data-testid="row-apple-health">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                        <Apple className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Apple Health Sync</div>
                        <div className="text-[13px] text-muted-foreground font-medium">Web Demo</div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="p-4 flex items-center justify-between bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer"
                    onClick={() => setLabSheetOpen(true)}
                    data-testid="button-open-lab-overrides"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Lab Data Overrides</div>
                        <div className="text-[13px] text-muted-foreground">Input verified VO2 Max, etc.</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-black/20" />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-3 ml-2">Preferences</h2>
                <div className="bg-white rounded-[24px] border border-black/5 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Weekly Summary</div>
                        <div className="text-[13px] text-muted-foreground">Push notifications</div>
                      </div>
                    </div>
                    <button
                      onClick={() => notificationsMutation.mutate(!weeklyNotifications)}
                      disabled={notificationsMutation.isPending}
                      className={`w-12 h-7 rounded-full relative shadow-inner transition-colors duration-200 ${weeklyNotifications ? "bg-primary" : "bg-gray-300"}`}
                      data-testid="toggle-weekly-notifications"
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${weeklyNotifications ? "right-1" : "left-1"}`}
                      />
                    </button>
                  </div>
                </div>
              </section>

              <button
                onClick={handleLogout}
                className="w-full py-4 text-red-500 font-medium bg-red-50 rounded-[20px] hover:bg-red-100 transition-colors"
                data-testid="button-logout"
              >
                Log Out
              </button>

            </div>
          )}
        </div>

        <BottomNav />
      </div>

      <AnimatePresence>
        {goalSheetOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setGoalSheetOpen(false)} />
            <motion.div
              className="relative w-full max-w-[428px] bg-white/80 backdrop-blur-xl border border-white/40 rounded-t-[36px] shadow-2xl p-6 pb-10"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              data-testid="sheet-goal"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Set BioAge Target</h3>
                <button
                  onClick={() => setGoalSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"
                  data-testid="button-close-goal-sheet"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mb-6">
                <label className="text-sm text-muted-foreground mb-2 block">Target Age</label>
                <input
                  type="number"
                  value={targetAge}
                  onChange={(e) => setTargetAge(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full px-4 py-3 rounded-2xl border border-black/10 bg-white text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                  data-testid="input-target-age"
                />
              </div>
              <button
                onClick={handleSaveGoal}
                disabled={goalMutation.isPending || !targetAge.trim()}
                className="w-full py-4 bg-primary text-white font-medium rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                data-testid="button-save-goal"
              >
                {goalMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save Target
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {labSheetOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLabSheetOpen(false)} />
            <motion.div
              className="relative w-full max-w-[428px] bg-white/80 backdrop-blur-xl border border-white/40 rounded-t-[36px] shadow-2xl p-6 pb-10"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              data-testid="sheet-lab-overrides"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Lab Data Overrides</h3>
                <button
                  onClick={() => setLabSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"
                  data-testid="button-close-lab-sheet"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">VO2 Max (ml/kg/min)</label>
                  <input
                    type="number"
                    value={vo2Max}
                    onChange={(e) => setVo2Max(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full px-4 py-3 rounded-2xl border border-black/10 bg-white text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                    data-testid="input-vo2max"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Resting HR (bpm)</label>
                  <input
                    type="number"
                    value={restingHR}
                    onChange={(e) => setRestingHR(e.target.value)}
                    placeholder="e.g. 58"
                    className="w-full px-4 py-3 rounded-2xl border border-black/10 bg-white text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                    data-testid="input-resting-hr"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">HRV (ms)</label>
                  <input
                    type="number"
                    value={hrv}
                    onChange={(e) => setHrv(e.target.value)}
                    placeholder="e.g. 65"
                    className="w-full px-4 py-3 rounded-2xl border border-black/10 bg-white text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                    data-testid="input-hrv"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveLabOverrides}
                disabled={metricsMutation.isPending || (!vo2Max.trim() && !restingHR.trim() && !hrv.trim())}
                className="w-full py-4 bg-primary text-white font-medium rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                data-testid="button-save-lab-overrides"
              >
                {metricsMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save Overrides
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}