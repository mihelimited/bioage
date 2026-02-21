import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertHealthMetricSchema, registerUserSchema, loginSchema } from "@shared/schema";
import { calculateBioAge, ALL_DOMAINS, DOMAIN_LABELS, type Domain } from "./bioage";
import { hashPassword, verifyPassword, generateToken, authenticateToken } from "./auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ─── Rate Limiting ───
const chatRateMap = new Map<number, number[]>();
const CHAT_RATE_LIMIT = 20;
const CHAT_RATE_WINDOW_MS = 60_000;

function checkChatRate(userId: number): boolean {
  const now = Date.now();
  const timestamps = chatRateMap.get(userId) ?? [];
  const recent = timestamps.filter(t => now - t < CHAT_RATE_WINDOW_MS);
  if (recent.length >= CHAT_RATE_LIMIT) return false;
  recent.push(now);
  chatRateMap.set(userId, recent);
  return true;
}

// ─── Ownership Helper ───
function requireOwnership(reqUserId: number | undefined, resourceUserId: number, res: any): boolean {
  if (reqUserId !== resourceUserId) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── Auth (public) ───
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const passwordHash = await hashPassword(data.password);
      const { password, ...userData } = data;
      const user = await storage.createUser({ ...userData, passwordHash } as any);
      const token = generateToken(user.id);
      res.status(201).json({ user, token });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const valid = await verifyPassword(data.password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = generateToken(user.id);
      res.json({ user, token });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ─── Meta (public) ───
  app.get("/api/meta/domains", (_req, res) => {
    res.json(ALL_DOMAINS.map(d => ({ key: d, label: DOMAIN_LABELS[d] })));
  });

  // ═══ All routes below require authentication ═══
  app.use("/api/users", authenticateToken);
  app.use("/api/conversations", authenticateToken);

  // ─── User / Onboarding ───
  app.get("/api/users/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!requireOwnership(req.userId, id, res)) return;
    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!requireOwnership(req.userId, id, res)) return;
      const user = await storage.updateUser(id, req.body);
      res.json(user);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ─── Health Metrics ───
  app.get("/api/users/:id/metrics", async (req, res) => {
    const id = Number(req.params.id);
    if (!requireOwnership(req.userId, id, res)) return;
    const metrics = await storage.getLatestMetrics(id);
    res.json(metrics);
  });

  app.get("/api/users/:id/metrics/:key/history", async (req, res) => {
    const id = Number(req.params.id);
    if (!requireOwnership(req.userId, id, res)) return;
    const metrics = await storage.getMetricHistory(id, req.params.key, 30);
    res.json(metrics);
  });

  app.post("/api/users/:id/metrics", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!requireOwnership(req.userId, id, res)) return;
      const data = insertHealthMetricSchema.parse({
        ...req.body,
        userId: id,
      });
      const metric = await storage.upsertMetric(data);
      res.status(201).json(metric);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/users/:id/metrics/batch", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!requireOwnership(req.userId, id, res)) return;
      const results = [];
      for (const m of req.body.metrics) {
        const data = insertHealthMetricSchema.parse({ ...m, userId: id });
        const metric = await storage.upsertMetric(data);
        results.push(metric);
      }
      res.status(201).json(results);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ─── BioAge Calculation ───
  app.get("/api/users/:id/bioage", async (req, res) => {
    const id = Number(req.params.id);
    if (!requireOwnership(req.userId, id, res)) return;

    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const metrics = await storage.getLatestMetrics(id);
    const result = calculateBioAge(user.age, metrics);

    await storage.createSnapshot({
      userId: id,
      bioAge: result.bioAge,
      chronologicalAge: result.chronologicalAge,
      paceOfAging: result.paceOfAging,
      categoryBreakdown: result.domains,
    });

    const missingDomains = ALL_DOMAINS.filter(
      d => !result.domains.find(rd => rd.domain === d)
    ).map(d => ({ domain: d, label: DOMAIN_LABELS[d] }));

    res.json({ ...result, missingDomains, target: user.bioAgeTarget });
  });

  app.get("/api/users/:id/bioage/history", async (req, res) => {
    const id = Number(req.params.id);
    if (!requireOwnership(req.userId, id, res)) return;
    const snapshots = await storage.getSnapshotHistory(id, 60);
    res.json(snapshots);
  });

  // ─── Chat ───
  app.get("/api/users/:id/conversations", async (req, res) => {
    const id = Number(req.params.id);
    if (!requireOwnership(req.userId, id, res)) return;
    const convos = await storage.getConversations(id);
    res.json(convos);
  });

  app.post("/api/users/:id/conversations", async (req, res) => {
    const id = Number(req.params.id);
    if (!requireOwnership(req.userId, id, res)) return;
    const conv = await storage.createConversation({
      userId: id,
      title: req.body.title || "New Chat",
    });
    res.status(201).json(conv);
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    const convId = Number(req.params.id);
    const conv = await storage.getConversation(convId);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    if (!requireOwnership(req.userId, conv.userId, res)) return;
    await storage.deleteConversation(convId);
    res.status(204).send();
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    const convId = Number(req.params.id);
    const conv = await storage.getConversation(convId);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });
    if (!requireOwnership(req.userId, conv.userId, res)) return;
    const msgs = await storage.getMessages(convId);
    res.json(msgs);
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const convId = Number(req.params.id);
      const conv = await storage.getConversation(convId);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      if (!requireOwnership(req.userId, conv.userId, res)) return;

      const userId = req.userId!;
      if (!checkChatRate(userId)) {
        return res.status(429).json({ error: "Rate limit exceeded. Max 20 messages per minute." });
      }

      const { content } = req.body;
      await storage.createMessage({ conversationId: convId, role: "user", content });

      const user = await storage.getUser(userId);
      const metrics = await storage.getLatestMetrics(userId);
      const bioAgeResult = calculateBioAge(user!.age, metrics);

      const existingMessages = await storage.getMessages(convId);
      const chatHistory = existingMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const systemPrompt = `You are Aura, a warm and knowledgeable wellness AI assistant inside a biological age tracking app.
The user's profile:
- Chronological age: ${user!.age}
- Sex: ${user!.sex}
- Height: ${user!.heightCm}cm, Weight: ${user!.weightKg}kg
- Current bio-age: ${bioAgeResult.bioAge} (${bioAgeResult.bioAge < user!.age ? "younger" : "older"} than actual)
- Pace of aging: ${bioAgeResult.paceOfAging} years per year
- Age gap: ${bioAgeResult.ageGap} years
- Bio-age target: ${user!.bioAgeTarget || "not set"}

Their health data by domain:
${bioAgeResult.domains.map(d => `${DOMAIN_LABELS[d.domain]}: gap ${d.gap > 0 ? "+" : ""}${d.gap} yrs (quality: ${Math.round(d.quality * 100)}%, weight: ${Math.round(d.weight * 100)}%)
  ${d.metrics.map(m => `- ${m.key}: ${m.value} ${m.unit} (${m.fresh ? "fresh" : "stale data"}${m.isOverride ? ", lab-verified" : ""})`).join("\n  ")}`).join("\n")}

Guidelines:
- Give specific, actionable advice based on their actual metrics
- Reference their specific numbers when relevant
- Be encouraging but honest about areas needing improvement
- Keep responses concise (2-3 short paragraphs max)
- If asked about something outside health/wellness, gently redirect`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
        ],
        stream: true,
        max_tokens: 500,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      }

      await storage.createMessage({ conversationId: convId, role: "assistant", content: fullResponse });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (e: any) {
      console.error("Chat error:", e);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: e.message });
      }
    }
  });

  // ─── Settings ───
  app.patch("/api/users/:id/goal", async (req, res) => {
    const id = Number(req.params.id);
    if (!requireOwnership(req.userId, id, res)) return;
    const user = await storage.updateUser(id, {
      bioAgeTarget: req.body.bioAgeTarget,
    });
    res.json(user);
  });

  app.patch("/api/users/:id/notifications", async (req, res) => {
    const id = Number(req.params.id);
    if (!requireOwnership(req.userId, id, res)) return;
    const user = await storage.updateUser(id, {
      weeklyNotifications: req.body.weeklyNotifications,
    });
    res.json(user);
  });

  return httpServer;
}
