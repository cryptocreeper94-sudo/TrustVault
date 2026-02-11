# Master Roadmap — DW Media Studio / TrustVault

**Project**: DW Media Studio (TrustVault) — Universal IP Storage & Media Platform
**Parent Ecosystem**: TrustLayer / Dark Wave Studios (darkwavestudios.io)
**Blockchain Layer**: Layer One blockchain (TrustLayer)
**Target Platform (Future)**: React Native + Expo (standalone native app)
**Date Created**: February 8, 2026
**Last Updated**: February 11, 2026

---

## COMPLETED — What's Built & Working

### Core Platform
- [x] Full-stack React + Express + PostgreSQL web application
- [x] PWA with web app manifest, service worker, splash screen, offline caching
- [x] Dark-themed premium UI with Tailwind CSS, Framer Motion animations
- [x] Custom fonts (Outfit, Plus Jakarta Sans), glassmorphism, micro-interactions
- [x] SEO meta tags, Open Graph tags, and Helmet across all pages

### Multi-Tenant Authentication
- [x] Multi-user password-based authentication (bcrypt, express-session, PostgreSQL session store)
- [x] Password policy enforcement (8+ chars, 1 uppercase, 1 special character)
- [x] Family member accounts auto-seeded on server startup (Jason, Madeline, Natalie, Avery, Jennifer, Will, Carley)
- [x] Family account claim flow ("First time? Set up your account" on login + /join page)
- [x] Developer access mode with PIN entry (0424) for Jason's quick admin login
- [x] 30-day session persistence toggle with privacy disclaimer
- [x] Admin role with master access to all tenant spaces
- [x] Tenant isolation — each user has their own private media vault

### Invite System & Onboarding
- [x] Developer Portal (/admin) for managing invites and users
- [x] Personalized invite codes — admin can set custom codes (e.g., "NATALIE-24") or auto-generate
- [x] One-time-use invite codes — marked as used after account creation
- [x] Join page (/join) supports both invite-code signups and family claim flow
- [x] Warm family welcome message on Join page with personal note from Dad
- [x] Copy invite link button for easy sharing
- [x] Full tenant auto-provisioning — new users get their own private vault space instantly

### Media Management
- [x] Upload any media type (video, audio, images, documents) via Replit Object Storage
- [x] Presigned URL upload flow (Uppy + AWS S3 plugin)
- [x] Category auto-detection from content type
- [x] Grid view and timeline view with toggle
- [x] Search, filter by category, sort by date/name/size
- [x] Date range filtering
- [x] Favorites system
- [x] Tags, labels, and metadata (artist, venue, tour, event date)
- [x] Bulk selection with batch actions (favorite, tag, delete)
- [x] Collections system for organizing media into groups
- [x] Multi-format modal media viewer (video, audio, image, document preview)
- [x] Ambient mode for immersive media viewing
- [x] Now Playing bar for audio with playlist support

### Media Editors
- [x] **Image Editor**: Crop, rotate, flip, resize, preset filters, brightness/contrast/saturation/blur/hue/temperature/vignette/sharpen adjustments, text overlays (draggable, font/size/color/bold), freehand drawing & annotation (brush/eraser/color/thickness), stickers & shapes (10 shapes, draggable, scalable, colored), save as new
- [x] **Audio Editor**: Trim with start/end points, fade in/out, volume adjustment, playback speed, full transport controls, EQ (bass/mid/treble biquad filters), reverb (convolver with dry/wet mix), noise gate (dynamics compressor), offline rendering for export, save as new
- [x] **Video Editor**: Trim, brightness/contrast/saturation/hue/temperature/vignette adjustments, frame capture (grab still images from video) with full grading applied, save as new
- [x] **Merge/Combine Editor**: Image collages, audio concatenation, video concatenation

