import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Clock
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showInsight, setShowInsight] = useState(false);
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:flex lg:justify-center lg:items-start lg:py-12">
      <div className="w-full lg:max-w-[428px] lg:h-[926px] lg:rounded-[56px] lg:border-[8px] lg:border-white lg:shadow-2xl lg:overflow-hidden relative bg-background">
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.15)_0%,transparent_50%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.1)_0%,transparent_50%)] pointer-events-none" />

        <div className="h-full overflow-y-auto hide-scrollbar px-6 pt-14 pb-32">
          
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-card shadow-sm flex items-center justify-center border border-white">
                <Sparkles className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
              <span className="font-serif font-medium text-lg tracking-tight text-foreground/90">Aura</span>
            </div>
            <button 
              onClick={() => setShowShare(true)}
              className="w-10 h-10 rounded-full bg-white border border-black/5 shadow-sm flex items-center justify-center hover:bg-secondary/80 transition-colors text-foreground"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </header>

          <div className="flex bg-secondary/50 p-1.5 rounded-[32px] mb-8 relative z-10">
            {["overview", "trends"].map((tab) => (
              <button
                key={tab}
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
                  
                  {/* Pace of Aging Headline */}
                  <div className="space-y-2 px-2">
                    <div className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-700 px-3 py-1 rounded-full text-xs font-medium mb-1">
                      <TrendingDown className="w-3 h-3" />
                      Pace of aging: 0.82 yrs/yr
                    </div>
                    <h1 className="font-serif text-4xl leading-[1.15] text-foreground">
                      Your body is<br />feeling younger.
                    </h1>
                    <p className="text-muted-foreground text-sm max-w-[280px]">
                      Target: 25.0 • Chronological: 32.0
                    </p>
                  </div>

                  {/* BioAge Hero */}
                  <motion.div 
                    whileTap={{ scale: 0.98 }}
                    className="relative bg-card rounded-[36px] p-8 shadow-md border border-white group"
                  >
                    <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-primary/10 to-accent/5 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                        Biological Age
                        <span className="w-2 h-2 rounded-full bg-green-400" title="Data fresh" />
                      </div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="font-serif text-[80px] leading-none tracking-tighter text-foreground text-glow">
                          28
                        </span>
                        <span className="text-2xl text-muted-foreground font-serif">.4</span>
                      </div>
                      
                      <div className="text-muted-foreground text-sm font-medium mb-6">
                        <span className="text-green-600 font-bold">-3.6 years</span> vs actual age
                      </div>

                      <button 
                        onClick={() => setShowInsight(true)}
                        className="flex items-center gap-2 text-sm font-medium text-foreground bg-secondary/80 hover:bg-secondary px-5 py-3 rounded-full transition-colors w-full justify-center"
                      >
                        See calculation breakdown
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>
                    </div>
                  </motion.div>

                  {/* Contributing Factors by Category */}
                  <div className="space-y-4">
                    <h2 className="font-serif text-xl px-2 pt-2">Contributing Factors</h2>
                    
                    {/* Cardiovascular */}
                    <div className="bg-white rounded-[28px] p-5 shadow-sm border border-black/5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                            <HeartPulse className="w-4 h-4" />
                          </div>
                          <span className="font-medium">Cardiovascular</span>
                        </div>
                        <span className="text-green-600 font-medium text-sm">-1.2 yrs</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-secondary/30 rounded-2xl p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-muted-foreground">VO2 Max</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          </div>
                          <div className="font-serif text-lg">45 <span className="text-xs text-muted-foreground font-sans">ml/kg/min</span></div>
                        </div>
                        <div className="bg-secondary/30 rounded-2xl p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-muted-foreground">Resting HR</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          </div>
                          <div className="font-serif text-lg">54 <span className="text-xs text-muted-foreground font-sans">bpm</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Sleep & Recovery */}
                    <div className="bg-white rounded-[28px] p-5 shadow-sm border border-black/5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <Moon className="w-4 h-4" />
                          </div>
                          <span className="font-medium">Sleep & Recovery</span>
                        </div>
                        <span className="text-green-600 font-medium text-sm">-1.8 yrs</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-secondary/30 rounded-2xl p-3 relative overflow-hidden">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-muted-foreground">Deep Sleep</span>
                            <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                          </div>
                          <div className="font-serif text-lg">1h 10m</div>
                          <div className="absolute top-0 right-0 p-1">
                            <div className="bg-orange-100 text-orange-700 text-[10px] px-1.5 rounded-full flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> Stale
                            </div>
                          </div>
                        </div>
                        <div className="bg-secondary/30 rounded-2xl p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs text-muted-foreground">HRV</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          </div>
                          <div className="font-serif text-lg">68 <span className="text-xs text-muted-foreground font-sans">ms</span></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Activity */}
                    <div className="bg-white rounded-[28px] p-5 shadow-sm border border-black/5 opacity-75">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <Flame className="w-4 h-4" />
                          </div>
                          <span className="font-medium">Activity</span>
                        </div>
                        <span className="text-muted-foreground font-medium text-sm">Need data</span>
                      </div>
                      <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-2xl flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Wear watch during workouts to track this category.
                      </div>
                    </div>

                  </div>
                  
                </div>
              )}

              {activeTab === "trends" && (
                <div className="space-y-8">
                  <div className="px-2">
                    <div className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-700 px-3 py-1 rounded-full text-xs font-medium mb-1">
                      <TrendingDown className="w-3 h-3" />
                      Pace of aging: 0.82
                    </div>
                    <h1 className="font-serif text-4xl leading-[1.15] text-foreground">
                      Pacing well.
                    </h1>
                    <p className="text-muted-foreground text-sm mt-2">
                      Your aging pace is consistently below average for the last 6 months.
                    </p>
                  </div>
                  
                  <div className="bg-card rounded-[36px] p-6 shadow-md border border-white h-64 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/10 to-transparent" />
                    <p className="text-muted-foreground font-medium z-10">6-Month Trend Chart Mockup</p>
                    {/* Decorative curved line for mockup */}
                    <svg className="absolute inset-0 w-full h-full stroke-primary z-0" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M0,80 Q25,60 50,70 T100,30" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <BottomNav />

        {/* Share Overlay */}
        <AnimatePresence>
          {showShare && (
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
              >
                <div className="glass-card rounded-[36px] p-8 pb-10 shadow-2xl relative overflow-hidden text-center">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/10 rounded-full mt-3" />
                  
                  <div className="w-full bg-gradient-to-br from-primary to-accent rounded-[24px] p-8 text-white shadow-inner mb-6 mt-4">
                    <Sparkles className="w-6 h-6 mb-4 opacity-80 mx-auto" />
                    <div className="font-serif text-5xl mb-2">28.4</div>
                    <div className="text-sm font-medium opacity-90 uppercase tracking-widest">Biological Age</div>
                    <div className="mt-6 text-xs opacity-75">via Aura Wellness</div>
                  </div>

                  <button 
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

        {/* Insight Callout */}
        <AnimatePresence>
          {showInsight && (
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
              >
                <div className="glass-card rounded-[36px] p-8 pb-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/10 rounded-full mt-3" />
                  
                  <h3 className="font-serif text-2xl mb-4 text-foreground pt-4">Calculation Impact</h3>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center pb-4 border-b border-black/5">
                      <span className="text-muted-foreground">Chronological Age</span>
                      <span className="font-medium">32.0</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-black/5">
                      <span className="text-muted-foreground">Sleep & Recovery</span>
                      <span className="font-medium text-green-600">-1.8 yrs</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-black/5">
                      <span className="text-muted-foreground">Cardiovascular</span>
                      <span className="font-medium text-green-600">-1.2 yrs</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-black/5">
                      <span className="text-muted-foreground">Body Composition</span>
                      <span className="font-medium text-green-600">-0.6 yrs</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-medium text-foreground">Biological Age</span>
                      <span className="font-serif text-2xl">28.4</span>
                    </div>
                  </div>

                  <button 
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