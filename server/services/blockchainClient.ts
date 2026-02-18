import crypto from "crypto";

const BLOCKCHAIN_BASE_URL = "https://dwtl.io";
const APP_ID = "dw_app_trustvault";

interface BlockchainHeaders {
  "x-blockchain-key": string;
  "x-blockchain-signature": string;
  "x-blockchain-timestamp": string;
  "Content-Type": string;
}

interface IdentityAnchorResponse {
  success: boolean;
  trustLayerId: string;
  chainAddress: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  message?: string;
  error?: string;
}

interface IdentityVerifyResponse {
  verified: boolean;
  trustLayerId: string;
  chainAddress?: string;
  reason?: string;
}

interface IdentityResolveResponse {
  trustLayerId: string;
  chainAddress: string;
  displayName: string;
  verifiedAt: string;
  error?: string;
}

interface ProvenanceRegisterResponse {
  success: boolean;
  provenanceId: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  error?: string;
}

interface ProvenanceVerifyResponse {
  verified: boolean;
  provenanceId: string;
  trustLayerId?: string;
  fileHash?: string;
  filename?: string;
  contentType?: string;
  registeredAt?: string;
  txHash?: string;
  reason?: string;
}

interface TrustScoreResponse {
  trustLayerId: string;
  score: number;
  level: string;
  factors?: Record<string, number>;
  error?: string;
}

interface TrustRelationshipResponse {
  idA: string;
  idB: string;
  relationship: string;
  trustLevel: number;
  verified: boolean;
  error?: string;
}

interface SignalBalanceResponse {
  trustLayerId: string;
  balance: number;
  currency: string;
  error?: string;
}

interface SignalGateResponse {
  allowed: boolean;
  trustLayerId: string;
  requiredAmount?: number;
  currentBalance?: number;
  error?: string;
}

export class BlockchainClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.BLOCKCHAIN_API_KEY || "";
    this.apiSecret = process.env.BLOCKCHAIN_API_SECRET || "";
    this.baseUrl = BLOCKCHAIN_BASE_URL;
  }

  get isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  private signRequest(method: string, path: string, body: any = {}): Record<string, string> {
    const timestamp = Date.now().toString();
    const bodyStr = JSON.stringify(body);
    const bodyHash = method === "GET" || Object.keys(body).length === 0
      ? ""
      : crypto.createHash("sha256").update(bodyStr).digest("hex");
    const canonical = `${method}:${path}:${this.apiKey}:${timestamp}:${bodyHash}`;
    const signature = crypto.createHmac("sha256", this.apiSecret).update(canonical).digest("hex");
    return {
      "x-blockchain-key": this.apiKey,
      "x-blockchain-signature": signature,
      "x-blockchain-timestamp": timestamp,
      "Content-Type": "application/json",
    };
  }

  private async post<T>(path: string, body: any): Promise<T> {
    const headers = this.signRequest("POST", path, body);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 200) }; }
    if (!res.ok) {
      throw new Error(`Blockchain POST ${path} failed (${res.status}): ${JSON.stringify(data)}`);
    }
    return data as T;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 200) }; }
    if (!res.ok) {
      throw new Error(`Blockchain GET ${path} failed (${res.status}): ${JSON.stringify(data)}`);
    }
    return data as T;
  }

  async anchorIdentity(trustLayerId: string, displayName: string, email: string): Promise<IdentityAnchorResponse> {
    return this.post<IdentityAnchorResponse>("/api/identity/anchor", {
      trustLayerId,
      displayName,
      email,
      appId: APP_ID,
    });
  }

  async verifyIdentity(trustLayerId: string): Promise<IdentityVerifyResponse> {
    return this.get<IdentityVerifyResponse>(`/api/identity/verify/${encodeURIComponent(trustLayerId)}`);
  }

  async resolveIdentity(trustLayerId: string): Promise<IdentityResolveResponse> {
    return this.get<IdentityResolveResponse>(`/api/identity/resolve/${encodeURIComponent(trustLayerId)}`);
  }

  async registerProvenance(data: {
    trustLayerId: string;
    fileHash: string;
    filename: string;
    contentType: string;
    size: number;
    uploadTimestamp: string;
  }): Promise<ProvenanceRegisterResponse> {
    return this.post<ProvenanceRegisterResponse>("/api/provenance/register", {
      ...data,
      appId: APP_ID,
    });
  }

  async verifyProvenance(provenanceId: string): Promise<ProvenanceVerifyResponse> {
    return this.get<ProvenanceVerifyResponse>(`/api/provenance/verify/${encodeURIComponent(provenanceId)}`);
  }

  async getTrustScore(trustLayerId: string): Promise<TrustScoreResponse> {
    return this.get<TrustScoreResponse>(`/api/trust/score/${encodeURIComponent(trustLayerId)}`);
  }

  async getTrustRelationship(idA: string, idB: string): Promise<TrustRelationshipResponse> {
    return this.get<TrustRelationshipResponse>(`/api/trust/relationship/${encodeURIComponent(idA)}/${encodeURIComponent(idB)}`);
  }

  async verifyTrust(data: { fromId: string; toId: string; level: string }): Promise<any> {
    return this.post("/api/trust/verify", { ...data, appId: APP_ID });
  }

  async getSignalBalance(trustLayerId: string): Promise<SignalBalanceResponse> {
    return this.get<SignalBalanceResponse>(`/api/signal/balance/${encodeURIComponent(trustLayerId)}`);
  }

  async transferSignal(data: { fromId: string; toId: string; amount: number; memo?: string }): Promise<any> {
    return this.post("/api/signal/transfer", { ...data, appId: APP_ID });
  }

  async checkSignalGate(data: { trustLayerId: string; requiredAmount: number; resource: string }): Promise<SignalGateResponse> {
    return this.post<SignalGateResponse>("/api/signal/gate", { ...data, appId: APP_ID });
  }
}

export const blockchainClient = new BlockchainClient();
