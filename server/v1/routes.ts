import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
const { sign, verify } = jwt;
import { db } from "../db";
import { apiKeys, mediaItems, collections, collectionItems, type ApiKey, type MediaItem } from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { ObjectStorageService, objectStorageClient } from "../replit_integrations/object_storage/objectStorage";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { dispatchV1Webhook, extractUserFromTenantId, extractServiceFromTenantId } from "./webhooks";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("[V1 API] CRITICAL: JWT_SECRET environment variable is not set. V1 API auth will be unavailable.");
}
const SERVICE_TOKEN_EXPIRY = 3600;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 120;
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = (req as any).serviceId || req.ip || "unknown";
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

interface ServiceRequest extends Request {
  serviceId?: string;
  serviceTenant?: ApiKey;
  serviceScopes?: string[];
}

function serviceAuth(req: ServiceRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verify(token, JWT_SECRET) as any;
    if (payload.type !== "service-token") {
      return res.status(401).json({ error: "Invalid token type" });
    }
    req.serviceId = payload.serviceId;
    req.serviceScopes = payload.scope || [];
    (req as any)._tenantId = payload.tenantId;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireScope(scope: string) {
  return (req: ServiceRequest, res: Response, next: NextFunction) => {
    if (!req.serviceScopes || !req.serviceScopes.includes(scope)) {
      return res.status(403).json({ error: `Missing required scope: ${scope}` });
    }
    next();
  };
}

const uploadSchema = z.object({
  userId: z.string().min(1),
  voidId: z.string().optional(),
  mediaType: z.enum(["audio", "image", "video", "document"]),
  format: z.string().min(1),
  encoding: z.enum(["base64", "utf-8"]),
  data: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  collection: z.string().optional(),
  tags: z.array(z.string()).optional(),
  title: z.string().optional(),
});

function detectContentType(mediaType: string, format: string): string {
  const map: Record<string, Record<string, string>> = {
    audio: { wav: "audio/wav", webm: "audio/webm", mp3: "audio/mpeg", ogg: "audio/ogg", m4a: "audio/mp4" },
    image: { svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" },
    video: { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" },
    document: { pdf: "application/pdf", txt: "text/plain" },
  };
  return map[mediaType]?.[format] || "application/octet-stream";
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

export function registerV1Routes(app: Express): void {
  const objectStorage = new ObjectStorageService();

  app.post("/api/v1/auth/service-token", async (req: Request, res: Response) => {
    try {
      if (!JWT_SECRET) {
        return res.status(503).json({ error: "Service temporarily unavailable — authentication not configured" });
      }

      const { serviceId, apiKey, scope } = req.body as { serviceId?: string; apiKey?: string; scope?: string[] };

      if (!serviceId || !apiKey) {
        return res.status(400).json({ error: "serviceId and apiKey are required" });
      }

      const [tenant] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.apiKey, apiKey), eq(apiKeys.active, true)));

      if (!tenant) {
        return res.status(401).json({ error: "Invalid API key" });
      }

      if (tenant.tenantId !== serviceId && tenant.appName.toLowerCase().replace(/\s+/g, "-") !== serviceId.toLowerCase()) {
        return res.status(401).json({ error: "Service ID does not match API key" });
      }

      const allowedScopes = ["media:write", "media:read", "media:delete"];
      const requestedScopes = (scope || ["media:read"]).filter((s: string) => allowedScopes.includes(s));

      const token = sign(
        {
          type: "service-token",
          serviceId: tenant.tenantId,
          tenantId: tenant.tenantId,
          appName: tenant.appName,
          scope: requestedScopes,
          iat: Math.floor(Date.now() / 1000),
        },
        JWT_SECRET,
        { expiresIn: SERVICE_TOKEN_EXPIRY }
      );

      console.log(`[V1 API] Service token issued for ${tenant.appName} (${tenant.tenantId}), scopes: ${requestedScopes.join(", ")}`);

      return res.json({
        token,
        expiresIn: SERVICE_TOKEN_EXPIRY,
        scopes: requestedScopes,
        serviceId: tenant.tenantId,
      });
    } catch (err: any) {
      console.error("[V1 API] Auth error:", err.message);
      return res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.post("/api/v1/media/upload", rateLimit, serviceAuth, requireScope("media:write"), async (req: ServiceRequest, res: Response) => {
    try {
      const parsed = uploadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors });
      }

      const { userId, voidId, mediaType, format, encoding, data, metadata, collection, tags, title } = parsed.data;

      let buffer: Buffer;
      if (encoding === "base64") {
        const cleanData = data.replace(/^data:[^;]+;base64,/, "");
        buffer = Buffer.from(cleanData, "base64");
      } else {
        buffer = Buffer.from(data, "utf-8");
      }

      if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
        return res.status(413).json({ error: `File too large. Maximum size is ${MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)}MB` });
      }

      const contentType = detectContentType(mediaType, format);
      const fileId = randomUUID();
      const ext = format.toLowerCase();
      const objectName = `ecosystem/${req.serviceId}/${userId}/${fileId}.${ext}`;

      const privateDir = objectStorage.getPrivateObjectDir();
      const fullPath = `${privateDir}/${objectName}`;
      const { bucketName, objectName: objName } = parseObjectPath(fullPath);

      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objName);
      await file.save(buffer, { contentType, resumable: false });

      const objectPath = `/objects/${objectName}`;
      const host = req.headers.host || "trustvault.replit.app";
      const protocol = req.headers["x-forwarded-proto"] || "https";

      const mediaTitle = title || `${metadata?.source || mediaType} - ${new Date().toISOString().split("T")[0]}`;

      const [mediaItem] = await db
        .insert(mediaItems)
        .values({
          tenantId: `v1:${req.serviceId}:${userId}`,
          title: mediaTitle,
          description: metadata?.source ? `Source: ${metadata.source}` : null,
          url: objectPath,
          filename: `${fileId}.${ext}`,
          contentType,
          category: mediaType === "audio" ? "audio" : mediaType === "image" ? "image" : mediaType === "video" ? "video" : "document",
          size: buffer.length,
          tags: tags || [],
          uploadedBy: userId,
          label: metadata?.source || null,
        })
        .returning();

      if (collection) {
        const ecosystemTenantId = `v1:${req.serviceId}:${userId}`;
        const [existingCollection] = await db
          .select()
          .from(collections)
          .where(and(eq(collections.tenantId, ecosystemTenantId), eq(collections.name, collection)));

        let collectionId: number;
        if (existingCollection) {
          collectionId = existingCollection.id;
        } else {
          const [newCol] = await db
            .insert(collections)
            .values({ tenantId: ecosystemTenantId, name: collection })
            .returning();
          collectionId = newCol.id;
        }

        await db.insert(collectionItems).values({ collectionId, mediaItemId: mediaItem.id }).onConflictDoNothing();
      }

      console.log(`[V1 API] Media uploaded: ${mediaItem.id} by ${userId} via ${req.serviceId} (${buffer.length} bytes)`);

      return res.status(201).json({
        success: true,
        mediaId: `tv-media-${mediaItem.id}`,
        url: `${protocol}://${host}/api/v1/media/tv-media-${mediaItem.id}`,
        objectPath,
        sizeBytes: buffer.length,
        storedAt: mediaItem.createdAt,
      });
    } catch (err: any) {
      console.error("[V1 API] Upload error:", err.message);
      return res.status(500).json({ error: "Upload failed" });
    }
  });

  app.get("/api/v1/media/:mediaId", rateLimit, serviceAuth, requireScope("media:read"), async (req: ServiceRequest, res: Response) => {
    try {
      const rawId = String(req.params.mediaId).replace(/^tv-media-/, "");
      const mediaId = parseInt(rawId, 10);
      if (isNaN(mediaId)) {
        return res.status(400).json({ error: "Invalid media ID" });
      }

      const voidUser = req.headers["x-void-user"] as string | undefined;
      const tenantPrefix = `v1:${(req as any)._tenantId}:`;

      const conditions = [eq(mediaItems.id, mediaId), sql`${mediaItems.tenantId} LIKE ${tenantPrefix + '%'}`];
      if (voidUser) {
        conditions.push(eq(mediaItems.tenantId, `${tenantPrefix}${voidUser}`));
      }

      const [item] = await db
        .select()
        .from(mediaItems)
        .where(and(...conditions));

      if (!item) {
        return res.status(404).json({ error: "Media not found" });
      }

      const host = req.headers.host || "trustvault.replit.app";
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const cdnUrl = `${protocol}://${host}${item.url}`;

      let signedUrl: string | undefined;
      try {
        if (item.url.startsWith("/objects/")) {
          const privateDir = objectStorage.getPrivateObjectDir();
          const entityPath = item.url.replace("/objects/", "");
          const fullPath = `${privateDir}/${entityPath}`;
          const { bucketName, objectName: objName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objName);
          const [url] = await file.getSignedUrl({
            version: "v4",
            action: "read",
            expires: Date.now() + 60 * 60 * 1000,
          });
          signedUrl = url;
        }
      } catch {}

      return res.json({
        mediaId: `tv-media-${item.id}`,
        mediaType: item.category,
        format: item.filename?.split(".").pop() || "unknown",
        url: signedUrl || cdnUrl,
        cdnUrl,
        metadata: {
          source: item.label,
          title: item.title,
          description: item.description,
          tags: item.tags,
        },
        sizeBytes: item.size,
        createdAt: item.createdAt,
      });
    } catch (err: any) {
      console.error("[V1 API] Retrieval error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve media" });
    }
  });

  app.delete("/api/v1/media/:mediaId", rateLimit, serviceAuth, requireScope("media:delete"), async (req: ServiceRequest, res: Response) => {
    try {
      const rawId = String(req.params.mediaId).replace(/^tv-media-/, "");
      const mediaId = parseInt(rawId, 10);
      if (isNaN(mediaId)) {
        return res.status(400).json({ error: "Invalid media ID" });
      }

      const voidUser = req.headers["x-void-user"] as string | undefined;
      const tenantPrefix = `v1:${(req as any)._tenantId}:`;

      const conditions = [eq(mediaItems.id, mediaId), sql`${mediaItems.tenantId} LIKE ${tenantPrefix + '%'}`];
      if (voidUser) {
        conditions.push(eq(mediaItems.tenantId, `${tenantPrefix}${voidUser}`));
      }

      const [item] = await db
        .select()
        .from(mediaItems)
        .where(and(...conditions));

      if (!item) {
        return res.status(404).json({ error: "Media not found" });
      }

      try {
        if (item.url.startsWith("/objects/")) {
          const privateDir = objectStorage.getPrivateObjectDir();
          const entityPath = item.url.replace("/objects/", "");
          const fullPath = `${privateDir}/${entityPath}`;
          const { bucketName, objectName: objName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objName);
          await file.delete().catch(() => {});
        }
      } catch {}

      const deletedUserId = extractUserFromTenantId(item.tenantId);
      const deletedServiceId = extractServiceFromTenantId(item.tenantId);

      await db.delete(collectionItems).where(eq(collectionItems.mediaItemId, mediaId));
      await db.delete(mediaItems).where(eq(mediaItems.id, mediaId));

      console.log(`[V1 API] Media deleted: tv-media-${mediaId} by ${req.serviceId}`);

      if (deletedServiceId) {
        dispatchV1Webhook(deletedServiceId, "media.deleted", {
          mediaId: `tv-media-${mediaId}`,
          userId: deletedUserId || undefined,
        }).catch(() => {});
      }

      return res.json({ success: true, deleted: `tv-media-${mediaId}` });
    } catch (err: any) {
      console.error("[V1 API] Deletion error:", err.message);
      return res.status(500).json({ error: "Failed to delete media" });
    }
  });

  app.get("/api/v1/media/user/:trustLayerId", rateLimit, serviceAuth, requireScope("media:read"), async (req: ServiceRequest, res: Response) => {
    try {
      const { trustLayerId } = req.params;
      const source = req.query.source as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const sort = (req.query.sort as string) === "oldest" ? "oldest" : "newest";

      const tenantId = `v1:${(req as any)._tenantId}:${trustLayerId}`;

      const conditions = [eq(mediaItems.tenantId, tenantId)];
      if (source) {
        conditions.push(eq(mediaItems.label, source));
      }

      const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

      const items = await db
        .select()
        .from(mediaItems)
        .where(whereClause!)
        .orderBy(sort === "oldest" ? asc(mediaItems.createdAt) : desc(mediaItems.createdAt))
        .limit(limit)
        .offset(offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(mediaItems)
        .where(whereClause!);

      const total = totalResult?.count || 0;

      const host = req.headers.host || "trustvault.replit.app";
      const protocol = req.headers["x-forwarded-proto"] || "https";

      return res.json({
        items: items.map((item) => ({
          mediaId: `tv-media-${item.id}`,
          mediaType: item.category,
          format: item.filename?.split(".").pop() || "unknown",
          url: `${protocol}://${host}${item.url}`,
          metadata: {
            source: item.label,
            title: item.title,
            description: item.description,
            tags: item.tags,
          },
          sizeBytes: item.size,
          createdAt: item.createdAt,
        })),
        total,
        hasMore: offset + limit < total,
      });
    } catch (err: any) {
      console.error("[V1 API] Batch retrieval error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve media" });
    }
  });

  app.post("/api/v1/media/:mediaId/flag", rateLimit, serviceAuth, requireScope("media:write"), async (req: ServiceRequest, res: Response) => {
    try {
      const rawId = String(req.params.mediaId).replace(/^tv-media-/, "");
      const mediaId = parseInt(rawId, 10);
      if (isNaN(mediaId)) {
        return res.status(400).json({ error: "Invalid media ID" });
      }

      const { reason, details } = req.body as { reason?: string; details?: string };
      if (!reason) {
        return res.status(400).json({ error: "reason is required" });
      }

      const tenantPrefix = `v1:${(req as any)._tenantId}:`;
      const [item] = await db
        .select()
        .from(mediaItems)
        .where(and(eq(mediaItems.id, mediaId), sql`${mediaItems.tenantId} LIKE ${tenantPrefix + '%'}`));

      if (!item) {
        return res.status(404).json({ error: "Media not found" });
      }

      const flaggedUserId = extractUserFromTenantId(item.tenantId);
      const flaggedServiceId = extractServiceFromTenantId(item.tenantId);

      console.log(`[V1 API] Media flagged: tv-media-${mediaId} reason=${reason} by ${req.serviceId}`);

      if (flaggedServiceId) {
        dispatchV1Webhook(flaggedServiceId, "media.flagged", {
          mediaId: `tv-media-${mediaId}`,
          userId: flaggedUserId || undefined,
          data: { reason, details: details || null },
        }).catch(() => {});
      }

      return res.json({
        success: true,
        flagged: `tv-media-${mediaId}`,
        reason,
      });
    } catch (err: any) {
      console.error("[V1 API] Flag error:", err.message);
      return res.status(500).json({ error: "Failed to flag media" });
    }
  });

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "TrustVault V1 API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  console.log("[V1 API] TrustVault V1 ecosystem routes registered");
}
