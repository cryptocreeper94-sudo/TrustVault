# TrustVault by Dark Wave Studios
### Universal IP Storage & Creative Media Platform

---

## Product Overview

TrustVault is a full-stack, multi-tenant digital media vault and creative studio built for families, creators, and teams. It provides secure cloud storage, professional-grade media editing, AI-powered creative tools, and ecosystem connectivity — all wrapped in a premium, dark-themed UI designed for desktop and mobile.

Part of the **Dark Wave Studios** ecosystem (darkwavestudios.io), TrustVault is a foundational application within the **TrustLayer** trust-based engagement platform, with architecture designed for future blockchain identity integration and native mobile deployment.

---

## By the Numbers

| Metric | Value |
|---|---|
| **Total Lines of Code** | 49,028 |
| **Frontend (React/TypeScript)** | 37,281 LOC |
| **Backend (Express/Node.js)** | 10,757 LOC |
| **Shared Schemas & Contracts** | 990 LOC |
| **Source Files** | 177 |
| **Pages** | 31 |
| **Components** | 30 |
| **API Endpoints** | 162 |
| **Database Tables** | 30 |
| **NPM Dependencies** | 84 production, 23 dev |

---

## Marketing Description

**TrustVault — Your Creative Vault. Your Rules.**

Stop scattering your photos, videos, music, and documents across a dozen apps. TrustVault is the all-in-one media vault and creative studio that keeps everything you create safely organized, beautifully displayed, and ready to edit — from any device.

Upload anything. Edit everything. Professional image, audio, and video editors are built right in — with AI-powered tools that auto-tag your uploads, remove backgrounds, generate captions, and even learn your personal aesthetic. Add text overlays to your videos with 7 animation effects, watermark your images, pick colors with an eyedropper, manage layers like the pros, and undo anything with a visual history timeline. Choose from 25 Google Fonts for text in both the image and video editors.

Combine media into collages, audio compilations, and video montages with 17 cinematic transition effects. Batch export your work in any format — resized for Instagram, Twitter, YouTube, or whatever platform you need.

Every family member gets their own private vault with PIN-secured access. Upgrade to unlock more storage, unlimited AI credits, and API access for your own apps. TrustVault is part of the Dark Wave Studios ecosystem — built on trust, designed for creators who demand more.

**Available tiers: Free · Personal · Pro · Studio**

---

## Complete Feature List

### Core Platform
- Multi-tenant architecture with PIN-based family accounts
- Private vault per user with tenant isolation
- Dual authentication: custom password/PIN + TrustLayer SSO (JWT)
- 4-tier subscription system: Free, Personal ($9.99/mo), Pro ($19.99/mo), Studio ($49.99/mo)
- Stripe integration with Checkout, Customer Portal, and webhook handling
- Annual billing discounts
- Progressive Web App (PWA) with offline support
- Mobile-optimized responsive design across all features
- Dark-themed UI with glassmorphism, micro-interactions, and premium animations
- Customer service: Team@dwsc.io

### Media Vault
- Upload videos, audio, images, and documents via presigned URLs
- Drag-and-drop and multi-file upload with progress tracking
- Grid view and timeline view with smooth transitions
- Category filtering (All, Videos, Audio, Images, Documents)
- Full-text search and AI Smart Search (natural language queries)
- Favorites system with quick access
- Collections (albums/folders) — one file can belong to multiple collections
- Bulk selection with batch actions (delete, move, tag, export)
- **Batch Export**: download as zip with format conversion (Original/PNG/JPEG) and size presets (Original, 1080p, 720p, Instagram Square, Twitter Header, YouTube Thumbnail)
- Date range filtering and sorting options
- Skeleton loading states and shimmer animations

### Media Viewer
- Full-screen modal viewer for all media types
- Video and audio playback with native controls
- Image viewing with **scroll-wheel zoom**, **pinch-to-zoom**, **double-click toggle**, and **pan when zoomed**
- Zoom level indicator with +/- buttons and fit-to-view reset
- Swipe navigation between items
- Document preview with built-in reader

