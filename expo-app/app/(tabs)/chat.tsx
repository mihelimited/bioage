import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Animated,
  Keyboard, Modal, Pressable, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, Bot, Sparkles, Clock, Plus, Trash2 } from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { colors, fonts } from "@/lib/theme";
import { apiRequest, API_BASE } from "@/lib/api";
import { getUserId, getAuthToken } from "@/lib/storage";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

function renderMarkdown(text: string, isUser: boolean) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const isBullet = /^[-•*]\s/.test(line.trim());
    const content = isBullet ? line.trim().replace(/^[-•*]\s/, "") : line;

    // Parse inline formatting: **bold** and *italic*
    const parts: { text: string; bold?: boolean; italic?: boolean }[] = [];
    let remaining = content;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

      const firstMatch = [boldMatch, italicMatch]
        .filter(Boolean)
        .sort((a, b) => (a!.index ?? 0) - (b!.index ?? 0))[0];

      if (!firstMatch || firstMatch.index === undefined) {
        parts.push({ text: remaining });
        break;
      }

      if (firstMatch.index > 0) {
        parts.push({ text: remaining.slice(0, firstMatch.index) });
      }
      parts.push({
        text: firstMatch[1],
        bold: firstMatch === boldMatch,
        italic: firstMatch === italicMatch,
      });
      remaining = remaining.slice(firstMatch.index + firstMatch[0].length);
    }

    return (
      <Text key={lineIdx} style={[s.bubbleText, isUser && s.userBubbleText, lineIdx > 0 && { marginTop: 2 }]}>
        {isBullet && "  •  "}
        {parts.map((p, i) => (
          <Text
            key={i}
            style={[
              p.bold && { fontFamily: fonts.sansBold },
              p.italic && { fontStyle: "italic" },
            ]}
          >
            {p.text}
          </Text>
        ))}
      </Text>
    );
  });
}

function TypingDots() {
  const anims = useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={s.typingRow}>
      <View style={s.typingDots}>
        {anims.map((anim, i) => (
          <Animated.View key={i} style={[s.dot, { opacity: anim }]} />
        ))}
      </View>
    </View>
  );
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
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

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardWillShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardWillHide", () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const welcomeMessage: ChatMessage = {
    id: 0,
    role: "assistant",
    content: "Hi! I'm Aura, your wellness guide. Ask me anything about your health metrics, bio-age, or how to improve your aging pace.",
  };

  const loadConversations = async () => {
    if (!userId) return;
    try {
      const res = await apiRequest("GET", `/api/users/${userId}/conversations`);
      const convos = await res.json();
      setHistoryList(convos);
    } catch (e) {
      console.error("Failed to load conversations:", e);
    }
  };

  const loadConversation = async (convId: number) => {
    try {
      const res = await apiRequest("GET", `/api/conversations/${convId}/messages`);
      const msgs = await res.json();
      conversationIdRef.current = convId;
      setMessages([
        welcomeMessage,
        ...msgs.map((m: any) => ({ id: m.id, role: m.role, content: m.content })),
      ]);
      setShowHistory(false);
      scrollToBottom();
    } catch (e) {
      console.error("Failed to load conversation:", e);
    }
  };

  const startNewConversation = async () => {
    if (!userId) return;
    try {
      const res = await apiRequest("POST", `/api/users/${userId}/conversations`, { title: "Chat" });
      const conv = await res.json();
      conversationIdRef.current = conv.id;
      setMessages([welcomeMessage]);
      setShowHistory(false);
    } catch (e) {
      console.error("Failed to create conversation:", e);
    }
  };

  const deleteConversation = async (convId: number) => {
    try {
      await apiRequest("DELETE", `/api/conversations/${convId}`);
      setHistoryList((prev) => prev.filter((c) => c.id !== convId));
      if (conversationIdRef.current === convId) {
        await startNewConversation();
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  };

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

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      // React Native doesn't support ReadableStream / getReader().
      // Read the full SSE response as text, then parse all data lines.
      const raw = await res.text();
      const lines = raw.split("\n");
      let fullText = "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.content) {
              fullText += data.content;
            }
          } catch {}
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: fullText || "I couldn't generate a response. Please try again." } : m))
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scrollToBottom();
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
        <View style={s.headerLeft}>
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
        <TouchableOpacity
          style={s.historyButton}
          onPress={() => { loadConversations(); setShowHistory(true); }}
          testID="button-history"
        >
          <Clock size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={s.chatArea}
        contentContainerStyle={s.chatContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => {
          // Hide the empty assistant placeholder while streaming - typing dots shown instead
          if (msg.role === "assistant" && !msg.content && isStreaming) return null;
          return (
            <View
              key={msg.id}
              style={[s.messageBubbleRow, msg.role === "user" ? s.userRow : s.assistantRow]}
            >
              <View style={[s.bubble, msg.role === "user" ? s.userBubble : s.assistantBubble]}>
                {msg.role === "user" ? (
                  <Text style={[s.bubbleText, s.userBubbleText]}>{msg.content}</Text>
                ) : (
                  renderMarkdown(msg.content, false)
                )}
              </View>
            </View>
          );
        })}

        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <TypingDots />
        )}
      </ScrollView>

      <View style={[s.inputArea, { paddingBottom: keyboardVisible ? 8 : insets.bottom + 90 }]}>
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
      <Modal visible={showHistory} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowHistory(false)}>
          <Pressable style={s.historySheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.historyHandle} />
            <View style={s.historyHeader}>
              <Text style={s.historyTitle}>Chat History</Text>
              <TouchableOpacity style={s.newChatButton} onPress={startNewConversation}>
                <Plus size={16} color={colors.white} />
                <Text style={s.newChatText}>New Chat</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={s.historyScroll} showsVerticalScrollIndicator={false}>
              {historyList.length === 0 && (
                <Text style={s.historyEmpty}>No previous conversations.</Text>
              )}
              {historyList.map((conv) => (
                <View key={conv.id} style={s.historyItem}>
                  <TouchableOpacity
                    style={s.historyItemContent}
                    onPress={() => loadConversation(conv.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.historyItemTitle} numberOfLines={1}>
                      {conv.title || "Chat"}
                    </Text>
                    <Text style={s.historyItemDate}>
                      {new Date(conv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.historyDeleteBtn}
                    onPress={() => Alert.alert("Delete chat?", "This will permanently delete this conversation.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteConversation(conv.id) },
                    ])}
                  >
                    <Trash2 size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    backgroundColor: "rgba(251,249,246,0.9)",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  historyButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(240,237,232,0.8)",
    justifyContent: "center", alignItems: "center",
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
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.1)" },
  historySheet: {
    backgroundColor: "rgba(255,255,255,0.97)", borderTopLeftRadius: 36, borderTopRightRadius: 36,
    padding: 32, paddingBottom: 40, maxHeight: "70%",
  },
  historyHandle: {
    width: 48, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.1)",
    alignSelf: "center", marginBottom: 24,
  },
  historyHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
  },
  historyTitle: { fontFamily: fonts.serif, fontSize: 24, color: colors.foreground },
  newChatButton: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.foreground, borderRadius: 9999,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  newChatText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.white },
  historyScroll: { maxHeight: 400 },
  historyEmpty: { fontFamily: fonts.sans, fontSize: 14, color: colors.mutedForeground, textAlign: "center", paddingVertical: 32 },
  historyItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.05)",
  },
  historyItemContent: { flex: 1 },
  historyItemTitle: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.foreground },
  historyItemDate: { fontFamily: fonts.sans, fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  historyDeleteBtn: { padding: 8 },
});
