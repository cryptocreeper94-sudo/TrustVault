# TrustVault — Return Handoff to TrustHome

**Date:** February 20, 2026
**From:** TrustVault / DW Media Studio (by Dark Wave Studios)
**To:** TrustHome

---

## Answers to TrustHome's Questions

### 1. Base URL

The correct base URL is:

```
https://trustvault.replit.app/api/ecosystem
```

Note: `https://media.darkwavestudios.io/api/ecosystem` is **not active**. Use the Replit URL above. When a custom domain is configured in the future, we will notify you of the cutover.

---

### 2. Auth Pattern — CONFIRMED

Yes, TrustVault uses the **same HMAC-SHA256 ecosystem auth pattern**:

```
Authorization: DW {apiKey}:{timestamp}:{signature}
```

Where:
- `timestamp` = `Date.now().toString()` (Unix milliseconds as string)
- `signature` = HMAC-SHA256 of `{timestamp}:{apiKey}` using your API secret
- Timestamp tolerance: **5 minutes** (requests older than 5 min are rejected)

Additionally, include this header:
```
X-App-Name: trusthome
```

Your stored secrets `DW_MEDIA_API_KEY` and `DW_MEDIA_API_SECRET` are the correct credentials. These were provisioned for TrustHome's tenant.

---

### 3. Endpoint Documentation — CONFIRMED

Here are the **exact endpoints** available, with request/response formats:

---

#### `GET /api/ecosystem/status?tenantId=trusthome`

**Purpose:** Health check / connection verification

**Headers:**
```
Authorization: DW {apiKey}:{timestamp}:{signature}
X-App-Name: trusthome
```

**Response (200):**
```json
{
  "configured": true,
  "capabilities": ["media_vault", "video_walkthrough", "photo_editing", "virtual_staging"],
  "version": "1.0.0"
}
```

---

#### `GET /api/ecosystem/projects?tenantId=trusthome`

**Purpose:** List all media projects for the TrustHome tenant

**Headers:** Same auth headers

**Response (200):**
```json
{
  "projects": [
    {
      "id": 1,
      "title": "Video Walkthrough - 123 Main St",
      "status": "queued",
      "propertyAddress": "123 Main St",
      "createdAt": "2026-02-20T10:00:00Z",
      "thumbnailUrl": null
    }
  ]
}
```

---

#### `GET /api/ecosystem/projects/:id?tenantId=trusthome`

**Purpose:** Get full details of a specific project

**Headers:** Same auth headers

**Response (200):**
```json
{
  "id": 1,
  "title": "Video Walkthrough - 123 Main St",
  "status": "queued",
  "propertyAddress": "123 Main St",
  "propertyId": "prop-abc123",
  "requestType": "Video Walkthrough",
  "notes": "Focus on the kitchen renovation",
  "agentId": "agent-jane-doe",
  "thumbnailUrl": null,
  "outputUrl": null,
  "duration": null,
  "timeline": null,
  "assets": null,
  "renderStatus": null,
  "errorMessage": null,
  "createdAt": "2026-02-20T10:00:00Z",
  "updatedAt": "2026-02-20T10:00:00Z"
}
```

---

#### `GET /api/ecosystem/projects/:id/status?tenantId=trusthome`

**Purpose:** Check render/processing status of a project

**Headers:** Same auth headers

**Response (200):**
```json
{
  "status": "complete",
  "renderStatus": "finished",
  "outputUrl": "https://storage.googleapis.com/.../final-video.mp4",
  "thumbnailUrl": "https://storage.googleapis.com/.../thumb.jpg",
  "duration": 45,
  "errorMessage": null,
  "updatedAt": "2026-02-20T12:00:00Z"
}
```

**Status values:** `queued`, `in_progress`, `complete`, `cancelled`

---

#### `POST /api/ecosystem/walkthrough-request`

**Purpose:** Request a new video walkthrough or media project

**Headers:** Same auth headers

**Request body:**
```json
{
  "tenantId": "trusthome",
  "propertyAddress": "456 Oak Ave, Suite 200",
  "propertyId": "prop-xyz789",
  "requestType": "Video Walkthrough",
  "notes": "3 bedroom, 2 bath, highlight the pool area",
  "agentId": "agent-jane-doe"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| tenantId | string | Yes | Must be `"trusthome"` |
| propertyAddress | string | Yes | Property street address |
| propertyId | string | No | TrustHome's internal property ID |
| requestType | string | Yes | e.g., "Video Walkthrough", "Photo Editing", "Virtual Staging" |
| notes | string | No | Special instructions |
| agentId | string | No | TrustHome agent identifier |

**Response (201):**
```json
{
  "requestId": 12,
  "status": "queued",
  "estimatedTurnaround": "24-48 hours"
}
```

---

#### `POST /api/ecosystem/projects/:id/cancel`

**Purpose:** Cancel a project that hasn't been completed yet

**Headers:** Same auth headers

**Request body:**
```json
{
  "tenantId": "trusthome"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Project cancelled"
}
```

**Note:** Cannot cancel projects with status `complete` or `cancelled`.

---

### 4. Tenant ID — CONFIRMED

Yes, `trusthome` is the correct tenant identifier. All requests must include `tenantId=trusthome` either as a query parameter (GET) or in the request body (POST). The API verifies this matches your provisioned API key's tenant.

---

### 5. TrustHome Credentials for TrustVault (Webhook Delivery)

Confirmed. TrustVault will store these for outbound webhook delivery:

| Secret Name | Purpose |
|---|---|
| `TRUSTHOME_API_KEY` | Auth for webhook delivery to TrustHome |
| `TRUSTHOME_API_SECRET` | HMAC signing for webhook delivery |
| `TRUSTHOME_BASE_URL` | `https://trusthome.replit.app` |

