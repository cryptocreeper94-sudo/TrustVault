# Verdara (App #28) — Ecosystem Integration Handoff

## About This Document
Verdara is requesting integration with your service within the DarkWave Trust Layer ecosystem. Below you'll find what Verdara has already implemented, what it needs from your service, and a **Return Handoff Template** at the bottom for you to fill out and send back.

---

## What Verdara Already Has
- **Trust Layer SSO:** JWT-based authentication using shared `JWT_SECRET` (HS256). Users authenticate via `/api/chat/auth/login` and receive a JWT containing `userId`, `trustLayerId`, and `iss: "trust-layer-sso"`.
- **Trust Layer IDs:** Every user is assigned a Trust Layer ID in `tl-xxxx-xxxx` format, stored in `chat_users.trust_layer_id`.
- **Signal Chat:** Real-time WebSocket messaging (`/ws/chat`) with JWT-authenticated connections, channel-based messaging, typing indicators, and presence tracking.
- **Tech Stack:** React 18 + TypeScript frontend, Express.js + TypeScript backend, PostgreSQL with Drizzle ORM, hosted on Replit.
- **Existing Payment Integration:** Stripe Checkout for the wood economy marketplace.

---

## Integration Requests by Service

### 1. TrustShield (Vendor Verification)

**What Verdara needs:**
- Verify marketplace sellers/vendors and display trust badges on their listings and profiles.
- Query a vendor's verification status by their Trust Layer ID.
- Display badge tier (e.g., Verified, Premium, Enterprise) and verification date.

**How Verdara will use it:**
- On marketplace listing pages: show a TrustShield badge next to the seller name.
- On seller profile pages: display full verification details.
- During checkout: show verification status to increase buyer confidence.

**What we need from you (Return Handoff):**
- API base URL
- Authentication method (API key, JWT, or Trust Layer SSO token?)
- Endpoint to check vendor verification status (input: Trust Layer ID, output: badge tier, status, verification date)
- Endpoint to initiate vendor verification (if Verdara can trigger it)
- Any webhook for verification status changes
- Badge asset URLs or SVGs for each tier
- Rate limits

---

### 2. Signal (SIG) Payments

**What Verdara needs:**
- Accept Signal cryptocurrency as a payment method in the marketplace alongside Stripe.
- Display SIG price equivalents on product listings.
- Process SIG payments for marketplace purchases.

**How Verdara will use it:**
- Marketplace checkout: offer "Pay with Signal" as an alternative to credit card.
- Product listings: show price in both USD and SIG.
- Order history: display SIG transaction details.

**What we need from you (Return Handoff):**
- API base URL
- Authentication method
- Endpoint to get current SIG/USD exchange rate
- Endpoint to create a payment request (input: amount in USD or SIG, seller wallet, buyer Trust Layer ID)
- Endpoint to check payment status
- Webhook for payment confirmation/failure
- Any SDK or client library available?
- Rate limits

---

### 3. Trust Vault (Signal Wallet)

**What Verdara needs:**
- Display user's SIG wallet balance within Verdara.
- Initiate in-app purchases using wallet funds.
- Link a user's Trust Vault wallet to their Verdara account via Trust Layer ID.

**How Verdara will use it:**
- User profile/settings: show wallet balance.
- Marketplace checkout: "Pay from Trust Vault" option.
- AI identification services: pay with SIG credits from wallet.

