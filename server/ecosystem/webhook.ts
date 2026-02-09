import { signPayload } from "./auth";
import { db } from "../db";
import { apiKeys } from "@shared/schema";
import { eq } from "drizzle-orm";

interface WebhookPayload {
  requestId: number;
  status: string;
  outputUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  tenantId: string;
  completedAt: string;
}

export async function sendWebhook(tenantId: string, payload: WebhookPayload): Promise<void> {
  const [tenant] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.tenantId, tenantId));

  if (!tenant || !tenant.webhookUrl) {
    console.log(`[Webhook] No webhook URL configured for tenant ${tenantId}, skipping`);
    return;
  }

  const { timestamp, signature } = signPayload(tenant.apiKey, tenant.apiSecret);
  const authHeader = `DW ${tenant.apiKey}:${timestamp}:${signature}`;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(tenant.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
          "X-App-Name": "mediastudio",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        console.log(`[Webhook] Successfully sent to ${tenant.webhookUrl} for request ${payload.requestId}`);
        return;
      }

      console.warn(`[Webhook] Attempt ${attempt}/${maxRetries} failed: HTTP ${response.status}`);
    } catch (err) {
      console.warn(`[Webhook] Attempt ${attempt}/${maxRetries} error:`, err);
    }

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  console.error(`[Webhook] All ${maxRetries} attempts failed for tenant ${tenantId}, request ${payload.requestId}`);
}
