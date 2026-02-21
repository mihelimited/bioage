import { useState, useRef, useEffect } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sparkles, Send, Bot, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const WELCOME_MESSAGE: Message = {
  id: 0,
  role: "assistant",
  text: "Hi! I'm Aura, your wellness guide. Ask me anything about your health metrics, bio-age, or how to improve your aging pace.",
};

export default function Chat() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForFirstChunk, setIsWaitingForFirstChunk] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userId = typeof window !== "undefined" ? localStorage.getItem("aura_user_id") : null;

  useEffect(() => {
    if (!userId) {
      setLocation("/onboarding");
      return;
    }

    const createConversation = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Chat" }),
        });
        if (res.ok) {
          const data = await res.json();
          conversationIdRef.current = data.id;
        }
      } catch (err) {
        console.error("Failed to create conversation:", err);
      }
    };

    createConversation();
  }, [userId, setLocation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isWaitingForFirstChunk]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !conversationIdRef.current || !userId) return;

    const userMsg: Message = { id: Date.now(), role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setIsWaitingForFirstChunk(true);

    try {
      const res = await fetch(`/api/conversations/${conversationIdRef.current}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, userId }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Stream request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const assistantId = Date.now() + 1;
      let assistantText = "";
      let buffer = "";
      let firstChunkReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.done) continue;
            if (parsed.content) {
              if (!firstChunkReceived) {
                firstChunkReceived = true;
                setIsWaitingForFirstChunk(false);
                setMessages((prev) => [
                  ...prev,
                  { id: assistantId, role: "assistant", text: parsed.content },
                ]);
              } else {
                assistantText += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, text: m.text + parsed.content }
                      : m
                  )
                );
              }
              assistantText = assistantText || parsed.content;
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      if (!firstChunkReceived) {
        setIsWaitingForFirstChunk(false);
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setIsWaitingForFirstChunk(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: "assistant",
          text: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:flex lg:justify-center lg:items-start lg:py-12">
      <div className="w-full lg:max-w-[428px] lg:h-[926px] lg:rounded-[56px] lg:border-[8px] lg:border-white lg:shadow-2xl lg:overflow-hidden relative bg-background flex flex-col">

        <header className="flex items-center gap-3 px-6 pt-14 pb-4 bg-background/80 backdrop-blur-xl border-b border-black/5 z-20">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif font-medium text-lg leading-tight" data-testid="text-chat-title">Aura Guide</h1>
            <p className="text-[13px] text-primary font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Personalized Health AI
            </p>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto hide-scrollbar px-6 py-6 space-y-6"
          data-testid="chat-messages-area"
        >
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`message-${msg.role}-${msg.id}`}
            >
              <div
                className={`max-w-[80%] rounded-[24px] px-5 py-3.5 shadow-sm ${
                  msg.role === "user"
                    ? "bg-foreground text-white rounded-br-[8px]"
                    : "bg-white border border-black/5 text-foreground rounded-bl-[8px]"
                }`}
              >
                <p className="text-[15px] leading-relaxed">{msg.text}</p>
              </div>
            </motion.div>
          ))}

          {isWaitingForFirstChunk && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
              data-testid="typing-indicator"
            >
              <div className="max-w-[80%] rounded-[24px] rounded-bl-[8px] px-5 py-3.5 shadow-sm bg-white border border-black/5">
                <div className="flex items-center gap-1.5">
                  <motion.span
                    className="w-2 h-2 rounded-full bg-primary/40"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="w-2 h-2 rounded-full bg-primary/40"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                  />
                  <motion.span
                    className="w-2 h-2 rounded-full bg-primary/40"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="px-6 pb-32 pt-4 bg-gradient-to-t from-background via-background to-transparent z-10">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about your health..."
              disabled={isStreaming}
              className="w-full bg-white border border-black/10 rounded-full pl-6 pr-14 py-4 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
              data-testid="input-chat-message"
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary"
              data-testid="button-send-message"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}
