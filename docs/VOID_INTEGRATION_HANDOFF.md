# TrustVault V1 API — Integration Response for THE VOID

**From:** TrustVault (trustvault.replit.app)
**To:** THE VOID (intothevoid.replit.app)
**Date:** February 21, 2026
**Status:** API Live & Ready

---

## Overview

TrustVault has provisioned THE VOID as an ecosystem service tenant and built a dedicated V1 REST API that meets all requirements from the handoff document. The API supports service-to-service JWT authentication, base64 media upload directly to encrypted Object Storage, signed URL retrieval, deletion, and batch queries by TrustLayer ID.

---

## Credentials

| Field | Value |
|---|---|
| **Service ID** | `the-void` |
| **API Key** | `dw_0fb4a28916a412c11ec57a3e61311c74` |
| **Webhook URL** | `https://intothevoid.replit.app/api/trustvault/webhook` |
| **Capabilities** | `media_vault`, `media_upload`, `media_read`, `media_delete`, `batch_retrieval` |

Store the API Key as `TRUSTVAULT_API_KEY` in THE VOID's secrets.

---

## Base URL

```
https://trustvault.replit.app/api/v1
```

---

## 1. Authentication — Service Token

**`POST /api/v1/auth/service-token`**

Authenticate as THE VOID to receive a short-lived JWT bearer token.

**Request:**
```json
{
  "serviceId": "the-void",
  "apiKey": "dw_0fb4a28916a412c11ec57a3e61311c74",
  "scope": ["media:write", "media:read", "media:delete"]
}
```

**Response:**
```json
{
  "token": "eyJhbG...",
  "expiresIn": 3600,
  "scopes": ["media:write", "media:read", "media:delete"],
  "serviceId": "the-void"
}
```

Use the returned token as `Authorization: Bearer {token}` on all subsequent calls. Tokens expire after 1 hour — re-authenticate when you receive a `TOKEN_EXPIRED` error.

---

## 2. Media Upload

**`POST /api/v1/media/upload`**

Upload base64-encoded media directly. TrustVault decodes and stores the binary in encrypted Object Storage, creates a media item record, and optionally auto-creates collections.

**Request:**
```json
{
  "userId": "tl-m4abc123-xk9f2g7h",
  "voidId": "V-A7K2M9X4",
  "mediaType": "audio",
  "format": "webm",
  "encoding": "base64",
  "data": "<base64_string>",
  "metadata": {
    "source": "vent",
    "ventId": 1234,
    "personality": "smart-ass",
    "duration": 45.2
  },
  "collection": "vents",
  "tags": ["vent", "smart-ass", "2026-02-21"],
  "title": "Vent Session #1234"
}
```

**Response (201):**
```json
{
  "success": true,
  "mediaId": "tv-media-42",
  "url": "https://trustvault.replit.app/api/v1/media/tv-media-42",
  "objectPath": "/objects/ecosystem/the-void/tl-m4abc123-xk9f2g7h/uuid.webm",
  "sizeBytes": 102400,
  "storedAt": "2026-02-21T10:00:00.000Z"
}
```

**Notes:**
- Maximum file size: **10MB** per upload
- Supported media types: `audio`, `image`, `video`, `document`
- Supported encodings: `base64`, `utf-8` (for SVG/text)
- Collections are auto-created per user if they don't exist
- The `metadata.source` value is stored as the item's label for filtering

### SVG/Mood Portrait Upload

Same endpoint, different encoding:
```json
{
  "userId": "tl-m4abc123-xk9f2g7h",
  "mediaType": "image",
  "format": "svg",
  "encoding": "utf-8",
  "data": "<svg>...</svg>",
  "metadata": { "source": "mood-portrait", "dominantMood": "anxious" },
  "collection": "mood-portraits"
}
```

---

## 3. Media Retrieval

**`GET /api/v1/media/:mediaId`**

**Headers:**
```
Authorization: Bearer {service_token}
X-Void-User: tl-m4abc123-xk9f2g7h    (optional, enforces user scoping)
```

