# TrustVault — Integration Handoff to TrustGen

**Date:** March 6, 2026
**From:** TrustVault / DW Media Studio (by Dark Wave Studios)
**To:** TrustGen (3D Model & Animation Generator Platform)
**Purpose:** 3D model storage, animation asset management, texture library, and cross-platform creative asset integration

---

## Service Overview

TrustVault is the universal IP storage and creative platform within the DarkWave Trust Layer ecosystem. It provides secure multi-tenant media vault storage, professional editing tools (image, audio, video, merge), AI-powered creative features, and ecosystem-wide media access via API.

**Production URL:** `https://trustvault.replit.app`
**Domain:** `trustvault.tlid.io`

---

## Authentication — Trust Layer SSO (JWT)

TrustVault uses **Trust Layer SSO** for all Studio API access. This is a shared JWT system across the entire ecosystem.

- **Algorithm:** HS256
- **Shared Secret:** The `JWT_SECRET` environment variable (same across all ecosystem apps)
- **Token Payload:** `{ userId, trustLayerId, iss: "trust-layer-sso" }`
- **Token Expiry:** 7 days
- **Client Storage:** `localStorage` key `"tl-sso-token"`
- **Header Format:** `Authorization: Bearer <jwt_token>`

**Trust Layer SSO Endpoints (live):**
| Service | URL |
|---|---|
| App Registration | `https://orbitstaffing.io/api/admin/ecosystem/register-app` |
| SSO Login | `https://orbitstaffing.io/api/auth/ecosystem-login` |
| Chat User Register | `https://orbitstaffing.io/api/chat/auth/register` |

---

## API Base URL

```
https://trustvault.replit.app/api/studio
```

---

## TrustGen Credentials

| Field | Value |
|---|---|
| Tenant ID | `trustgen` |
| App Name | `TrustGen` |
| API Key | Stored in env var `TRUSTGEN_API_KEY` |
| API Secret | Stored in env var `TRUSTGEN_API_SECRET` |
| Webhook URL | `https://trustgen.replit.app/api/trustvault/webhook` |
| CORS Origin | `https://trustgen.replit.app` |
| Capabilities | `media_vault`, `media_upload`, `media_read`, `media_delete`, `3d_model_storage`, `animation_storage`, `texture_storage` |

**Environment variables to set in TrustGen:**

```
TRUSTVAULT_API_KEY=<value from TRUSTGEN_API_KEY>
TRUSTVAULT_API_SECRET=<value from TRUSTGEN_API_SECRET>
JWT_SECRET=<shared Trust Layer JWT secret>
```

---

## Hallmark System

TrustGen is part of the Trust Layer Hallmark blockchain audit trail.

| Field | Value |
|---|---|
| Hallmark Prefix | `TG` (see ecosystem registry — note: Trust Golf also uses `TG`, coordinate if needed) |
| Genesis Hallmark | To be created on first TrustGen boot |
| Parent Genesis | `TH-00000001` (Trust Layer Hub) |
| TrustVault Genesis | `TV-00000001` |
| Verification | `GET https://trustvault.replit.app/api/hallmark/:id/verify` |

---

## Affiliate Program

TrustGen participates in the universal Trust Layer affiliate system.

| Field | Value |
|---|---|
| Referral Link | `https://trustgen.tlid.io/ref/{uniqueHash}` |
| Commission Tiers | Base 10%, Silver 12.5%, Gold 15%, Platinum 17.5%, Diamond 20% |
| Payout Currency | SIG (native asset) |
| Minimum Payout | 10 SIG |
| UniqueHash | Same per user across all 33 ecosystem apps |

The `uniqueHash` is generated once per user and shared across the entire ecosystem. When a user signs up via a referral link on any app, the referring user earns commission based on their tier.

---

## Key Endpoints

### 1. Discovery — Get Capabilities (No Auth Required)

```
GET /api/studio/capabilities
```

Returns all available endpoints, auth requirements, rate limits, file limits, and webhook config.

### 2. Upload Media (JWT Required)

```
POST /api/studio/upload
Content-Type: multipart/form-data

Fields:
  - file: The file to upload (3D model, animation, texture, reference image, etc.)
  - title: Display title
  - description: Optional description
  - tags: Comma-separated tags (e.g., "3d,character,rigged,fbx")
```

**Supported file types for TrustGen integration:**
- `.glb`, `.gltf` — 3D models (GL Transmission Format)
- `.fbx` — 3D models (Autodesk FBX)
- `.obj` — 3D models (Wavefront OBJ)
- `.usdz` — 3D models (Apple AR format)
- `.blend` — Blender project files
- `.png`, `.jpg`, `.exr`, `.hdr` — Textures, environment maps, reference images
- `.mp4`, `.webm` — Animation previews, turntable renders
- `.gif` — Animated thumbnails
- `.zip` — Bundled asset packages (model + textures + animations)

### 3. List Media (JWT Required)

```
GET /api/studio/media
GET /api/studio/media?category=image
```

Returns all media for the authenticated user's tenant. Use category filters:
- `image` — textures, reference images, renders
- `video` — animation previews, turntable renders
- `document` — asset manifests, project files

### 4. Get Single Item (JWT Required)

```
GET /api/studio/media/:id
```

### 5. Delete Media (JWT Required)

