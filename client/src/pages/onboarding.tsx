import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ChevronRight, Apple, Heart, Activity } from "lucide-react";

const steps = [
  { id: "intro", title: "Welcome to Aura" },
  { id: "basics", title: "The Basics" },
  { id: "metrics", title: "Your Body" },
  { id: "sync", title: "Connect Data" }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setLocation] = useLocation();

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:flex lg:justify-center lg:items-start lg:py-12">
      <div className="w-full lg:max-w-[428px] lg:h-[926px] lg:rounded-[56px] lg:border-[8px] lg:border-white lg:shadow-2xl lg:overflow-hidden relative bg-background flex flex-col">
        
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.1)_0%,transparent_60%)] pointer-events-none" />

        {/* Progress bar */}
        <div className="pt-16 px-6 pb-4 flex justify-between gap-2 z-10 relative">
          {steps.map((step, idx) => (
            <div key={step.id} className="h-1 flex-1 bg-black/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-foreground"
                initial={{ width: "0%" }}
                animate={{ width: idx <= currentStep ? "100%" : "0%" }}
                transition={{ duration: 0.4 }}
              />
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pt-8 pb-32 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full flex flex-col justify-center"
            >
              {currentStep === 0 && (
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-[32px] mx-auto flex items-center justify-center shadow-lg transform rotate-3">
                    <Heart className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="font-serif text-4xl leading-[1.1] text-foreground">
                    Discover your<br/>true age.
                  </h1>
                  <p className="text-muted-foreground text-lg px-4">
                    Aura analyzes your health data to calculate how fast your body is actually aging.
                  </p>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="font-serif text-3xl mb-2">Let's start with the basics.</h1>
                    <p className="text-muted-foreground">This helps establish your baseline chronological age.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground ml-1">Chronological Age</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 32"
                        className="w-full bg-white border border-black/5 rounded-2xl px-5 py-4 text-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground ml-1">Biological Sex</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button className="bg-primary/10 border border-primary/20 rounded-2xl py-4 font-medium text-foreground">Female</button>
                        <button className="bg-white border border-black/5 rounded-2xl py-4 font-medium text-muted-foreground shadow-sm">Male</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <div>
                    <h1 className="font-serif text-3xl mb-2">Your body composition.</h1>
                    <p className="text-muted-foreground">For more accurate metabolic estimations.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground ml-1">Height</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="170"
                          className="w-full bg-white border border-black/5 rounded-2xl px-5 py-4 text-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">cm</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground ml-1">Weight</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="65"
                          className="w-full bg-white border border-black/5 rounded-2xl px-5 py-4 text-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">kg</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-black rounded-[24px] flex items-center justify-center shadow-lg mb-4">
                    <Apple className="w-10 h-10 text-white" />
                  </div>
                  
                  <div>
                    <h1 className="font-serif text-3xl mb-3">Sync Apple Health</h1>
                    <p className="text-muted-foreground mb-8 px-4">
                      Aura needs access to your sleep, activity, heart rate, and VO2 max to calculate your pace of aging.
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-sm w-full text-left space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center"><Activity className="w-4 h-4" /></div>
                      <span className="font-medium">Activity & Workouts</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center"><Heart className="w-4 h-4" /></div>
                      <span className="font-medium">Heart Rate & HRV</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute bottom-8 left-6 right-6 z-20">
          <button 
            onClick={nextStep}
            className="w-full bg-foreground text-white rounded-full py-4 font-medium text-base hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-black/10"
          >
            {currentStep === 0 ? "Get Started" : currentStep === steps.length - 1 ? "Connect & Finish" : "Continue"}
            <ChevronRight className="w-4 h-4 opacity-50" />
          </button>
        </div>

      </div>
    </div>
  );
}