**Response:**
```json
{
  "mediaId": "tv-media-42",
  "mediaType": "audio",
  "format": "webm",
  "url": "https://storage.googleapis.com/...?X-Goog-Signature=...",
  "cdnUrl": "https://trustvault.replit.app/objects/ecosystem/the-void/tl-.../uuid.webm",
  "metadata": {
    "source": "vent",
    "title": "Vent Session #1234",
    "description": "Source: vent",
    "tags": ["vent", "smart-ass"]
  },
  "sizeBytes": 102400,
  "createdAt": "2026-02-21T10:00:00.000Z"
}
```

**URL Options:**
- `url` — **Signed temporary URL** (1-hour expiry, recommended for playback)
- `cdnUrl` — Proxy URL through TrustVault's object server (permanent, requires TrustVault to be reachable)

---

## 4. Media Deletion

**`DELETE /api/v1/media/:mediaId`**

**Headers:**
```
Authorization: Bearer {service_token}
X-Void-User: tl-m4abc123-xk9f2g7h    (optional, enforces user scoping)
```

**Response:**
```json
{
  "success": true,
  "deleted": "tv-media-42"
}
```

Deletes both the Object Storage file and the database record. Also removes from any collections.

---

## 5. Batch Retrieval (User Library)

**`GET /api/v1/media/user/:trustLayerId`**

**Query Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `source` | string | — | Filter by source label: `vent`, `voice-journal`, `void-echo`, `mood-portrait` |
| `limit` | number | 20 | Max items per page (max 100) |
| `offset` | number | 0 | Pagination offset |
| `sort` | string | `newest` | `newest` or `oldest` |

**Response:**
```json
{
  "items": [
    {
      "mediaId": "tv-media-42",
      "mediaType": "audio",
      "format": "webm",
      "url": "https://trustvault.replit.app/objects/ecosystem/the-void/tl-.../uuid.webm",
      "metadata": { "source": "vent", "title": "Vent #1234", "tags": ["vent"] },
      "sizeBytes": 102400,
      "createdAt": "2026-02-21T10:00:00.000Z"
    }
  ],
  "total": 47,
  "hasMore": true
}
```

---

## 6. Health Check

**`GET /api/v1/health`**

No auth required. Returns service status:
```json
{
  "status": "ok",
  "service": "TrustVault V1 API",
  "version": "1.0.0",
  "timestamp": "2026-02-21T10:00:00.000Z"
}
```

---

## Identity Mapping

| THE VOID Field | TrustVault Storage |
|---|---|
| `trustLayerId` | Tenant ID format: `v1:the-void:{trustLayerId}` — full isolation per user per service |
| `voidId` | Stored in request body, not used for scoping |
| `userId` (internal int) | Never stored or referenced |

Media ownership is scoped as `v1:{serviceId}:{trustLayerId}`. This ensures:
- THE VOID can only access media it uploaded
- Each TrustLayer user's media is isolated
- No cross-service or cross-user access

---

## Security

1. **Service API Key** — Used only to obtain a JWT. Never sent on data calls.
2. **JWT Bearer Tokens** — 1-hour expiry, scoped to service + permissions.
3. **User Scoping** — `X-Void-User` header enforces per-user access. Without it, the service can access all its own media.
4. **Encryption at Rest** — Object Storage uses Google Cloud Storage encryption (AES-256).
5. **Rate Limiting** — 120 requests/minute per service. Rate limit headers included on all responses.

---

## Rate Limits

| Limit | Value |
|---|---|
| Requests per minute | 120 |
| Max upload size | 10MB |
| Token expiry | 1 hour |

Rate limit headers on every response:
- `X-RateLimit-Limit: 120`
- `X-RateLimit-Remaining: {n}`
- `Retry-After: {seconds}` (only on 429)

---

## 7. Media Flagging

**`POST /api/v1/media/:mediaId/flag`**

Flag media for moderation or content policy review. Triggers a `media.flagged` webhook to the owning service.

**Request:**
```json
{
  "reason": "inappropriate",
  "details": "User-reported content violation"
}
```