```
DELETE /api/studio/media/:id
```

### 6. Webhook — Receive Notifications

TrustVault will POST to `https://trustgen.replit.app/api/trustvault/webhook` when:
- A user uploads a new 3D asset, texture, or animation
- Media is edited or deleted
- Subscription tier changes (affects storage limits)

**Webhook payload:**
```json
{
  "event": "media.uploaded",
  "tenantId": "trustgen",
  "data": {
    "id": 456,
    "title": "Character Model v3",
    "category": "document",
    "contentType": "model/gltf-binary",
    "filename": "character-v3.glb",
    "size": 8388608,
    "tags": ["3d", "character", "rigged"]
  }
}
```

---

## Integration Use Cases

### 1. Store Generated 3D Models in Vault

After TrustGen generates a 3D model (like Meshy AI), push the result to the user's TrustVault for permanent storage and organization.

```
POST /api/studio/upload
Authorization: Bearer <sso-token>

FormData:
  file: [character-model.glb]
  title: "AI Character - Warrior Knight"
  tags: "3d,character,ai-generated,rigged,fbx"
  description: "Generated from text prompt: medieval warrior knight with armor"
```

### 2. Store Animation Exports

After creating animations (like Mixamo), save the animated model or preview video to TrustVault.

```
POST /api/studio/upload
Authorization: Bearer <sso-token>

FormData:
  file: [walk-cycle.mp4]
  title: "Walk Cycle - Warrior Knight"
  tags: "animation,walk-cycle,preview"
```

### 3. Pull Textures from Vault

Users can store texture libraries in TrustVault and pull them into TrustGen for model texturing.

```
GET /api/studio/media?category=image
Authorization: Bearer <sso-token>
```

Filter by tags to find specific textures:
```
GET /api/studio/media?search=texture+metal
Authorization: Bearer <sso-token>
```

### 4. Pull Reference Images for AI Generation

Users can store reference images in TrustVault and use them as input for TrustGen's AI 3D generation.

```
GET /api/studio/media/:id
Authorization: Bearer <sso-token>
```

### 5. Store Turntable Renders

After generating a 3D model, create a turntable render video and store it in TrustVault as a preview.

```
POST /api/studio/upload
Authorization: Bearer <sso-token>

FormData:
  file: [turntable-render.mp4]
  title: "Turntable - Warrior Knight"
  tags: "turntable,render,preview,3d"
```

### 6. Bundled Asset Packages

Zip up a complete asset (model + textures + animations) and store as a single file.

```
POST /api/studio/upload
Authorization: Bearer <sso-token>

FormData:
  file: [warrior-knight-complete.zip]
  title: "Warrior Knight - Complete Asset Pack"
  tags: "3d,character,rigged,textured,animated,asset-pack"
```

---

## HMAC Webhook Verification

If TrustGen wants to verify webhook authenticity:

```javascript
const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}
```

The signature is sent in the `X-TrustVault-Signature` header.

---

## HMAC API Authentication (Alternative to JWT)

For server-to-server calls where JWT SSO is not available, use HMAC authentication:

```
Authorization: DW {apiKey}:{timestamp}:{hmac_signature}
```

**How to generate:**

```javascript
const crypto = require("crypto");

function generateHMAC(apiKey, apiSecret, method, path, body = "") {
  const timestamp = Date.now().toString();
  const payload = `${method}:${path}:${timestamp}:${typeof body === 'string' ? body : JSON.stringify(body)}`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(payload)
    .digest("hex");
  return `DW ${apiKey}:${timestamp}:${signature}`;
}

// Example usage:
const auth = generateHMAC(
  process.env.TRUSTVAULT_API_KEY,
  process.env.TRUSTVAULT_API_SECRET,
  "GET",
  "/api/studio/media"
);

fetch("https://trustvault.replit.app/api/studio/media", {
  headers: { Authorization: auth }
});
```

---

## Rate Limits

- **60 requests per minute** per tenant
- Rate limit headers included in responses: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Subscription Tier Storage Limits

| Tier | Monthly Price | Storage | AI Credits |
|---|---|---|---|
| Free | $0 | 500 MB | 10/month |
| Personal | $9.99/mo | 10 GB | 100/month |
| Pro | $19.99/mo | 100 GB | Unlimited |
| Studio | $49.99/mo | 1 TB | Unlimited + API access |

API access (Studio API endpoints) requires the **Studio** tier or ecosystem tenant provisioning.

---

## Cross-App Navigation

TrustGen can link users back to their TrustVault to manage stored assets:

```
https://trustvault.replit.app/explore
```

For return navigation from TrustVault to TrustGen, implement a return URL parameter:

```
https://trustgen.replit.app/studio?returnFrom=trustvault&assetId={id}
```

---

## DarkWave Ecosystem Widget

Embed the ecosystem directory widget in TrustGen:

```html
<script src="https://dwsc.io/api/ecosystem/widget.js"></script>
```

Widget data API (requires TL SSO JWT):
```
GET https://dwsc.io/api/ecosystem/widget-data
Authorization: Bearer <sso-token>
```

---

## Support

**Customer Service:** Team@dwsc.io
**Ecosystem:** Trust Layer / Dark Wave Studios
**Widget:** `https://dwsc.io/api/ecosystem/directory.js`