### Image Editor
- **Zoom/Pan Canvas**: scroll-wheel zoom (10%–500%), click-drag pan when zoomed, fit-to-view reset
- Crop with custom aspect ratios
- Rotate (90° left/right), Mirror, Flip
- Resize with aspect ratio lock
- 8+ one-tap style filters (Vintage, Noir, Warm, Cool, Vivid, Dramatic, Fade, Cinematic)
- Fine-tuned adjustments: Brightness, Contrast, Saturation, Blur, Hue, Temperature, Vignette, Sharpness
- **Eyedropper/Color Picker**: click any pixel to sample color, copies hex to clipboard, sets active drawing/text color
- **Text tool with 25 Google Fonts**: font size, color, drag-to-position, font family selection from curated Google Fonts library
- Freehand drawing with brush size, color, and eraser mode
- Stickers/shapes with drag-to-position and resize
- **Watermark Tool**: text watermark with font size, color, opacity (5–100%), 6 position presets (corners, center, tiled), tiled mode with -30° rotation for copyright protection
- **Layer Panel**: see all elements (base image, text, stickers, drawings), toggle visibility, reorder with up/down, select for editing, delete
- **Visual History Panel**: named entries for every edit step (up to 30), click to jump to any previous state, current state highlighted
- **Gradient & Pattern Canvas Backgrounds**: 8 gradient presets (Sunset, Ocean, Forest, Galaxy, Fire, Arctic, Neon, Pastel) and 4 pattern options (Grid, Dots, Diagonal, Checkerboard) for canvas background styling
- AI Auto-Enhance (one-click color optimization)
- AI Background Removal
- AI Smart Erase (object removal)
- AI Magic Aspect Ratio Fill (gradient-matched extension)
- Voice-Commanded Editing (Web Speech API — "make it warmer", "increase brightness")
- Save as new file to preserve originals

### Audio Editor
- Waveform visualization
- Trim with precise start/end time controls
- Volume adjustment
- Fade in/out effects
- Equalizer (Bass, Mid, Treble)
- Reverb effect
- Noise gate
- Save as new file

### Video Editor
- Video playback with frame-accurate seeking
- Trim with drag handles and precise time inputs
- Color grading: Brightness, Contrast, Saturation, Hue, Temperature, Vignette
- **Text Overlays with 25 Google Fonts**: add multiple text layers with font family selection, font size, color, position (drag to move), start/end timing, visible during playback and included in frame captures
- **7 Text Animation Effects**: Fade In, Typewriter, Slide Up, Slide Down, Scale In, Bounce, None — applied per text layer
- Frame capture (save current frame as image)
- **Custom Thumbnail Selection**: capture any frame and set it as the video's thumbnail in the vault
- Save as new file

### Merge / Combine Studio
- Photo collage builder with layout options
- Audio concatenation with crossfade
- Video concatenation with **17 transition effects**: Fade, Dissolve, Wipe (4 directions), Slide (4 directions), Circle, Radial, Smooth (4 directions)
- Configurable transition duration (0.2s–3s) via FFmpeg xfade
- Per-clip duration validation to prevent processing failures
- Audio stream fallback handling

### AI Creative Tools
- **AI Auto-Tag on Upload**: vision-based analysis for images, text-based for audio/documents
- **AI Smart Search**: natural language search across vault metadata
- **AI Auto-Enhance**: one-click color grading optimization
- **AI Caption Generator**: descriptive captions for any media item
- **AI Background Removal**: intelligent background removal in image editor
- **AI Smart Erase**: object removal in image editor
- **Voice-Commanded Editing**: speak commands to edit images hands-free
- **Social Media Kit**: generates 5 platform-optimized image sizes from one photo, with gradient/pattern canvas background options
- **Audio Visualizer Art**: 5 real-time visualization styles (Waveform, Bars, Circle, Particles, Galaxy) with 5 color themes
- **Beat-Sync Video Maker**: auto-detects beats in audio for photo transition synchronization
- **Style DNA**: AI analyzes photos to build a personal aesthetic profile (color palette, warmth, mood, contrast) with auto-apply option
- **Thumbnail Ranker**: AI scores images for social media impact
- **Portfolio Generator**: AI selects best work and builds a curated portfolio page
- **Magic Aspect Ratio Fill**: AI-matched gradient fill for aspect ratio changes

### Blog Platform
- Full blog system with public and admin interfaces
- AI content generation via OpenAI
- Rich text editing with formatting
- Draft/publish workflow
- Public blog page with responsive layout

### Signal Chat
- Real-time ecosystem-wide chat at `/chat`
- JWT-authenticated SSO
- Channel-based messaging
- WebSocket-powered real-time delivery
- Typing indicators and presence tracking
- Default channels seeded automatically

### Spinny AI Agent
- Floating side-tab chat panel
- Powered by OpenAI (gpt-5.1)
- Streaming SSE responses
- Tenant-scoped and media vault context-aware
- Voice output via ElevenLabs text-to-speech

### Explorer Pages
- **User Explorer** (`/explore`): cinematic rotating video hero with 6 AI-generated flyover videos, crossfade transitions, parallax scroll, navigation dots, photorealistic feature card grid. First screen after login, no login required to view.
- **Developer Explorer** (`/developer`): admin-only portal with same cinematic hero, card grid for platform management (User Management, Blockchain, API Keys, Revenue, Ecosystem, Invites, System Activity, Settings)

