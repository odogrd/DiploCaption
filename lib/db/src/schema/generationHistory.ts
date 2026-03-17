import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const generationHistoryTable = pgTable("generation_history", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  mapType: text("map_type").notNull(),
  contextNotes: text("context_notes"),
  imageThumbnail: text("image_thumbnail"),
  captionsJson: text("captions_json").notNull(),
});

export const insertGenerationHistorySchema = createInsertSchema(generationHistoryTable).omit({ id: true, createdAt: true });
export type InsertGenerationHistory = z.infer<typeof insertGenerationHistorySchema>;
export type GenerationHistory = typeof generationHistoryTable.$inferSelect;
