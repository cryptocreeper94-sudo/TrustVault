import { db } from "./db";
import { 
  videos, 
  pinAuth,
  type Video, 
  type InsertVideo, 
  type UpdateVideoRequest,
  type PinAuth
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getVideos(): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  createVideo(video: InsertVideo & { uploadedBy?: string }): Promise<Video>;
  updateVideo(id: number, updates: UpdateVideoRequest): Promise<Video>;
  deleteVideo(id: number): Promise<void>;
  toggleFavorite(id: number, isFavorite: boolean): Promise<Video | undefined>;
  getPinAuth(): Promise<PinAuth | undefined>;
  updatePin(pin: string, mustReset: boolean): Promise<PinAuth>;
  initializePinAuth(pin: string, name: string): Promise<PinAuth>;
}

export class DatabaseStorage implements IStorage {
  async getVideos(): Promise<Video[]> {
    return await db.select().from(videos).orderBy(desc(videos.createdAt));
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async createVideo(insertVideo: InsertVideo & { uploadedBy?: string }): Promise<Video> {
    const [video] = await db
      .insert(videos)
      .values(insertVideo)
      .returning();
    return video;
  }

  async updateVideo(id: number, updates: UpdateVideoRequest): Promise<Video> {
    const [video] = await db
      .update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();
    return video;
  }

  async deleteVideo(id: number): Promise<void> {
    await db.delete(videos).where(eq(videos.id, id));
  }

  async toggleFavorite(id: number, isFavorite: boolean): Promise<Video | undefined> {
    const [video] = await db
      .update(videos)
      .set({ isFavorite })
      .where(eq(videos.id, id))
      .returning();
    return video;
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
