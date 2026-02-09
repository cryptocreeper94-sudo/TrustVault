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

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
    name: string;
    tenantId: string;
    pinAuthId: number;
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
  app.use(session({
    secret: process.env.SESSION_SECRET || "concert-memories-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }));

  registerObjectStorageRoutes(app);
  registerEcosystemRoutes(app);
  registerBlogRoutes(app);
  registerStripeRoutes(app);

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
      const { name, password } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      const trimmedName = name.trim();
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
      await storage.updateTenant(tenant.id, { pinAuthId: auth.id });
      req.session.authenticated = true;
      req.session.name = auth.name;
      req.session.tenantId = tenant.id;
      req.session.pinAuthId = auth.id;
      return res.json({ name: auth.name, mustReset: false, tenantId: tenant.id });
    } catch (err) {
      console.error("Setup error:", err);
      return res.status(500).json({ message: "Account setup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { name, password } = req.body;
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
      return res.json({ name: auth.name, mustReset: auth.mustReset, tenantId: tenant.id });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/reset-password", isAuthenticated, async (req, res) => {
    try {
      const { newPassword } = req.body;
      const validationError = validatePassword(newPassword);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updatePin(req.session.pinAuthId!, hashedPassword, false);
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
    return res.json({
      name: req.session.name || "User",
      mustReset: false,
      tenantId: req.session.tenantId,
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
