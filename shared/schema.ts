import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";
export * from "./models/auth";

// === TABLE DEFINITIONS ===

// Video table
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(), // The object storage URL (or path)
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size"),
  uploadedBy: varchar("uploaded_by").references(() => users.id), // Link to auth users
  createdAt: timestamp("created_at").defaultNow(),
  isFavorite: boolean("is_favorite").default(false),
  // Optional: add metadata like duration if we can extract it later
});

// === BASE SCHEMAS ===
export const insertVideoSchema = createInsertSchema(videos).omit({ 
  id: true, 
  createdAt: true, 
  uploadedBy: true // Set on backend from session
});

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;

// Request types
export type CreateVideoRequest = InsertVideo; // Metadata for upload
export type UpdateVideoRequest = Partial<InsertVideo>; 
export type ToggleVideoFavoriteRequest = { isFavorite: boolean };

// Response types
export type VideoResponse = Video;
export type VideosListResponse = Video[];

// Upload presigned URL types (matching object storage blueprint)
export type UploadUrlRequest = {
  name: string;
  size: number;
  contentType: string;
};

export type UploadUrlResponse = {
  uploadURL: string;
  objectPath: string;
  metadata: {
    name: string;
    size: number;
    contentType: string;
  };
};
