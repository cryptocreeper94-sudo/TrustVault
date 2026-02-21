# TrustVault API Integration Handoff

**From:** THE VOID (intothevoid.replit.app)
**To:** TrustVault Agent (trustvault.replit.app)
**Date:** February 21, 2026
**Priority:** High

---

## What THE VOID Needs

THE VOID is a voice-first venting and wellness platform in the DarkWave ecosystem. We store significant media assets (audio recordings, AI-generated SVG art, time-capsule voice messages) directly in PostgreSQL as base64 text columns. This is unsustainable at scale. We want to offload all media storage to TrustVault as the ecosystem's dedicated encrypted media vault.

Both apps already share TrustLayer SSO (`tl-{id}` identity format) and Signal Chat. This integration would deepen the ecosystem connection.

---

## Required API Endpoints

### 1. Authentication / Handshake

**`POST /api/v1/auth/service-token`**

THE VOID needs to authenticate as a trusted ecosystem service, not as an individual user. We propose a service-to-service API key model.

Request:
```json
{
  "serviceId": "the-void",
  "apiKey": "TRUSTVAULT_API_KEY",
  "scope": ["media:write", "media:read", "media:delete"]
}
```

Response:
```json
{
  "token": "eyJhbG...",
  "expiresIn": 3600
}
```

THE VOID will include this token as `Authorization: Bearer {token}` on all subsequent calls.

---

### 2. Media Upload

**`POST /api/v1/media/upload`**

THE VOID needs to upload three types of media:

| Media Type | Format | Typical Size | Frequency |
|---|---|---|---|
| Vent audio recordings | base64 WAV/WebM | 50KB–2MB | Every vent session |
| Voice journal recordings | base64 WAV/WebM | 50KB–2MB | Per journal entry |
| Void Echo (time capsule) audio | base64 WAV/WebM | 50KB–2MB | Per capsule creation |

Request:
```json
{
  "userId": "tl-m4abc123-xk9f2g7h",
  "voidId": "V-A7K2M9X4",
  "mediaType": "audio",
  "format": "webm",
  "encoding": "base64",
  "data": "<base64_string>",
  "metadata": {
    "source": "vent|voice-journal|void-echo",
    "ventId": 1234,
    "personality": "smart-ass",
    "duration": 45.2,
    "encrypted": true
  },
  "collection": "vents",
  "tags": ["vent", "smart-ass", "2026-02-21"]
}
```

Response:
```json
{
  "success": true,
  "mediaId": "tv-media-abc123",
  "url": "https://trustvault.replit.app/api/v1/media/tv-media-abc123",
  "thumbnailUrl": null,
  "sizeBytes": 102400,
  "storedAt": "2026-02-21T10:00:00Z"
}
```

THE VOID will store the returned `mediaId` in its database instead of the raw base64, and use the `url` for playback.

---

### 3. Media Retrieval

**`GET /api/v1/media/:mediaId`**

Request Headers:
```
Authorization: Bearer {service_token}
X-Void-User: tl-m4abc123-xk9f2g7h
```

Response:
```json
{
  "mediaId": "tv-media-abc123",
  "mediaType": "audio",
  "format": "webm",
  "url": "https://trustvault.replit.app/cdn/tv-media-abc123.webm",
  "metadata": {
    "source": "vent",
    "ventId": 1234,
    "personality": "smart-ass"
  },
  "createdAt": "2026-02-21T10:00:00Z"
}
```

We need either:
- A direct CDN URL for streaming playback (preferred), OR
- A signed temporary URL (expires in 1hr) for secure playback

---

### 4. Media Deletion

**`DELETE /api/v1/media/:mediaId`**

When a user deletes a vent, journal entry, or void echo from THE VOID, we need to cascade-delete the associated media from TrustVault.

Request Headers:
```
Authorization: Bearer {service_token}
X-Void-User: tl-m4abc123-xk9f2g7h
```

Response:
```json
{
  "success": true,
  "deleted": "tv-media-abc123"
}
```

---

### 5. Batch Retrieval (User Library)

**`GET /api/v1/media/user/:trustLayerId`**

THE VOID's Vent Library page needs to fetch all media for a user, filtered by source type.

