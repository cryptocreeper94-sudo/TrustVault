# TrustVault — Integration Handoff to TrustBook

**Date:** February 26, 2026
**From:** TrustVault / DW Media Studio (by Dark Wave Studios)
**To:** TrustBook (ePub Publisher Platform)
**Purpose:** ePub storage, media asset sharing, and cross-platform publishing integration

---

## Service Overview

TrustVault is the universal IP storage and creative platform within the DarkWave Trust Layer ecosystem. It provides secure multi-tenant media vault storage, professional editing tools (image, audio, video, merge), AI-powered creative features, an in-app ePub reader, and ecosystem-wide media access via API.

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

---

## API Base URL

```
https://trustvault.replit.app/api/studio
```

---

## TrustBook Credentials

| Field | Value |
|---|---|
| Tenant ID | `trustbook` |
| App Name | `TrustBook` |
| API Key | `dw_8f408c9e34765316d7aa7623dbbf437f` |
| API Secret | `f791fac3afd4087319505670280e52f4ce2e6fb0addb0b31271a76729b0f6891` |
| Webhook URL | `https://trustbook.replit.app/api/trustvault/webhook` |
| CORS Origin | `https://trustbook.replit.app` |
| Capabilities | `media_vault`, `media_upload`, `media_read`, `media_delete`, `document_storage`, `epub_storage` |

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
  - file: The file to upload (ePub, cover image, audiobook, etc.)
  - title: Display title
  - description: Optional description
  - tags: Comma-separated tags (e.g., "ebook,fiction,scifi")
```

**Supported file types for TrustBook integration:**
- `.epub` (application/epub+zip) — ePub ebooks
- Images (cover art, illustrations)
- Audio (audiobook chapters, narration)
- PDF (print-ready manuscripts)
- Documents (manuscripts, drafts)

### 3. List Media (JWT Required)

```
GET /api/studio/media
GET /api/studio/media?category=document
```

Returns all media for the authenticated user's tenant. Filter by category to get documents/ePubs only.

### 4. Get Single Item (JWT Required)

```
GET /api/studio/media/:id
```

### 5. Delete Media (JWT Required)

```
DELETE /api/studio/media/:id
```

### 6. Webhook — Receive Notifications

TrustVault will POST to `https://trustbook.replit.app/api/trustvault/webhook` when:
- A user uploads a new ePub or document
- Media is edited or deleted
- Subscription tier changes (affects storage limits)

**Webhook payload:**
```json
{
  "event": "media.uploaded",
  "tenantId": "trustbook",
  "data": {
    "id": 123,
    "title": "My Novel",
    "category": "document",
    "contentType": "application/epub+zip",
    "filename": "my-novel.epub",
    "size": 1048576,
    "tags": ["ebook", "fiction"]
  }
}
```

---

## Integration Use Cases

### 1. Publish to Vault
Authors finish writing/publishing in TrustBook and push the final ePub to their TrustVault for safe storage and reading.

```
POST /api/studio/upload
Authorization: Bearer <sso-token>

FormData:
  file: [final.epub]
  title: "My Novel - Final Edition"
  tags: "ebook,published,fiction"
```

### 2. Pull Cover Art from Vault
TrustBook needs cover images. Authors can store their artwork in TrustVault and pull it into TrustBook.

```
GET /api/studio/media?category=image
Authorization: Bearer <sso-token>
```

### 3. Audiobook Asset Storage
Narration audio files stored in TrustVault can be pulled into TrustBook for audiobook packaging.

```
GET /api/studio/media?category=audio
Authorization: Bearer <sso-token>
```

### 4. Cross-App Reading
ePubs stored via TrustBook are readable in TrustVault's built-in ePub reader with dark theme, pagination, and keyboard navigation.

---

## HMAC Webhook Verification

If TrustBook wants to verify webhook authenticity:

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

## Rate Limits

- **60 requests per minute** per tenant
- Rate limit headers included in responses: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## ePub Reader Features in TrustVault

When ePubs are stored in TrustVault, users get:
- In-app dark-themed ePub reader
- Paginated reading with prev/next navigation
- Keyboard navigation (left/right arrow keys)
- Page counter display
- Mobile-responsive layout
- Download fallback if rendering fails

---

## Support

**Customer Service:** Team@dwsc.io
**Ecosystem:** Trust Layer / Dark Wave Studios
**Widget:** `https://dwsc.io/api/ecosystem/directory.js`