### Stripe Subscription System
- [x] 4-tier pricing: Free / Personal ($5.99/mo) / Pro ($12.99/mo) / Studio ($24.99/mo)
- [x] Pricing page with monthly/annual toggle and feature comparison
- [x] Stripe Checkout integration for payments
- [x] Stripe Customer Portal for subscription management
- [x] Webhook handling (checkout, subscription updates, cancellations, failed payments)
- [x] Auto-provisioning of tenant spaces for new subscribers

### Spinny AI Agent
- [x] Vinyl record mascot with floating side tab
- [x] Full chat panel powered by OpenAI (gpt-5.1) with streaming SSE responses
- [x] Tenant-scoped conversations with media vault context awareness
- [x] Voice output via ElevenLabs TTS (Sarah voice) with OpenAI fallback (nova voice)
- [x] Auto-speak toggle and per-message speak buttons

### Signal Chat
- [x] Real-time ecosystem-wide chat system at /chat
- [x] JWT-authenticated via TrustLayer SSO
- [x] Channel-based messaging with WebSocket real-time delivery
- [x] 6 default channels: general, announcements, darkwavestudios-support, garagebot-support, tlid-marketing, guardian-ai
- [x] Typing indicators and user presence tracking (online count)
- [x] Reply threading
- [x] User join/leave notifications per channel

### TrustLayer SSO
- [x] Cross-app single sign-on via shared JWT_SECRET (HS256, 7-day expiry)
- [x] Trust Layer ID generation (tl-{base36-timestamp}-{random-8-chars})
- [x] Auth endpoints: register, login, me
- [x] Bridge endpoint to create chat_users from existing TrustVault session users

### AI-Driven Blog System
- [x] Full blog platform with public listing and individual post pages
- [x] Admin interface for creating/editing/publishing posts
- [x] AI content generation via OpenAI
- [x] SEO-optimized with meta descriptions, Open Graph tags
- [x] Cover images, excerpts, slug-based URLs

### Ecosystem Integrations
- [x] **ORBIT Financial Hub**: Registered as dw_app_trustvault with 100% Jason royalty split. Connection status, financial statements, transaction reporting, webhook receiver with HMAC verification
- [x] **DarkWave Studios API**: JWT Bearer auth, CORS-whitelisted, rate-limited (60 req/min). Media management, project/render system, editor embed tokens, webhook callbacks
- [x] **Ecosystem API (TrustHome)**: Inter-service API with HMAC auth, tenant scoping, project management, webhook callbacks with retry

### Community Voice (Feature Voting)
- [x] Public feature request/voting system at /roadmap
- [x] Category filtering, vote tracking per tenant
- [x] Admin controls for status updates and notes

### Vault Enhancements (Feb 10-11, 2026)
- [x] Storage usage dashboard with tier-based limits and progress bar
- [x] Media stats panel (counts by category: video, audio, image, document)
- [x] Recently added carousel (horizontal scroll of last 8 uploads)
- [x] Activity feed with real-time logging (uploads, deletes, shares, collection actions)
- [x] Download button on media cards
- [x] Shared collections — share collections with family members using real tenant UUIDs from /api/family-members endpoint
- [x] Nested collections with parent/child hierarchy, breadcrumb navigation, parent folder selector in create dialog
- [x] Collection reordering (drag/sort order support)

---

## PLANNED — Next Up

### Phase Next: Media Sharing & Social Features
- [x] **Shared Folders & Collections** — Family members can create shared collections that multiple tenants can access and contribute to *(DONE — Feb 11, 2026)*
- [ ] **Media Sharing** — Share individual media items with specific family members or friends
- [ ] **Collaborative Playlists** — Shared playlists (especially for audio/music) that multiple users can add to
- [ ] **Shared Upload Folders** — Drop zones where everyone in a group can contribute photos, videos, or music
- [ ] **Integration with Signal Chat** — Share media directly through chat conversations

