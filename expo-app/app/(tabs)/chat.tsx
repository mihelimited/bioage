import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, Bot, Sparkles } from "lucide-react-native";
import { router } from "expo-router";
import { colors, fonts } from "@/lib/theme";
import { apiRequest, API_BASE } from "@/lib/api";
import { getUserId, getAuthToken } from "@/lib/storage";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "assistant",
      content: "Hi! I'm Aura, your wellness guide. Ask me anything about your health metrics, bio-age, or how to improve your aging pace.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const conversationIdRef = useRef<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getUserId().then((id) => {
      if (!id) {
        router.replace("/onboarding");
        return;
      }
      setUserId(id);
      apiRequest("POST", `/api/users/${id}/conversations`, { title: "Chat" })
        .then((res) => res.json())
        .then((conv) => {
          conversationIdRef.current = conv.id;
        });
    });
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !conversationIdRef.current || !userId) return;

    const userMessage: ChatMessage = { id: Date.now(), role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    scrollToBottom();

    const assistantId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/api/conversations/${conversationIdRef.current}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: userMessage.content }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.done) break;
                if (data.content) {
                  fullText += data.content;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
                  );
                  scrollToBottom();
                }
              } catch {}
            }
          }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: "Sorry, something went wrong. Please try again." } : m
        )
      );
    }

    setIsStreaming(false);
    scrollToBottom();
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={s.header}>
        <View style={s.avatarGradient}>
          <Bot size={20} color={colors.white} />
        </View>
        <View>
          <Text style={s.headerTitle}>Aura Guide</Text>
          <View style={s.headerSubRow}>
            <Sparkles size={12} color={colors.primary} />
            <Text style={s.headerSub}>Personalized Health AI</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.chatArea}
        contentContainerStyle={s.chatContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[s.messageBubbleRow, msg.role === "user" ? s.userRow : s.assistantRow]}
          >
            <View style={[s.bubble, msg.role === "user" ? s.userBubble : s.assistantBubble]}>
              <Text style={[s.bubbleText, msg.role === "user" && s.userBubbleText]}>
                {msg.content || (isStreaming ? "..." : "")}
              </Text>
            </View>
          </View>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <View style={s.typingRow}>
            <View style={s.typingDots}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[s.dot, { opacity: 0.3 + i * 0.2 }]} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[s.inputArea, { paddingBottom: insets.bottom + 90 }]}>
        <View style={s.inputRow}>
          <TextInput
            style={s.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your health..."
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            testID="input-chat"
          />
          <TouchableOpacity
            style={[s.sendButton, input.trim() ? s.sendButtonActive : {}]}
            onPress={handleSend}
            disabled={!input.trim() || isStreaming}
            testID="button-send"
          >
            <Send size={16} color={input.trim() ? colors.white : colors.primary} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 24, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    backgroundColor: "rgba(251,249,246,0.9)",
  },
  avatarGradient: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.foreground },
  headerSubRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerSub: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.primary },
  chatArea: { flex: 1 },
  chatContent: { padding: 24, gap: 16 },
  messageBubbleRow: { flexDirection: "row" },
  userRow: { justifyContent: "flex-end" },
  assistantRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 14, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  userBubble: { backgroundColor: colors.foreground, borderBottomRightRadius: 8 },
  assistantBubble: { backgroundColor: colors.white, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", borderBottomLeftRadius: 8 },
  bubbleText: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.foreground },
  userBubbleText: { color: colors.white },
  typingRow: { flexDirection: "row", justifyContent: "flex-start" },
  typingDots: { flexDirection: "row", gap: 4, backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.mutedForeground },
  inputArea: { paddingHorizontal: 24, paddingTop: 12 },
  inputRow: { position: "relative" },
  textInput: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 9999, paddingLeft: 24, paddingRight: 56, paddingVertical: 16,
    fontFamily: fonts.sans, fontSize: 15, color: colors.foreground,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  sendButton: {
    position: "absolute", right: 8, top: 8,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(242,191,176,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  sendButtonActive: { backgroundColor: colors.primary },
});
