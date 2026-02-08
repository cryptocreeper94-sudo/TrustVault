import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
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

      return res.json({ 
        name: auth.name, 
        mustReset: auth.mustReset 
      });
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

  // --- Video Routes ---

  app.get(api.videos.list.path, isAuthenticated, async (req, res) => {
    const vids = await storage.getVideos();
    res.json(vids);
  });

  app.get(api.videos.get.path, isAuthenticated, async (req, res) => {
    const video = await storage.getVideo(Number(req.params.id));
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    res.json(video);
  });

  app.post(api.videos.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.videos.create.input.parse(req.body);
      const video = await storage.createVideo(input);
      res.status(201).json(video);
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

  app.patch(api.videos.toggleFavorite.path, isAuthenticated, async (req, res) => {
    const { isFavorite } = req.body;
    const video = await storage.toggleFavorite(Number(req.params.id), isFavorite);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    res.json(video);
  });

  app.delete(api.videos.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteVideo(Number(req.params.id));
    res.sendStatus(204);
  });

  return httpServer;
}