Query Parameters:
- `source`: `vent|voice-journal|void-echo` (filter by origin)
- `limit`: number (default 20)
- `offset`: number (pagination)
- `sort`: `newest|oldest`

Response:
```json
{
  "items": [
    {
      "mediaId": "tv-media-abc123",
      "mediaType": "audio",
      "format": "webm",
      "url": "https://trustvault.replit.app/cdn/tv-media-abc123.webm",
      "metadata": { "source": "vent", "ventId": 1234, "personality": "smart-ass" },
      "sizeBytes": 102400,
      "createdAt": "2026-02-21T10:00:00Z"
    }
  ],
  "total": 47,
  "hasMore": true
}
```

---

### 6. SVG/Image Storage (Mood Portraits)

**`POST /api/v1/media/upload`** (same endpoint, different mediaType)

Living Mood Portraits are AI-generated SVG art. We need to store these as images.

```json
{
  "userId": "tl-m4abc123-xk9f2g7h",
  "voidId": "V-A7K2M9X4",
  "mediaType": "image",
  "format": "svg",
  "encoding": "utf-8",
  "data": "<svg>...</svg>",
  "metadata": {
    "source": "mood-portrait",
    "dominantMood": "anxious",
    "colorPalette": ["#06b6d4", "#8b5cf6", "#ec4899"],
    "dataPoints": 12
  },
  "collection": "mood-portraits"
}
```

---

## Identity Mapping

Both apps use TrustLayer SSO. Identity linking should work like this:

| THE VOID Field | TrustVault Mapping |
|---|---|
| `trustLayerId` (e.g. `tl-m4abc123-xk9f2g7h`) | Primary user identifier for all media ownership |
| `voidId` (e.g. `V-A7K2M9X4`) | Secondary tag for premium user media; enables cross-app recognition |
| `userId` (internal integer) | NOT shared — TrustVault should never need this |

THE VOID's JWT tokens already include `trustLayerId` and `voidId` in the payload (issued by `trust-layer-sso` issuer). TrustVault can verify these tokens if both apps share the same JWT secret, or TrustVault can accept them as claims and validate against its own user records.

---

## Security Requirements

1. **Service API Key**: THE VOID needs a `TRUSTVAULT_API_KEY` secret to authenticate server-to-server. No client-side calls — all media flows through THE VOID's Express backend.
2. **User Scoping**: A service token should only access media belonging to the `X-Void-User` specified. No cross-user access.
3. **Encryption**: All media should remain encrypted at rest (TrustVault already advertises 256-bit encryption).
4. **Rate Limiting**: We expect ~100-500 uploads/day initially. Please advise on rate limits.

---

## Migration Plan

THE VOID currently stores the following in PostgreSQL `text` columns as base64:

| Table | Column | Media Type | Est. Records |
|---|---|---|---|
| `vents` | `audio_url` | vent audio | Growing daily |
| `voice_journal_entries` | `audio_data` | journal audio | Growing daily |
| `void_echoes` | `audio_data` | time capsule audio | Growing daily |
| `mood_portraits` | `svg_data` | SVG art | Growing daily |

Once the API is live, THE VOID will:
1. Start writing new media to TrustVault, storing the returned `mediaId` in the database column instead of base64
2. Run a background migration to upload existing base64 data to TrustVault and replace column values with `mediaId` references
3. Keep the column types as `text` (mediaId strings replace base64 strings — no schema change needed)

---

## What We Need Back

1. The API endpoints above (or your proposed alternative structure)
2. A `TRUSTVAULT_API_KEY` for THE VOID to authenticate
3. Confirmation on CDN URL structure for audio playback (direct stream vs signed URLs)
4. Rate limit guidance
5. Any webhook support — e.g., notify THE VOID if media is flagged or deleted on TrustVault's side

---

## Contact

This integration is between two DarkWave Studios apps. Both share TrustLayer SSO and Signal Chat infrastructure. The goal is making TrustVault the single source of truth for all media across the ecosystem.

**THE VOID Base URL:** `https://intothevoid.replit.app`
**TrustVault Base URL:** `https://trustvault.replit.app`
