import { randomBytes } from "crypto";
import { db } from "../db";
import {
  apiKeys,
  ecosystemProjects,
  type ApiKey,
  type EcosystemProject,
  type ProjectStatus,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

class EcosystemStorage {
  async getTenantByApiKey(key: string): Promise<ApiKey | undefined> {
    const [record] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.apiKey, key), eq(apiKeys.active, true)));
    return record;
  }

  async getTenantByTenantId(tenantId: string): Promise<ApiKey | undefined> {
    const [record] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.tenantId, tenantId));
    return record;
  }

  async provisionTenant(
    tenantId: string,
    appName: string,
    webhookUrl?: string,
    capabilities?: string[]
  ): Promise<ApiKey> {
    const apiKey = `dw_${randomBytes(16).toString("hex")}`;
    const apiSecret = randomBytes(32).toString("hex");

    const [record] = await db
      .insert(apiKeys)
      .values({
        tenantId,
        appName,
        apiKey,
        apiSecret,
        webhookUrl: webhookUrl || null,
        capabilities: capabilities || null,
        active: true,
      })
      .returning();
    return record;
  }

  async getProjects(tenantId: string): Promise<EcosystemProject[]> {
    return db
      .select()
      .from(ecosystemProjects)
      .where(eq(ecosystemProjects.tenantId, tenantId))
      .orderBy(desc(ecosystemProjects.createdAt));
  }

  async getProject(id: number, tenantId: string): Promise<EcosystemProject | undefined> {
    const [record] = await db
      .select()
      .from(ecosystemProjects)
      .where(
        and(
          eq(ecosystemProjects.id, id),
          eq(ecosystemProjects.tenantId, tenantId)
        )
      );
    return record;
  }

  async createProject(data: {
    tenantId: string;
    title: string;
    status: string;
    propertyAddress?: string | null;
    propertyId?: string | null;
    requestType: string;
    notes?: string | null;
    agentId?: string | null;
    estimatedTurnaround?: string | null;
  }): Promise<EcosystemProject> {
    const [record] = await db
      .insert(ecosystemProjects)
      .values(data)
      .returning();
    return record;
  }

  async updateProject(
    id: number,
    tenantId: string,
    updates: Partial<{
      status: ProjectStatus;
      thumbnailUrl: string;
      outputUrl: string;
      duration: number;
      timeline: string;
      assets: string;
      renderStatus: string;
      errorMessage: string;
      title: string;
    }>
  ): Promise<EcosystemProject | undefined> {
    const [record] = await db
      .update(ecosystemProjects)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(ecosystemProjects.id, id),
          eq(ecosystemProjects.tenantId, tenantId)
        )
      )
      .returning();
    return record;
  }

  async deleteProject(id: number, tenantId: string): Promise<void> {
    await db
      .delete(ecosystemProjects)
      .where(
        and(
          eq(ecosystemProjects.id, id),
          eq(ecosystemProjects.tenantId, tenantId)
        )
      );
  }
}

export const ecosystemStorage = new EcosystemStorage();
