import { db } from "./db";
import { 
  mediaItems, 
  pinAuth,
  collections,
  collectionItems,
  processingJobs,
  blogPosts,
  subscriptions,
  tenants,
  whitelist,
  chatUsers,
  chatChannels,
  chatMessages,
  DEFAULT_CHANNELS,
  type MediaItem, 
  type InsertMediaItem, 
  type UpdateMediaRequest,
  type PinAuth,
  type MediaCategory,
  type Collection,
  type InsertCollection,
  type CollectionItem,
  type CollectionWithCount,
  type ProcessingJob,
  type JobStatus,
  type BlogPost,
  type InsertBlogPost,
  type Subscription,
  type InsertSubscription,
  type Tenant,
  type InsertTenant,
  type WhitelistEntry,
  type InsertWhitelistEntry,
  type FeatureRequest,
  type InsertFeatureRequest,
  type FeatureVote,
  type ChatUser,
  type InsertChatUser,
  type ChatChannel,
  type ChatMessage,
  featureRequests,
  featureVotes,
} from "@shared/schema";
import { eq, desc, and, inArray, sql, count } from "drizzle-orm";

export interface IStorage {
  // Tenant methods
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByPinAuthId(pinAuthId: number): Promise<Tenant | undefined>;
  getTenantByStripeCustomerId(customerId: string): Promise<Tenant | undefined>;
  createTenant(data: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, updates: Partial<InsertTenant>): Promise<Tenant>;
  getAllTenants(): Promise<Tenant[]>;

  // Media methods (tenant-scoped)
  getMediaItems(tenantId: string, category?: MediaCategory): Promise<MediaItem[]>;
  getMediaItem(id: number): Promise<MediaItem | undefined>;
  createMediaItem(item: InsertMediaItem & { uploadedBy?: string; tenantId?: string }): Promise<MediaItem>;
  updateMediaItem(id: number, updates: UpdateMediaRequest): Promise<MediaItem>;
  deleteMediaItem(id: number): Promise<void>;
  toggleFavorite(id: number, isFavorite: boolean): Promise<MediaItem | undefined>;

  // Auth methods (multi-user)
  getPinAuth(): Promise<PinAuth | undefined>;
  getPinAuthByName(name: string): Promise<PinAuth | undefined>;
  getPinAuthById(id: number): Promise<PinAuth | undefined>;
  getAllPinAuths(): Promise<PinAuth[]>;
  updatePin(id: number, pin: string, mustReset: boolean, email?: string): Promise<PinAuth>;
  initializePinAuth(pin: string, name: string, mustReset?: boolean, tenantId?: string): Promise<PinAuth>;
  updatePinAuthTenantId(id: number, tenantId: string): Promise<void>;

  // Collections (tenant-scoped)
  getCollections(tenantId: string): Promise<CollectionWithCount[]>;
  getCollection(id: number): Promise<Collection | undefined>;
  createCollection(data: InsertCollection): Promise<Collection>;
  updateCollection(id: number, data: Partial<InsertCollection>): Promise<Collection>;
  deleteCollection(id: number): Promise<void>;
  getCollectionItems(collectionId: number): Promise<MediaItem[]>;
  addToCollection(collectionId: number, mediaItemIds: number[]): Promise<CollectionItem[]>;
  removeFromCollection(collectionId: number, mediaItemIds: number[]): Promise<void>;
  batchUpdateMedia(ids: number[], updates: Partial<{ isFavorite: boolean; label: string; tags: string[] }>): Promise<MediaItem[]>;
  batchDeleteMedia(ids: number[]): Promise<void>;

  // Processing jobs
  createProcessingJob(type: string, inputData: string): Promise<ProcessingJob>;
  getProcessingJob(id: number): Promise<ProcessingJob | undefined>;
  updateProcessingJob(id: number, updates: Partial<{ status: JobStatus; progress: number; outputMediaId: number; errorMessage: string }>): Promise<ProcessingJob>;

