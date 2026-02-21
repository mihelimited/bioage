import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertHealthMetricSchema } from "@shared/schema";
import { calculateBioAge, ALL_METRIC_KEYS, CATEGORIES, getCategoryLabel } from "./bioage";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── User / Onboarding ───
  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      res.status(201).json(user);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(Number(req.params.id), req.body);
      res.json(user);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ─── Health Metrics ───
  app.get("/api/users/:id/metrics", async (req, res) => {
    const metrics = await storage.getLatestMetrics(Number(req.params.id));
    res.json(metrics);
  });

  app.get("/api/users/:id/metrics/:key/history", async (req, res) => {
    const metrics = await storage.getMetricHistory(Number(req.params.id), req.params.key, 30);
    res.json(metrics);
  });

  app.post("/api/users/:id/metrics", async (req, res) => {
    try {
      const data = insertHealthMetricSchema.parse({
        ...req.body,
        userId: Number(req.params.id),
      });
      const metric = await storage.upsertMetric(data);
      res.status(201).json(metric);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/users/:id/metrics/batch", async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const results = [];
      for (const m of req.body.metrics) {
        const data = insertHealthMetricSchema.parse({ ...m, userId });
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
    const userId = Number(req.params.id);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const metrics = await storage.getLatestMetrics(userId);
    const result = calculateBioAge(user.age, metrics);

    await storage.createSnapshot({
      userId,
      bioAge: result.bioAge,
      chronologicalAge: result.chronologicalAge,
      paceOfAging: result.paceOfAging,
      categoryBreakdown: result.categories,
    });

    const missingCategories = CATEGORIES.filter(
      c => !result.categories.find(rc => rc.category === c)
    ).map(c => ({ category: c, label: getCategoryLabel(c) }));

    res.json({ ...result, missingCategories, target: user.bioAgeTarget });
  });

  app.get("/api/users/:id/bioage/history", async (req, res) => {
    const snapshots = await storage.getSnapshotHistory(Number(req.params.id), 60);
    res.json(snapshots);
  });

  // ─── Chat ───
  app.get("/api/users/:id/conversations", async (req, res) => {
    const convos = await storage.getConversations(Number(req.params.id));
    res.json(convos);
  });

  app.post("/api/users/:id/conversations", async (req, res) => {
    const conv = await storage.createConversation({
      userId: Number(req.params.id),
      title: req.body.title || "New Chat",
    });
    res.status(201).json(conv);
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    await storage.deleteConversation(Number(req.params.id));
    res.status(204).send();
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    const msgs = await storage.getMessages(Number(req.params.id));
    res.json(msgs);
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = Number(req.params.id);
      const { content, userId } = req.body;

      await storage.createMessage({ conversationId, role: "user", content });

      const user = await storage.getUser(userId);
      const metrics = await storage.getLatestMetrics(userId);
      const bioAgeResult = calculateBioAge(user!.age, metrics);

      const existingMessages = await storage.getMessages(conversationId);
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
- Bio-age target: ${user!.bioAgeTarget || "not set"}

Their health data breakdown:
${bioAgeResult.categories.map(c => `${getCategoryLabel(c.category)}: ${c.impact > 0 ? "+" : ""}${c.impact} yrs impact
  ${c.metrics.map(m => `- ${m.key}: ${m.value} ${m.unit} (${m.impact > 0 ? "+" : ""}${m.impact} yrs, ${m.fresh ? "fresh" : "stale data"}${m.isOverride ? ", lab-verified" : ""})`).join("\n  ")}`).join("\n")}

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

      await storage.createMessage({ conversationId, role: "assistant", content: fullResponse });
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
    const user = await storage.updateUser(Number(req.params.id), {
      bioAgeTarget: req.body.bioAgeTarget,
    });
    res.json(user);
  });

  app.patch("/api/users/:id/notifications", async (req, res) => {
    const user = await storage.updateUser(Number(req.params.id), {
      weeklyNotifications: req.body.weeklyNotifications,
    });
    res.json(user);
  });

  // ─── Meta ───
  app.get("/api/meta/categories", (_req, res) => {
    res.json(CATEGORIES.map(c => ({ key: c, label: getCategoryLabel(c) })));
  });

  app.get("/api/meta/metrics", (_req, res) => {
    res.json(ALL_METRIC_KEYS);
  });

  return httpServer;
}
