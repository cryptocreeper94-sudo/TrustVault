import { type Express, type Request, type Response } from "express";
import { blockchainClient } from "../services/blockchainClient";
import { storage } from "../storage";

export function registerBlockchainRoutes(app: Express): void {
  app.get("/api/blockchain/status", async (_req: Request, res: Response) => {
    try {
      const configured = blockchainClient.isConfigured;
      if (!configured) {
        return res.json({ connected: false, reason: "Blockchain API credentials not configured" });
      }
      const probe = await blockchainClient.verifyIdentity("status-check");
      return res.json({ connected: true, baseUrl: "https://dwtl.io", appId: "dw_app_trustvault" });
    } catch (err: any) {
      return res.json({ connected: false, reason: err.message || "Connection failed" });
    }
  });

  app.get("/api/blockchain/identity/:trustLayerId", async (req: Request, res: Response) => {
    try {
      const result = await blockchainClient.verifyIdentity(req.params.trustLayerId as string);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/blockchain/provenance/:provenanceId", async (req: Request, res: Response) => {
    try {
      const result = await blockchainClient.verifyProvenance(req.params.provenanceId as string);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/blockchain/trust/:trustLayerId", async (req: Request, res: Response) => {
    try {
      const result = await blockchainClient.getTrustScore(req.params.trustLayerId as string);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/blockchain/signal/:trustLayerId", async (req: Request, res: Response) => {
    try {
      const result = await blockchainClient.getSignalBalance(req.params.trustLayerId as string);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/blockchain/anchor", async (req: Request, res: Response) => {
    try {
      if (!blockchainClient.isConfigured) {
        return res.status(503).json({ error: "Blockchain not configured" });
      }
      const { trustLayerId, displayName, email } = req.body;
      if (!trustLayerId || !displayName || !email) {
        return res.status(400).json({ error: "trustLayerId, displayName, and email are required" });
      }
      const result = await blockchainClient.anchorIdentity(trustLayerId, displayName, email);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}
