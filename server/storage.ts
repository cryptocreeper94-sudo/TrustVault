import { db } from "./db";
import { 
  mediaItems, 
  pinAuth,
  type MediaItem, 
  type InsertMediaItem, 
  type UpdateMediaRequest,
  type PinAuth,
  type MediaCategory
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getMediaItems(category?: MediaCategory): Promise<MediaItem[]>;
  getMediaItem(id: number): Promise<MediaItem | undefined>;
  createMediaItem(item: InsertMediaItem & { uploadedBy?: string }): Promise<MediaItem>;
  updateMediaItem(id: number, updates: UpdateMediaRequest): Promise<MediaItem>;
  deleteMediaItem(id: number): Promise<void>;
  toggleFavorite(id: number, isFavorite: boolean): Promise<MediaItem | undefined>;
  getPinAuth(): Promise<PinAuth | undefined>;
  updatePin(pin: string, mustReset: boolean): Promise<PinAuth>;
  initializePinAuth(pin: string, name: string): Promise<PinAuth>;
}

export class DatabaseStorage implements IStorage {
  async getMediaItems(category?: MediaCategory): Promise<MediaItem[]> {
    if (category) {
      return await db.select().from(mediaItems)
        .where(eq(mediaItems.category, category))
        .orderBy(desc(mediaItems.fileDate), desc(mediaItems.createdAt));
    }
    return await db.select().from(mediaItems)
      .orderBy(desc(mediaItems.fileDate), desc(mediaItems.createdAt));
  }

  async getMediaItem(id: number): Promise<MediaItem | undefined> {
    const [item] = await db.select().from(mediaItems).where(eq(mediaItems.id, id));
    return item;
  }

  async createMediaItem(item: InsertMediaItem & { uploadedBy?: string }): Promise<MediaItem> {
    const [created] = await db
      .insert(mediaItems)
      .values(item)
      .returning();
    return created;
  }

  async updateMediaItem(id: number, updates: UpdateMediaRequest): Promise<MediaItem> {
    const [updated] = await db
      .update(mediaItems)
      .set(updates)
      .where(eq(mediaItems.id, id))
      .returning();
    return updated;
  }

  async deleteMediaItem(id: number): Promise<void> {
    await db.delete(mediaItems).where(eq(mediaItems.id, id));
  }

  async toggleFavorite(id: number, isFavorite: boolean): Promise<MediaItem | undefined> {
    const [item] = await db
      .update(mediaItems)
      .set({ isFavorite })
      .where(eq(mediaItems.id, id))
      .returning();
    return item;
  }

  async getPinAuth(): Promise<PinAuth | undefined> {
    const [auth] = await db.select().from(pinAuth);
    return auth;
  }

  async updatePin(pin: string, mustReset: boolean): Promise<PinAuth> {
    const existing = await this.getPinAuth();
    if (existing) {
      const [updated] = await db
        .update(pinAuth)
        .set({ pin, mustReset, updatedAt: new Date() })
        .where(eq(pinAuth.id, existing.id))
        .returning();
      return updated;
    }
    return this.initializePinAuth(pin, "Madeline");
  }

  async initializePinAuth(pin: string, name: string): Promise<PinAuth> {
    const [auth] = await db
      .insert(pinAuth)
      .values({ pin, name, mustReset: true })
      .returning();
    return auth;
  }
}

export const storage = new DatabaseStorage();
