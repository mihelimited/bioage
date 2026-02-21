import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, real, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  age: integer("age").notNull(),
  sex: text("sex").notNull(),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  bioAgeTarget: real("bio_age_target"),
  weeklyNotifications: boolean("weekly_notifications").default(true),
  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const healthMetrics = pgTable("health_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  metricKey: text("metric_key").notNull(),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  isOverride: boolean("is_override").default(false),
  recordedAt: timestamp("recorded_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const bioAgeSnapshots = pgTable("bio_age_snapshots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bioAge: real("bio_age").notNull(),
  chronologicalAge: real("chronological_age").notNull(),
  paceOfAging: real("pace_of_aging").notNull(),
  categoryBreakdown: jsonb("category_breakdown").notNull(),
  calculatedAt: timestamp("calculated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertHealthMetricSchema = createInsertSchema(healthMetrics).omit({ id: true, recordedAt: true });
export const insertBioAgeSnapshotSchema = createInsertSchema(bioAgeSnapshots).omit({ id: true, calculatedAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type HealthMetric = typeof healthMetrics.$inferSelect;
export type InsertHealthMetric = z.infer<typeof insertHealthMetricSchema>;
export type BioAgeSnapshot = typeof bioAgeSnapshots.$inferSelect;
export type InsertBioAgeSnapshot = z.infer<typeof insertBioAgeSnapshotSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
