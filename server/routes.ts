import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { detectCategory, type MediaCategory, MEDIA_CATEGORIES } from "@shared/schema";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { processTrimJob, processMergeJob } from "./videoProcessor";
import { registerEcosystemRoutes } from "./ecosystem/routes";
import { registerBlogRoutes } from "./blog/routes";
import { registerStripeRoutes } from "./stripe/routes";
import { registerAgentRoutes } from "./agent/routes";
import { registerChatAuthRoutes } from "./chat/auth-routes";
import { setupChatWebSocket } from "./chat/ws-server";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
    name: string;
    tenantId: string;
    pinAuthId: number;
    isAdmin: boolean;
  }
}

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) return "Password must contain at least one special character";
  return null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: 30 * 24 * 60 * 60,
    tableName: "sessions",
  });

  app.set("trust proxy", 1);
  const isProduction = process.env.NODE_ENV === "production";
  app.use(session({
    secret: process.env.SESSION_SECRET || "concert-memories-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }));

  registerObjectStorageRoutes(app);
  registerEcosystemRoutes(app);
  registerBlogRoutes(app);
  registerStripeRoutes(app);
  registerAgentRoutes(app);
  registerChatAuthRoutes(app);
  setupChatWebSocket(httpServer);

  storage.seedDefaultChannels().then(() => {
    console.log("[Signal Chat] Default channels seeded");
  }).catch((err) => {
    console.error("[Signal Chat] Failed to seed channels:", err);
  });

  // --- Auth Routes ---

  app.get("/api/auth/status", async (_req, res) => {
    try {
      const allAuths = await storage.getAllPinAuths();
      return res.json({ accountExists: allAuths.length > 0, accountCount: allAuths.length });
    } catch (err) {
      console.error("Auth status error:", err);
      return res.status(500).json({ message: "Failed to check auth status" });
    }
  });

  app.post("/api/auth/setup", async (req, res) => {
    try {
      const { name, password, email } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      if (!email || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const existingByName = await storage.getPinAuthByName(trimmedName);
      if (existingByName) {
        return res.status(400).json({ message: "An account with that name already exists. Please log in." });
      }
      const validationError = validatePassword(password);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const storagePrefix = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const tenant = await storage.createTenant({
        name: trimmedName,
        storagePrefix,
        tier: "free",
        status: "active",
      });
      const auth = await storage.initializePinAuth(hashedPassword, trimmedName, false, tenant.id);
      await storage.updatePin(auth.id, hashedPassword, false, trimmedEmail);
      await storage.updateTenant(tenant.id, { pinAuthId: auth.id });
      req.session.authenticated = true;
      req.session.name = auth.name;
      req.session.tenantId = tenant.id;
      req.session.pinAuthId = auth.id;
      req.session.isAdmin = false;
      return res.json({ name: auth.name, mustReset: false, tenantId: tenant.id, isAdmin: false });
    } catch (err) {
      console.error("Setup error:", err);
      return res.status(500).json({ message: "Account setup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { name, password, rememberMe } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      let auth;
      if (name) {
        auth = await storage.getPinAuthByName(name.trim());
      } else {
        const allAuths = await storage.getAllPinAuths();
        if (allAuths.length === 1) {
          auth = allAuths[0];
        } else {
          return res.status(400).json({ message: "Please provide your name to log in" });
        }
      }

      if (!auth) {
        return res.status(400).json({ message: "No account found with that name. Please create one first." });
      }
      const match = await bcrypt.compare(password, auth.pin);
      if (!match) {
        return res.status(401).json({ message: "Incorrect password" });
      }

      let tenant;
      if (auth.tenantId) {
        tenant = await storage.getTenant(auth.tenantId);
      }
      if (!tenant) {
        tenant = await storage.getTenantByPinAuthId(auth.id);
      }
      if (!tenant) {
        const storagePrefix = auth.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        tenant = await storage.createTenant({
          name: auth.name,
          storagePrefix,
          tier: "free",
          status: "active",
          pinAuthId: auth.id,
        });
      }

      req.session.authenticated = true;
      req.session.name = auth.name;
      req.session.tenantId = tenant.id;
      req.session.pinAuthId = auth.id;
      req.session.isAdmin = auth.isAdmin ?? false;

      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      } else {
        req.session.cookie.maxAge = null as any;
        req.session.cookie.expires = false as any;
      }

      return res.json({ name: auth.name, mustReset: auth.mustReset, tenantId: tenant.id, isAdmin: auth.isAdmin ?? false });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/reset-password", isAuthenticated, async (req, res) => {
    try {
      const { newPassword, email } = req.body;
      if (!email || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }
      const validationError = validatePassword(newPassword);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updatePin(req.session.pinAuthId!, hashedPassword, false, email.trim().toLowerCase());
      return res.json({ success: true, name: updated.name });
    } catch (err) {
      console.error("Reset password error:", err);
      return res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }
      const auth = await storage.getPinAuthById(req.session.pinAuthId!);
      if (!auth) {
        return res.status(500).json({ message: "Auth not configured" });
      }
      const match = await bcrypt.compare(currentPassword, auth.pin);
      if (!match) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const validationError = validatePassword(newPassword);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updatePin(auth.id, hashedPassword, false);
      return res.json({ success: true, name: updated.name });
    } catch (err) {
      console.error("Change password error:", err);
      return res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session || !req.session.authenticated) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    let mustReset = false;
    if (req.session.pinAuthId) {
      const auth = await storage.getPinAuthById(req.session.pinAuthId);
      if (auth) mustReset = auth.mustReset ?? false;
    }
    return res.json({
      name: req.session.name || "User",
      mustReset,
      tenantId: req.session.tenantId,
      isAdmin: req.session.isAdmin ?? false,
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
  });

  // --- Whitelist / Invite Routes ---

  function isAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.authenticated && req.session.isAdmin) {
      return next();
    }
    return res.status(403).json({ message: "Admin access required" });
  }

  app.get("/api/whitelist", isAdmin, async (_req, res) => {
    try {
      const entries = await storage.getWhitelistEntries();
      res.json(entries);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch whitelist" });
    }
  });

  app.post("/api/whitelist", isAdmin, async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!name || typeof name !== "string" || name.trim().length < 1) {
        return res.status(400).json({ message: "Name is required" });
      }
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const entry = await storage.createWhitelistEntry({
        name: name.trim(),
        email: email?.trim() || null,
        inviteCode,
      });
      res.json(entry);
    } catch (err) {
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.delete("/api/whitelist/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteWhitelistEntry(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  app.get("/api/admin/users", isAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllPinAuths();
      const sanitized = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        tenantId: u.tenantId,
        isAdmin: u.isAdmin,
        mustReset: u.mustReset,
        createdAt: u.createdAt,
      }));
      res.json(sanitized);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/join", async (req, res) => {
    try {
      const { inviteCode, name, password, email } = req.body;
      if (!inviteCode || !name || !password) {
        return res.status(400).json({ message: "Invite code, name, and password are required" });
      }

      const entry = await storage.getWhitelistByCode(inviteCode.trim().toUpperCase());
      if (!entry) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      if (entry.used) {
        return res.status(400).json({ message: "This invite code has already been used" });
      }

      const validationError = validatePassword(password);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const existingUser = await storage.getPinAuthByName(name.trim());
      if (existingUser) {
        return res.status(400).json({ message: "An account with that name already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await storage.initializePinAuth(
        hashedPassword,
        name.trim(),
        false,
        "pending"
      );

      if (email) {
        await storage.updatePin(newUser.id, hashedPassword, false, email.trim().toLowerCase());
      }

      const tenant = await storage.createTenant({
        name: name.trim(),
        storagePrefix: `tenant_${crypto.randomUUID()}`,
        tier: "free",
        status: "active",
        pinAuthId: newUser.id,
      });

      await storage.updatePinAuthTenantId(newUser.id, tenant.id);

      await storage.markWhitelistUsed(entry.id);

      req.session.authenticated = true;
      req.session.name = name.trim();
      req.session.tenantId = tenant.id;
      req.session.pinAuthId = newUser.id;
      req.session.isAdmin = false;

      res.json({ success: true, name: name.trim() });
    } catch (err) {
      console.error("Join error:", err);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // --- Feature Requests / Community Voice ---

  app.get("/api/features", isAuthenticated, async (_req, res) => {
    try {
      const requests = await storage.getFeatureRequests();
      res.json(requests);
    } catch (err) {
      console.error("Error fetching feature requests:", err);
      res.status(500).json({ message: "Failed to fetch feature requests" });
    }
  });

  app.get("/api/features/my-votes", isAuthenticated, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const votedIds = await storage.getVotesForTenant(tenantId);
      res.json(votedIds);
    } catch (err) {
      console.error("Error fetching votes:", err);
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });

  const featureSubmitSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.enum(["music_services", "media_tools", "storage", "social", "integrations", "other"]).default("other"),
  });

  app.post("/api/features", isAuthenticated, async (req, res) => {
    try {
      const parsed = featureSubmitSchema.parse(req.body);
      const request = await storage.createFeatureRequest({
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        submittedBy: req.session.name || null,
        tenantId: req.session.tenantId || null,
        status: "open",
        adminNote: null,
      });
      res.json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Error creating feature request:", err);
      res.status(500).json({ message: "Failed to submit feature request" });
    }
  });

  app.post("/api/features/:id/vote", isAuthenticated, async (req, res) => {
    try {
      const featureId = Number(req.params.id);
      const tenantId = req.session.tenantId!;
      const result = await storage.voteForFeature(featureId, tenantId);
      res.json(result);
    } catch (err) {
      console.error("Error voting:", err);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  const featureUpdateSchema = z.object({
    status: z.enum(["open", "under_review", "planned", "in_progress", "completed", "declined"]).optional(),
    adminNote: z.string().nullable().optional(),
  });

  app.patch("/api/features/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const parsed = featureUpdateSchema.parse(req.body);
      const updated = await storage.updateFeatureRequest(id, parsed);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Error updating feature request:", err);
      res.status(500).json({ message: "Failed to update feature request" });
    }
  });

  app.delete("/api/features/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteFeatureRequest(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting feature request:", err);
      res.status(500).json({ message: "Failed to delete feature request" });
    }
  });

  // Seed initial feature requests if none exist
  app.post("/api/features/seed", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const existing = await storage.getFeatureRequests();
      if (existing.length > 0) {
        return res.json({ message: "Features already seeded", count: existing.length });
      }

      const seeds = [
        {
          title: "Music Service Integration (Spotify, Apple Music, etc.)",
          description: "Connect to music streaming services to browse and import tracks. This feature requires proper copyright licensing and legal review before implementation. We want to do this the right way — with proper agreements in place to protect our community.",
          category: "music_services",
          status: "under_review",
          adminNote: "Requires copyright attorney consultation and licensing agreements. Tracking community interest to build a case for proper implementation.",
          isSeeded: true,
          submittedBy: null,
          tenantId: null,
        },
        {
          title: "Playlist Sharing Between Users",
          description: "Allow users to share playlists and collections with other TrustVault members while maintaining ownership tracking.",
          category: "social",
          status: "open",
          isSeeded: true,
          submittedBy: null,
          tenantId: null,
          adminNote: null,
        },
        {
          title: "Advanced Audio Equalizer & Effects",
          description: "Built-in audio equalizer with presets and custom frequency controls for audio playback within the vault.",
          category: "media_tools",
          status: "open",
          isSeeded: true,
          submittedBy: null,
          tenantId: null,
          adminNote: null,
        },
        {
          title: "Bulk Import from Cloud Storage",
          description: "Import media files directly from Google Drive, Dropbox, or iCloud into your vault with automatic organization.",
          category: "integrations",
          status: "open",
          isSeeded: true,
          submittedBy: null,
          tenantId: null,
          adminNote: null,
        },
        {
          title: "Collaborative Collections",
          description: "Create shared collections where multiple family members can contribute and organize media together.",
          category: "social",
          status: "planned",
          isSeeded: true,
          submittedBy: null,
          tenantId: null,
          adminNote: "Planned for Phase 3 of the roadmap.",
        },
      ];

      for (const seed of seeds) {
        await storage.createFeatureRequest(seed as any);
      }

      res.json({ message: "Seeded feature requests", count: seeds.length });
    } catch (err) {
      console.error("Error seeding features:", err);
      res.status(500).json({ message: "Failed to seed features" });
    }
  });

  // --- Media Routes ---

  // Batch routes must come before parameterized :id routes
  app.patch(api.media.batchUpdate.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.media.batchUpdate.input.parse(req.body);
      const updated = await storage.batchUpdateMedia(input.ids, input.updates);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.media.batchDelete.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.media.batchDelete.input.parse(req.body);
      await storage.batchDeleteMedia(input.ids);
      res.sendStatus(204);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.media.list.path, isAuthenticated, async (req, res) => {
    const category = req.query.category as MediaCategory | undefined;
    if (category && !MEDIA_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }
    const tenantId = req.session.tenantId!;
    const items = await storage.getMediaItems(tenantId, category);
    res.json(items);
  });

  app.get(api.media.get.path, isAuthenticated, async (req, res) => {
    const item = await storage.getMediaItem(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: "Media item not found" });
    }
    res.json(item);
  });

  app.post(api.media.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.media.create.input.parse(req.body);
      const category = detectCategory(input.contentType);
      const tenantId = req.session.tenantId!;
      const item = await storage.createMediaItem({
        ...input,
        category,
        tenantId,
      });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.patch(api.media.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.media.update.input.parse(req.body);
      const updates: any = { ...input };
      if (updates.eventDate) {
        updates.eventDate = new Date(updates.eventDate);
      }
      const item = await storage.updateMediaItem(Number(req.params.id), updates);
      if (!item) {
        return res.status(404).json({ message: "Media item not found" });
      }
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.patch(api.media.toggleFavorite.path, isAuthenticated, async (req, res) => {
    const { isFavorite } = req.body;
    const item = await storage.toggleFavorite(Number(req.params.id), isFavorite);
    if (!item) {
      return res.status(404).json({ message: "Media item not found" });
    }
    res.json(item);
  });

  app.delete(api.media.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteMediaItem(Number(req.params.id));
    res.sendStatus(204);
  });

  // --- Collection Routes ---

  app.get(api.collections.list.path, isAuthenticated, async (req, res) => {
    const tenantId = req.session.tenantId!;
    const cols = await storage.getCollections(tenantId);
    res.json(cols);
  });

  app.get(api.collections.get.path, isAuthenticated, async (req, res) => {
    const col = await storage.getCollection(Number(req.params.id));
    if (!col) return res.status(404).json({ message: "Collection not found" });
    res.json(col);
  });

  app.post(api.collections.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.collections.create.input.parse(req.body);
      const tenantId = req.session.tenantId!;
      const col = await storage.createCollection({ ...input, tenantId });
      res.status(201).json(col);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.collections.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.collections.update.input.parse(req.body);
      const col = await storage.updateCollection(Number(req.params.id), input);
      if (!col) return res.status(404).json({ message: "Collection not found" });
      res.json(col);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.collections.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteCollection(Number(req.params.id));
    res.sendStatus(204);
  });

  app.get(api.collections.items.path, isAuthenticated, async (req, res) => {
    const items = await storage.getCollectionItems(Number(req.params.id));
    res.json(items);
  });

  app.post(api.collections.addItems.path, isAuthenticated, async (req, res) => {
    try {
      const { mediaItemIds } = req.body;
      const result = await storage.addToCollection(Number(req.params.id), mediaItemIds);
      res.json({ added: result.length });
    } catch (err) {
      throw err;
    }
  });

  app.delete(api.collections.removeItems.path, isAuthenticated, async (req, res) => {
    const { mediaItemIds } = req.body;
    await storage.removeFromCollection(Number(req.params.id), mediaItemIds);
    res.sendStatus(204);
  });

  app.post("/api/video/trim", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        mediaId: z.number(),
        trimStart: z.number().min(0),
        trimEnd: z.number().min(0),
        title: z.string().optional(),
      });
      const input = schema.parse(req.body);
      if (input.trimEnd <= input.trimStart) {
        return res.status(400).json({ message: "trimEnd must be greater than trimStart" });
      }
      const mediaItem = await storage.getMediaItem(input.mediaId);
      if (!mediaItem) return res.status(404).json({ message: "Media item not found" });
      if (mediaItem.category !== "video") return res.status(400).json({ message: "Item is not a video" });

      const job = await storage.createProcessingJob("trim", JSON.stringify(input));
      processTrimJob(job.id).catch(err => console.error("[VideoProcessor] Background trim error:", err));
      res.status(201).json(job);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post("/api/video/merge", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        mediaIds: z.array(z.number()).min(2),
        title: z.string().optional(),
      });
      const input = schema.parse(req.body);

      for (const id of input.mediaIds) {
        const item = await storage.getMediaItem(id);
        if (!item) return res.status(404).json({ message: `Media item ${id} not found` });
        if (item.category !== "video") return res.status(400).json({ message: `Item "${item.title}" is not a video` });
      }

      const job = await storage.createProcessingJob("merge", JSON.stringify(input));
      processMergeJob(job.id).catch(err => console.error("[VideoProcessor] Background merge error:", err));
      res.status(201).json(job);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get("/api/video/jobs/:id", isAuthenticated, async (req, res) => {
    const job = await storage.getProcessingJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  });

  return httpServer;
}
