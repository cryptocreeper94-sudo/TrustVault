import { pgTable, text, serial, integer, boolean, timestamp, varchar, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pinAuth = pgTable("pin_auth", {
  id: serial("id").primaryKey(),
  pin: text("pin").notNull(),
  mustReset: boolean("must_reset").default(true),
  name: text("name").notNull().default("Madeline"),
  email: text("email"),
  tenantId: varchar("tenant_id"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- Tenants Table ---

export const TENANT_STATUSES = ["active", "suspended", "deleted"] as const;
export type TenantStatus = typeof TENANT_STATUSES[number];

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  storagePrefix: text("storage_prefix").notNull(),
  tier: text("tier").notNull().default("free"),
  status: text("status").notNull().default("active"),
  pinAuthId: integer("pin_auth_id"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export const MEDIA_CATEGORIES = ["video", "audio", "image", "document", "other"] as const;
export type MediaCategory = typeof MEDIA_CATEGORIES[number];

export const mediaItems = pgTable("media_items", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id"),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  category: text("category").notNull().default("other"),
  size: integer("size"),
  label: text("label"),
  tags: text("tags").array(),
  uploadedBy: varchar("uploaded_by"),
  fileDate: timestamp("file_date"),
  createdAt: timestamp("created_at").defaultNow(),
  isFavorite: boolean("is_favorite").default(false),
  thumbnailUrl: text("thumbnail_url"),
  durationSeconds: integer("duration_seconds"),
  artist: text("artist"),
  venue: text("venue"),
  tour: text("tour"),
  eventDate: timestamp("event_date"),
});

export const insertMediaSchema = createInsertSchema(mediaItems).omit({
  id: true,
  createdAt: true,
  uploadedBy: true,
});

export type PinAuth = typeof pinAuth.$inferSelect;

export type MediaItem = typeof mediaItems.$inferSelect;
export type InsertMediaItem = z.infer<typeof insertMediaSchema>;

export type UpdateMediaRequest = Partial<Pick<InsertMediaItem, "title" | "description" | "label" | "tags" | "artist" | "venue" | "tour" | "eventDate" | "thumbnailUrl" | "durationSeconds">>;
export type ToggleFavoriteRequest = { isFavorite: boolean };

export type MediaItemResponse = MediaItem;
export type MediaListResponse = MediaItem[];

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id"),
  name: text("name").notNull(),
  description: text("description"),
  coverMediaId: integer("cover_media_id"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const collectionItems = pgTable("collection_items", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull(),
  mediaItemId: integer("media_item_id").notNull(),
  sortOrder: integer("sort_order").default(0),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
});

export const insertCollectionItemSchema = createInsertSchema(collectionItems).omit({
  id: true,
  addedAt: true,
});

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type InsertCollectionItem = z.infer<typeof insertCollectionItemSchema>;

export type CollectionWithCount = Collection & { itemCount: number; coverUrl?: string | null; parentId?: number | null; isShared?: boolean | null };

export const JOB_STATUSES = ["queued", "downloading", "processing", "uploading", "complete", "failed"] as const;
export type JobStatus = typeof JOB_STATUSES[number];
export const JOB_TYPES = ["trim", "merge"] as const;
export type JobType = typeof JOB_TYPES[number];

export const processingJobs = pgTable("processing_jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  progress: integer("progress").default(0),
  inputData: text("input_data").notNull(),
  outputMediaId: integer("output_media_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ProcessingJob = typeof processingJobs.$inferSelect;
export type InsertProcessingJob = typeof processingJobs.$inferInsert;

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

// --- Ecosystem API Tables ---

export const ECOSYSTEM_CAPABILITIES = [
  "video_walkthrough",
  "video_editing",
  "audio_editing",
  "media_combining",
  "branded_intros",
  "voiceover",
  "multi_angle_stitch",
  "thumbnail_generation",
] as const;
export type EcosystemCapability = typeof ECOSYSTEM_CAPABILITIES[number];

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().unique(),
  appName: text("app_name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  apiSecret: text("api_secret").notNull(),
  webhookUrl: text("webhook_url"),
  capabilities: text("capabilities").array(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

export const PROJECT_STATUSES = ["queued", "in_progress", "rendering", "complete", "failed", "cancelled"] as const;
export type ProjectStatus = typeof PROJECT_STATUSES[number];

export const ecosystemProjects = pgTable("ecosystem_projects", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("queued"),
  propertyAddress: text("property_address"),
  propertyId: text("property_id"),
  requestType: text("request_type").notNull(),
  notes: text("notes"),
  agentId: text("agent_id"),
  thumbnailUrl: text("thumbnail_url"),
  outputUrl: text("output_url"),
  duration: integer("duration"),
  timeline: text("timeline"),
  assets: text("assets"),
  renderStatus: text("render_status"),
  errorMessage: text("error_message"),
  estimatedTurnaround: text("estimated_turnaround"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type EcosystemProject = typeof ecosystemProjects.$inferSelect;
export type InsertEcosystemProject = typeof ecosystemProjects.$inferInsert;

export const insertEcosystemProjectSchema = createInsertSchema(ecosystemProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// --- Blog Tables ---

export const BLOG_STATUSES = ["draft", "published", "archived"] as const;
export type BlogStatus = typeof BLOG_STATUSES[number];

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  metaDescription: text("meta_description"),
  keywords: text("keywords").array(),
  category: text("category"),
  coverImageUrl: text("cover_image_url"),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

// --- Subscription Tables ---

export const SUBSCRIPTION_TIERS = ["free", "personal", "pro", "studio"] as const;
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

export const SUBSCRIPTION_STATUSES = ["active", "canceled", "past_due", "trialing", "incomplete"] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id"),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  tier: text("tier").notNull().default("free"),
  status: text("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export const TIER_LIMITS: Record<SubscriptionTier, { storage: string; storageBytes: number; items: number; features: string[] }> = {
  free: {
    storage: "500MB",
    storageBytes: 500 * 1024 * 1024,
    items: 50,
    features: ["Basic viewing", "50 media items", "Standard support"],
  },
  personal: {
    storage: "5GB",
    storageBytes: 5 * 1024 * 1024 * 1024,
    items: 500,
    features: ["All media editors", "Collections & tags", "500 media items", "5GB storage", "PWA access"],
  },
  pro: {
    storage: "50GB",
    storageBytes: 50 * 1024 * 1024 * 1024,
    items: 5000,
    features: ["Merge & combine tools", "AI blog platform", "5,000 media items", "50GB storage", "Priority support", "Advanced editors"],
  },
  studio: {
    storage: "Unlimited",
    storageBytes: -1,
    items: -1,
    features: ["Ecosystem API access", "Unlimited media items", "Unlimited storage", "Blockchain provenance (coming soon)", "White-label options", "Dedicated support"],
  },
};

export const TIER_PRICING: Record<SubscriptionTier, { monthly: number; annual: number; name: string; description: string }> = {
  free: { monthly: 0, annual: 0, name: "Free", description: "Get started with basic media storage" },
  personal: { monthly: 599, annual: 5999, name: "Personal", description: "For individual creators who need more" },
  pro: { monthly: 1299, annual: 12999, name: "Pro", description: "Full creative studio for serious creators" },
  studio: { monthly: 2499, annual: 24999, name: "Studio", description: "Enterprise-grade for professionals" },
};

// --- Whitelist / Invite System ---

export const whitelist = pgTable("whitelist", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  inviteCode: text("invite_code").notNull().unique(),
  used: boolean("used").default(false),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhitelistSchema = createInsertSchema(whitelist).omit({
  id: true,
  used: true,
  usedAt: true,
  createdAt: true,
});

export type WhitelistEntry = typeof whitelist.$inferSelect;
export type InsertWhitelistEntry = z.infer<typeof insertWhitelistSchema>;

// --- Feature Requests / Community Voice ---

export const FEATURE_CATEGORIES = ["music_services", "media_tools", "storage", "social", "integrations", "other"] as const;
export type FeatureCategory = typeof FEATURE_CATEGORIES[number];

export const FEATURE_STATUSES = ["open", "under_review", "planned", "in_progress", "completed", "declined"] as const;
export type FeatureStatus = typeof FEATURE_STATUSES[number];

export const featureRequests = pgTable("feature_requests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("other"),
  status: text("status").notNull().default("open"),
  adminNote: text("admin_note"),
  votes: integer("votes").notNull().default(0),
  submittedBy: text("submitted_by"),
  tenantId: varchar("tenant_id"),
  isSeeded: boolean("is_seeded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const featureVotes = pgTable("feature_votes", {
  id: serial("id").primaryKey(),
  featureRequestId: integer("feature_request_id").notNull(),
  tenantId: varchar("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeatureRequestSchema = createInsertSchema(featureRequests).omit({
  id: true,
  votes: true,
  isSeeded: true,
  createdAt: true,
});

export type FeatureRequest = typeof featureRequests.$inferSelect;
export type InsertFeatureRequest = z.infer<typeof insertFeatureRequestSchema>;
export type FeatureVote = typeof featureVotes.$inferSelect;

export function detectCategory(contentType: string): MediaCategory {
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  if (contentType.startsWith("image/")) return "image";
  if (
    contentType === "application/pdf" ||
    contentType.startsWith("text/") ||
    contentType.includes("document") ||
    contentType.includes("spreadsheet") ||
    contentType.includes("presentation") ||
    contentType.includes("msword") ||
    contentType.includes("officedocument")
  ) return "document";
  return "other";
}

// --- Signal Chat / TrustLayer SSO Tables ---

export const CHAT_USER_ROLES = ["member", "admin", "moderator", "bot"] as const;
export type ChatUserRole = typeof CHAT_USER_ROLES[number];

export const chatUsers = pgTable("chat_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  avatarColor: text("avatar_color").notNull().default("#06b6d4"),
  role: text("role").notNull().default("member"),
  trustLayerId: text("trust_layer_id").unique(),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  pinAuthId: integer("pin_auth_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatUserSchema = createInsertSchema(chatUsers).omit({
  id: true,
  isOnline: true,
  lastSeen: true,
  createdAt: true,
});

export type ChatUser = typeof chatUsers.$inferSelect;
export type InsertChatUser = z.infer<typeof insertChatUserSchema>;

export const CHANNEL_CATEGORIES = ["ecosystem", "support", "general"] as const;
export type ChannelCategory = typeof CHANNEL_CATEGORIES[number];

export const chatChannels = pgTable("chat_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").notNull().default("ecosystem"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatChannelSchema = createInsertSchema(chatChannels).omit({
  id: true,
  createdAt: true,
});

export type ChatChannel = typeof chatChannels.$inferSelect;
export type InsertChatChannel = z.infer<typeof insertChatChannelSchema>;

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  replyToId: varchar("reply_to_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export const DEFAULT_CHANNELS = [
  { name: "general", description: "General conversation for the TrustLayer ecosystem", category: "ecosystem", isDefault: true },
  { name: "announcements", description: "Official announcements and updates", category: "ecosystem", isDefault: true },
  { name: "darkwavestudios-support", description: "Support for Dark Wave Studios products", category: "support", isDefault: false },
  { name: "garagebot-support", description: "Support for GarageBot", category: "support", isDefault: false },
  { name: "tlid-marketing", description: "TrustLayer ID marketing and outreach", category: "general", isDefault: false },
  { name: "guardian-ai", description: "Guardian AI assistant channel", category: "general", isDefault: false },
] as const;

// --- Activity Log Table ---

export const ACTIVITY_TYPES = ["upload", "delete", "create_collection", "favorite", "share", "edit"] as const;
export type ActivityType = typeof ACTIVITY_TYPES[number];

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id"),
  actorName: text("actor_name"),
  actionType: text("action_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  entityTitle: text("entity_title"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// --- Collection Shares Table ---

export const collectionShares = pgTable("collection_shares", {
  id: serial("id").primaryKey(),
  collectionId: integer("collection_id").notNull(),
  sharedWithTenantId: varchar("shared_with_tenant_id").notNull(),
  sharedByTenantId: varchar("shared_by_tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCollectionShareSchema = createInsertSchema(collectionShares).omit({
  id: true,
  createdAt: true,
});

export type CollectionShare = typeof collectionShares.$inferSelect;
export type InsertCollectionShare = z.infer<typeof insertCollectionShareSchema>;

// --- Media Shares Table ---

export const mediaShares = pgTable("media_shares", {
  id: serial("id").primaryKey(),
  mediaItemId: integer("media_item_id").notNull(),
  sharedByTenantId: varchar("shared_by_tenant_id").notNull(),
  sharedWithTenantId: varchar("shared_with_tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMediaShareSchema = createInsertSchema(mediaShares).omit({
  id: true,
  createdAt: true,
});

export type MediaShare = typeof mediaShares.$inferSelect;
export type InsertMediaShare = z.infer<typeof insertMediaShareSchema>;

// --- Playlists Tables ---

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playlistItems = pgTable("playlist_items", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").notNull(),
  mediaItemId: integer("media_item_id").notNull(),
  addedByTenantId: varchar("added_by_tenant_id"),
  sortOrder: integer("sort_order").default(0),
  addedAt: timestamp("added_at").defaultNow(),
});

export const playlistShares = pgTable("playlist_shares", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").notNull(),
  sharedWithTenantId: varchar("shared_with_tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
  createdAt: true,
});

export const insertPlaylistItemSchema = createInsertSchema(playlistItems).omit({
  id: true,
  addedAt: true,
});

export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type PlaylistItem = typeof playlistItems.$inferSelect;
export type InsertPlaylistItem = z.infer<typeof insertPlaylistItemSchema>;
export type PlaylistShare = typeof playlistShares.$inferSelect;
export type PlaylistWithItems = Playlist & { itemCount: number; items?: (PlaylistItem & { mediaTitle?: string; mediaUrl?: string })[] };

export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DirectMessage = typeof directMessages.$inferSelect;

export * from "./models/chat";
