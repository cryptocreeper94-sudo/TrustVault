import { db } from "../db";
import { apiKeys } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export type V1WebhookEvent =
  | "media.deleted"
  | "media.flagged"
  | "media.uploaded"
  | "service.quota_warning";

interface V1WebhookPayload {
  event: V1WebhookEvent;
  mediaId?: string;
  userId?: string;
  serviceId?: string;
  timestamp: string;
  data?: Record<string, any>;
}

function signWebhookPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export async function dispatchV1Webhook(
  tenantId: string,
  event: V1WebhookEvent,
  payload: Omit<V1WebhookPayload, "event" | "timestamp">
): Promise<boolean> {
  try {
    const [tenant] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, tenantId));

    if (!tenant || !tenant.webhookUrl) {
      console.log(`[V1 Webhook] No webhook URL for tenant ${tenantId}, skipping ${event}`);
      return false;
    }

    const webhookBody: V1WebhookPayload = {
      event,
      ...payload,
      serviceId: tenantId,
      timestamp: new Date().toISOString(),
    };

    const bodyStr = JSON.stringify(webhookBody);
    const signature = signWebhookPayload(tenant.apiSecret, bodyStr);

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(tenant.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-TrustVault-Signature": signature,
            "X-TrustVault-Event": event,
            "X-TrustVault-Timestamp": webhookBody.timestamp,
            "User-Agent": "TrustVault/1.0",
          },
          body: bodyStr,
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          console.log(`[V1 Webhook] ${event} delivered to ${tenant.appName} (${tenant.webhookUrl})`);
          return true;
        }

        console.warn(`[V1 Webhook] ${event} attempt ${attempt}/${maxRetries} to ${tenant.appName}: HTTP ${response.status}`);
      } catch (err: any) {
        console.warn(`[V1 Webhook] ${event} attempt ${attempt}/${maxRetries} to ${tenant.appName}: ${err.message}`);
      }

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    console.error(`[V1 Webhook] ${event} delivery failed after ${maxRetries} attempts to ${tenant.appName}`);
    return false;
  } catch (err: any) {
    console.error(`[V1 Webhook] Dispatch error for ${tenantId}:`, err.message);
    return false;
  }
}

export function extractUserFromTenantId(tenantId: string | null): string | null {
  if (!tenantId) return null;
  const parts = tenantId.split(":");
  return parts.length === 3 ? parts[2] : null;
}

export function extractServiceFromTenantId(tenantId: string | null): string | null {
  if (!tenantId) return null;
  const parts = tenantId.split(":");
  return parts.length === 3 ? parts[1] : null;
}
