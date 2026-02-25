# TrustVault — Integration Handoff to Trust Golf

**Date:** February 25, 2026
**From:** TrustVault / DW Media Studio (by Dark Wave Studios)
**To:** Trust Golf
**Purpose:** Media editing and storage integration

---

## Service Overview

TrustVault is the universal IP storage and creative platform within the DarkWave Trust Layer ecosystem. It provides secure multi-tenant media vault storage, professional editing tools (image, audio, video, merge), AI-powered creative features, and ecosystem-wide media access via API.

**Production URL:** `https://trustvault.replit.app`

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

**Trust Golf must register as an ecosystem app first** using the registration endpoint above. After registration, users who log in via Trust Layer SSO on Trust Golf will automatically have access to their TrustVault media.

---

## API Base URL

```
https://trustvault.replit.app/api/studio
```

---

## Endpoints

### 1. Discovery — Get Capabilities (No Auth Required)

```
GET /api/studio/capabilities
```

Returns all available endpoints, auth requirements, rate limits, file limits, and webhook config. Call this first to discover what's available.

**Response:**
```json
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
```

---

### 2. Connection Check — Verify Auth

```
GET /api/studio/status
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "connected": true,
  "appName": "Trust Vault",
  "appId": "dw_app_trustvault",
  "version": "1.0.0",
  "user": { "trustLayerId": "tl-xxxx-xxxx", "userId": "abc123" },
  "capabilities": ["media:list", "media:get", "media:upload", "media:delete", "projects:create", "projects:status", "projects:export", "editor:embed"],
  "limits": {
    "rateLimit": "60 requests per minute",
    "maxUploadSize": "500MB",
    "maxConcurrentRenders": 3,
    "supportedMediaTypes": ["image", "video", "audio", "document"]
  }
}
```

---

### 3. List Media Items

```
GET /api/studio/media/list
Authorization: Bearer <jwt_token>
```

**Query Params:**
| Param | Type | Required | Description |
|---|---|---|---|
| category | string | No | Filter: `image`, `video`, `audio`, `document` |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50, max: 100) |

**Response:**
```json
{
  "items": [
    {
      "id": 42,
      "title": "Golf Course Drone Shot",
      "category": "image",
      "contentType": "image/jpeg",
      "size": 2048000,
      "url": "https://storage.googleapis.com/...",
      "thumbnailUrl": "https://storage.googleapis.com/...",
      "isFavorite": true,
      "tags": ["golf", "drone", "course-overview"],
      "createdAt": "2026-02-25T10:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 85, "totalPages": 2 }
}
```

---

### 4. Get Single Media Item

```
GET /api/studio/media/:id
Authorization: Bearer <jwt_token>
```

**Response:** Full media item object with all metadata.

---

### 5. Upload Media (Presigned URL Flow)

**Step 1 — Get upload URL:**
```
POST /api/studio/media/upload
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "hole-7-flyover.mp4",
  "contentType": "video/mp4",
  "size": 52428800
}
```

**Response:**
```json
{
  "uploadURL": "https://storage.googleapis.com/...?X-Goog-Signature=...",
  "objectPath": "uploads/abc123/hole-7-flyover.mp4",
  "metadata": { "name": "hole-7-flyover.mp4", "contentType": "video/mp4" },
  "instructions": "Upload the file directly to uploadURL via PUT request with the correct Content-Type header. After upload completes, call POST /api/studio/media/confirm."
}
```

**Step 2 — Upload the file directly to the presigned URL:**
```
PUT <uploadURL>
Content-Type: video/mp4

<file binary data>
```

**Step 3 — Confirm and register:**
```
POST /api/studio/media/confirm
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Hole 7 Flyover Video",
  "url": "https://storage.googleapis.com/...",
  "filename": "hole-7-flyover.mp4",
  "contentType": "video/mp4",
  "size": 52428800,
  "tags": ["golf", "hole-7", "flyover", "trustgolf"]
}
```

**Response:**
```json
{
  "id": 99,
  "title": "Hole 7 Flyover Video",
  "category": "video",
  "url": "https://storage.googleapis.com/...",
  "createdAt": "2026-02-25T14:00:00Z"
}
```

---

### 6. Embed TrustVault Media Editors (Primary Use Case for Trust Golf)

This is the key endpoint for media editing. It generates a tokenized URL that Trust Golf can open in an iframe or redirect the user to. The user gets access to TrustVault's full editing suite.