### Phase Next: Signal Chat Enhancements
- [ ] **Online Member List with Name Indicators** — Show who's online by name with green dot indicators (Discord-style member sidebar)
- [ ] **Per-channel member list** — See who's in each channel
- [ ] **Browser push notifications** — Get notified when someone sends a message while you're away
- [ ] **Direct messages** — Private 1:1 messaging between users
- [ ] **Media sharing in chat** — Send images, videos, audio directly in conversations

### Phase Next: Advanced Media Editing
- [ ] **Background Removal (AI-powered)** — Remove backgrounds from images for product photos, thumbnails, design work
- [x] **Text Overlays** — Add text, titles, captions, watermarks to images *(DONE — Feb 11, 2026)*
- [x] **Drawing & Annotation Tools** — Draw, highlight, annotate on images *(DONE — Feb 11, 2026)*
- [x] **Stickers & Graphics** — Add pre-built design elements (star, heart, arrow, circle, triangle, diamond, checkmark, x-mark, lightning) to images *(DONE — Feb 11, 2026)*
- [x] **Advanced Color Grading** — Professional color correction for photos and video (hue, temperature, vignette, sharpen) *(DONE — Feb 11, 2026)*
- [x] **Audio Effects** — Reverb, EQ (bass/mid/treble), noise gate/reduction *(DONE — Feb 11, 2026)*
- [ ] **Video Transitions** — Add transition effects between clips when merging
- [ ] **Template System** — Pre-built templates for social media posts, thumbnails, covers

---

## FUTURE PHASES

### Phase: Signal Chat as Standalone Platform
- [ ] Spin Signal Chat into its own standalone app/domain (Telegram/Discord-style)
- [ ] Shared TrustLayer SSO for seamless cross-app identity
- [ ] Server/community creation (like Discord servers)
- [ ] Voice channels and audio rooms
- [ ] Bot framework for automated interactions
- [ ] File sharing and media embedding
- [ ] Moderation tools (roles, permissions, content filtering)
- [ ] Mobile push notifications
- [ ] Foundation for the broader social network

### Phase: Website Builder Integration
- [ ] Squarespace-style website builder for non-technical users
- [ ] Media vault as the asset library for website content
- [ ] Drag-and-drop page building
- [ ] Template marketplace
- [ ] Editor tools integrated directly (crop, resize, background removal for product photos)
- [ ] Custom domain support
- [ ] E-commerce capabilities

### Phase: TrustLayer Blockchain Integration
- [ ] Connect authentication to TrustLayer identity layer
- [ ] On-chain identity verification for vault access
- [ ] Trust-gated sharing: access based on trust scores or verified relationships
- [ ] Media provenance: on-chain proof of ownership/origination
- [ ] Immutable creation timestamps for IP disputes
- [ ] Content licensing framework tied to blockchain provenance
- [ ] Integration with Dark Wave Studios ecosystem (shared navigation, unified identity)

### Phase: React Native + Expo (Standalone Native App)
- [ ] Port frontend to React Native + Expo
- [ ] Native video/photo capture and upload (direct from phone camera)
- [ ] Offline viewing / downloaded favorites
- [ ] Push notifications (new shared content, messages, trust requests)
- [ ] Native media player with gesture controls
- [ ] App Store and Google Play deployment
- [ ] Consistent UI/UX standards from web version

### Phase: Platform & Marketplace
- [ ] Creator monetization (pay-per-view, subscription galleries)
- [ ] Concert/event community features (organize clips by artist, venue, tour)
- [ ] Small venue / indie artist tools (private galleries as digital merch)
- [ ] Event keepsakes (weddings, graduations, reunions with private access)
- [ ] Content licensing framework
- [ ] API marketplace for third-party integrations

---

## Ecosystem Context

### TrustLayer (Master Brand)
- The overarching brand and ecosystem for everything
- Full ecosystem centered on trust-based engagement between people and businesses
- A trust-verified, secure blockchain network of businesses and individuals
- Core philosophy: People who accept responsibility for their own actions, who don't depend on others to make things happen — they do it themselves
- Built to have real use and real value — not vaporware
- Founded on direct experience in the blockchain/crypto space and the determination to build something viable, legitimate, and helpful

