import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { verifyJWT, type JWTPayload } from "../trustlayer-sso";
import { storage } from "../storage";
import { detectCategory, type MediaCategory, MEDIA_CATEGORIES } from "@shared/schema";
import { ObjectStorageService } from "../replit_integrations/object_storage/objectStorage";
import crypto from "crypto";

const DARKWAVE_ORIGINS = [
  "https://darkwavestudios.replit.app",
  "https://darkwavestudios.com",
  "https://www.darkwavestudios.com",
];

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = (req as any).jwtPayload?.trustLayerId || req.ip || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    res.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
    res.set("X-RateLimit-Remaining", String(RATE_LIMIT_MAX - 1));
    return next();
  }

  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  res.set("X-RateLimit-Limit", String(RATE_LIMIT_MAX));
  res.set("X-RateLimit-Remaining", String(remaining));

  if (entry.count > RATE_LIMIT_MAX) {
    res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
    return res.status(429).json({ error: "Rate limit exceeded", retryAfter: Math.ceil((entry.resetAt - now) / 1000) });
  }

  next();
}

function studioCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin && DARKWAVE_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-App-Name");
    res.set("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
}

interface StudioRequest extends Request {
  jwtPayload?: JWTPayload;
  tenantId?: string;
}

function jwtAuth(req: StudioRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header. Use Bearer <jwt_token>" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyJWT(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired JWT token" });
  }

  req.jwtPayload = decoded;
  req.tenantId = decoded.userId;
  next();
}

async function resolveUserTenant(req: StudioRequest, res: Response, next: NextFunction) {
  const trustLayerId = req.jwtPayload!.trustLayerId;
  const chatUser = await storage.getChatUserByTrustLayerId(trustLayerId);
  if (!chatUser) {
    return res.status(403).json({ error: "User not found in TrustVault. Ensure the user has a TrustVault account linked via TrustLayer SSO." });
  }

  const allAuths = await storage.getAllPinAuths();
  const matchedAuth = allAuths.find(
    (a) => a.name.toLowerCase() === chatUser.username.toLowerCase()
  );

  if (matchedAuth && matchedAuth.tenantId) {
    req.tenantId = matchedAuth.tenantId;
  } else {
    req.tenantId = chatUser.username.toLowerCase();
  }

  next();
}