```
POST /api/studio/editor/embed-token
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "editorType": "image",
  "mediaId": 42,
  "returnUrl": "https://trustgolf.replit.app/gallery"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| editorType | string | Yes | `"image"`, `"video"`, `"audio"`, or `"merge"` |
| mediaId | number | No | ID of existing media to edit (omit for new project) |
| returnUrl | string | No | Where to redirect after editing is done |

**Response:**
```json
{
  "embedUrl": "https://trustvault.replit.app/image-editor?embed=true&token=abc123def456...&mediaId=42&returnUrl=https://trustgolf.replit.app/gallery",
  "embedToken": "abc123def456...",
  "expiresAt": "2026-02-25T16:00:00Z",
  "editorType": "image",
  "instructions": "Open this URL in an iframe or redirect the user. The token authenticates their session for 2 hours."
}
```

**Available Editors:**
| Editor Type | Capabilities |
|---|---|
| `image` | Crop, rotate, resize, 16 filters, color grading, text/drawing/stickers, AI background removal, AI smart erase, AI magic fill, AI auto-enhance, voice commands, social media kit |
| `video` | Trim, color grading, frame capture, presets |
| `audio` | Trim, fade, EQ, reverb, noise gate, waveform visualization |
| `merge` | Collage builder, audio concatenation, video concatenation |

**Embed token is valid for 2 hours.** After expiry, request a new one.

---

### 7. Create Media Projects

```
POST /api/studio/projects/create
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Trust Golf Course Highlight Reel",
  "type": "video",
  "description": "Highlight reel from drone footage of all 18 holes"
}
```

**Response:**
```json
{
  "projectId": 15,
  "status": "queued",
  "title": "Trust Golf Course Highlight Reel",
  "type": "video",
  "createdAt": "2026-02-25T14:05:00Z"
}
```

---

### 8. Check Project Status

```
GET /api/studio/projects/:id/status
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "projectId": 15,
  "status": "completed",
  "type": "video",
  "title": "Trust Golf Course Highlight Reel",
  "progress": 100,
  "outputMediaId": 101,
  "errorMessage": null
}
```

**Status values:** `queued`, `processing`, `completed`, `failed`

---

### 9. Export/Render Project

```
POST /api/studio/projects/:id/export
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "webhookUrl": "https://trustgolf.replit.app/api/trustvault/webhook"
}
```

TrustVault will send webhook callbacks to the provided URL when rendering starts, completes, or fails.

---

## Webhooks (Outbound from TrustVault to Trust Golf)

When Trust Golf provides a `webhookUrl` in export requests, TrustVault sends these events:

| Event | Fired When | Key Payload Fields |
|---|---|---|
| `render.started` | Export begins processing | `projectId`, `status: "processing"` |
| `render.complete` | Export finishes | `projectId`, `status: "completed"`, `downloadUrl`, `outputMediaId` |
| `render.failed` | Export fails | `projectId`, `status: "failed"`, `error` |

**Webhook headers:**
```
X-App-Name: Trust Vault
X-App-Id: dw_app_trustvault
Content-Type: application/json
```

**Trust Golf should implement:**
```
POST https://trustgolf.replit.app/api/trustvault/webhook
```

Example handler:
```javascript
app.post("/api/trustvault/webhook", (req, res) => {
  const { event, projectId, status, downloadUrl } = req.body;
  
  switch (event) {
    case "render.complete":
      // Save downloadUrl, notify user their edit is ready
      break;
    case "render.failed":
      // Handle error, notify user
      break;
    case "render.started":
      // Update UI to show processing
      break;
  }
  
  res.json({ received: true });
});
```

---

## CORS

Trust Golf's production URL must be added to TrustVault's CORS allowlist for browser-based API calls. Provide your production URL and we'll add it.

Server-to-server calls are not affected by CORS.

---

## Rate Limits

- **60 requests per minute** per user (identified by Trust Layer ID)
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- On exceed: HTTP 429 with `Retry-After` header

---

## File Limits

- Max upload size: **500MB**
- Supported types: `image/*`, `video/*`, `audio/*`, `application/pdf`

---

## Trust Golf Integration Checklist

1. **Register as ecosystem app** at `https://orbitstaffing.io/api/admin/ecosystem/register-app`
2. **Store the shared `JWT_SECRET`** as an environment variable (same secret used across all ecosystem apps)
3. **Implement Trust Layer SSO login** — use `https://orbitstaffing.io/api/auth/ecosystem-login`
4. **Test connection** — call `GET /api/studio/status` with a valid JWT
5. **Upload media** — use the 3-step presigned URL flow (upload → PUT → confirm)
6. **Embed editors** — call `/api/studio/editor/embed-token` and open the `embedUrl` in an iframe or redirect
7. **Handle webhooks** — implement `POST /api/trustvault/webhook` for render callbacks
8. **Provide your production URL** to TrustVault for CORS allowlist

---

## Trust Golf Use Cases Supported

| Use Case | How |
|---|---|
| Store course photos/videos in the vault | Upload → Confirm flow |
| Edit course images (crop, enhance, AI tools) | Embed image editor via iframe |
| Create highlight reels from drone footage | Create project → Export with webhook |
| Edit promotional videos | Embed video editor via iframe |
| Edit background music/audio for promos | Embed audio editor via iframe |
| Create photo collages of course layouts | Embed merge editor via iframe |
| AI auto-tag uploaded media | Automatic on upload (images analyzed by AI) |
| Social media kit for course photos | Available in embedded image editor |

---

## Server-to-Server Alternative (HMAC Auth)

If Trust Golf needs server-to-server access without a user context (e.g., backend batch uploads), TrustVault also provides an HMAC-authenticated Ecosystem API:

- **Base URL:** `https://trustvault.replit.app/api/ecosystem`
- **Auth Header:** `Authorization: DW {apiKey}:{timestamp}:{signature}`
- **Signature:** HMAC-SHA256 of `{timestamp}:{apiKey}` using your API secret
- **Timestamp tolerance:** 5 minutes
- **Additional Header:** `X-App-Name: trustgolf`

To get provisioned with an API key + secret pair, contact TrustVault admin or call:
```
POST /api/ecosystem/provision
```
(Requires vault admin session)

---

## Financial Reporting

All subscription revenue from Trust Golf users (if applicable) is automatically reported to ORBIT Staffing OS Financial Hub for bookkeeping under owner **Jason Andrews**.

---

## Contact

| Field | Value |
|---|---|
| App Name | TrustVault / DW Media Studio |
| App ID | `dw_app_trustvault` |
| Owner | Jason Andrews |
| Stack | React 18 + Express + PostgreSQL on Replit |
| SSO | Trust Layer JWT (HS256, shared JWT_SECRET) |
| Trust Layer ID Format | `tl-xxxx-xxxx` |
| Production URL | `https://trustvault.replit.app` |
| Ecosystem | Dark Wave Studios / TrustLayer |
