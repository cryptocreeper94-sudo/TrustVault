import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { blockchainClient } from "./services/blockchainClient";
import { detectCategory, type MediaCategory, MEDIA_CATEGORIES, TIER_LIMITS, type SubscriptionTier } from "@shared/schema";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { processTrimJob, processMergeJob } from "./videoProcessor";
import { registerEcosystemRoutes } from "./ecosystem/routes";
import { registerBlogRoutes } from "./blog/routes";
import { registerStripeRoutes } from "./stripe/routes";
import { registerAgentRoutes } from "./agent/routes";
import { registerChatAuthRoutes } from "./chat/auth-routes";
import { setupChatWebSocket } from "./chat/ws-server";
import { registerOrbitRoutes } from "./orbit/routes";
import { registerStudioRoutes } from "./studio/routes";
import { registerAIRoutes } from "./ai/routes";
import { registerBlockchainRoutes } from "./blockchain/routes";
import { registerV1Routes } from "./v1/routes";
import { generateTrustLayerId, generateJWT, hashPassword } from "./trustlayer-sso";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
    name: string;
    tenantId: string;
    pinAuthId: number;
    isAdmin: boolean;
  }
}

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) return "Password must contain at least one special character";
  return null;
}

async function bootstrapInviteCodes() {
  const defaultInvites = [
    { name: "Kathy", code: "KATHY-TENNIS" },
  ];

  for (const invite of defaultInvites) {
    const existing = await storage.getWhitelistByCode(invite.code);
    if (!existing) {
      await storage.createWhitelistEntry({
        name: invite.name,
        inviteCode: invite.code,
      });
      console.log(`[Bootstrap] Created invite code for ${invite.name}: ${invite.code}`);
    } else {
      console.log(`[Bootstrap] Invite code for ${invite.name} already exists, skipping`);
    }
  }
}

async function bootstrapFamilyAccounts() {
  const TEMP_PASSWORD = "Temp12345!";
  const JASON_PIN = "0424";
  const hashedTempPassword = await bcrypt.hash(TEMP_PASSWORD, 10);
  const hashedJasonPin = await bcrypt.hash(JASON_PIN, 10);

  const familyMembers = [
    { name: "Jason", isAdmin: true, mustReset: false, password: hashedJasonPin, tier: "studio" as const },
    { name: "Madeline", isAdmin: false, mustReset: true, password: hashedTempPassword, tier: "studio" as const },
    { name: "Natalie", isAdmin: false, mustReset: true, password: hashedTempPassword, tier: "studio" as const },
    { name: "Avery", isAdmin: false, mustReset: true, password: hashedTempPassword, tier: "studio" as const },
    { name: "Jennifer", isAdmin: false, mustReset: true, password: hashedTempPassword, tier: "studio" as const },
    { name: "Will", isAdmin: false, mustReset: true, password: hashedTempPassword, tier: "studio" as const },
    { name: "Carley", isAdmin: false, mustReset: true, password: hashedTempPassword, tier: "studio" as const },
  ];

  for (const member of familyMembers) {
    const existing = await storage.getPinAuthByName(member.name);
    if (existing) {
      if (member.name === "Jason") {
        const pinMatch = await bcrypt.compare(JASON_PIN, existing.pin);
        if (!pinMatch) {
          await storage.updatePin(existing.id, member.password, false);
          console.log(`[Bootstrap] Reset Jason's developer PIN`);
        } else {
          console.log(`[Bootstrap] Jason's PIN is correct, skipping`);
        }
      } else if (existing.mustReset) {
        await storage.updatePin(existing.id, member.password, true);
        console.log(`[Bootstrap] Reset temp password for ${member.name}`);
      } else {
        console.log(`[Bootstrap] ${member.name} already set up, skipping`);
      }
      if (existing.tenantId && member.tier !== "free") {
        const tenant = await storage.getTenant(existing.tenantId);
        if (tenant && tenant.tier !== member.tier) {
          await storage.updateTenant(tenant.id, { tier: member.tier });
          console.log(`[Bootstrap] Upgraded ${member.name} to ${member.tier} tier`);
        }
      }
    } else {
      const storagePrefix = member.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const tenant = await storage.createTenant({
        name: member.name,
        storagePrefix,
        tier: member.tier,
        status: "active",
      });
      const auth = await storage.initializePinAuth(member.password, member.name, member.mustReset, tenant.id);
      if (member.isAdmin) {
        const { pinAuth } = await import("@shared/schema");
        const { db } = await import("./db");
        const { eq } = await import("drizzle-orm");
        await db.update(pinAuth).set({ isAdmin: true }).where(eq(pinAuth.id, auth.id));
      }
      await storage.updateTenant(tenant.id, { pinAuthId: auth.id });
      console.log(`[Bootstrap] Created account for ${member.name} (admin: ${member.isAdmin})`);
    }
  }
  console.log("[Bootstrap] Family accounts ready");
}

async function bootstrapEcosystemMembers() {
  const { db } = await import("./db");
  const { pinAuth } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");

  const ecosystemMembers = [
    { name: "Kathy Nguyen", email: "kathy@happyeats.io", password: "HappyEats@2025", pin: "7724", trustLayerId: "tl-kathy-he01", ecosystemApp: "Happy Eats" },
    { name: "Marcus Chen", email: "marcus@trusthome.io", password: "TrustHome@2025", pin: "4419", trustLayerId: "tl-marc-th01", ecosystemApp: "TrustHome" },
    { name: "Devon Park", email: "devon@signal.dw", password: "Signal@2025", pin: "8832", trustLayerId: "tl-devn-sg01", ecosystemApp: "Signal" },
  ];

  for (const m of ecosystemMembers) {
    const existing = await storage.getPinAuthByTrustLayerId(m.trustLayerId);
    if (existing) {
      console.log(`[Bootstrap] Ecosystem member ${m.name} (${m.trustLayerId}) already exists, skipping`);
      continue;
    }
    const existingByEmail = await storage.getPinAuthByEmail(m.email);
    if (existingByEmail) {
      if (!existingByEmail.trustLayerId) {
        const pinHash = await bcrypt.hash(m.pin, 12);
        await db.update(pinAuth).set({
          trustLayerId: m.trustLayerId,
          ecosystemPinHash: pinHash,
          ecosystemApp: m.ecosystemApp,
        }).where(eq(pinAuth.id, existingByEmail.id));
        console.log(`[Bootstrap] Linked existing ${m.name} to Trust Layer (${m.trustLayerId})`);
      }
      continue;
    }
    const passwordHash = await bcrypt.hash(m.password, 12);
    const pinHash = await bcrypt.hash(m.pin, 12);
    const storagePrefix = m.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const tenant = await storage.createTenant({
      name: m.name,
      storagePrefix,
      tier: "free",
      status: "active",
    });
    const auth = await storage.initializePinAuth(passwordHash, m.name, false, tenant.id);
    await db.update(pinAuth).set({
      email: m.email,
      trustLayerId: m.trustLayerId,
      ecosystemPinHash: pinHash,
      ecosystemApp: m.ecosystemApp,
    }).where(eq(pinAuth.id, auth.id));
    await storage.updateTenant(tenant.id, { pinAuthId: auth.id });
    console.log(`[Bootstrap] Created ecosystem member ${m.name} (${m.trustLayerId}) from ${m.ecosystemApp}`);
  }
  console.log("[Bootstrap] Ecosystem members ready");
}