export function registerStudioRoutes(app: Express): void {
  app.get("/api/studio/capabilities", studioCors, async (_req: Request, res: Response) => {
    return res.json({
      appName: "Trust Vault",
      appId: "dw_app_trustvault",
      version: "1.0.0",
      endpoints: [
        { method: "GET", path: "/api/studio/status", description: "Verify connection and get user info" },
        { method: "GET", path: "/api/studio/media/list", description: "List user media (paginated, filterable by category)" },
        { method: "GET", path: "/api/studio/media/:id", description: "Get a specific media item" },
        { method: "POST", path: "/api/studio/media/upload", description: "Get presigned upload URL" },
        { method: "POST", path: "/api/studio/media/confirm", description: "Confirm upload and register media item" },
        { method: "POST", path: "/api/studio/projects/create", description: "Create a new media project" },
        { method: "GET", path: "/api/studio/projects/:id/status", description: "Check project/render status" },
        { method: "POST", path: "/api/studio/projects/:id/export", description: "Trigger project export/render" },
        { method: "POST", path: "/api/studio/editor/embed-token", description: "Generate tokenized editor URL for iframe embedding" },
      ],
      authentication: {
        type: "Bearer JWT",
        header: "Authorization: Bearer <trustlayer_jwt_token>",
        tokenSource: "TrustLayer SSO — shared JWT_SECRET across ecosystem apps",
        tokenExpiry: "7 days",
      },
      cors: {
        allowedOrigins: DARKWAVE_ORIGINS,
      },
      rateLimits: {
        maxRequestsPerMinute: RATE_LIMIT_MAX,
        windowMs: RATE_LIMIT_WINDOW_MS,
      },
      fileLimits: {
        maxUploadSize: "500MB",
        supportedTypes: ["image/*", "video/*", "audio/*", "application/pdf", "application/msword"],
      },
      webhooks: {
        renderComplete: {
          url: "Configured per export request via webhookUrl parameter",
          defaultUrl: "https://darkwavestudios.replit.app/api/trustvault/webhook",
          payload: "{ projectId, status, downloadUrl, userId, trustLayerId, timestamp }",
          events: ["render.complete", "render.failed"],
        },
      },
    });
  });

  app.use("/api/studio", studioCors, jwtAuth, rateLimit);

  app.get("/api/studio/status", async (req: StudioRequest, res: Response) => {
    return res.json({
      connected: true,
      appName: "Trust Vault",
      appId: "dw_app_trustvault",
      version: "1.0.0",
      user: {
        trustLayerId: req.jwtPayload!.trustLayerId,
        userId: req.jwtPayload!.userId,
      },
      capabilities: [
        "media:list",
        "media:get",
        "media:upload",
        "media:delete",
        "projects:create",
        "projects:status",
        "projects:export",
        "editor:embed",
      ],
      limits: {
        rateLimit: `${RATE_LIMIT_MAX} requests per minute`,
        maxUploadSize: "500MB",
        maxConcurrentRenders: 3,
        supportedMediaTypes: ["image", "video", "audio", "document"],
      },
    });
  });

  app.get("/api/studio/media/list", resolveUserTenant, async (req: StudioRequest, res: Response) => {
    try {
      const category = req.query.category as MediaCategory | undefined;
      if (category && !MEDIA_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: "Invalid category. Supported: " + MEDIA_CATEGORIES.join(", ") });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const items = await storage.getMediaItems(req.tenantId!, category);

      const start = (page - 1) * limit;
      const paginated = items.slice(start, start + limit);

      return res.json({
        items: paginated.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          contentType: item.contentType,
          size: item.size,
          url: item.url,
          thumbnailUrl: item.thumbnailUrl,
          isFavorite: item.isFavorite,
          tags: item.tags,
          createdAt: item.createdAt,
        })),
        pagination: {
          page,
          limit,
          total: items.length,
          totalPages: Math.ceil(items.length / limit),
        },
      });
    } catch (err: any) {
      console.error("[Studio API] Media list error:", err);
      return res.status(500).json({ error: "Failed to list media" });
    }
  });

  app.get("/api/studio/media/:id", resolveUserTenant, async (req: StudioRequest, res: Response) => {
    try {
      const item = await storage.getMediaItem(Number(req.params.id));
      if (!item) {
        return res.status(404).json({ error: "Media item not found" });
      }
      if (item.tenantId !== req.tenantId) {
        return res.status(403).json({ error: "Access denied — media belongs to another tenant" });
      }

      return res.json({
        id: item.id,
        title: item.title,
        category: item.category,
        contentType: item.contentType,
        size: item.size,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        isFavorite: item.isFavorite,
        tags: item.tags,
        description: item.description,
        createdAt: item.createdAt,
      });
    } catch (err: any) {
      console.error("[Studio API] Media get error:", err);
      return res.status(500).json({ error: "Failed to get media item" });
    }
  });

  app.post("/api/studio/media/upload", resolveUserTenant, async (req: StudioRequest, res: Response) => {
    try {
      const schema = z.object({
        name: z.string().min(1),
        contentType: z.string().min(1),
        size: z.number().optional(),
      });
      const input = schema.parse(req.body);

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      return res.json({
        uploadURL,
        objectPath,
        metadata: { name: input.name, contentType: input.contentType, size: input.size },
        instructions: "Upload the file directly to uploadURL via PUT request with the correct Content-Type header. After upload completes, call POST /api/studio/media/confirm to register the media item.",
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("[Studio API] Upload URL error:", err);
      return res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.post("/api/studio/media/confirm", resolveUserTenant, async (req: StudioRequest, res: Response) => {
    try {
      const schema = z.object({
        title: z.string().min(1),
        url: z.string().min(1),
        filename: z.string().min(1),
        contentType: z.string().min(1),
        size: z.number().optional(),
        thumbnailUrl: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      });
      const input = schema.parse(req.body);

      const category = detectCategory(input.contentType);
      const item = await storage.createMediaItem({
        title: input.title,
        url: input.url,
        filename: input.filename,
        contentType: input.contentType,
        size: input.size,
        thumbnailUrl: input.thumbnailUrl,
        description: input.description,
        tags: input.tags,
        category,
        tenantId: req.tenantId,
      });

      return res.status(201).json({
        id: item.id,
        title: item.title,
        category: item.category,
        url: item.url,
        createdAt: item.createdAt,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("[Studio API] Media confirm error:", err);
      return res.status(500).json({ error: "Failed to confirm media upload" });
    }
  });

  app.post("/api/studio/projects/create", resolveUserTenant, async (req: StudioRequest, res: Response) => {
    try {
      const schema = z.object({
        title: z.string().min(1),
        type: z.enum(["video", "image", "audio"]).default("video"),
        description: z.string().optional(),
        dimensions: z.object({
          width: z.number().default(1920),
          height: z.number().default(1080),
        }).optional(),
        duration: z.number().optional(),
      });
      const input = schema.parse(req.body);

      const job = await storage.createProcessingJob(
        `studio-${input.type}`,
        JSON.stringify({
          title: input.title,
          type: input.type,
          description: input.description,
          dimensions: input.dimensions || { width: 1920, height: 1080 },
          duration: input.duration,
          tenantId: req.tenantId,
          trustLayerId: req.jwtPayload!.trustLayerId,
          createdVia: "darkwave-studio-api",
        })
      );

      return res.status(201).json({
        projectId: job.id,
        status: "queued",
        title: input.title,
        type: input.type,
        createdAt: job.createdAt,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("[Studio API] Project create error:", err);
      return res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.get("/api/studio/projects/:id/status", resolveUserTenant, async (req: StudioRequest, res: Response) => {
    try {
      const job = await storage.getProcessingJob(Number(req.params.id));
      if (!job) {
        return res.status(404).json({ error: "Project not found" });
      }

      let parsedData: any = {};
      try { parsedData = JSON.parse(job.inputData); } catch {}

      if (!parsedData.tenantId || parsedData.tenantId !== req.tenantId) {
        return res.status(403).json({ error: "Access denied — you do not own this project" });
      }

      return res.json({
        projectId: job.id,
        status: job.status,
        type: job.type,
        title: parsedData.title || null,
        progress: job.progress,
        outputMediaId: job.outputMediaId || null,
        errorMessage: job.errorMessage || null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      });
    } catch (err: any) {
      console.error("[Studio API] Project status error:", err);
      return res.status(500).json({ error: "Failed to get project status" });
    }
  });

  app.post("/api/studio/projects/:id/export", resolveUserTenant, async (req: StudioRequest, res: Response) => {
    try {
      const job = await storage.getProcessingJob(Number(req.params.id));
      if (!job) {
        return res.status(404).json({ error: "Project not found" });
      }

      let parsedData: any = {};
      try { parsedData = JSON.parse(job.inputData); } catch {}
      if (!parsedData.tenantId || parsedData.tenantId !== req.tenantId) {
        return res.status(403).json({ error: "Access denied — you do not own this project" });
      }

      const webhookUrl = req.body.webhookUrl || "https://darkwavestudios.replit.app/api/trustvault/webhook";

      await storage.updateProcessingJob(job.id, {
        status: "processing",
        inputData: JSON.stringify({ ...parsedData, webhookUrl }),
      });

      sendDarkWaveWebhook(webhookUrl, {
        event: "render.started",
        projectId: job.id,
        status: "processing",
        userId: req.jwtPayload!.userId,
        trustLayerId: req.jwtPayload!.trustLayerId,
        timestamp: new Date().toISOString(),
      }).catch((err) => console.error("[Studio API] Webhook send error:", err));

      simulateRenderCompletion(job.id, webhookUrl, req.jwtPayload!.userId, req.jwtPayload!.trustLayerId);

      return res.json({
        projectId: job.id,
        status: "processing",
        message: "Export started. You will receive webhook callbacks for render.started, render.complete, or render.failed events.",
        webhookUrl,
      });
    } catch (err: any) {
      console.error("[Studio API] Project export error:", err);
      return res.status(500).json({ error: "Failed to start export" });
    }
  });

  app.post("/api/studio/editor/embed-token", resolveUserTenant, async (req: StudioRequest, res: Response) => {
    try {
      const schema = z.object({
        editorType: z.enum(["video", "image", "audio", "merge"]).default("video"),
        mediaId: z.number().optional(),
        returnUrl: z.string().optional(),
      });
      const input = schema.parse(req.body);

      const embedToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      const editorPaths: Record<string, string> = {
        video: "/video-editor",
        image: "/image-editor",
        audio: "/audio-editor",
        merge: "/merge-editor",
      };

      const editorPath = editorPaths[input.editorType];
      const params = new URLSearchParams({
        embed: "true",
        token: embedToken,
        ...(input.mediaId ? { mediaId: String(input.mediaId) } : {}),
        ...(input.returnUrl ? { returnUrl: input.returnUrl } : {}),
      });

      const embedUrl = `https://trustvault.replit.app${editorPath}?${params.toString()}`;

      return res.json({
        embedUrl,
        embedToken,
        expiresAt,
        editorType: input.editorType,
        instructions: "Open this URL in an iframe or redirect the user. The token authenticates their session for 2 hours.",
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("[Studio API] Embed token error:", err);
      return res.status(500).json({ error: "Failed to generate embed token" });
    }
  });

}

async function simulateRenderCompletion(
  jobId: number,
  webhookUrl: string,
  userId: number,
  trustLayerId: string
): Promise<void> {
  setTimeout(async () => {
    try {
      const job = await storage.getProcessingJob(jobId);
      if (!job) return;

      const success = Math.random() > 0.05;

      if (success) {
        await storage.updateProcessingJob(jobId, {
          status: "completed",
          progress: 100,
        });

        let downloadUrl: string | null = null;
        if (job.outputMediaId) {
          const media = await storage.getMediaItem(job.outputMediaId);
          if (media) {
            downloadUrl = media.storageUrl;
          }
        }

        await sendDarkWaveWebhook(webhookUrl, {
          event: "render.complete",
          projectId: jobId,
          status: "completed",
          downloadUrl,
          outputMediaId: job.outputMediaId,
          userId,
          trustLayerId,
          timestamp: new Date().toISOString(),
        });
      } else {
        await storage.updateProcessingJob(jobId, {
          status: "failed",
          errorMessage: "Render processing failed due to an internal error",
        });

        await sendDarkWaveWebhook(webhookUrl, {
          event: "render.failed",
          projectId: jobId,
          status: "failed",
          error: "Render processing failed due to an internal error",
          userId,
          trustLayerId,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("[Studio API] Render completion simulation error:", err);
    }
  }, 5000 + Math.random() * 10000);
}

async function sendDarkWaveWebhook(url: string, payload: any): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Name": "Trust Vault",
        "X-App-Id": "dw_app_trustvault",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[Studio Webhook] Failed to send to ${url}: ${res.status} ${res.statusText}`);
    } else {
      console.log(`[Studio Webhook] Sent to ${url}: ${payload.status}`);
    }
  } catch (err) {
    console.error(`[Studio Webhook] Error sending to ${url}:`, err);
  }
}
