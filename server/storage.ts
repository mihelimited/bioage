import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  users, healthMetrics, bioAgeSnapshots, conversations, messages,
  type User, type InsertUser,
  type HealthMetric, type InsertHealthMetric,
  type BioAgeSnapshot, type InsertBioAgeSnapshot,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
} from "@shared/schema";

export interface RecentMessage {
  role: string;
  content: string;
  conversationId: number;
  createdAt: Date;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;

  getLatestMetrics(userId: number): Promise<HealthMetric[]>;
  getMetricHistory(userId: number, metricKey: string, limit?: number): Promise<HealthMetric[]>;
  upsertMetric(metric: InsertHealthMetric): Promise<HealthMetric>;

  getLatestSnapshot(userId: number): Promise<BioAgeSnapshot | undefined>;
  getSnapshotHistory(userId: number, limit?: number): Promise<BioAgeSnapshot[]>;
  createSnapshot(snapshot: InsertBioAgeSnapshot): Promise<BioAgeSnapshot>;

  getConversations(userId: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conv: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, data: Partial<{ title: string }>): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
  getRecentUserMessages(userId: number, limit?: number): Promise<RecentMessage[]>;
  getMetricAverages(userId: number): Promise<Record<string, { week: number | null; month: number | null; sixMonth: number | null }>>;
}

class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getLatestMetrics(userId: number): Promise<HealthMetric[]> {
    const allMetrics = await db.select().from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.recordedAt));
    const seen = new Set<string>();
    const latest: HealthMetric[] = [];
    for (const m of allMetrics) {
      if (!seen.has(m.metricKey)) {
        seen.add(m.metricKey);
        latest.push(m);
      }
    }
    return latest;
  }

  async getMetricHistory(userId: number, metricKey: string, limit = 30): Promise<HealthMetric[]> {
    return db.select().from(healthMetrics)
      .where(and(eq(healthMetrics.userId, userId), eq(healthMetrics.metricKey, metricKey)))
      .orderBy(desc(healthMetrics.recordedAt))
      .limit(limit);
  }

  async upsertMetric(metric: InsertHealthMetric): Promise<HealthMetric> {
    // Check if a record exists for the same user + metricKey today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await db.select().from(healthMetrics)
      .where(and(
        eq(healthMetrics.userId, metric.userId),
        eq(healthMetrics.metricKey, metric.metricKey),
        sql`${healthMetrics.recordedAt} >= ${today}`,
        sql`${healthMetrics.recordedAt} < ${tomorrow}`,
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record for today
      const [updated] = await db.update(healthMetrics)
        .set({ value: metric.value, unit: metric.unit, category: metric.category, isOverride: metric.isOverride })
        .where(eq(healthMetrics.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(healthMetrics).values(metric).returning();
    return created;
  }

  async getLatestSnapshot(userId: number): Promise<BioAgeSnapshot | undefined> {
    const [snapshot] = await db.select().from(bioAgeSnapshots)
      .where(eq(bioAgeSnapshots.userId, userId))
      .orderBy(desc(bioAgeSnapshots.calculatedAt))
      .limit(1);
    return snapshot;
  }

  async getSnapshotHistory(userId: number, limit = 30): Promise<BioAgeSnapshot[]> {
    return db.select().from(bioAgeSnapshots)
      .where(eq(bioAgeSnapshots.userId, userId))
      .orderBy(desc(bioAgeSnapshots.calculatedAt))
      .limit(limit);
  }

  async createSnapshot(snapshot: InsertBioAgeSnapshot): Promise<BioAgeSnapshot> {
    const [created] = await db.insert(bioAgeSnapshots).values(snapshot).returning();
    return created;
  }

  async getConversations(userId: number): Promise<Conversation[]> {
    return db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv;
  }

  async createConversation(conv: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conv).returning();
    return created;
  }

  async updateConversation(id: number, data: Partial<{ title: string }>): Promise<Conversation> {
    const [updated] = await db.update(conversations).set(data).where(eq(conversations.id, id)).returning();
    return updated;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(msg).returning();
    return created;
  }

  async getRecentUserMessages(userId: number, limit = 50): Promise<RecentMessage[]> {
    const userConvos = await db.select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, userId));
    if (userConvos.length === 0) return [];

    const convoIds = userConvos.map(c => c.id);
    const allMessages = await db.select({
      role: messages.role,
      content: messages.content,
      conversationId: messages.conversationId,
      createdAt: messages.createdAt,
    })
      .from(messages)
      .where(
        convoIds.length === 1
          ? eq(messages.conversationId, convoIds[0])
          : sql`${messages.conversationId} IN (${sql.join(convoIds.map(id => sql`${id}`), sql`, `)})`
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return allMessages.reverse();
  }

  async getMetricAverages(userId: number): Promise<Record<string, { week: number | null; month: number | null; sixMonth: number | null }>> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixMonthAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const rows = await db.select({
      metricKey: healthMetrics.metricKey,
      value: healthMetrics.value,
      recordedAt: healthMetrics.recordedAt,
    })
      .from(healthMetrics)
      .where(and(
        eq(healthMetrics.userId, userId),
        sql`${healthMetrics.recordedAt} >= ${sixMonthAgo}`,
      ))
      .orderBy(desc(healthMetrics.recordedAt));

    const byKey: Record<string, Array<{ value: number; recordedAt: Date }>> = {};
    for (const row of rows) {
      if (!byKey[row.metricKey]) byKey[row.metricKey] = [];
      byKey[row.metricKey].push({ value: row.value, recordedAt: row.recordedAt });
    }

    const result: Record<string, { week: number | null; month: number | null; sixMonth: number | null }> = {};
    for (const [key, entries] of Object.entries(byKey)) {
      const avg = (items: typeof entries) => items.length > 0 ? Math.round(items.reduce((s, e) => s + e.value, 0) / items.length * 10) / 10 : null;
      result[key] = {
        week: avg(entries.filter(e => e.recordedAt >= weekAgo)),
        month: avg(entries.filter(e => e.recordedAt >= monthAgo)),
        sixMonth: avg(entries),
      };
    }
    return result;
  }
}

export const storage = new DatabaseStorage();
