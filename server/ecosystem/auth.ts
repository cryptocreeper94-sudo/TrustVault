import { createHmac, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { apiKeys, type ApiKey } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

export interface EcosystemRequest extends Request {
  tenant?: ApiKey;
}

async function lookupApiKey(key: string): Promise<ApiKey | undefined> {
  const [record] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.apiKey, key), eq(apiKeys.active, true)));
  return record;
}

function verifySignature(
  apiKey: string,
  apiSecret: string,
  timestamp: string,
  providedSignature: string
): boolean {
  const message = `${timestamp}:${apiKey}`;
  const expected = createHmac("sha256", apiSecret).update(message).digest("hex");
  try {
    const sigBuf = Buffer.from(providedSignature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export function ecosystemAuth(
  req: EcosystemRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("DW ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const parts = authHeader.slice(3).split(":");
  if (parts.length !== 3) {
    return res.status(401).json({ message: "Malformed Authorization header" });
  }

  const [key, timestamp, signature] = parts;
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime)) {
    return res.status(401).json({ message: "Invalid timestamp" });
  }

  const now = Date.now();
  if (Math.abs(now - requestTime) > TIMESTAMP_TOLERANCE_MS) {
    return res.status(401).json({ message: "Request timestamp expired" });
  }

  lookupApiKey(key)
    .then((tenant) => {
      if (!tenant) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      if (!verifySignature(key, tenant.apiSecret, timestamp, signature)) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      const appName = req.headers["x-app-name"] as string | undefined;
      if (appName && appName !== tenant.appName) {
        return res.status(403).json({ message: "App name mismatch" });
      }

      req.tenant = tenant;
      next();
    })
    .catch((err) => {
      console.error("[EcosystemAuth] Error:", err);
      return res.status(500).json({ message: "Authentication error" });
    });
}

export function signPayload(apiKey: string, apiSecret: string): { timestamp: string; signature: string } {
  const timestamp = Date.now().toString();
  const message = `${timestamp}:${apiKey}`;
  const signature = createHmac("sha256", apiSecret).update(message).digest("hex");
  return { timestamp, signature };
}
