import type { Express } from "express";
import { z } from "zod";
import { ecosystemStorage } from "./storage";
import { ecosystemAuth, type EcosystemRequest } from "./auth";
import { sendWebhook } from "./webhook";
import { ECOSYSTEM_CAPABILITIES } from "@shared/schema";

const APP_VERSION = "1.0.0";

export function registerEcosystemRoutes(app: Express): void {
  app.get("/api/ecosystem/status", ecosystemAuth, async (req: EcosystemRequest, res) => {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) {
      return res.status(400).json({ message: "tenantId query parameter required" });
    }
    if (tenantId !== req.tenant!.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    const capabilities = (req.tenant!.capabilities || ECOSYSTEM_CAPABILITIES as unknown as string[]);
    return res.json({
      configured: true,
      capabilities,
      version: APP_VERSION,
    });
  });

  app.get("/api/ecosystem/projects", ecosystemAuth, async (req: EcosystemRequest, res) => {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) {
      return res.status(400).json({ message: "tenantId query parameter required" });
    }
    if (tenantId !== req.tenant!.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    const projects = await ecosystemStorage.getProjects(tenantId);
    return res.json({
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        propertyAddress: p.propertyAddress,
        createdAt: p.createdAt,
        thumbnailUrl: p.thumbnailUrl,
      })),
    });
  });

  app.get("/api/ecosystem/projects/:id", ecosystemAuth, async (req: EcosystemRequest, res) => {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) {
      return res.status(400).json({ message: "tenantId query parameter required" });
    }
    if (tenantId !== req.tenant!.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    const project = await ecosystemStorage.getProject(Number(req.params.id), tenantId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    return res.json({
      id: project.id,
      title: project.title,
      status: project.status,
      propertyAddress: project.propertyAddress,
      propertyId: project.propertyId,
      requestType: project.requestType,
      notes: project.notes,
      agentId: project.agentId,
      thumbnailUrl: project.thumbnailUrl,
      outputUrl: project.outputUrl,
      duration: project.duration,
      timeline: project.timeline ? JSON.parse(project.timeline) : null,
      assets: project.assets ? JSON.parse(project.assets) : null,
      renderStatus: project.renderStatus,
      errorMessage: project.errorMessage,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  });

  app.get("/api/ecosystem/projects/:id/status", ecosystemAuth, async (req: EcosystemRequest, res) => {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) {
      return res.status(400).json({ message: "tenantId query parameter required" });
    }
    if (tenantId !== req.tenant!.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    const project = await ecosystemStorage.getProject(Number(req.params.id), tenantId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    return res.json({
      status: project.status,
      renderStatus: project.renderStatus,
      outputUrl: project.outputUrl,
      thumbnailUrl: project.thumbnailUrl,
      duration: project.duration,
      errorMessage: project.errorMessage,
      updatedAt: project.updatedAt,
    });
  });

  const walkthroughSchema = z.object({
    tenantId: z.string().min(1),
    propertyAddress: z.string().min(1),
    propertyId: z.string().optional(),
    requestType: z.string().min(1),
    notes: z.string().optional(),
    agentId: z.string().optional(),
  });

  app.post("/api/ecosystem/walkthrough-request", ecosystemAuth, async (req: EcosystemRequest, res) => {
    try {
      const input = walkthroughSchema.parse(req.body);
      if (input.tenantId !== req.tenant!.tenantId) {
        return res.status(403).json({ message: "Tenant mismatch" });
      }

      const project = await ecosystemStorage.createProject({
        tenantId: input.tenantId,
        title: `${input.requestType} - ${input.propertyAddress}`,
        status: "queued",
        propertyAddress: input.propertyAddress,
        propertyId: input.propertyId || null,
        requestType: input.requestType,
        notes: input.notes || null,
        agentId: input.agentId || null,
        estimatedTurnaround: "24-48 hours",
      });

      return res.status(201).json({
        requestId: project.id,
        status: "queued",
        estimatedTurnaround: project.estimatedTurnaround,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("[Ecosystem] Walkthrough request error:", err);
      return res.status(500).json({ message: "Failed to create walkthrough request" });
    }
  });

  app.post("/api/ecosystem/projects/:id/cancel", ecosystemAuth, async (req: EcosystemRequest, res) => {
    const { tenantId } = req.body;
    if (!tenantId) {
      return res.status(400).json({ message: "tenantId required in body" });
    }
    if (tenantId !== req.tenant!.tenantId) {
      return res.status(403).json({ message: "Tenant mismatch" });
    }

    const project = await ecosystemStorage.getProject(Number(req.params.id), tenantId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.status === "complete" || project.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel project with status: ${project.status}`,
      });
    }

    const updated = await ecosystemStorage.updateProject(project.id, tenantId, {
      status: "cancelled",
    });

    sendWebhook(tenantId, {
      requestId: project.id,
      status: "cancelled",
      outputUrl: null,
      thumbnailUrl: null,
      duration: null,
      tenantId,
      completedAt: new Date().toISOString(),
    }).catch((err) => console.error("[Webhook] Cancel notification error:", err));

    return res.json({ success: true, message: "Project cancelled" });
  });

  app.post("/api/ecosystem/provision", async (req: EcosystemRequest, res) => {
    const pinSession = req.session as any;
    if (!pinSession || !pinSession.authenticated) {
      return res.status(401).json({ message: "Vault authentication required" });
    }

    try {
      const schema = z.object({
        tenantId: z.string().min(1),
        appName: z.string().min(1),
        webhookUrl: z.string().url().optional(),
        capabilities: z.array(z.string()).optional(),
      });
      const input = schema.parse(req.body);

      const existing = await ecosystemStorage.getTenantByTenantId(input.tenantId);
      if (existing) {
        return res.json({
          apiKey: existing.apiKey,
          apiSecret: existing.apiSecret,
          tenantId: existing.tenantId,
          appName: existing.appName,
          message: "Tenant already provisioned",
        });
      }

      const tenant = await ecosystemStorage.provisionTenant(
        input.tenantId,
        input.appName,
        input.webhookUrl,
        input.capabilities
      );

      return res.status(201).json({
        apiKey: tenant.apiKey,
        apiSecret: tenant.apiSecret,
        tenantId: tenant.tenantId,
        appName: tenant.appName,
        message: "Tenant provisioned successfully",
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("[Ecosystem] Provision error:", err);
      return res.status(500).json({ message: "Failed to provision tenant" });
    }
  });
}
