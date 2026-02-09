import type { Express, Request, Response } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { orbitClient } from "../services/orbitClient";
import { z } from "zod";

function isAuthenticated(req: Request, res: Response, next: Function) {
  const session = req.session as any;
  if (!session?.authenticated || !session?.isAdmin) {
    return res.status(401).json({ message: "Admin authentication required" });
  }
  next();
}

function verifyOrbitWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function registerOrbitRoutes(app: Express): void {
  app.get("/api/orbit/status", isAuthenticated, async (_req: Request, res: Response) => {
    if (!orbitClient.isConfigured) {
      return res.json({
        connected: false,
        configured: false,
        message: "ORBIT credentials not configured. Set ORBIT_ECOSYSTEM_API_KEY and ORBIT_ECOSYSTEM_API_SECRET.",
      });
    }

    try {
      const status = await orbitClient.checkConnection();
      return res.json({
        connected: true,
        configured: true,
        hubName: status.hubName || "ORBIT Staffing OS",
        permissions: status.permissions || [],
        appName: "Trust Vault",
        royaltySplit: "100% Jason",
      });
    } catch (err: any) {
      return res.json({
        connected: false,
        configured: true,
        error: err.message,
      });
    }
  });

  app.get("/api/orbit/financial-statement", isAuthenticated, async (req: Request, res: Response) => {
    if (!orbitClient.isConfigured) {
      return res.status(503).json({ message: "ORBIT not configured" });
    }

    try {
      const period = req.query.period as string | undefined;
      const format = req.query.format as string | undefined;
      const statement = await orbitClient.getFinancialStatement({ period, format });
      return res.json(statement);
    } catch (err: any) {
      console.error("[ORBIT] Financial statement error:", err);
      return res.status(502).json({ message: "Failed to fetch financial statement from ORBIT", error: err.message });
    }
  });

  const transactionSchema = z.object({
    transactionId: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().default("USD"),
    description: z.string().min(1),
    category: z.string().min(1),
    timestamp: z.string().optional(),
  });

  app.post("/api/orbit/report-transaction", isAuthenticated, async (req: Request, res: Response) => {
    if (!orbitClient.isConfigured) {
      return res.status(503).json({ message: "ORBIT not configured" });
    }

    try {
      const input = transactionSchema.parse(req.body);
      const tx = {
        ...input,
        timestamp: input.timestamp || new Date().toISOString(),
      };
      const result = await orbitClient.reportTransaction(tx);
      return res.json({ success: true, result });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("[ORBIT] Transaction report error:", err);
      return res.status(502).json({ message: "Failed to report transaction to ORBIT", error: err.message });
    }
  });

  app.get("/api/orbit/logs", isAuthenticated, async (_req: Request, res: Response) => {
    if (!orbitClient.isConfigured) {
      return res.status(503).json({ message: "ORBIT not configured" });
    }

    try {
      const logs = await orbitClient.getLogs();
      return res.json(logs);
    } catch (err: any) {
      console.error("[ORBIT] Logs error:", err);
      return res.status(502).json({ message: "Failed to fetch logs from ORBIT", error: err.message });
    }
  });

  app.get("/api/orbit/snippets", isAuthenticated, async (_req: Request, res: Response) => {
    if (!orbitClient.isConfigured) {
      return res.status(503).json({ message: "ORBIT not configured" });
    }

    try {
      const snippets = await orbitClient.getSnippets();
      return res.json(snippets);
    } catch (err: any) {
      console.error("[ORBIT] Snippets error:", err);
      return res.status(502).json({ message: "Failed to fetch snippets from ORBIT", error: err.message });
    }
  });

  app.post("/webhooks/orbit", async (req: Request, res: Response) => {
    const signature = req.headers["x-orbit-signature"] as string;
    const secret = process.env.ORBIT_WEBHOOK_SECRET;

    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        console.error("[ORBIT Webhook] ORBIT_WEBHOOK_SECRET not configured in production, rejecting");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }
      console.warn("[ORBIT Webhook] No ORBIT_WEBHOOK_SECRET configured (dev mode), skipping verification");
    } else {
      const rawBody = (req as any).rawBody
        ? (req as any).rawBody.toString()
        : JSON.stringify(req.body);
      if (!signature || !verifyOrbitWebhook(rawBody, signature, secret)) {
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const { event, data } = req.body;
    console.log(`[ORBIT Webhook] Received event: ${event}`, data);

    switch (event) {
      case "payroll.completed":
        console.log("[ORBIT Webhook] Payroll completed:", data);
        break;
      case "payroll.payment.sent":
        console.log("[ORBIT Webhook] Payment sent:", data);
        break;
      case "payroll.payment.failed":
        console.error("[ORBIT Webhook] Payment failed:", data);
        break;
      case "worker.created":
        console.log("[ORBIT Webhook] Worker created:", data);
        break;
      case "worker.updated":
        console.log("[ORBIT Webhook] Worker updated:", data);
        break;
      case "document.generated":
        console.log("[ORBIT Webhook] Document generated:", data);
        break;
      case "tax.form.ready":
        console.log("[ORBIT Webhook] Tax form ready:", data);
        break;
      default:
        console.log(`[ORBIT Webhook] Unknown event: ${event}`, data);
    }

    res.json({ received: true });
  });
}
