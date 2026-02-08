import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Sessions table for express-session
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Users table (kept from auth integration but simplified)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PIN auth table - single row for Madeline's PIN
export const pinAuth = pgTable("pin_auth", {
  id: serial("id").primaryKey(),
  pin: text("pin").notNull(),
  mustReset: boolean("must_reset").default(true),
  name: text("name").notNull().default("Madeline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video table
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size"),
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
  isFavorite: boolean("is_favorite").default(false),
});

// === BASE SCHEMAS ===
export const insertVideoSchema = createInsertSchema(videos).omit({ 
  id: true, 
  createdAt: true, 
  uploadedBy: true
});

// === EXPLICIT API CONTRACT TYPES ===

// PIN Auth types
export type PinAuth = typeof pinAuth.$inferSelect;

// Base types
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;

// Request types
export type CreateVideoRequest = InsertVideo;
export type UpdateVideoRequest = Partial<InsertVideo>; 
export type ToggleVideoFavoriteRequest = { isFavorite: boolean };

// Response types
export type VideoResponse = Video;
export type VideosListResponse = Video[];

// Upload presigned URL types
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
