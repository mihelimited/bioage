import { BottomNav } from "@/components/layout/BottomNav";
import { User, Bell, Target, Apple, ShieldAlert, ArrowRight, ChevronRight } from "lucide-react";

export default function Settings() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:flex lg:justify-center lg:items-start lg:py-12">
      <div className="w-full lg:max-w-[428px] lg:h-[926px] lg:rounded-[56px] lg:border-[8px] lg:border-white lg:shadow-2xl lg:overflow-hidden relative bg-background">
        
        <div className="h-full overflow-y-auto hide-scrollbar px-6 pt-14 pb-32">
          
          <header className="mb-8">
            <h1 className="font-serif text-3xl text-foreground">Settings</h1>
          </header>

          <div className="space-y-8">
            
            {/* Goal Setting */}
            <section>
              <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-3 ml-2">Your Goal</h2>
              <div className="bg-white rounded-[24px] border border-black/5 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">BioAge Target</div>
                      <div className="text-sm text-muted-foreground">Currently aiming for 25.0</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-black/20" />
                </div>
              </div>
            </section>

            {/* Data Overrides */}
            <section>
              <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-3 ml-2">Data & Overrides</h2>
              <div className="bg-white rounded-[24px] border border-black/5 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                      <Apple className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Apple Health Sync</div>
                      <div className="text-[13px] text-green-600 font-medium">Synced 5 mins ago</div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 flex items-center justify-between bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer">
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

            {/* Notifications */}
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
                  {/* Switch mockup */}
                  <div className="w-12 h-7 bg-primary rounded-full relative shadow-inner">
                    <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              </div>
            </section>

            <button className="w-full py-4 text-red-500 font-medium bg-red-50 rounded-[20px] hover:bg-red-100 transition-colors">
              Log Out
            </button>

          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}