### Hallmark System (Blockchain Audit Trail)
- **Trust Layer Hallmark IDs**: SHA-256 hashed, format `TV-XXXXXXXX` (8-digit zero-padded)
- **Genesis Hallmark**: `TV-00000001` auto-created on first boot with full metadata (chain, domain, operator, consensus, native asset, utility token)
- **Trust Stamps**: immutable audit records for auth events (login, registration) and subscription events (start, cancel, upgrade, downgrade, payment failure)
- **Public Verification**: `GET /api/hallmark/:id/verify` — anyone can verify any hallmark
- **Genesis Badge**: visible in hamburger menu with click-to-expand detail dialog showing blockchain record, ecosystem info, and parent genesis reference (`TH-00000001`)
- **Parent Chain**: all hallmarks reference Trust Layer Hub genesis `TH-00000001`

### Affiliate Program (Share & Earn)
- **Universal Referral System**: single `uniqueHash` per user across all 33 ecosystem apps
- **5 Commission Tiers**: Base (0 refs, 10%), Silver (5 refs, 12.5%), Gold (15 refs, 15%), Platinum (30 refs, 17.5%), Diamond (50 refs, 20%)
- **Referral Link Routing**: `/ref/:hash` captures referral, stores in localStorage, converts on registration
- **Cross-Platform Links**: all 33 ecosystem app referral URLs generated per user
- **Deduplication**: 1-hour cooldown prevents referral tracking spam
- **Affiliate Dashboard** (`/affiliate`): tier progress bar, stats cards, commission table, recent referrals, payout requests
- **Payouts**: SIG (native asset), minimum 10 SIG per request
- **Share & Earn**: hamburger menu link + home dashboard card when user has pending earnings

### Subscription & Billing
- 4 tiers: Free, Personal, Pro, Studio
- Stripe Checkout integration
- Stripe Customer Portal for self-service management
- Webhook handling for all subscription lifecycle events
- Transactional email notifications (Resend) with dark-themed HTML templates for subscription confirmation, upgrade, downgrade, cancellation, and payment failure
- ORBIT Financial Hub auto-reporting: all Stripe events automatically reported to ORBIT Staffing OS for bookkeeping under owner Jason Andrews

### Ecosystem Integrations
- **TrustLayer SSO**: cross-app single sign-on with `tl-{base36-timestamp}-{random-8-chars}` ID generation
- **TrustHome**: ecosystem API with HMAC authentication, tenant scoping, webhooks
- **Trust Golf**: provisioned tenant with API key, webhook, CORS allowlist
- **TL Driver Connect**: provisioned ecosystem tenant
- **THE VOID**: provisioned ecosystem tenant
- **Trust Book**: provisioned ecosystem tenant with ePub/document storage capabilities
- **TrustGen**: provisioned ecosystem tenant for 3D model and animation asset storage
- **ORBIT Staffing OS Financial Hub**: outbound financial statement and transaction reporting
- **DarkWave Studio API**: external API layer with JWT Bearer auth, CORS, rate-limiting
- **DarkWave Ecosystem Widget**: embeddable widget via `<script>` tag
- **Verdara (App #28)**: ecosystem integration handoff documented
- **SMS Opt-In**: carrier-compliant SMS notification signup

### Founder Mission Statement
- Jason's creator statement in hamburger menu emphasizing affordable professional tools and TrustLayer foundation

### Onboarding & Help
- 13-slide interactive onboarding guide with swipe navigation, haptic feedback, and progress bar
- InfoBubble tooltips on every tool and control across all editors
- Contextual zoom hints ("Scroll to zoom · Drag to pan")
- Help button accessible from menu at any time

### Technical Architecture
- **Frontend**: React 18, TypeScript, Vite, Wouter routing, TanStack React Query, shadcn/ui + Radix UI, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express.js, TypeScript, Zod validation
- **Database**: PostgreSQL with Drizzle ORM (30 tables)
- **Storage**: Replit Object Storage (Google Cloud) with presigned URL upload flow
- **Auth**: bcrypt + express-session (local) + JWT HS256 (SSO)
- **Payments**: Stripe
- **AI**: OpenAI (gpt-5.1, gpt-4.1-mini)
- **Voice**: ElevenLabs TTS, Web Speech API
- **Email**: Resend
- **Video Processing**: FFmpeg (xfade transitions, audio crossfade)
- **Client Zip**: JSZip for batch export
- **WebSockets**: ws library for real-time chat
- **Blockchain**: SHA-256 hallmark hashing with Trust Layer chain integration

---

## Target Platforms

| Platform | Status |
|---|---|
| Web (Desktop) | Live |
| Web (Mobile/Responsive) | Live |
| PWA (Installable) | Live |
| React Native + Expo (iOS/Android) | Planned |
| Blockchain Identity (dwtl.io) | Planned |

---

## Support

**Customer Service**: Team@dwsc.io
**Website**: darkwavestudios.io
**Ecosystem**: TrustLayer / Dark Wave Studios

---

*Built by Dark Wave Studios — Affordable Professional Tools for Every Creator.*