  // Blog
  getBlogPosts(status?: string): Promise<BlogPost[]>;
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, updates: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: number): Promise<void>;

  // Subscriptions (tenant-scoped)
  getSubscription(tenantId: string): Promise<Subscription | undefined>;
  getSubscriptionByCustomerId(customerId: string): Promise<Subscription | undefined>;
  upsertSubscription(data: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription>;

  // Whitelist / Invites
  getWhitelistEntries(): Promise<WhitelistEntry[]>;
  getWhitelistEntry(id: number): Promise<WhitelistEntry | undefined>;
  getWhitelistByCode(code: string): Promise<WhitelistEntry | undefined>;
  createWhitelistEntry(data: InsertWhitelistEntry): Promise<WhitelistEntry>;
  deleteWhitelistEntry(id: number): Promise<void>;
  markWhitelistUsed(id: number): Promise<WhitelistEntry>;

  // Feature Requests / Community Voice
  getFeatureRequests(): Promise<FeatureRequest[]>;
  getFeatureRequest(id: number): Promise<FeatureRequest | undefined>;
  createFeatureRequest(data: InsertFeatureRequest): Promise<FeatureRequest>;
  updateFeatureRequest(id: number, updates: Partial<InsertFeatureRequest>): Promise<FeatureRequest>;
  deleteFeatureRequest(id: number): Promise<void>;
  voteForFeature(featureId: number, tenantId: string): Promise<{ voted: boolean }>;
  getVotesForTenant(tenantId: string): Promise<number[]>;

  // Signal Chat / SSO
  getChatUserByUsername(username: string): Promise<ChatUser | undefined>;
  getChatUserByEmail(email: string): Promise<ChatUser | undefined>;
  getChatUserById(id: string): Promise<ChatUser | undefined>;
  getChatUserByTrustLayerId(tlId: string): Promise<ChatUser | undefined>;
  getChatUserByPinAuthId(pinAuthId: number): Promise<ChatUser | undefined>;
  createChatUser(data: InsertChatUser): Promise<ChatUser>;
  updateChatUserOnline(id: string, isOnline: boolean): Promise<void>;
  getOnlineChatUsers(): Promise<ChatUser[]>;
  getChatChannels(): Promise<ChatChannel[]>;
  getChatChannel(id: string): Promise<ChatChannel | undefined>;
  getChatChannelByName(name: string): Promise<ChatChannel | undefined>;
  seedDefaultChannels(): Promise<void>;
  getChatMessages(channelId: string, limit?: number): Promise<(ChatMessage & { username: string; avatarColor: string; role: string; displayName: string })[]>;
  createChatMessage(data: { channelId: string; userId: string; content: string; replyToId?: string }): Promise<ChatMessage>;
}

