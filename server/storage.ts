import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  users, healthMetrics, bioAgeSnapshots, conversations, messages,
  type User, type InsertUser,
  type HealthMetric, type InsertHealthMetric,
  type BioAgeSnapshot, type InsertBioAgeSnapshot,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
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
  deleteConversation(id: number): Promise<void>;
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
}

class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
}

export const storage = new DatabaseStorage();
