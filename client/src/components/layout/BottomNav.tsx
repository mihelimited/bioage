import { Link, useLocation } from "wouter";
import { Activity, MessageCircle, Settings } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent z-40">
      <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(160,150,140,0.15)] rounded-full py-2.5 px-6 flex justify-between items-center relative">
        <Link href="/">
          <a className="flex-1 flex justify-center">
            <button className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${location === "/" ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"}`}>
              <Activity className="w-6 h-6" strokeWidth={location === "/" ? 2.5 : 2} />
              {location === "/" && <span className="w-1 h-1 rounded-full bg-primary mt-1 absolute bottom-1" />}
            </button>
          </a>
        </Link>
        
        <Link href="/chat">
          <a className="flex-1 flex justify-center">
            <button className={`w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-accent text-white shadow-md flex items-center justify-center -translate-y-3 hover:scale-105 transition-transform border-4 border-background ${location === "/chat" ? "ring-2 ring-primary/20 ring-offset-2" : ""}`}>
              <MessageCircle className="w-6 h-6" strokeWidth={2} />
            </button>
          </a>
        </Link>

        <Link href="/settings">
          <a className="flex-1 flex justify-center">
            <button className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${location === "/settings" ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"}`}>
              <Settings className="w-6 h-6" strokeWidth={location === "/settings" ? 2.5 : 2} />
              {location === "/settings" && <span className="w-1 h-1 rounded-full bg-primary mt-1 absolute bottom-1" />}
            </button>
          </a>
        </Link>
      </div>
    </div>
  );
}