### Dark Wave Studios (darkwavestudios.io)
- Architectural arm of the Layer One blockchain
- Product development and engineering hub
- Where this media vault product (and others) are built and maintained

### TrustShield (trustshield.tech)
- Security arm of the ecosystem
- Handles the security infrastructure, verification, and protection layers
- Ensures the network remains trust-verified and secure

### Signal (Native Asset)
- The native asset of the TrustLayer ecosystem
- NOT a cryptocurrency, NOT a coin, NOT a token — it is an **asset**
- Represents something intentional and meaningful: the signal from the ether, from the creator — not the noise and confusion of cultural engineering
- Currently in early, quiet soft presale phase
- Launch timing still being determined

### Ecosystem Structure
```
TrustLayer (Master Brand / Ecosystem)
├── Dark Wave Studios (darkwavestudios.io) — Architecture & Product Development
├── TrustShield (trustshield.tech) — Security & Verification
├── Signal — Native Asset
├── DW Media Studio / TrustVault — Trust-Gated IP Storage & Media Platform
├── Signal Chat — Ecosystem Communication Platform (evolving to standalone)
├── ORBIT Staffing OS — Financial Hub & Operations
└── [Future products aligned to verticals]
```

---

## Industry Verticals & Stakeholder Map

Every digital file that could be considered intellectual property — video, audio, visual art, documents — touches a web of people, companies, and industries. This product sits at the center of all of them.

### 1. Live Music & Concerts
- Fans / Attendees, Artists / Performers, Touring Crews, Tour Managers, Venues, Promoters, Ticketing Platforms

### 2. Music Production & Recording
- Producers / Engineers, Studios, Session Musicians, Songwriters, Labels / Distributors, Music Publishers

### 3. Film, Video & Visual Production
- Filmmakers / Directors, Cinematographers, Editors, VFX Studios, Production Companies, Actors / Talent

### 4. Photography & Visual Art
- Photographers, Digital Artists, Galleries / Curators, Art Directors

### 5. Audio & Podcasting
- Podcasters, Voice Actors, Audiobook Publishers, Sound Designers, Radio / Broadcast

### 6. Education & Training
- Instructors / Coaches, Course Creators, Schools / Universities, Corporate Training

### 7. Legal & Intellectual Property
- IP Attorneys, Rights Management, Copyright Registrars, Dispute Resolution

### 8. Sports & Athletics
- Athletes, Coaches / Teams, Sports Agencies, Fans

### 9. Corporate & Business
- Businesses, Marketing / Ad Agencies, PR Firms, Real Estate, Construction / Architecture

### 10. Personal & Family
- Families (milestone vaults), Memorial / Legacy, Travel, Hobbyists / Creators

### 11. Platform & Infrastructure Partners
- Cloud Storage, CDN / Streaming, Blockchain / Web3, Payment Processors, App Stores, Device Manufacturers

### 12. Regulatory & Compliance
- Data Privacy (GDPR, CCPA), Content Moderation, Age Verification, Export Controls

---

## Core Value Proposition

**Any digital file that represents intellectual property needs a secure, immutable, trust-verified vault with provenance tracking — and the ability to showcase it when the creator chooses.**

### The Dual Nature: Vault + Showcase
1. A **vault** — where the raw work lives, protected, permanent, provable. Private by default. Immutable.
2. A **showcase** — where the finished work shines. A curated, professional presentation the creator controls. Public when they choose.

Most platforms force you to choose one or the other. This does both — and the creator controls the line between them.

---

## Founding Principles

- Build something with real utility — not speculative hype
- Trust is earned through personal responsibility and verified action
- Every product must serve people and have genuine value
- The ecosystem exists to help people, not extract from them
- Provenance, presence, and purpose drive every decision
