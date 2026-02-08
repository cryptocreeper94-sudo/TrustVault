import { db } from "./db";
import { 
  videos, 
  type Video, 
  type InsertVideo, 
  type UpdateVideoRequest 
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { authStorage, IAuthStorage } from "./replit_integrations/auth"; // Reuse auth storage

export interface IStorage extends IAuthStorage {
  // Video operations
  getVideos(userId?: string): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, updates: UpdateVideoRequest): Promise<Video>;
  deleteVideo(id: number): Promise<void>;
  toggleFavorite(id: number, isFavorite: boolean): Promise<Video | undefined>;
}

export class DatabaseStorage implements IStorage {
  // --- Auth Storage Delegation ---
  // We can inherit or just delegate. Delegation is cleaner if we want to keep them separate, 
  // but for simplicity here I'll just re-implement the interface methods or import them.
  // Actually, since I extended IAuthStorage, I need to implement them.
  // Best way is to use the existing authStorage instance logic or just mix it in.
  
  async getUser(id: string) {
    return authStorage.getUser(id);
  }
  
  async upsertUser(user: any) {
    return authStorage.upsertUser(user);
  }

  // --- Video Operations ---

  async getVideos(userId?: string): Promise<Video[]> {
    // If userId provided, we could filter. But for this app, maybe all logged in users see all videos?
    // User said "mainly meant for my daughter... and her use specifically".
    // So maybe global list is fine for now, or filter by user. 
    // Let's return all videos for now as it's a family app.
    // Or, strictly, usually we filter by `uploadedBy`? 
    // The user said "I have... videos... I would like to be able to put them there for her".
    // So HE uploads, SHE watches. 
    // So everyone should see everything.
    return await db.select().from(videos).orderBy(desc(videos.createdAt));
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
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
}

export const storage = new DatabaseStorage();
