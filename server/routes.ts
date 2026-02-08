import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // 1. Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // 2. Setup Object Storage (Video Uploads)
  registerObjectStorageRoutes(app);

  // 3. API Routes

  // List videos
  app.get(api.videos.list.path, isAuthenticated, async (req, res) => {
    const videos = await storage.getVideos();
    res.json(videos);
  });

  // Get single video
  app.get(api.videos.get.path, isAuthenticated, async (req, res) => {
    const video = await storage.getVideo(Number(req.params.id));
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    res.json(video);
  });

  // Create video (Save metadata after upload)
  app.post(api.videos.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.videos.create.input.parse(req.body);
      
      // Inject the current user as the uploader
      const userId = (req.user as any)?.claims?.sub;
      
      const videoData = {
        ...input,
        uploadedBy: userId // Now we link it to the user!
      };

      const video = await storage.createVideo(videoData);
      res.status(201).json(video);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Toggle favorite
  app.patch(api.videos.toggleFavorite.path, isAuthenticated, async (req, res) => {
    const { isFavorite } = req.body;
    const video = await storage.toggleFavorite(Number(req.params.id), isFavorite);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    res.json(video);
  });

  // Delete video
  app.delete(api.videos.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteVideo(Number(req.params.id));
    res.sendStatus(204);
  });

  // Seed Data (Optional, but good for demo if empty)
  // We can't really seed valid videos without files, but we can try.
  // actually, let's skip seeding for now as broken video links are annoying.
  // The user will upload their own.

  return httpServer;
}
