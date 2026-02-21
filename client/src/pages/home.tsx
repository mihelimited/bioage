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
  Info,
  Sparkles
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showInsight, setShowInsight] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:flex lg:justify-center lg:items-start lg:py-12">
      {/* Mobile Constraint Wrapper for Desktop Viewing */}
      <div className="w-full lg:max-w-[428px] lg:h-[926px] lg:rounded-[56px] lg:border-[8px] lg:border-white lg:shadow-2xl lg:overflow-hidden relative bg-background">
        
        {/* Ambient Pastel Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.15)_0%,transparent_50%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.1)_0%,transparent_50%)] pointer-events-none" />

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto hide-scrollbar px-6 pt-14 pb-32">
          
          {/* 5.1 Top Brand Header */}
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-card shadow-sm flex items-center justify-center border border-white">
                <Sparkles className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
              <span className="font-serif font-medium text-lg tracking-tight text-foreground/90">Aura</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
              <img 
                src="https://i.pravatar.cc/150?u=a042581f4e29026704d" 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-white object-cover" 
              />
            </div>
          </header>

          {/* 5.2 Segmented Control */}
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
                  
                  {/* Hero Headline */}
                  <div className="space-y-2 px-2">
                    <h1 className="font-serif text-4xl leading-[1.15] text-foreground">
                      Your body is<br />feeling younger.
                    </h1>
                    <p className="text-muted-foreground text-base leading-relaxed max-w-[280px]">
                      Based on your recent sleep and activity, you're aging slower than your chronological age.
                    </p>
                  </div>

                  {/* 5.5 Primary "Card" Surface (BioAge Hero) */}
                  <motion.div 
                    whileTap={{ scale: 0.98 }}
                    className="relative bg-card rounded-[36px] p-8 shadow-md border border-white group"
                  >
                    {/* Inner Pastel Wash */}
                    <div className="absolute inset-0 rounded-[36px] bg-gradient-to-br from-primary/10 to-accent/5 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
                        Biological Age
                      </div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="font-serif text-[80px] leading-none tracking-tighter text-foreground text-glow">
                          28
                        </span>
                        <span className="text-2xl text-muted-foreground font-serif">.4</span>
                      </div>
                      
                      <div className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
                        <TrendingDown className="w-3.5 h-3.5" />
                        -3.6 years vs actual
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

                  {/* 5.3 "Chips" Row */}
                  <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-6 px-6">
                    {["Sleep Quality", "HRV Recovery", "V02 Max"].map((chip, i) => (
                      <div key={chip} className="flex-none bg-white rounded-full px-4 py-2 text-sm font-medium text-muted-foreground border border-black/5 shadow-sm whitespace-nowrap">
                        {chip}
                      </div>
                    ))}
                  </div>

                  {/* 5.6 Stats Tiles (3-up row) */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Resting HR", value: "54 bpm", icon: HeartPulse, color: "bg-red-500/10 text-red-500" },
                      { label: "Deep Sleep", value: "2h 15m", icon: Moon, color: "bg-indigo-500/10 text-indigo-500" },
                      { label: "Activity", value: "1.2k cal", icon: Flame, color: "bg-orange-500/10 text-orange-500" }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5 flex flex-col items-center text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${stat.color}`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="text-[11px] font-medium text-muted-foreground mb-1">{stat.label}</div>
                        <div className="font-serif text-lg text-foreground">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  
                </div>
              )}

              {activeTab === "trends" && (
                <div className="space-y-8">
                  <div className="px-2">
                    <h1 className="font-serif text-4xl leading-[1.15] text-foreground">
                      Pacing well.
                    </h1>
                    <p className="text-muted-foreground text-base mt-2">
                      Your aging pace is consistently below average for the last 6 months.
                    </p>
                  </div>
                  
                  <div className="bg-card rounded-[36px] p-6 shadow-md border border-white h-64 flex items-center justify-center">
                    <p className="text-muted-foreground">Trend graph placeholder</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 5.4 Floating Circular Action Buttons (Dock) */}
        <div className="absolute bottom-8 left-0 right-0 px-8 z-40">
          <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-lg rounded-full py-3 px-6 flex justify-between items-center">
            <button className="w-12 h-12 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Activity className="w-6 h-6" strokeWidth={2} />
            </button>
            <button className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-accent text-white shadow-md flex items-center justify-center -translate-y-4 hover:scale-105 transition-transform">
              <Droplets className="w-7 h-7" strokeWidth={2} />
            </button>
            <button className="w-12 h-12 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Info className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 5.7 "Glass"/frosted overlay card (Insight Callout) */}
        <AnimatePresence>
          {showInsight && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-foreground/10 backdrop-blur-[2px] z-50"
                onClick={() => setShowInsight(false)}
              />
              
              {/* Callout Card */}
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 p-4 z-50"
              >
                <div className="glass-card rounded-[36px] p-8 pb-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-black/10 rounded-full mt-3" />
                  
                  <h3 className="font-serif text-2xl mb-4 text-foreground pt-4">Age Calculation</h3>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center pb-4 border-b border-black/5">
                      <span className="text-muted-foreground">Chronological Age</span>
                      <span className="font-medium">32.0</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-black/5">
                      <span className="text-muted-foreground">Sleep Quality Bonus</span>
                      <span className="font-medium text-green-600">-1.8 yrs</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-black/5">
                      <span className="text-muted-foreground">Cardio Fitness (VO2)</span>
                      <span className="font-medium text-green-600">-2.1 yrs</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-medium text-foreground">Biological Age</span>
                      <span className="font-serif text-2xl">28.1</span>
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