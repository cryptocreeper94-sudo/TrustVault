# TrustVault — Return Handoff to Verdara (App #28)

**Date:** February 20, 2026
**From:** TrustVault (by Dark Wave Studios)
**To:** Verdara (App #28)

---

## Service Overview

TrustVault is the universal IP storage and creative platform within the DarkWave Trust Layer ecosystem. It provides secure multi-tenant media vault storage, professional editing tools, AI-powered creative features, and ecosystem-wide media access via API.

---

```
SERVICE NAME: TrustVault (Media Vault & Creative Platform)
APP ID: dw_app_trustvault
API BASE URL: https://trustvault.replit.app/api/studio
AUTHENTICATION METHOD: Trust Layer SSO JWT (Bearer token, HS256, shared JWT_SECRET)
API KEY: Not required — uses shared Trust Layer SSO JWT tokens

---

ENDPOINTS:

- GET /api/studio/capabilities — Public endpoint: discover all available endpoints, auth info, rate limits, and webhook config
  - Input: None (no auth required)
  - Output: { appName, appId, version, endpoints[], authentication{}, cors{}, rateLimits{}, fileLimits{}, webhooks{} }
  - Example request: GET https://trustvault.replit.app/api/studio/capabilities
  - Example response:
    {
      "appName": "Trust Vault",
      "appId": "dw_app_trustvault",
      "version": "1.0.0",
      "endpoints": [...],
      "authentication": {
        "type": "Bearer JWT",
        "header": "Authorization: Bearer <trustlayer_jwt_token>",
        "tokenSource": "TrustLayer SSO — shared JWT_SECRET across ecosystem apps",
        "tokenExpiry": "7 days"
      },
      "rateLimits": { "maxRequestsPerMinute": 60, "windowMs": 60000 }
    }

- GET /api/studio/status — Verify connection, get authenticated user info and capabilities
  - Input: Authorization: Bearer <jwt_token>
  - Output: { connected, appName, appId, version, user: { trustLayerId, userId }, capabilities[], limits{} }
  - Example request: GET /api/studio/status (Authorization: Bearer eyJ...)
  - Example response:
    {
      "connected": true,
      "appName": "Trust Vault",
      "appId": "dw_app_trustvault",
      "version": "1.0.0",
      "user": { "trustLayerId": "tl-mlamvhdd-qvg07fyt", "userId": "abc123" },
      "capabilities": ["media:list", "media:get", "media:upload", "media:delete", "projects:create", "projects:status", "projects:export", "editor:embed"],
      "limits": {
        "rateLimit": "60 requests per minute",
        "maxUploadSize": "500MB",
        "maxConcurrentRenders": 3,
        "supportedMediaTypes": ["image", "video", "audio", "document"]
      }
    }

- GET /api/studio/media/list — List user's media items (paginated, filterable)
  - Input: Authorization: Bearer <jwt_token>, Query params: ?category=image|video|audio|document (optional), ?page=1, ?limit=50 (max 100)
  - Output: { items[]: { id, title, category, contentType, size, url, thumbnailUrl, isFavorite, tags[], createdAt }, pagination: { page, limit, total, totalPages } }
  - Example request: GET /api/studio/media/list?category=image&page=1&limit=20
  - Example response:
    {
      "items": [
        {
          "id": 42,
          "title": "Trail Photo",
          "category": "image",
          "contentType": "image/jpeg",
          "size": 2048000,
          "url": "https://storage.googleapis.com/...",
          "thumbnailUrl": "https://storage.googleapis.com/...",
          "isFavorite": true,
          "tags": ["nature", "trail"],
          "createdAt": "2026-02-15T10:30:00Z"
        }
      ],
      "pagination": { "page": 1, "limit": 20, "total": 85, "totalPages": 5 }
    }

- GET /api/studio/media/:id — Get a specific media item by ID
  - Input: Authorization: Bearer <jwt_token>, Path param: media item ID
  - Output: { id, title, category, contentType, size, url, thumbnailUrl, isFavorite, tags[], description, createdAt }
  - Example request: GET /api/studio/media/42
  - Example response:
    {
      "id": 42,
      "title": "Trail Photo",
      "category": "image",
      "contentType": "image/jpeg",
      "size": 2048000,
      "url": "https://storage.googleapis.com/...",
      "thumbnailUrl": "https://storage.googleapis.com/...",
      "isFavorite": true,
      "tags": ["nature", "trail"],
      "description": "Photo taken at Eagle Creek Trail",
      "createdAt": "2026-02-15T10:30:00Z"
    }

- POST /api/studio/media/upload — Get a presigned upload URL for direct-to-cloud file upload
  - Input: Authorization: Bearer <jwt_token>, Body: { name: string, contentType: string, size?: number }
  - Output: { uploadURL, objectPath, metadata{}, instructions }
  - Example request: POST /api/studio/media/upload
    Body: { "name": "species-photo.jpg", "contentType": "image/jpeg", "size": 1024000 }
  - Example response:
    {
      "uploadURL": "https://storage.googleapis.com/...?X-Goog-Signature=...",
      "objectPath": "uploads/abc123/species-photo.jpg",
      "metadata": { "name": "species-photo.jpg", "contentType": "image/jpeg", "size": 1024000 },
      "instructions": "Upload the file directly to uploadURL via PUT request with the correct Content-Type header. After upload completes, call POST /api/studio/media/confirm to register the media item."
    }

- POST /api/studio/media/confirm — Confirm upload and register the media item in the vault
  - Input: Authorization: Bearer <jwt_token>, Body: { title: string, url: string, filename: string, contentType: string, size?: number, thumbnailUrl?: string, description?: string, tags?: string[] }
  - Output: { id, title, category, url, createdAt }
  - Example request: POST /api/studio/media/confirm
    Body: { "title": "Oak Tree Species Photo", "url": "https://storage.googleapis.com/...", "filename": "species-photo.jpg", "contentType": "image/jpeg", "size": 1024000, "tags": ["species", "oak", "verdara"] }
  - Example response:
    {
      "id": 99,
      "title": "Oak Tree Species Photo",
      "category": "image",
      "url": "https://storage.googleapis.com/...",
      "createdAt": "2026-02-20T14:00:00Z"
    }

- POST /api/studio/projects/create — Create a new media project (video/image/audio)
  - Input: Authorization: Bearer <jwt_token>, Body: { title: string, type: "video"|"image"|"audio", description?: string, dimensions?: { width, height }, duration?: number }
  - Output: { projectId, status: "queued", title, type, createdAt }
  - Example request: POST /api/studio/projects/create
    Body: { "title": "Verdara Trail Highlight Reel", "type": "video", "description": "Auto-generated trail highlight video" }
  - Example response:
    {
      "projectId": 15,
      "status": "queued",
      "title": "Verdara Trail Highlight Reel",
      "type": "video",
      "createdAt": "2026-02-20T14:05:00Z"
    }

- GET /api/studio/projects/:id/status — Check project/render status
  - Input: Authorization: Bearer <jwt_token>, Path param: project ID
  - Output: { projectId, status, type, title, progress, outputMediaId, errorMessage, createdAt, updatedAt }
  - Example request: GET /api/studio/projects/15/status
  - Example response:
    {
      "projectId": 15,
      "status": "completed",
      "type": "video",
      "title": "Verdara Trail Highlight Reel",
      "progress": 100,
      "outputMediaId": 101,
      "errorMessage": null,
      "createdAt": "2026-02-20T14:05:00Z",
      "updatedAt": "2026-02-20T14:05:15Z"
    }

- POST /api/studio/projects/:id/export — Trigger project export/render
  - Input: Authorization: Bearer <jwt_token>, Path param: project ID, Body: { webhookUrl?: string }
  - Output: { projectId, status: "processing", message, webhookUrl }
  - Example request: POST /api/studio/projects/15/export
    Body: { "webhookUrl": "https://verdara.replit.app/api/trustvault/webhook" }
  - Example response:
    {
      "projectId": 15,
      "status": "processing",
      "message": "Export started. You will receive webhook callbacks for render.started, render.complete, or render.failed events.",
      "webhookUrl": "https://verdara.replit.app/api/trustvault/webhook"
    }

- POST /api/studio/editor/embed-token — Generate a tokenized editor URL for iframe embedding
  - Input: Authorization: Bearer <jwt_token>, Body: { editorType: "video"|"image"|"audio"|"merge", mediaId?: number, returnUrl?: string }
  - Output: { embedUrl, embedToken, expiresAt, editorType, instructions }
  - Example request: POST /api/studio/editor/embed-token
    Body: { "editorType": "image", "mediaId": 42, "returnUrl": "https://verdara.replit.app/gallery" }
  - Example response:
    {
      "embedUrl": "https://trustvault.replit.app/image-editor?embed=true&token=abc123def456...&mediaId=42&returnUrl=https://verdara.replit.app/gallery",
      "embedToken": "abc123def456...",
      "expiresAt": "2026-02-20T16:00:00Z",
      "editorType": "image",
      "instructions": "Open this URL in an iframe or redirect the user. The token authenticates their session for 2 hours."
    }

---

WEBHOOKS:

- render.started — Fired when a project export begins processing
  - Payload: { event: "render.started", projectId, status: "processing", userId, trustLayerId, timestamp }
  - Delivery: POST to webhookUrl provided in export request

- render.complete — Fired when a project export finishes successfully
  - Payload: { event: "render.complete", projectId, status: "completed", downloadUrl, outputMediaId, userId, trustLayerId, timestamp }
  - Delivery: POST to webhookUrl provided in export request

- render.failed — Fired when a project export fails
  - Payload: { event: "render.failed", projectId, status: "failed", error, userId, trustLayerId, timestamp }
  - Delivery: POST to webhookUrl provided in export request

Webhook headers on all deliveries:
  X-App-Name: Trust Vault
  X-App-Id: dw_app_trustvault
  Content-Type: application/json

---

RATE LIMITS: 60 requests per minute per user (identified by Trust Layer ID or IP)
  - Response headers: X-RateLimit-Limit, X-RateLimit-Remaining
  - On exceed: HTTP 429 with Retry-After header

CORS:
  - Allowed origins: https://darkwavestudios.replit.app, https://darkwavestudios.com, https://www.darkwavestudios.com
  - NOTE: Verdara's origin will need to be added to the allowlist. Provide your production URL.

FILE LIMITS:
  - Max upload size: 500MB
  - Supported types: image/*, video/*, audio/*, application/pdf, application/msword

SDK/CLIENT LIBRARY: None currently — standard REST API with fetch/axios

---

ADDITIONAL NOTES:

1. CORS ALLOWLIST: Verdara must provide its production URL(s) to be added to TrustVault's CORS allowlist for browser-based API calls. Server-to-server calls are unaffected.

2. TRUST LAYER SSO: Authentication uses the shared JWT_SECRET across all ecosystem apps. Users who register on ANY ecosystem app (Verdara, TrustVault, GarageBot, etc.) receive a Trust Layer ID. The same JWT token works on all apps.

3. TOKEN FORMAT:
   - Algorithm: HS256
   - Payload: { userId, trustLayerId, iss: "trust-layer-sso" }
   - Expiry: 7 days
   - Client storage: localStorage key "tl-sso-token"

4. TENANT ISOLATION: Each user's media is fully isolated by tenant. A user can only access their own media items via the API. TrustVault resolves the tenant from the JWT's trustLayerId automatically.

5. VERDARA USE CASES SUPPORTED:
   - Store species identification photos in TrustVault via upload + confirm flow
   - Retrieve and display user's nature/trail photos from their vault
   - Embed TrustVault's image editor for photo editing (crop, enhance, AI tools) via iframe
   - Create video projects from trail photos (highlight reels)
   - Tag media with Verdara-specific tags for cross-app organization

6. SIGNAL WALLET / CREDITS (FUTURE): TrustVault does not currently operate as a wallet service. Signal (SIG) wallet and credits functionality is on the ecosystem roadmap. When available, endpoints for balance checks, transfers, and transaction history will be added to this handoff. For now, Verdara should direct wallet/credits requests to the dedicated Trust Layer Credits service.

7. ECOSYSTEM API (HMAC): TrustVault also exposes an HMAC-authenticated Ecosystem API at /api/ecosystem/* for server-to-server provisioning, project management, and webhook delivery. If Verdara needs server-to-server integration (no user context), contact us for tenant provisioning (API key + secret pair).
   - Auth header format: Authorization: DW {apiKey}:{timestamp}:{hmac_signature}
   - Signature: HMAC-SHA256 of "{timestamp}:{apiKey}" using apiSecret
   - Timestamp tolerance: 5 minutes
```

---

## Summary of What TrustVault Provides to Verdara

| Capability | Status | Details |
|---|---|---|
| Media storage (upload/retrieve) | **Available** | Presigned URL upload, cloud storage, full CRUD |
| Media listing & search | **Available** | Paginated, filterable by category, tagged |
| Image/Video/Audio editing | **Available** | Embeddable editors via iframe token |
| AI creative tools (enhance, background removal, auto-tag) | **Available** | Via embedded editor sessions |
| Media project creation & export | **Available** | Video/image/audio projects with webhook callbacks |
| Trust Layer SSO authentication | **Available** | Shared JWT, automatic user linking |
| Tenant-isolated storage | **Available** | Each user's media is private and separated |
| Signal (SIG) wallet balance | **Roadmap** | Coming — will be separate service endpoint |
| Signal (SIG) payments/transfers | **Roadmap** | Coming — will be separate service endpoint |
| Credit balance / deduction | **Roadmap** | Coming — will be separate service endpoint |

---

## Contact

**App:** TrustVault (by Dark Wave Studios)
**App ID:** dw_app_trustvault
**Stack:** React 18 + Express + PostgreSQL on Replit
**SSO:** Trust Layer JWT (HS256, shared JWT_SECRET)
**Trust Layer ID format:** tl-xxxx-xxxx
**Production URL:** https://trustvault.replit.app
