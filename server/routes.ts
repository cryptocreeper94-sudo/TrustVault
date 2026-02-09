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

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
    name: string;
  }
}

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

async function seedPinAuth() {
  const existing = await storage.getPinAuth();
  if (!existing) {
    const hashedPin = await bcrypt.hash("4444", 10);
    await storage.initializePinAuth(hashedPin, "Madeline");
  }
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

  await seedPinAuth();

  registerObjectStorageRoutes(app);

  // --- PIN Auth Routes ---

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { pin } = req.body;
      if (!pin) {
        return res.status(400).json({ message: "PIN is required" });
      }
      const auth = await storage.getPinAuth();
      if (!auth) {
        return res.status(500).json({ message: "Auth not configured" });
      }
      const pinMatch = await bcrypt.compare(pin, auth.pin);
      if (!pinMatch) {
        return res.status(401).json({ message: "Incorrect PIN" });
      }
      req.session.authenticated = true;
      req.session.name = auth.name;
      return res.json({ name: auth.name, mustReset: auth.mustReset });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/reset-pin", isAuthenticated, async (req, res) => {
    try {
      const { newPin } = req.body;
      if (!newPin || newPin.length < 4 || newPin.length > 8) {
        return res.status(400).json({ message: "PIN must be 4-8 digits" });
      }
      if (!/^\d+$/.test(newPin)) {
        return res.status(400).json({ message: "PIN must contain only numbers" });
      }
      const hashedNewPin = await bcrypt.hash(newPin, 10);
      const updated = await storage.updatePin(hashedNewPin, false);
      return res.json({ success: true, name: updated.name });
    } catch (err) {
      console.error("Reset PIN error:", err);
      return res.status(500).json({ message: "Failed to reset PIN" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session || !req.session.authenticated) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const auth = await storage.getPinAuth();
    return res.json({
      name: auth?.name || "Madeline",
      mustReset: auth?.mustReset || false
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
    const items = await storage.getMediaItems(category);
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
      const item = await storage.createMediaItem({
        ...input,
        category,
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

  app.get(api.collections.list.path, isAuthenticated, async (_req, res) => {
    const cols = await storage.getCollections();
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
      const col = await storage.createCollection(input);
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

  return httpServer;
}
