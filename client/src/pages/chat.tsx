import { useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sparkles, Send, Bot } from "lucide-react";
import { motion } from "framer-motion";

export default function Chat() {
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", text: "Hi! Your VO2 Max has been looking great lately, which is pulling your BioAge down. But I noticed your sleep quality dropped this week. How are you feeling?" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now(), role: "user", text: input }]);
    setInput("");
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        role: "assistant", 
        text: "That makes sense. Missing sleep affects your HRV recovery, which temporarily spikes your pace of aging. Try getting to bed 30 mins earlier tonight to help your body recover." 
      }]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:flex lg:justify-center lg:items-start lg:py-12">
      <div className="w-full lg:max-w-[428px] lg:h-[926px] lg:rounded-[56px] lg:border-[8px] lg:border-white lg:shadow-2xl lg:overflow-hidden relative bg-background flex flex-col">
        
        {/* Header */}
        <header className="flex items-center gap-3 px-6 pt-14 pb-4 bg-background/80 backdrop-blur-xl border-b border-black/5 z-20">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif font-medium text-lg leading-tight">Aura Guide</h1>
            <p className="text-[13px] text-primary font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Personalized Health AI
            </p>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-6 space-y-6">
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-[24px] px-5 py-3.5 shadow-sm ${
                msg.role === "user" 
                  ? "bg-foreground text-white rounded-br-[8px]" 
                  : "bg-white border border-black/5 text-foreground rounded-bl-[8px]"
              }`}>
                <p className="text-[15px] leading-relaxed">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input Area */}
        <div className="px-6 pb-32 pt-4 bg-gradient-to-t from-background via-background to-transparent z-10">
          <div className="relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about your health..."
              className="w-full bg-white border border-black/10 rounded-full pl-6 pr-14 py-4 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button 
              onClick={handleSend}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}