async function bootstrapEcosystemTenants() {
  const { ecosystemStorage } = await import("./ecosystem/storage");

  const tenants = [
    {
      tenantId: "trusthome",
      appName: "TrustHome",
      apiKey: "dw_4c5f4e62a04cf0aff2ee69468021a373",
      apiSecret: "f95477a1daa27f0edf40e336a79cd07f0ae72218b2783c64332d33a3459581b0",
      webhookUrl: "https://trusthome.replit.app/api/ecosystem/incoming",
      capabilities: ["media_vault", "video_walkthrough", "photo_editing", "virtual_staging"],
    },
    {
      tenantId: "driver-connect",
      appName: "TL Driver Connect",
      apiKey: "dw_63e5db8f122ad2c4dc89440bb355995c",
      apiSecret: "24d4c036e266bf40921877257c8ea8d3748a6e46d01f83ae86984531200cb924",
      webhookUrl: "https://tldriverconnect.com/api/trustvault/webhook",
      capabilities: ["media_vault", "video_walkthrough", "photo_editing", "virtual_staging"],
    },
    {
      tenantId: "the-void",
      appName: "THE VOID",
      apiKey: "dw_0fb4a28916a412c11ec57a3e61311c74",
      apiSecret: "6501933226dbc1d7c2b9952ff6f1d83d07d51d0b2d7832f9f267cc922cff70ed",
      webhookUrl: "https://intothevoid.replit.app/api/trustvault/webhook",
      capabilities: ["media_vault", "media_upload", "media_read", "media_delete", "batch_retrieval"],
    },
    {
      tenantId: "trustgolf",
      appName: "Trust Golf",
      apiKey: "dw_a2c03ec033fc85aa11d1b6ed558b2b1d",
      apiSecret: "83a81962529662b58e4306a1cb474e1c01a2a78ea150a61cda908d0b6ccab93e",
      webhookUrl: "https://trustgolf.replit.app/api/trustvault/webhook",
      capabilities: ["media_vault", "media_upload", "media_read", "media_delete", "photo_editing", "video_editing", "audio_editing"],
    },
    {
      tenantId: "trustbook",
      appName: "TrustBook",
      apiKey: "dw_8f408c9e34765316d7aa7623dbbf437f",
      apiSecret: "f791fac3afd4087319505670280e52f4ce2e6fb0addb0b31271a76729b0f6891",
      webhookUrl: "https://trustbook.replit.app/api/trustvault/webhook",
      capabilities: ["media_vault", "media_upload", "media_read", "media_delete", "document_storage", "epub_storage"],
    },
  ];

  for (const t of tenants) {
    const existing = await ecosystemStorage.getTenantByTenantId(t.tenantId);
    if (existing) {
      console.log(`[Bootstrap] Ecosystem tenant ${t.tenantId} already exists, skipping`);
    } else {
      const { db } = await import("./db");
      const { apiKeys } = await import("@shared/schema");
      await db.insert(apiKeys).values({
        tenantId: t.tenantId,
        appName: t.appName,
        apiKey: t.apiKey,
        apiSecret: t.apiSecret,
        webhookUrl: t.webhookUrl,
        capabilities: t.capabilities,
        active: true,
      });
      console.log(`[Bootstrap] Provisioned ecosystem tenant: ${t.tenantId}`);
    }
  }
  console.log("[Bootstrap] Ecosystem tenants ready");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: 30 * 24 * 60 * 60,
    tableName: "sessions",
  });

  app.set("trust proxy", 1);
  const isProduction = process.env.NODE_ENV === "production";
  app.use(session({
    secret: process.env.SESSION_SECRET || "concert-memories-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }));

  registerObjectStorageRoutes(app);
  registerEcosystemRoutes(app);
  registerBlogRoutes(app);
  registerStripeRoutes(app);
  registerAgentRoutes(app);
  registerChatAuthRoutes(app);
  registerOrbitRoutes(app);
  registerStudioRoutes(app);
  registerAIRoutes(app);
  registerBlockchainRoutes(app);
  registerV1Routes(app);
  setupChatWebSocket(httpServer);

  storage.seedDefaultChannels().then(() => {
    console.log("[Signal Chat] Default channels seeded");
  }).catch((err) => {
    console.error("[Signal Chat] Failed to seed channels:", err);
  });

  bootstrapFamilyAccounts().catch((err) => {
    console.error("[Bootstrap] Failed to seed family accounts:", err);
  });

  bootstrapInviteCodes().catch((err) => {
    console.error("[Bootstrap] Failed to seed invite codes:", err);
  });

  bootstrapEcosystemTenants().catch((err) => {
    console.error("[Bootstrap] Failed to seed ecosystem tenants:", err);
  });

  bootstrapEcosystemMembers().catch((err) => {
    console.error("[Bootstrap] Failed to seed ecosystem members:", err);
  });

  import("./hallmark").then(({ seedGenesisHallmark }) => {
    seedGenesisHallmark().catch((err) => {
      console.error("[Hallmark] Failed to seed genesis:", err);
    });
  });

  import("./affiliate").then(({ backfillUniqueHashes }) => {
    backfillUniqueHashes().catch((err) => {
      console.error("[Affiliate] Failed to backfill hashes:", err);
    });
  });

  app.post("/api/client-error", (req, res) => {
    const { message, stack, componentStack } = req.body || {};
    console.error("[CLIENT ERROR]", message);
    if (stack) console.error("[CLIENT STACK]", stack);
    if (componentStack) console.error("[CLIENT COMPONENT]", componentStack);
    res.json({ ok: true });
  });

  app.post("/api/auth/verify-pin", async (req, res) => {
    try {
      if (!req.session?.authenticated || !req.session.pinAuthId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { pin } = req.body;
      if (!pin) return res.status(400).json({ message: "PIN required" });
      const auth = await storage.getPinAuthById(req.session.pinAuthId);
      if (!auth || !auth.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const match = await bcrypt.compare(pin, auth.pin);
      if (!match) {
        return res.status(401).json({ message: "Invalid PIN" });
      }
      return res.json({ verified: true });
    } catch (err) {
      console.error("PIN verify error:", err);
      return res.status(500).json({ message: "Verification failed" });
    }
  });

  // --- Auth Routes ---

  app.get("/api/auth/status", async (_req, res) => {
    try {
      const allAuths = await storage.getAllPinAuths();
      return res.json({ accountExists: allAuths.length > 0, accountCount: allAuths.length });
    } catch (err) {
      console.error("Auth status error:", err);
      return res.status(500).json({ message: "Failed to check auth status" });
    }
  });

  app.post("/api/auth/setup", async (req, res) => {
    try {
      const { name, password, email } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      if (!email || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const existingByName = await storage.getPinAuthByName(trimmedName);
      if (existingByName) {
        return res.status(400).json({ message: "An account with that name already exists. Please log in." });
      }
      const validationError = validatePassword(password);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const storagePrefix = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const tenant = await storage.createTenant({
        name: trimmedName,
        storagePrefix,
        tier: "free",
        status: "active",
      });
      const auth = await storage.initializePinAuth(hashedPassword, trimmedName, false, tenant.id);
      await storage.updatePin(auth.id, hashedPassword, false, trimmedEmail);
      await storage.updateTenant(tenant.id, { pinAuthId: auth.id });
      req.session.authenticated = true;
      req.session.name = auth.name;
      req.session.tenantId = tenant.id;
      req.session.pinAuthId = auth.id;
      req.session.isAdmin = false;
      return res.json({ name: auth.name, mustReset: false, tenantId: tenant.id, isAdmin: false });
    } catch (err) {
      console.error("Setup error:", err);
      return res.status(500).json({ message: "Account setup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { name, password, rememberMe } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      let auth;
      if (name) {
        auth = await storage.getPinAuthByName(name.trim());
      } else {
        const allAuths = await storage.getAllPinAuths();
        if (allAuths.length === 1) {
          auth = allAuths[0];
        } else {
          return res.status(400).json({ message: "Please provide your name to log in" });
        }
      }

      if (!auth) {
        return res.status(400).json({ message: "No account found with that name. Please create one first." });
      }
      const match = await bcrypt.compare(password, auth.pin);
      if (!match) {
        return res.status(401).json({ message: "Incorrect password" });
      }

      let tenant;
      if (auth.tenantId) {
        tenant = await storage.getTenant(auth.tenantId);
      }
      if (!tenant) {
        tenant = await storage.getTenantByPinAuthId(auth.id);
      }
      if (!tenant) {
        const storagePrefix = auth.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        tenant = await storage.createTenant({
          name: auth.name,
          storagePrefix,
          tier: "free",
          status: "active",
          pinAuthId: auth.id,
        });
      }

      req.session.authenticated = true;
      req.session.name = auth.name;
      req.session.tenantId = tenant.id;
      req.session.pinAuthId = auth.id;
      req.session.isAdmin = auth.isAdmin ?? false;

      if (rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      } else {
        req.session.cookie.maxAge = null as any;
        req.session.cookie.expires = false as any;
      }

      try {
        const { createTrustStamp } = await import("./hallmark");
        await createTrustStamp({ userId: auth.id, category: "auth-login", data: { device: req.headers["user-agent"] || "unknown" } });
      } catch {}

      return res.json({ name: auth.name, mustReset: auth.mustReset, tenantId: tenant.id, isAdmin: auth.isAdmin ?? false });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/ecosystem-login", async (req, res) => {
    try {
      const { identifier, credential } = req.body;
      if (!identifier || !credential || typeof identifier !== "string" || typeof credential !== "string") {
        return res.status(400).json({ message: "Trust Layer ID or email and credential are required" });
      }
      const trimmedId = identifier.trim();
      const trimmedCred = credential.trim();
      if (!trimmedId || !trimmedCred) {
        return res.status(400).json({ message: "Trust Layer ID or email and credential are required" });
      }

      let auth;
      if (trimmedId.startsWith("tl-")) {
        auth = await storage.getPinAuthByTrustLayerId(trimmedId);
      }
      if (!auth) {
        auth = await storage.getPinAuthByEmail(trimmedId.toLowerCase());
      }
      if (!auth) {
        return res.status(401).json({ message: "No ecosystem account found. Check your Trust Layer ID or email." });
      }

      if (!auth.trustLayerId) {
        return res.status(401).json({ message: "This account is not linked to the Trust Layer ecosystem. Please sign in with your email and password instead." });
      }

      let authenticated = false;
      if (auth.ecosystemPinHash && trimmedCred.length <= 8 && /^\d+$/.test(trimmedCred)) {
        authenticated = await bcrypt.compare(trimmedCred, auth.ecosystemPinHash);
      }
      if (!authenticated) {
        authenticated = await bcrypt.compare(trimmedCred, auth.pin);
      }
      if (!authenticated) {
        return res.status(401).json({ message: "Invalid credential. Please check your password or ecosystem PIN." });
      }

      let tenant;
      if (auth.tenantId) {
        tenant = await storage.getTenant(auth.tenantId);
      }
      if (!tenant) {
        tenant = await storage.getTenantByPinAuthId(auth.id);
      }
      if (!tenant) {
        const storagePrefix = auth.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        tenant = await storage.createTenant({
          name: auth.name,
          storagePrefix,
          tier: "free",
          status: "active",
          pinAuthId: auth.id,
        });
      }

      req.session.authenticated = true;
      req.session.name = auth.name;
      req.session.tenantId = tenant.id;
      req.session.pinAuthId = auth.id;
      req.session.isAdmin = auth.isAdmin ?? false;

      console.log(`[Ecosystem Login] ${auth.name} (${auth.email}) authenticated via Trust Layer (${auth.trustLayerId}) from ${auth.ecosystemApp || "unknown"}`);

      return res.json({
        name: auth.name,
        mustReset: false,
        tenantId: tenant.id,
        isAdmin: auth.isAdmin ?? false,
        ecosystemApp: auth.ecosystemApp,
      });
    } catch (err) {
      console.error("Ecosystem login error:", err);
      return res.status(500).json({ message: "Login failed. Please try again." });
    }
  });

  app.post("/api/auth/claim-account", async (req, res) => {
    try {
      const { name, password, email } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }
      if (!email || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      const validationError = validatePassword(password);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const auth = await storage.getPinAuthByName(name.trim());
      if (!auth) {
        return res.status(404).json({ message: "No account found with that name. Please check the spelling." });
      }
      if (!auth.mustReset) {
        return res.status(400).json({ message: "This account already has a password. Please use the login form." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updatePin(auth.id, hashedPassword, false, email.trim().toLowerCase());

      let tenant;
      if (auth.tenantId) {
        tenant = await storage.getTenant(auth.tenantId);
      }
      if (!tenant) {
        tenant = await storage.getTenantByPinAuthId(auth.id);
      }
      if (!tenant) {
        const storagePrefix = auth.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        tenant = await storage.createTenant({
          name: auth.name,
          storagePrefix,
          tier: "free",
          status: "active",
          pinAuthId: auth.id,
        });
      }

      req.session.authenticated = true;
      req.session.name = auth.name;
      req.session.tenantId = tenant.id;
      req.session.pinAuthId = auth.id;
      req.session.isAdmin = auth.isAdmin ?? false;

      return res.json({ name: auth.name, mustReset: false, tenantId: tenant.id, isAdmin: auth.isAdmin ?? false });
    } catch (err) {
      console.error("Claim account error:", err);
      return res.status(500).json({ message: "Failed to set up account" });
    }
  });

  app.post("/api/auth/reset-password", isAuthenticated, async (req, res) => {
    try {
      const { newPassword, email } = req.body;
      if (!email || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }
      const validationError = validatePassword(newPassword);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updatePin(req.session.pinAuthId!, hashedPassword, false, email.trim().toLowerCase());
      return res.json({ success: true, name: updated.name });
    } catch (err) {
      console.error("Reset password error:", err);
      return res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }
      const auth = await storage.getPinAuthById(req.session.pinAuthId!);
      if (!auth) {
        return res.status(500).json({ message: "Auth not configured" });
      }
      const match = await bcrypt.compare(currentPassword, auth.pin);
      if (!match) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const validationError = validatePassword(newPassword);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updatePin(auth.id, hashedPassword, false);
      return res.json({ success: true, name: updated.name });
    } catch (err) {
      console.error("Change password error:", err);
      return res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session || !req.session.authenticated) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    let mustReset = false;
    if (req.session.pinAuthId) {
      const auth = await storage.getPinAuthById(req.session.pinAuthId);
      if (auth) mustReset = auth.mustReset ?? false;
    }
    return res.json({
      name: req.session.name || "User",
      mustReset,
      tenantId: req.session.tenantId,
      isAdmin: req.session.isAdmin ?? false,
    });
  });

  app.post("/api/auth/bridge-sso", isAuthenticated, async (req, res) => {
    try {
      const pinAuthId = req.session.pinAuthId!;
      const auth = await storage.getPinAuthById(pinAuthId);
      if (!auth) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const existing = await storage.getChatUserByPinAuthId(pinAuthId);
      if (existing) {
        const token = generateJWT(existing.id, existing.trustLayerId || "");
        return res.json({
          success: true,
          user: {
            id: existing.id,
            username: existing.username,
            displayName: existing.displayName,
            email: existing.email,
            avatarColor: existing.avatarColor,
            role: existing.role,
            trustLayerId: existing.trustLayerId,
          },
          token,
        });
      }

      const email = auth.email || `${auth.name.toLowerCase()}@trustvault.local`;
      const existingByEmail = await storage.getChatUserByEmail(email);
      if (existingByEmail) {
        const token = generateJWT(existingByEmail.id, existingByEmail.trustLayerId || "");
        return res.json({
          success: true,
          user: {
            id: existingByEmail.id,
            username: existingByEmail.username,
            displayName: existingByEmail.displayName,
            email: existingByEmail.email,
            avatarColor: existingByEmail.avatarColor,
            role: existingByEmail.role,
            trustLayerId: existingByEmail.trustLayerId,
          },
          token,
        });
      }

      const trustLayerId = generateTrustLayerId();
      const passwordHash = await hashPassword(auth.pin);

      const chatUser = await storage.createChatUser({
        username: auth.name.toLowerCase(),
        email,
        passwordHash,
        displayName: auth.name,
        avatarColor: "#06b6d4",
        role: auth.isAdmin ? "admin" : "member",
        trustLayerId,
        pinAuthId: auth.id,
      });

      const token = generateJWT(chatUser.id, trustLayerId);
      return res.json({
        success: true,
        user: {
          id: chatUser.id,
          username: chatUser.username,
          displayName: chatUser.displayName,
          email: chatUser.email,
          avatarColor: chatUser.avatarColor,
          role: chatUser.role,
          trustLayerId: chatUser.trustLayerId,
        },
        token,
      });
    } catch (err) {
      console.error("SSO bridge error:", err);
      return res.status(500).json({ success: false, message: "Failed to bridge SSO" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
  });

  // --- Whitelist / Invite Routes ---

  function isAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.authenticated && req.session.isAdmin) {
      return next();
    }
    return res.status(403).json({ message: "Admin access required" });
  }

  app.get("/api/whitelist", isAdmin, async (_req, res) => {
    try {
      const entries = await storage.getWhitelistEntries();
      res.json(entries);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch whitelist" });
    }
  });

  app.post("/api/whitelist", isAdmin, async (req, res) => {
    try {
      const { name, email, customCode } = req.body;
      if (!name || typeof name !== "string" || name.trim().length < 1) {
        return res.status(400).json({ message: "Name is required" });
      }
      let inviteCode: string;
      if (customCode && typeof customCode === "string" && customCode.trim().length >= 3) {
        inviteCode = customCode.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, "").substring(0, 20);
        if (inviteCode.length < 3) {
          return res.status(400).json({ message: "Custom code must be at least 3 characters (letters, numbers, dashes)" });
        }
        const existing = await storage.getWhitelistByCode(inviteCode);
        if (existing) {
          return res.status(409).json({ message: "That invite code is already taken. Try a different one." });
        }
      } else {
        inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      }
      const entry = await storage.createWhitelistEntry({
        name: name.trim(),
        email: email?.trim() || null,
        inviteCode,
      });
      res.json(entry);
    } catch (err) {
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.delete("/api/whitelist/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteWhitelistEntry(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete invite" });
    }
  });

  app.get("/api/admin/users", isAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllPinAuths();
      const sanitized = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        tenantId: u.tenantId,
        isAdmin: u.isAdmin,
        mustReset: u.mustReset,
        createdAt: u.createdAt,
      }));
      res.json(sanitized);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/chain-users", isAdmin, async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { chatUsers } = await import("@shared/schema");
      const users = await db.select({
        id: chatUsers.id,
        username: chatUsers.username,
        display_name: chatUsers.displayName,
        trust_layer_id: chatUsers.trustLayerId,
        chain_address: chatUsers.chainAddress,
        chain_verified: chatUsers.chainVerified,
      }).from(chatUsers);
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch chain users" });
    }
  });

  app.get("/api/admin/chain-media", isAdmin, async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { mediaItems } = await import("@shared/schema");
      const { sql } = await import("drizzle-orm");
      const items = await db.select({
        id: mediaItems.id,
        filename: mediaItems.filename,
        provenance_id: mediaItems.provenanceId,
        tx_hash: mediaItems.provenanceTxHash,
        file_hash: mediaItems.fileHash,
      }).from(mediaItems).where(sql`${mediaItems.provenanceId} IS NOT NULL OR ${mediaItems.provenanceTxHash} IS NOT NULL`);
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch chain media" });
    }
  });

  app.post("/api/join", async (req, res) => {
    try {
      const { inviteCode, name, password, email } = req.body;
      if (!inviteCode || !name || !password) {
        return res.status(400).json({ message: "Invite code, name, and password are required" });
      }

      const entry = await storage.getWhitelistByCode(inviteCode.trim().toUpperCase());
      if (!entry) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      if (entry.used) {
        return res.status(400).json({ message: "This invite code has already been used" });
      }

      const validationError = validatePassword(password);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      const existingUser = await storage.getPinAuthByName(name.trim());
      if (existingUser) {
        return res.status(400).json({ message: "An account with that name already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await storage.initializePinAuth(
        hashedPassword,
        name.trim(),
        false,
        "pending"
      );

      if (email) {
        await storage.updatePin(newUser.id, hashedPassword, false, email.trim().toLowerCase());
      }

      const tenant = await storage.createTenant({
        name: name.trim(),
        storagePrefix: `tenant_${crypto.randomUUID()}`,
        tier: "free",
        status: "active",
        pinAuthId: newUser.id,
      });

      await storage.updatePinAuthTenantId(newUser.id, tenant.id);

      await storage.markWhitelistUsed(entry.id);

      try {
        const { ensureUniqueHash, convertReferral } = await import("./affiliate");
        await ensureUniqueHash(newUser.id);
        const { createTrustStamp } = await import("./hallmark");
        await createTrustStamp({ userId: newUser.id, category: "auth-register", data: { email: email?.trim(), username: name.trim() } });
        if (req.body.referralHash) {
          await convertReferral(newUser.id, req.body.referralHash);
        }
      } catch {}

      req.session.authenticated = true;
      req.session.name = name.trim();
      req.session.tenantId = tenant.id;
      req.session.pinAuthId = newUser.id;
      req.session.isAdmin = false;

      res.json({ success: true, name: name.trim() });
    } catch (err) {
      console.error("Join error:", err);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // --- Feature Requests / Community Voice ---

  app.get("/api/features", isAuthenticated, async (_req, res) => {
    try {
      const requests = await storage.getFeatureRequests();
      res.json(requests);
    } catch (err) {
      console.error("Error fetching feature requests:", err);
      res.status(500).json({ message: "Failed to fetch feature requests" });
    }
  });

  app.get("/api/features/my-votes", isAuthenticated, async (req, res) => {
    try {
      const tenantId = req.session.tenantId!;
      const votedIds = await storage.getVotesForTenant(tenantId);
      res.json(votedIds);
    } catch (err) {
      console.error("Error fetching votes:", err);
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });

  const featureSubmitSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.enum(["music_services", "media_tools", "storage", "social", "integrations", "other"]).default("other"),
  });

  app.post("/api/features", isAuthenticated, async (req, res) => {
    try {
      const parsed = featureSubmitSchema.parse(req.body);
      const request = await storage.createFeatureRequest({
        title: parsed.title,
        description: parsed.description,
        category: parsed.category,
        submittedBy: req.session.name || null,
        tenantId: req.session.tenantId || null,
        status: "open",
        adminNote: null,
      });
      res.json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Error creating feature request:", err);
      res.status(500).json({ message: "Failed to submit feature request" });
    }
  });

  app.post("/api/features/:id/vote", isAuthenticated, async (req, res) => {
    try {
      const featureId = Number(req.params.id);
      const tenantId = req.session.tenantId!;
      const result = await storage.voteForFeature(featureId, tenantId);
      res.json(result);
    } catch (err) {
      console.error("Error voting:", err);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  const featureUpdateSchema = z.object({
    status: z.enum(["open", "under_review", "planned", "in_progress", "completed", "declined"]).optional(),
    adminNote: z.string().nullable().optional(),
  });

  app.patch("/api/features/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const parsed = featureUpdateSchema.parse(req.body);
      const updated = await storage.updateFeatureRequest(id, parsed);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Error updating feature request:", err);
      res.status(500).json({ message: "Failed to update feature request" });
    }
  });

  app.delete("/api/features/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteFeatureRequest(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting feature request:", err);
      res.status(500).json({ message: "Failed to delete feature request" });
    }
  });

  // Seed initial feature requests if none exist
  app.post("/api/features/seed", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const existing = await storage.getFeatureRequests();
      if (existing.length > 0) {
        return res.json({ message: "Features already seeded", count: existing.length });
      }

      const seeds = [
        {
          title: "Music Service Integration (Spotify, Apple Music, etc.)",
          description: "Connect to music streaming services to browse and import tracks. This feature requires proper copyright licensing and legal review before implementation. We want to do this the right way — with proper agreements in place to protect our community.",
          category: "music_services",
          status: "under_review",
          adminNote: "Requires copyright attorney consultation and licensing agreements. Tracking community interest to build a case for proper implementation.",
          isSeeded: true,
          submittedBy: null,
          tenantId: null,
        },
        {
          title: "Playlist Sharing Between Users",
          description: "Allow users to share playlists and collections with other TrustVault members while maintaining ownership tracking.",
          category: "social",
          status: "open",
          isSeeded: true,
          submittedBy: null,
          tenantId: null,
          adminNote: null,
        },
        {
          title: "Advanced Audio Equalizer & Effects",
          description: "Built-in audio equalizer with presets and custom frequency controls for audio playback within the vault.",
          category: "media_tools",
          status: "open",
          isSeeded: true,
          submittedBy: null,
          tenantId: null,
          adminNote: null,
        },
        {
          title: "Bulk Import from Cloud Storage",
          description: "Import media files directly from Google Drive, Dropbox, or iCloud into your vault with automatic organization.",
          category: "integrations",
          status: "open",
          isSeeded: true,
          submittedBy: null,
          tenantId: null,
          adminNote: null,
        },
        {
          title: "Collaborative Collections",
          description: "Create shared collections where multiple family members can contribute and organize media together.",
          category: "social",
          status: "planned",
          isSeeded: true,
          submittedBy: null,
          tenantId: null,
          adminNote: "Planned for Phase 3 of the roadmap.",
        },
      ];

      for (const seed of seeds) {
        await storage.createFeatureRequest(seed as any);
      }

      res.json({ message: "Seeded feature requests", count: seeds.length });
    } catch (err) {
      console.error("Error seeding features:", err);
      res.status(500).json({ message: "Failed to seed features" });
    }
  });

  // --- Media Stats & Activity Routes ---

  app.get("/api/media/stats", isAuthenticated, async (req, res) => {
    try {
      let tenantId = (req.session as any).tenantId;
      if ((req.session as any).isAdmin && req.query.tenantId) {
        tenantId = req.query.tenantId as string;
      }
      const stats = await storage.getMediaStats(tenantId);
      res.json(stats);
    } catch (err) {
      console.error("Error fetching media stats:", err);
      res.status(500).json({ message: "Failed to fetch media stats" });
    }
  });

  app.get("/api/media/recent", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.session as any).tenantId;
      const limit = Math.min(Number(req.query.limit) || 8, 20);
      const items = await storage.getRecentMedia(tenantId, limit);
      res.json(items);
    } catch (err) {
      console.error("Error fetching recent media:", err);
      res.status(500).json({ message: "Failed to fetch recent media" });
    }
  });

  app.get("/api/usage", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.session as any).tenantId;
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      const tier = (tenant.tier || "free") as SubscriptionTier;
      const stats = await storage.getMediaStats(tenantId);
      res.json({
        used: stats.totalSize,
        limit: TIER_LIMITS[tier].storageBytes,
        itemCount: stats.totalFiles,
        itemLimit: TIER_LIMITS[tier].items,
        tier,
      });
    } catch (err) {
      console.error("Error fetching usage:", err);
      res.status(500).json({ message: "Failed to fetch usage" });
    }
  });

  app.get("/api/activity", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.session as any).tenantId;
      const limit = Math.min(Number(req.query.limit) || 30, 100);
      const activities = await storage.getActivities(tenantId, limit);
      res.json(activities);
    } catch (err) {
      console.error("Error fetching activity:", err);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.post("/api/activity", isAuthenticated, async (req, res) => {
    try {
      const { actionType, entityType, entityId, entityTitle, metadata } = req.body;
      const tenantId = (req.session as any).tenantId;
      const actorName = (req.session as any).name || "Unknown";
      const activity = await storage.createActivity({
        tenantId,
        actorName,
        actionType,
        entityType,
        entityId: entityId || null,
        entityTitle: entityTitle || null,
        metadata: metadata || null,
      });
      res.status(201).json(activity);
    } catch (err) {
      console.error("Error creating activity:", err);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // --- Collection Sharing & Reordering Routes ---

  app.get("/api/collections/shared", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.session as any).tenantId;
      const shared = await storage.getSharedCollections(tenantId);
      res.json(shared);
    } catch (err) {
      console.error("Error fetching shared collections:", err);
      res.status(500).json({ message: "Failed to fetch shared collections" });
    }
  });

  app.patch("/api/collections/reorder", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.session as any).tenantId;
      const { orderedIds } = req.body;
      await storage.reorderCollections(tenantId, orderedIds);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error reordering collections:", err);
      res.status(500).json({ message: "Failed to reorder collections" });
    }
  });

  app.get("/api/family-members", isAuthenticated, async (req, res) => {
    try {
      const currentTenantId = (req.session as any).tenantId;
      const allTenants = await storage.getAllTenants();
      const members = allTenants
        .filter(t => t.id !== currentTenantId && t.status === "active" && !t.name?.includes("Test"))
        .map(t => ({ id: t.id, name: t.name }));
      res.json(members);
    } catch (err) {
      console.error("Error fetching family members:", err);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });

  app.post("/api/collections/:id/share", isAuthenticated, async (req, res) => {
    try {
      const collectionId = Number(req.params.id);
      const tenantId = (req.session as any).tenantId;
      const col = await storage.getCollection(collectionId);
      if (!col || col.tenantId !== tenantId) {
        return res.status(403).json({ message: "Not authorized to share this collection" });
      }
      const { tenantIds } = req.body;
      const shares = await storage.shareCollection(collectionId, tenantId, tenantIds);
      try {
        await storage.createActivity({
          tenantId,
          actorName: (req.session as any).name || "Unknown",
          actionType: "share",
          entityType: "collection",
          entityId: collectionId,
          entityTitle: col.name,
        });
      } catch {}
      res.json(shares);
    } catch (err) {
      console.error("Error sharing collection:", err);
      res.status(500).json({ message: "Failed to share collection" });
    }
  });

  app.delete("/api/collections/:id/share/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const collectionId = Number(req.params.id);
      const sessionTenantId = (req.session as any).tenantId;
      const col = await storage.getCollection(collectionId);
      if (!col || col.tenantId !== sessionTenantId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.unshareCollection(collectionId, req.params.tenantId as string);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error unsharing collection:", err);
      res.status(500).json({ message: "Failed to unshare collection" });
    }
  });

  app.patch("/api/collections/:id/reorder-items", isAuthenticated, async (req, res) => {
    try {
      const collectionId = Number(req.params.id);
      const { orderedMediaIds } = req.body;
      await storage.reorderCollectionItems(collectionId, orderedMediaIds);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error reordering collection items:", err);
      res.status(500).json({ message: "Failed to reorder collection items" });
    }
  });

  // --- Media Sharing ---

  app.get("/api/media/shared-with-me", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.session as any).tenantId;
      const items = await storage.getSharedWithMe(tenantId);
      res.json(items);
    } catch (err) {
      console.error("Error fetching shared media:", err);
      res.status(500).json({ message: "Failed to fetch shared media" });
    }
  });

  app.post("/api/media/:id/share", isAuthenticated, async (req, res) => {
    try {
      const mediaItemId = Number(req.params.id);
      const tenantId = (req.session as any).tenantId;
      const { sharedWithTenantIds } = req.body;
      if (!Array.isArray(sharedWithTenantIds) || sharedWithTenantIds.length === 0) {
        return res.status(400).json({ message: "sharedWithTenantIds required" });
      }
      const item = await storage.getMediaItem(mediaItemId);
      if (!item || item.tenantId !== tenantId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const shares = await storage.shareMedia(mediaItemId, tenantId, sharedWithTenantIds);
      await storage.createActivity({
        tenantId,
        actorName: (req.session as any).userName || "User",
        actionType: "share",
        entityType: "media",
        entityId: mediaItemId,
        entityTitle: item.title,
        metadata: JSON.stringify({ sharedWith: sharedWithTenantIds }),
      });
      res.json({ success: true, shares });
    } catch (err) {
      console.error("Error sharing media:", err);
      res.status(500).json({ message: "Failed to share media" });
    }
  });

  app.get("/api/media/:id/shares", isAuthenticated, async (req, res) => {
    try {
      const mediaItemId = Number(req.params.id);
      const shares = await storage.getMediaShares(mediaItemId);
      res.json(shares);
    } catch (err) {
      console.error("Error fetching shares:", err);
      res.status(500).json({ message: "Failed to fetch shares" });
    }
  });

  app.delete("/api/media/:id/share/:tenantId", isAuthenticated, async (req, res) => {
    try {
      const mediaItemId = Number(req.params.id);
      const sharedWithTenantId = req.params.tenantId;
      const currentTenantId = (req.session as any).tenantId;
      const item = await storage.getMediaItem(mediaItemId);
      if (!item || item.tenantId !== currentTenantId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.unshareMedia(mediaItemId, sharedWithTenantId as string);
      res.json({ success: true });
    } catch (err) {
      console.error("Error unsharing media:", err);
      res.status(500).json({ message: "Failed to unshare media" });
    }
  });

  // --- Media Routes ---

  // Batch routes must come before parameterized :id routes
  app.patch(api.media.batchUpdate.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.media.batchUpdate.input.parse(req.body);
      const updated = await storage.batchUpdateMedia(input.ids, input.updates);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.media.batchDelete.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.media.batchDelete.input.parse(req.body);
      await storage.batchDeleteMedia(input.ids);
      res.sendStatus(204);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.media.list.path, isAuthenticated, async (req, res) => {
    const category = req.query.category as MediaCategory | undefined;
    if (category && !MEDIA_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }
    const tenantId = req.session.tenantId!;
    const items = await storage.getMediaItems(tenantId, category);
    res.json(items);
  });

  app.get(api.media.get.path, isAuthenticated, async (req, res) => {
    const item = await storage.getMediaItem(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: "Media item not found" });
    }
    res.json(item);
  });

  app.post(api.media.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.media.create.input.parse(req.body);
      const category = detectCategory(input.contentType);
      const tenantId = req.session.tenantId!;
      const item = await storage.createMediaItem({
        ...input,
        category,
        tenantId,
      });
      try {
        await storage.createActivity({
          tenantId: (req.session as any).tenantId,
          actorName: (req.session as any).name || "Unknown",
          actionType: "upload",
          entityType: "media",
          entityId: item.id,
          entityTitle: item.title,
        });
      } catch {}

      if (blockchainClient.isConfigured) {
        (async () => {
          try {
            const pinAuthId = req.session.pinAuthId;
            let trustLayerId: string | undefined;
            if (pinAuthId) {
              const chatUser = await storage.getChatUserByPinAuthId(pinAuthId);
              trustLayerId = chatUser?.trustLayerId || undefined;
            }
            if (trustLayerId) {
              const fileHash = crypto.createHash("sha256").update(`${item.filename}-${item.size}-${item.createdAt}`).digest("hex");
              const result = await blockchainClient.registerProvenance({
                trustLayerId,
                fileHash,
                filename: item.filename,
                contentType: item.contentType,
                size: item.size || 0,
                uploadTimestamp: new Date().toISOString(),
              });
              if (result.success) {
                await storage.updateMediaProvenance(item.id, {
                  fileHash,
                  provenanceId: result.provenanceId,
                  provenanceTxHash: result.txHash,
                  provenanceBlockNumber: result.blockNumber,
                  provenanceTimestamp: new Date(result.timestamp),
                });
                console.log(`[Blockchain] Provenance registered for "${item.title}" → ${result.provenanceId}`);
              }
            }
          } catch (err) {
            console.error("[Blockchain] Provenance registration failed (non-blocking):", err);
          }
        })();
      }

      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.patch(api.media.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.media.update.input.parse(req.body);
      const updates: any = { ...input };
      if (updates.eventDate) {
        updates.eventDate = new Date(updates.eventDate);
      }
      const item = await storage.updateMediaItem(Number(req.params.id), updates);
      if (!item) {
        return res.status(404).json({ message: "Media item not found" });
      }
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.patch(api.media.toggleFavorite.path, isAuthenticated, async (req, res) => {
    const { isFavorite } = req.body;
    const item = await storage.toggleFavorite(Number(req.params.id), isFavorite);
    if (!item) {
      return res.status(404).json({ message: "Media item not found" });
    }
    res.json(item);
  });

  app.delete(api.media.delete.path, isAuthenticated, async (req, res) => {
    const itemToDelete = await storage.getMediaItem(Number(req.params.id));
    await storage.deleteMediaItem(Number(req.params.id));
    try {
      await storage.createActivity({
        tenantId: (req.session as any).tenantId,
        actorName: (req.session as any).name || "Unknown",
        actionType: "delete",
        entityType: "media",
        entityId: Number(req.params.id),
        entityTitle: itemToDelete?.title || null,
      });
    } catch {}
    res.sendStatus(204);
  });

  // --- Collection Routes ---

  app.get(api.collections.list.path, isAuthenticated, async (req, res) => {
    const tenantId = req.session.tenantId!;
    const cols = await storage.getCollections(tenantId);
    res.json(cols);
  });

  app.get(api.collections.get.path, isAuthenticated, async (req, res) => {
    const col = await storage.getCollection(Number(req.params.id));
    if (!col) return res.status(404).json({ message: "Collection not found" });
    res.json(col);
  });

  app.post(api.collections.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.collections.create.input.parse(req.body);
      const tenantId = req.session.tenantId!;
      const col = await storage.createCollection({ ...input, tenantId });
      try {
        await storage.createActivity({
          tenantId: (req.session as any).tenantId,
          actorName: (req.session as any).name || "Unknown",
          actionType: "create_collection",
          entityType: "collection",
          entityId: col.id,
          entityTitle: col.name,
        });
      } catch {}
      res.status(201).json(col);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.collections.update.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.collections.update.input.parse(req.body);
      const col = await storage.updateCollection(Number(req.params.id), input);
      if (!col) return res.status(404).json({ message: "Collection not found" });
      res.json(col);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.collections.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteCollection(Number(req.params.id));
    res.sendStatus(204);
  });

  app.get(api.collections.items.path, isAuthenticated, async (req, res) => {
    const items = await storage.getCollectionItems(Number(req.params.id));
    res.json(items);
  });

  app.post(api.collections.addItems.path, isAuthenticated, async (req, res) => {
    try {
      const { mediaItemIds } = req.body;
      const result = await storage.addToCollection(Number(req.params.id), mediaItemIds);
      res.json({ added: result.length });
    } catch (err) {
      throw err;
    }
  });

  app.delete(api.collections.removeItems.path, isAuthenticated, async (req, res) => {
    const { mediaItemIds } = req.body;
    await storage.removeFromCollection(Number(req.params.id), mediaItemIds);
    res.sendStatus(204);
  });

  app.post("/api/video/trim", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        mediaId: z.number(),
        trimStart: z.number().min(0),
        trimEnd: z.number().min(0),
        title: z.string().optional(),
      });
      const input = schema.parse(req.body);
      if (input.trimEnd <= input.trimStart) {
        return res.status(400).json({ message: "trimEnd must be greater than trimStart" });
      }
      const mediaItem = await storage.getMediaItem(input.mediaId);
      if (!mediaItem) return res.status(404).json({ message: "Media item not found" });
      if (mediaItem.category !== "video") return res.status(400).json({ message: "Item is not a video" });

      const job = await storage.createProcessingJob("trim", JSON.stringify(input));
      processTrimJob(job.id).catch(err => console.error("[VideoProcessor] Background trim error:", err));
      res.status(201).json(job);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post("/api/video/merge", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        mediaIds: z.array(z.number()).min(2),
        title: z.string().optional(),
        transition: z.enum(["none", "fade", "wipeleft", "wiperight", "wipeup", "wipedown", "slideleft", "slideright", "slideup", "slidedown", "circlecrop", "radial", "smoothleft", "smoothright", "smoothup", "smoothdown", "dissolve"]).optional(),
        transitionDuration: z.number().min(0.2).max(3).optional(),
      });
      const input = schema.parse(req.body);

      for (const id of input.mediaIds) {
        const item = await storage.getMediaItem(id);
        if (!item) return res.status(404).json({ message: `Media item ${id} not found` });
        if (item.category !== "video") return res.status(400).json({ message: `Item "${item.title}" is not a video` });
      }

      const job = await storage.createProcessingJob("merge", JSON.stringify(input));
      processMergeJob(job.id).catch(err => console.error("[VideoProcessor] Background merge error:", err));
      res.status(201).json(job);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get("/api/video/jobs/:id", isAuthenticated, async (req, res) => {
    const job = await storage.getProcessingJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  });

  // --- Playlists ---
  app.get("/api/playlists", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.session as any).tenantId;
      const owned = await storage.getPlaylists(tenantId);
      const shared = await storage.getSharedPlaylists(tenantId);
      res.json({ owned, shared });
    } catch (err) {
      console.error("Error fetching playlists:", err);
      res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  app.post("/api/playlists", isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.session as any).tenantId;
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ message: "Name required" });
      const playlist = await storage.createPlaylist({ tenantId, name, description });
      res.json(playlist);
    } catch (err) {
      console.error("Error creating playlist:", err);
      res.status(500).json({ message: "Failed to create playlist" });
    }
  });

  app.delete("/api/playlists/:id", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req.session as any).tenantId;
      const pl = await storage.getPlaylist(id);
      if (!pl || pl.tenantId !== tenantId) return res.status(403).json({ message: "Not authorized" });
      await storage.deletePlaylist(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting playlist:", err);
      res.status(500).json({ message: "Failed to delete playlist" });
    }
  });

  app.get("/api/playlists/:id/items", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const items = await storage.getPlaylistItems(id);
      res.json(items);
    } catch (err) {
      console.error("Error fetching playlist items:", err);
      res.status(500).json({ message: "Failed to fetch playlist items" });
    }
  });

  app.post("/api/playlists/:id/items", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req.session as any).tenantId;
      const { mediaItemId } = req.body;
      if (!mediaItemId) return res.status(400).json({ message: "mediaItemId required" });
      const item = await storage.addToPlaylist(id, mediaItemId, tenantId);
      res.json(item);
    } catch (err) {
      console.error("Error adding to playlist:", err);
      res.status(500).json({ message: "Failed to add to playlist" });
    }
  });

  app.delete("/api/playlists/:id/items/:mediaId", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const mediaId = Number(req.params.mediaId);
      await storage.removeFromPlaylist(id, mediaId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error removing from playlist:", err);
      res.status(500).json({ message: "Failed to remove from playlist" });
    }
  });

  app.post("/api/playlists/:id/share", isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req.session as any).tenantId;
      const { sharedWithTenantIds } = req.body;
      const pl = await storage.getPlaylist(id);
      if (!pl || pl.tenantId !== tenantId) return res.status(403).json({ message: "Not authorized" });
      await storage.sharePlaylist(id, sharedWithTenantIds);
      res.json({ success: true });
    } catch (err) {
      console.error("Error sharing playlist:", err);
      res.status(500).json({ message: "Failed to share playlist" });
    }
  });

  // --- Direct Messages ---
  app.get("/api/chat/dm/partners", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
      const jwt = await import("jsonwebtoken");
      const decoded = jwt.default.verify(authHeader.split(" ")[1], process.env.JWT_SECRET!) as any;
      const partners = await storage.getDirectMessagePartners(decoded.userId);
      res.json({ partners });
    } catch (err) {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.get("/api/chat/dm/:userId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
      const jwt = await import("jsonwebtoken");
      const decoded = jwt.default.verify(authHeader.split(" ")[1], process.env.JWT_SECRET!) as any;
      const messages = await storage.getDirectMessages(decoded.userId, req.params.userId);
      res.json({ messages });
    } catch (err) {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  // --- Hallmark System Routes ---

  app.get("/api/hallmark/genesis", async (_req, res) => {
    try {
      const { getGenesisHallmark } = await import("./hallmark");
      const genesis = await getGenesisHallmark();
      if (!genesis) return res.status(404).json({ error: "Genesis hallmark not found" });
      res.json(genesis);
    } catch (err) {
      res.status(500).json({ error: "Failed to get genesis hallmark" });
    }
  });

  app.get("/api/hallmark/:id/verify", async (req, res) => {
    try {
      const { verifyHallmark } = await import("./hallmark");
      const result = await verifyHallmark(req.params.id);
      if (!result.verified) return res.status(404).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // --- Affiliate System Routes ---

  app.get("/api/affiliate/dashboard", isAuthenticated, async (req, res) => {
    try {
      const { getAffiliateDashboard } = await import("./affiliate");
      const pinAuthId = req.session.pinAuthId!;
      const dashboard = await getAffiliateDashboard(pinAuthId);
      res.json(dashboard);
    } catch (err) {
      console.error("[Affiliate] Dashboard error:", err);
      res.status(500).json({ error: "Failed to load affiliate dashboard" });
    }
  });

  app.get("/api/affiliate/link", isAuthenticated, async (req, res) => {
    try {
      const { ensureUniqueHash } = await import("./affiliate");
      const pinAuthId = req.session.pinAuthId!;
      const hash = await ensureUniqueHash(pinAuthId);
      res.json({
        uniqueHash: hash,
        referralLink: `https://trustvault.tlid.io/ref/${hash}`,
        crossPlatformLinks: {
          trusthub: `https://trusthub.tlid.io/ref/${hash}`,
          trustvault: `https://trustvault.tlid.io/ref/${hash}`,
          thevoid: `https://thevoid.tlid.io/ref/${hash}`,
          tradeworks: `https://tradeworks.tlid.io/ref/${hash}`,
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to get referral link" });
    }
  });

  app.post("/api/affiliate/track", async (req, res) => {
    try {
      const { referralHash, platform } = req.body;
      if (!referralHash) return res.status(400).json({ error: "Missing referralHash" });
      const { trackReferral } = await import("./affiliate");
      const referral = await trackReferral(referralHash, platform || "trustvault");
      if (!referral) return res.status(404).json({ error: "Referrer not found" });
      res.json({ success: true, referralId: referral.id });
    } catch (err) {
      res.status(500).json({ error: "Failed to track referral" });
    }
  });

  app.post("/api/affiliate/request-payout", isAuthenticated, async (req, res) => {
    try {
      const { requestPayout } = await import("./affiliate");
      const pinAuthId = req.session.pinAuthId!;
      const result = await requestPayout(pinAuthId);
      if (!result.success) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to request payout" });
    }
  });

  return httpServer;
}