**TrustHome webhook endpoint:** `POST https://trusthome.replit.app/api/ecosystem/incoming`

Please confirm the API key and secret values so we can store them.

---

### 6. Webhook / Callback Support — YES, SUPPORTED

TrustVault sends webhooks when projects are completed, cancelled, or fail. The webhook is sent to the URL configured for your tenant (set during provisioning, or the endpoint you specified: `POST https://trusthome.replit.app/api/ecosystem/incoming`).

**Webhook delivery details:**
- Method: `POST`
- Auth: `Authorization: DW {apiKey}:{timestamp}:{signature}` (signed with TrustHome's credentials)
- Header: `X-App-Name: mediastudio`
- Content-Type: `application/json`
- Retries: 3 attempts with exponential backoff (1s, 2s, 3s)
- Timeout: 10 seconds per attempt

**Webhook payload format:**
```json
{
  "requestId": 12,
  "status": "complete",
  "outputUrl": "https://storage.googleapis.com/.../final-walkthrough.mp4",
  "thumbnailUrl": "https://storage.googleapis.com/.../thumbnail.jpg",
  "duration": 45,
  "tenantId": "trusthome",
  "completedAt": "2026-02-20T14:30:00Z"
}
```

| Field | Type | Description |
|---|---|---|
| requestId | number | The project ID from the original walkthrough request |
| status | string | `"complete"`, `"cancelled"`, or `"failed"` |
| outputUrl | string or null | Download URL for finished media (null if cancelled/failed) |
| thumbnailUrl | string or null | Thumbnail preview URL |
| duration | number or null | Duration in seconds (for video) |
| tenantId | string | Always `"trusthome"` |
| completedAt | string | ISO 8601 timestamp |

---

### Endpoints TrustHome Asked About — Mapping

| TrustHome Expected | TrustVault Actual | Notes |
|---|---|---|
| `GET /api/ecosystem/status` | `GET /api/ecosystem/status?tenantId=trusthome` | Add tenantId query param |
| `GET /api/ecosystem/projects` | `GET /api/ecosystem/projects?tenantId=trusthome` | Add tenantId query param |
| `POST /api/ecosystem/upload` | Not yet implemented | See note below |
| `GET /api/ecosystem/projects/{id}/export` | `GET /api/ecosystem/projects/:id?tenantId=trusthome` | Use project detail endpoint — outputUrl contains download link |
| `POST /api/ecosystem/walkthrough` | `POST /api/ecosystem/walkthrough-request` | Note the `-request` suffix |
| `GET /api/ecosystem/editor` | Available via Studio API (see below) | JWT-based, separate auth |

**Upload endpoint:** Direct file uploads are handled via the **Studio API** (`/api/studio/media/upload` + `/api/studio/media/confirm`) which uses Trust Layer SSO JWT auth instead of HMAC. For server-to-server uploads without a user context, we can add a `POST /api/ecosystem/upload` endpoint if needed. Let us know.

**Editor embed:** Available via the Studio API at `POST /api/studio/editor/embed-token`. This generates a tokenized URL that can be embedded in an iframe, valid for 2 hours. Supports image, video, audio, and merge editors. This endpoint uses JWT Bearer auth (Trust Layer SSO), not the HMAC ecosystem pattern.

---

## Provisioning

If TrustHome has not yet been provisioned as a tenant, an admin can provision via:

```
POST /api/ecosystem/provision
```

**Body:**
```json
{
  "tenantId": "trusthome",
  "appName": "TrustHome",
  "webhookUrl": "https://trusthome.replit.app/api/ecosystem/incoming",
  "capabilities": ["media_vault", "video_walkthrough", "photo_editing", "virtual_staging"]
}
```

This returns the `apiKey` and `apiSecret` pair for TrustHome to store as `DW_MEDIA_API_KEY` and `DW_MEDIA_API_SECRET`.

**Note:** This endpoint requires vault authentication (admin PIN session), not HMAC auth.

---

## Summary

| Item | Answer |
|---|---|
| Base URL | `https://trustvault.replit.app/api/ecosystem` |
| Auth pattern | HMAC-SHA256: `DW {apiKey}:{timestamp}:{signature}` — confirmed |
| Tenant ID | `trusthome` — confirmed |
| Webhook support | Yes — POST to configured URL with retry + HMAC auth |
| Webhook endpoint for TrustHome | `POST https://trusthome.replit.app/api/ecosystem/incoming` |
| Endpoints confirmed | status, projects, projects/:id, projects/:id/status, walkthrough-request, projects/:id/cancel |
| Upload endpoint | Available via Studio API (JWT auth) — ecosystem HMAC version can be added on request |
| Editor embed | Available via Studio API: `POST /api/studio/editor/embed-token` (JWT auth) |

---

## Contact

**App:** TrustVault / DW Media Studio
**App ID:** dw_app_trustvault
**Stack:** React 18 + Express + PostgreSQL on Replit
**Production URL:** https://trustvault.replit.app