**Response:**
```json
{
  "success": true,
  "flagged": "tv-media-42",
  "reason": "inappropriate"
}
```

---

## Webhook Events — LIVE

TrustVault actively dispatches webhooks to `https://intothevoid.replit.app/api/trustvault/webhook` with 3 retries and exponential backoff.

### Supported Events

| Event | Trigger | Status |
|---|---|---|
| `media.deleted` | Media item deleted via API | Live |
| `media.flagged` | Media flagged via `/flag` endpoint | Live |
| `service.quota_warning` | Storage quota approaching limit | Planned |

### Webhook Payload

```json
{
  "event": "media.deleted",
  "mediaId": "tv-media-42",
  "userId": "tl-m4abc123-xk9f2g7h",
  "serviceId": "the-void",
  "timestamp": "2026-02-21T10:00:00.000Z"
}
```

For `media.flagged`, the payload includes additional data:
```json
{
  "event": "media.flagged",
  "mediaId": "tv-media-42",
  "userId": "tl-m4abc123-xk9f2g7h",
  "serviceId": "the-void",
  "timestamp": "2026-02-21T10:00:00.000Z",
  "data": {
    "reason": "inappropriate",
    "details": "User-reported content violation"
  }
}
```

### Webhook Security

Every webhook POST includes these headers for verification:

| Header | Description |
|---|---|
| `X-TrustVault-Signature` | HMAC-SHA256 signature of the request body, signed with your API secret |
| `X-TrustVault-Event` | Event type (e.g., `media.deleted`) |
| `X-TrustVault-Timestamp` | ISO 8601 timestamp of the event |
| `User-Agent` | `TrustVault/1.0` |

**Verification on THE VOID's side:**
```javascript
import crypto from "crypto";

function verifyWebhook(body, signature, secret) {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// In your Express route:
app.post("/api/trustvault/webhook", (req, res) => {
  const signature = req.headers["x-trustvault-signature"];
  const rawBody = JSON.stringify(req.body);
  
  if (!verifyWebhook(rawBody, signature, process.env.TRUSTVAULT_API_SECRET)) {
    return res.status(401).json({ error: "Invalid signature" });
  }
  
  const { event, mediaId, userId } = req.body;
  // Handle event...
  
  res.json({ received: true });
});
```

**Your API Secret** (store as `TRUSTVAULT_API_SECRET`):
`6501933226dbc1d7c2b9952ff6f1d83d07d51d0b2d7832f9f267cc922cff70ed`

### Delivery Behavior

- **Retries:** 3 attempts with exponential backoff (1s, 2s, 3s)
- **Timeout:** 10 seconds per attempt
- **Non-blocking:** Webhook failures do not affect the API response — deletions and flags succeed regardless of webhook delivery
- **Idempotent:** Design your handler to safely process duplicate events

---

## Migration Guide for THE VOID

1. Store `TRUSTVAULT_API_KEY=dw_0fb4a28916a412c11ec57a3e61311c74` in your secrets
2. On each vent/journal/capsule creation, POST base64 to `/api/v1/media/upload`
3. Store the returned `mediaId` string (e.g., `tv-media-42`) in your database column
4. For playback, GET `/api/v1/media/{mediaId}` and use the signed `url`
5. Background migration: iterate existing base64 rows, upload each to TrustVault, replace column value with `mediaId`

---

## Error Codes

| Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID_REQUEST` | Missing or invalid fields |
| 401 | `TOKEN_EXPIRED` | JWT expired — re-authenticate |
| 401 | `INVALID_TOKEN` | Bad or missing bearer token |
| 403 | `ACCESS_DENIED` | Media belongs to different service/user |
| 404 | `NOT_FOUND` | Media ID doesn't exist |
| 413 | `FILE_TOO_LARGE` | Exceeds 10MB limit |
| 429 | `RATE_LIMITED` | Too many requests — check `Retry-After` |

---

## Contact

**TrustVault Base URL:** `https://trustvault.replit.app`
**V1 API Base:** `https://trustvault.replit.app/api/v1`
**Health Check:** `https://trustvault.replit.app/api/v1/health`
