import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const analyticsEvents = sqliteTable("analytics_events", {
  id: text("id").primaryKey(), sessionId: text("session_id").notNull(), type: text("type").notNull(), page: text("page").notNull(),
  locale: text("locale").notNull(), device: text("device").notNull(), detail: text("detail").notNull(), createdAt: integer("created_at").notNull(),
}, (table) => [index("events_created").on(table.createdAt), index("events_type_created").on(table.type, table.createdAt)]);
export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull(), kind: text("kind").notNull(),
  locale: text("locale").notNull(), status: text("status").notNull(), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
}, (table) => [index("leads_created").on(table.createdAt), index("leads_status_created").on(table.status, table.createdAt)]);
export const requestLimits = sqliteTable("request_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(), expiresAt: integer("expires_at").notNull(),
}, (table) => [index("limits_expiry").on(table.expiresAt)]);