export class DatabaseStorage implements IStorage {
  // --- Tenant Methods ---

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantByPinAuthId(pinAuthId: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.pinAuthId, pinAuthId));
    return tenant;
  }

  async getTenantByStripeCustomerId(customerId: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.stripeCustomerId, customerId));
    return tenant;
  }

  async createTenant(data: InsertTenant): Promise<Tenant> {
    const [created] = await db.insert(tenants).values(data).returning();
    return created;
  }

  async updateTenant(id: string, updates: Partial<InsertTenant>): Promise<Tenant> {
    const [updated] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  // --- Media Methods (tenant-scoped) ---

  async getMediaItems(tenantId: string, category?: MediaCategory): Promise<MediaItem[]> {
    if (category) {
      return await db.select().from(mediaItems)
        .where(and(eq(mediaItems.tenantId, tenantId), eq(mediaItems.category, category)))
        .orderBy(desc(mediaItems.fileDate), desc(mediaItems.createdAt));
    }
    return await db.select().from(mediaItems)
      .where(eq(mediaItems.tenantId, tenantId))
      .orderBy(desc(mediaItems.fileDate), desc(mediaItems.createdAt));
  }

  async getMediaItem(id: number): Promise<MediaItem | undefined> {
    const [item] = await db.select().from(mediaItems).where(eq(mediaItems.id, id));
    return item;
  }

  async createMediaItem(item: InsertMediaItem & { uploadedBy?: string; tenantId?: string }): Promise<MediaItem> {
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

  // --- Auth Methods (multi-user) ---

  async getPinAuth(): Promise<PinAuth | undefined> {
    const [auth] = await db.select().from(pinAuth).limit(1);
    return auth;
  }

  async getPinAuthByName(name: string): Promise<PinAuth | undefined> {
    const allAuths = await db.select().from(pinAuth);
    return allAuths.find(a => a.name.toLowerCase() === name.toLowerCase());
  }

  async getPinAuthById(id: number): Promise<PinAuth | undefined> {
    const [auth] = await db.select().from(pinAuth).where(eq(pinAuth.id, id));
    return auth;
  }

  async getAllPinAuths(): Promise<PinAuth[]> {
    return await db.select().from(pinAuth);
  }

  async updatePin(id: number, pin: string, mustReset: boolean, email?: string): Promise<PinAuth> {
    const updates: any = { pin, mustReset, updatedAt: new Date() };
    if (email !== undefined) updates.email = email;
    const [updated] = await db
      .update(pinAuth)
      .set(updates)
      .where(eq(pinAuth.id, id))
      .returning();
    return updated;
  }

  async initializePinAuth(pin: string, name: string, mustReset: boolean = true, tenantId?: string): Promise<PinAuth> {
    const [auth] = await db
      .insert(pinAuth)
      .values({ pin, name, mustReset, tenantId: tenantId || null })
      .returning();
    return auth;
  }

  async updatePinAuthTenantId(id: number, tenantId: string): Promise<void> {
    await db.update(pinAuth).set({ tenantId }).where(eq(pinAuth.id, id));
  }

  // --- Collections (tenant-scoped) ---

  async getCollections(tenantId: string): Promise<CollectionWithCount[]> {
    const cols = await db.select().from(collections)
      .where(eq(collections.tenantId, tenantId))
      .orderBy(desc(collections.createdAt));
    const results: CollectionWithCount[] = [];
    for (const col of cols) {
      const [countResult] = await db
        .select({ count: count() })
        .from(collectionItems)
        .where(eq(collectionItems.collectionId, col.id));
      let coverUrl: string | null = null;
      if (col.coverMediaId) {
        const [coverItem] = await db.select().from(mediaItems).where(eq(mediaItems.id, col.coverMediaId));
        coverUrl = coverItem?.url || null;
      } else {
        const [firstItem] = await db
          .select()
          .from(collectionItems)
          .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
          .where(eq(collectionItems.collectionId, col.id))
          .limit(1);
        coverUrl = firstItem?.media_items?.url || null;
      }
      results.push({ ...col, itemCount: countResult?.count || 0, coverUrl });
    }
    return results;
  }

  async getCollection(id: number): Promise<Collection | undefined> {
    const [col] = await db.select().from(collections).where(eq(collections.id, id));
    return col;
  }

  async createCollection(data: InsertCollection): Promise<Collection> {
    const [created] = await db.insert(collections).values(data).returning();
    return created;
  }

  async updateCollection(id: number, data: Partial<InsertCollection>): Promise<Collection> {
    const [updated] = await db
      .update(collections)
      .set(data)
      .where(eq(collections.id, id))
      .returning();
    return updated;
  }

  async deleteCollection(id: number): Promise<void> {
    await db.delete(collectionItems).where(eq(collectionItems.collectionId, id));
    await db.delete(collections).where(eq(collections.id, id));
  }

  async getCollectionItems(collectionId: number): Promise<MediaItem[]> {
    const rows = await db
      .select({ media: mediaItems })
      .from(collectionItems)
      .innerJoin(mediaItems, eq(collectionItems.mediaItemId, mediaItems.id))
      .where(eq(collectionItems.collectionId, collectionId))
      .orderBy(desc(collectionItems.addedAt));
    return rows.map(r => r.media);
  }

  async addToCollection(collectionId: number, mediaItemIds: number[]): Promise<CollectionItem[]> {
    const existing = await db
      .select()
      .from(collectionItems)
      .where(
        and(
          eq(collectionItems.collectionId, collectionId),
          inArray(collectionItems.mediaItemId, mediaItemIds)
        )
      );
    const existingIds = new Set(existing.map(e => e.mediaItemId));
    const newIds = mediaItemIds.filter(id => !existingIds.has(id));
    if (newIds.length === 0) return existing;
    const inserted = await db
      .insert(collectionItems)
      .values(newIds.map(mediaItemId => ({ collectionId, mediaItemId })))
      .returning();
    return [...existing, ...inserted];
  }

  async removeFromCollection(collectionId: number, mediaItemIds: number[]): Promise<void> {
    await db
      .delete(collectionItems)
      .where(
        and(
          eq(collectionItems.collectionId, collectionId),
          inArray(collectionItems.mediaItemId, mediaItemIds)
        )
      );
  }

  async batchUpdateMedia(ids: number[], updates: Partial<{ isFavorite: boolean; label: string; tags: string[] }>): Promise<MediaItem[]> {
    const updated = await db
      .update(mediaItems)
      .set(updates)
      .where(inArray(mediaItems.id, ids))
      .returning();
    return updated;
  }

  async batchDeleteMedia(ids: number[]): Promise<void> {
    await db.delete(collectionItems).where(inArray(collectionItems.mediaItemId, ids));
    await db.delete(mediaItems).where(inArray(mediaItems.id, ids));
  }

  // --- Processing Jobs ---

  async createProcessingJob(type: string, inputData: string): Promise<ProcessingJob> {
    const [job] = await db.insert(processingJobs).values({ type, inputData, status: "queued", progress: 0 }).returning();
    return job;
  }

  async getProcessingJob(id: number): Promise<ProcessingJob | undefined> {
    const [job] = await db.select().from(processingJobs).where(eq(processingJobs.id, id));
    return job;
  }

  async updateProcessingJob(id: number, updates: Partial<{ status: JobStatus; progress: number; outputMediaId: number; errorMessage: string }>): Promise<ProcessingJob> {
    const [updated] = await db
      .update(processingJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(processingJobs.id, id))
      .returning();
    return updated;
  }

  // --- Blog ---

  async getBlogPosts(status?: string): Promise<BlogPost[]> {
    if (status) {
      return await db.select().from(blogPosts)
        .where(eq(blogPosts.status, status))
        .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));
    }
    return await db.select().from(blogPosts)
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [created] = await db.insert(blogPosts).values(post).returning();
    return created;
  }

  async updateBlogPost(id: number, updates: Partial<InsertBlogPost>): Promise<BlogPost> {
    const [updated] = await db
      .update(blogPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return updated;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  // --- Subscriptions (tenant-scoped) ---

  async getSubscription(tenantId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId));
    return sub;
  }

  async getSubscriptionByCustomerId(customerId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, customerId));
    return sub;
  }

  async upsertSubscription(data: InsertSubscription): Promise<Subscription> {
    const existing = await this.getSubscriptionByCustomerId(data.stripeCustomerId);
    if (existing) {
      const [updated] = await db
        .update(subscriptions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(subscriptions.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(subscriptions).values(data).returning();
    return created;
  }

  async updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription> {
    const [updated] = await db
      .update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return updated;
  }

  // --- Whitelist / Invites ---

  async getWhitelistEntries(): Promise<WhitelistEntry[]> {
    return db.select().from(whitelist).orderBy(desc(whitelist.createdAt));
  }

  async getWhitelistEntry(id: number): Promise<WhitelistEntry | undefined> {
    const [entry] = await db.select().from(whitelist).where(eq(whitelist.id, id));
    return entry;
  }

  async getWhitelistByCode(code: string): Promise<WhitelistEntry | undefined> {
    const [entry] = await db.select().from(whitelist).where(eq(whitelist.inviteCode, code));
    return entry;
  }

  async createWhitelistEntry(data: InsertWhitelistEntry): Promise<WhitelistEntry> {
    const [created] = await db.insert(whitelist).values(data).returning();
    return created;
  }

  async deleteWhitelistEntry(id: number): Promise<void> {
    await db.delete(whitelist).where(eq(whitelist.id, id));
  }

  async markWhitelistUsed(id: number): Promise<WhitelistEntry> {
    const [updated] = await db
      .update(whitelist)
      .set({ used: true, usedAt: new Date() })
      .where(eq(whitelist.id, id))
      .returning();
    return updated;
  }

  // --- Feature Requests / Community Voice ---

  async getFeatureRequests(): Promise<FeatureRequest[]> {
    return db.select().from(featureRequests).orderBy(desc(featureRequests.votes), desc(featureRequests.createdAt));
  }

  async getFeatureRequest(id: number): Promise<FeatureRequest | undefined> {
    const [request] = await db.select().from(featureRequests).where(eq(featureRequests.id, id));
    return request;
  }

  async createFeatureRequest(data: InsertFeatureRequest): Promise<FeatureRequest> {
    const [created] = await db.insert(featureRequests).values(data).returning();
    return created;
  }

  async updateFeatureRequest(id: number, updates: Partial<InsertFeatureRequest>): Promise<FeatureRequest> {
    const [updated] = await db
      .update(featureRequests)
      .set(updates)
      .where(eq(featureRequests.id, id))
      .returning();
    return updated;
  }

  async deleteFeatureRequest(id: number): Promise<void> {
    await db.delete(featureVotes).where(eq(featureVotes.featureRequestId, id));
    await db.delete(featureRequests).where(eq(featureRequests.id, id));
  }

  async voteForFeature(featureId: number, tenantId: string): Promise<{ voted: boolean }> {
    const [existing] = await db.select().from(featureVotes)
      .where(and(eq(featureVotes.featureRequestId, featureId), eq(featureVotes.tenantId, tenantId)));

    if (existing) {
      await db.delete(featureVotes).where(eq(featureVotes.id, existing.id));
      await db.update(featureRequests).set({ votes: sql`votes - 1` }).where(eq(featureRequests.id, featureId));
      return { voted: false };
    } else {
      await db.insert(featureVotes).values({ featureRequestId: featureId, tenantId });
      await db.update(featureRequests).set({ votes: sql`votes + 1` }).where(eq(featureRequests.id, featureId));
      return { voted: true };
    }
  }

  async getVotesForTenant(tenantId: string): Promise<number[]> {
    const votes = await db.select({ featureRequestId: featureVotes.featureRequestId })
      .from(featureVotes)
      .where(eq(featureVotes.tenantId, tenantId));
    return votes.map(v => v.featureRequestId);
  }

  // --- Signal Chat / SSO ---

  async getChatUserByUsername(username: string): Promise<ChatUser | undefined> {
    const [user] = await db.select().from(chatUsers)
      .where(sql`LOWER(${chatUsers.username}) = LOWER(${username})`);
    return user;
  }

  async getChatUserByEmail(email: string): Promise<ChatUser | undefined> {
    const [user] = await db.select().from(chatUsers)
      .where(sql`LOWER(${chatUsers.email}) = LOWER(${email})`);
    return user;
  }

  async getChatUserById(id: string): Promise<ChatUser | undefined> {
    const [user] = await db.select().from(chatUsers).where(eq(chatUsers.id, id));
    return user;
  }

  async getChatUserByTrustLayerId(tlId: string): Promise<ChatUser | undefined> {
    const [user] = await db.select().from(chatUsers).where(eq(chatUsers.trustLayerId, tlId));
    return user;
  }

  async getChatUserByPinAuthId(pinAuthId: number): Promise<ChatUser | undefined> {
    const [user] = await db.select().from(chatUsers).where(eq(chatUsers.pinAuthId, pinAuthId));
    return user;
  }

  async createChatUser(data: InsertChatUser): Promise<ChatUser> {
    const [created] = await db.insert(chatUsers).values(data).returning();
    return created;
  }

  async updateChatUserOnline(id: string, isOnline: boolean): Promise<void> {
    await db.update(chatUsers).set({ isOnline, lastSeen: new Date() }).where(eq(chatUsers.id, id));
  }

  async getOnlineChatUsers(): Promise<ChatUser[]> {
    return db.select().from(chatUsers).where(eq(chatUsers.isOnline, true));
  }

  async getChatChannels(): Promise<ChatChannel[]> {
    return db.select().from(chatChannels).orderBy(chatChannels.name);
  }

  async getChatChannel(id: string): Promise<ChatChannel | undefined> {
    const [ch] = await db.select().from(chatChannels).where(eq(chatChannels.id, id));
    return ch;
  }

  async getChatChannelByName(name: string): Promise<ChatChannel | undefined> {
    const [ch] = await db.select().from(chatChannels).where(eq(chatChannels.name, name));
    return ch;
  }

  async seedDefaultChannels(): Promise<void> {
    for (const ch of DEFAULT_CHANNELS) {
      const existing = await this.getChatChannelByName(ch.name);
      if (!existing) {
        await db.insert(chatChannels).values({
          name: ch.name,
          description: ch.description,
          category: ch.category,
          isDefault: ch.isDefault,
        });
      }
    }
  }

  async getChatMessages(channelId: string, limit: number = 50): Promise<(ChatMessage & { username: string; avatarColor: string; role: string; displayName: string })[]> {
    const rows = await db
      .select({
        id: chatMessages.id,
        channelId: chatMessages.channelId,
        userId: chatMessages.userId,
        content: chatMessages.content,
        replyToId: chatMessages.replyToId,
        createdAt: chatMessages.createdAt,
        username: chatUsers.username,
        avatarColor: chatUsers.avatarColor,
        role: chatUsers.role,
        displayName: chatUsers.displayName,
      })
      .from(chatMessages)
      .innerJoin(chatUsers, eq(chatMessages.userId, chatUsers.id))
      .where(eq(chatMessages.channelId, channelId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    return rows.reverse();
  }

  async createChatMessage(data: { channelId: string; userId: string; content: string; replyToId?: string }): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(data).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
