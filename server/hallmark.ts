import crypto from "crypto";
import { db } from "./db";
import { hallmarks, trustStamps, hallmarkCounter } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const APP_PREFIX = "TV";
const APP_NAME = "TrustVault";
const APP_DOMAIN = "trustvault.tlid.io";

function generateDataHash(payload: Record<string, any>): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function simulateTxHash(): string {
  return "0x" + crypto.randomBytes(32).toString("hex");
}

function simulateBlockHeight(): string {
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

async function getNextSequence(): Promise<number> {
  const result = await db
    .insert(hallmarkCounter)
    .values({ id: "tv-master", currentSequence: "1" })
    .onConflictDoUpdate({
      target: hallmarkCounter.id,
      set: {
        currentSequence: sql`(CAST(${hallmarkCounter.currentSequence} AS integer) + 1)::text`,
      },
    })
    .returning({ currentSequence: hallmarkCounter.currentSequence });

  return parseInt(result[0].currentSequence, 10);
}

function formatHallmarkId(sequence: number): string {
  return `${APP_PREFIX}-${String(sequence).padStart(8, "0")}`;
}

export async function generateHallmark(data: {
  userId?: number;
  appId: string;
  productName: string;
  releaseType: string;
  metadata?: Record<string, any>;
}): Promise<typeof hallmarks.$inferSelect> {
  const sequence = await getNextSequence();
  const thId = formatHallmarkId(sequence);
  const timestamp = new Date().toISOString();

  const payload = {
    thId,
    userId: data.userId,
    appId: data.appId,
    appName: APP_NAME,
    productName: data.productName,
    releaseType: data.releaseType,
    timestamp,
    ...(data.metadata || {}),
  };

  const dataHash = generateDataHash(payload);
  const txHash = simulateTxHash();
  const blockHeight = simulateBlockHeight();
  const verificationUrl = `https://${APP_DOMAIN}/api/hallmark/${thId}/verify`;

  const [hallmark] = await db
    .insert(hallmarks)
    .values({
      thId,
      userId: data.userId || null,
      appId: data.appId,
      appName: APP_NAME,
      productName: data.productName,
      releaseType: data.releaseType,
      metadata: data.metadata || {},
      dataHash,
      txHash,
      blockHeight,
      verificationUrl,
      hallmarkId: sequence,
    })
    .returning();

  return hallmark;
}

export async function createTrustStamp(data: {
  userId?: number;
  category: string;
  data: Record<string, any>;
}): Promise<typeof trustStamps.$inferSelect> {
  const timestamp = new Date().toISOString();
  const payload = {
    userId: data.userId,
    category: data.category,
    data: { ...data.data, appContext: "trustvault", timestamp },
    timestamp,
  };

  const dataHash = generateDataHash(payload);
  const txHash = simulateTxHash();
  const blockHeight = simulateBlockHeight();

  const [stamp] = await db
    .insert(trustStamps)
    .values({
      userId: data.userId || null,
      category: data.category,
      data: { ...data.data, appContext: "trustvault", timestamp },
      dataHash,
      txHash,
      blockHeight,
    })
    .returning();

  return stamp;
}

export async function seedGenesisHallmark(): Promise<void> {
  const genesisId = `${APP_PREFIX}-00000001`;
  const existing = await db
    .select()
    .from(hallmarks)
    .where(eq(hallmarks.thId, genesisId))
    .limit(1);

  if (existing.length > 0) {
    console.log(`[Hallmark] Genesis hallmark ${genesisId} already exists`);
    return;
  }

  await db
    .update(hallmarkCounter)
    .set({ currentSequence: "0" })
    .where(eq(hallmarkCounter.id, "tv-master"));

  const genesis = await generateHallmark({
    appId: "trustvault-genesis",
    productName: "Genesis Block",
    releaseType: "genesis",
    metadata: {
      ecosystem: "Trust Layer",
      version: "1.0.0",
      domain: APP_DOMAIN,
      operator: "DarkWave Studios LLC",
      chain: "Trust Layer Blockchain",
      consensus: "Proof of Trust",
      launchDate: "2026-08-23T00:00:00.000Z",
      nativeAsset: "SIG",
      utilityToken: "Shells",
      parentApp: "Trust Layer Hub",
      parentGenesis: "TH-00000001",
    },
  });

  console.log(`[Hallmark] Genesis hallmark created: ${genesis.thId}`);
}

export async function getHallmarkById(thId: string) {
  const [hallmark] = await db
    .select()
    .from(hallmarks)
    .where(eq(hallmarks.thId, thId.toUpperCase()))
    .limit(1);
  return hallmark || null;
}

export async function getGenesisHallmark() {
  return getHallmarkById(`${APP_PREFIX}-00000001`);
}

export async function verifyHallmark(thId: string) {
  const hallmark = await getHallmarkById(thId);
  if (!hallmark) {
    return { verified: false, error: "Hallmark not found" };
  }
  return {
    verified: true,
    hallmark: {
      thId: hallmark.thId,
      appName: hallmark.appName,
      productName: hallmark.productName,
      releaseType: hallmark.releaseType,
      dataHash: hallmark.dataHash,
      txHash: hallmark.txHash,
      blockHeight: hallmark.blockHeight,
      createdAt: hallmark.createdAt,
      metadata: hallmark.metadata,
    },
  };
}