**What we need from you (Return Handoff):**
- API base URL
- Authentication method (does the user's SSO JWT grant wallet access, or is a separate auth flow needed?)
- Endpoint to get wallet balance (input: Trust Layer ID)
- Endpoint to initiate a debit/transfer (input: Trust Layer ID, amount, description)
- Endpoint to check transaction history
- Webhook for balance changes or completed transactions
- Rate limits

---

### 4. GarageBot API

**What Verdara needs:**
- Pull in a user's motorized outdoor equipment (ATVs, boats, chainsaws, mowers, etc.) and their maintenance schedules.
- Display equipment status and upcoming maintenance within Verdara's trip planner and arborist modules.
- Optionally push new equipment entries from Verdara (e.g., arborist logging a new chainsaw).

**How Verdara will use it:**
- Trip Planner: show equipment readiness for planned trips (e.g., "Your boat is due for service before your fishing trip").
- Arborist Pro: link equipment to jobs, track maintenance.
- Command Center: surface maintenance alerts in the activity feed.

**What we need from you (Return Handoff):**
- API base URL
- Authentication method (Trust Layer SSO JWT, or separate API key?)
- Endpoint to list user's equipment (input: Trust Layer ID)
- Endpoint to get equipment details and maintenance schedule
- Endpoint to create/update equipment entries (if write access is available)
- Webhook for maintenance alerts or status changes
- Data model: what fields does an equipment record contain?
- Rate limits

---

### 5. DW-STAMP (Blockchain Certifications)

**What Verdara needs:**
- Issue blockchain-backed certifications when users complete activities (trail completions, species identifications, campground stays, etc.).
- Verify and display a user's earned stamps/certifications.
- Show stamp details (activity type, date, location, blockchain hash).

**How Verdara will use it:**
- After completing a trail or identifying a species via AI: trigger stamp issuance.
- User profile: display earned stamps as achievements.
- Catalog/trail detail pages: show "X users have earned this stamp."

**What we need from you (Return Handoff):**
- API base URL
- Authentication method
- Endpoint to issue a new stamp (input: Trust Layer ID, activity type, activity details, location, timestamp)
- Endpoint to list stamps for a user (input: Trust Layer ID)
- Endpoint to verify a stamp (input: stamp ID or blockchain hash)
- Supported activity types (or can Verdara define custom ones?)
- Webhook for stamp issuance confirmation
- Any asset URLs for stamp visuals?
- Rate limits

---

### 6. TLID Identity (.tlid Domains)

**What Verdara needs:**
- Resolve .tlid domain names to Trust Layer IDs and user profiles.
- Allow users to display their .tlid identity within Verdara (profile, chat, marketplace).
- Look up other users by .tlid handle.

**How Verdara will use it:**
- User profiles: display .tlid name alongside username.
- Signal Chat: @mention users by .tlid handle.
- Marketplace: show seller's .tlid identity for trust.

**What we need from you (Return Handoff):**
- API base URL
- Authentication method
- Endpoint to resolve a .tlid name to a Trust Layer ID
- Endpoint to get the .tlid name for a Trust Layer ID (reverse lookup)
- Endpoint to check .tlid availability (if registration is supported from Verdara)
- Data returned: display name, avatar, registration date, any other public profile fields?
- Rate limits

---

### 7. Credits System (Trust Layer Credits)

**What Verdara needs:**
- Check a user's credit balance.
- Deduct credits when users use AI identification services (species ID, plant ID).
- Display credit balance and usage history.

**How Verdara will use it:**
- AI Identification flow: check balance before processing, deduct credits on successful identification.
- User profile/settings: show credit balance and top-up option.
- Command Center: surface low-balance alerts.

**What we need from you (Return Handoff):**
- API base URL
- Authentication method
- Endpoint to check credit balance (input: Trust Layer ID)
- Endpoint to deduct credits (input: Trust Layer ID, amount, service description)
- Endpoint to view credit transaction history
- Credit cost per AI identification (or does Verdara set this?)
- Webhook for balance changes
- Is there a top-up/purchase flow, and does Verdara need to link to it or host it?
- Rate limits

---

### 8. VedaSolus (Wellness Hub)

**What Verdara needs:**
- Push wild edible and medicinal plant data from Verdara's foraging module to VedaSolus for wellness recommendations.
- Pull wellness recommendations related to plants a user has identified or favorited.
- Deep-link users from Verdara's plant pages to relevant VedaSolus content.

**How Verdara will use it:**
- Wild Edibles pages: "View wellness uses on VedaSolus" button with deep link.
- After plant identification: show VedaSolus wellness recommendations for that plant.
- User profile: link Verdara and VedaSolus accounts via Trust Layer ID.

**What we need from you (Return Handoff):**
- API base URL
- Authentication method
- Endpoint to push plant identification data (input: plant name, species, properties, Trust Layer ID)
- Endpoint to get wellness recommendations for a plant (input: plant name or species ID)
- Deep link URL format for specific plants or wellness pages
- Data model: what plant/wellness fields does VedaSolus use?
- Webhook for new wellness content related to plants in Verdara's catalog
- Rate limits

---

## Return Handoff Template

Please fill out and return to the Verdara team:

```
SERVICE NAME: [Your service name]
API BASE URL: [e.g., https://api.trustshield.darkwave.io/v1]
AUTHENTICATION METHOD: [API Key / Trust Layer SSO JWT / OAuth / Other]
API KEY (if applicable): [Will be stored as encrypted secret]

ENDPOINTS:
- [Method] [Path] — [Description]
  - Input: [Parameters]
  - Output: [Response format]
  - Example request:
  - Example response:

- [Method] [Path] — [Description]
  - Input: [Parameters]
  - Output: [Response format]
  - Example request:
  - Example response:

WEBHOOKS (if any):
- [Event name] — [Description]
  - Payload format:
  - Delivery: [POST to configured URL]

RATE LIMITS: [e.g., 100 requests/minute]

SDK/CLIENT LIBRARY: [URL or npm package name, if available]

ADDITIONAL NOTES:
[Any special requirements, sandbox/test credentials, or gotchas]
```

---

## Contact
**App:** Verdara (App #28)
**Stack:** React + Express + PostgreSQL on Replit
**SSO:** Trust Layer JWT (HS256, shared JWT_SECRET)
**Trust Layer ID format:** tl-xxxx-xxxx
