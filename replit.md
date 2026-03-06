# replit.md

## Overview

This project, known as TrustVault or DW Media Studio, is a universal media vault. It's a full-stack multi-tenant web application designed for families to upload, store, organize, and preview various digital media types including videos, audio, images, and documents. It features multi-user authentication with tenant isolation, file uploads via presigned URLs to Replit Object Storage, a dark-themed UI with advanced filtering and tagging, and a multi-format modal media viewer. The project aims to deliver a premium user experience and is a foundational component within a larger ecosystem (TrustLayer / Dark Wave Studios), with future ambitions for blockchain integration and native mobile applications, providing comprehensive digital content management with advanced editing and smart organization features.

## User Preferences

- Preferred communication style: Simple, everyday language.
- Very strict, consistent UI/UX requirements across all builds — tight, professional layouts with grid systems, skeleton loading, smooth transitions, hover effects.
- Premium Protocol UI/UX Standard: All apps in the ecosystem follow the standard defined in `docs/PREMIUM_UI_PROTOCOL.md` — includes glassmorphism, 3D hover effects, shimmer loading, haptic feedback, tooltips, dynamic theming, micro-interactions, and scroll-triggered animations.
- This project is part of a larger ecosystem: TrustLayer (trust-based engagement platform) / Dark Wave Studios (darkwavestudios.io) — the architectural arm of a Layer One blockchain.
- Future target platform: React Native + Expo for standalone native app.
- A full master roadmap exists at `MASTER_ROADMAP.md` covering phases from current MVP through blockchain integration and native app deployment.
- A strategic architecture plan exists at `ARCHITECTURE_PLAN.md` covering the modular architecture strategy, build order, workspace separation, and how the media vault fits into the broader TrustLayer ecosystem (Dark Wave Studios, TrustShield, Signal asset).

## System Architecture

### Frontend (React SPA)
- **Framework**: React 18 with TypeScript and Vite.
- **Routing**: Wouter.
- **State Management**: TanStack React Query.
- **UI Components**: shadcn/ui (new-york style) built on Radix UI, styled with Tailwind CSS.
- **Animations**: Framer Motion.
- **Styling**: Tailwind CSS, dark-mode-first, custom fonts.
- **File Upload**: Uppy library with AWS S3 plugin for presigned URL uploads.
- **PWA**: Implemented with manifest and service worker for offline capabilities.
- **Media Editors**: Dedicated pages for image (crop, rotate, filters, color grading, text with 25 Google Fonts, drawing, stickers, eyedropper color picker, watermark tool, layer panel, visual history panel, zoom/pan canvas, gradient/pattern canvas backgrounds), audio (trim, fade, EQ, reverb, noise gate), and video (trim, color grading, frame capture, text overlays with 25 Google Fonts and 7 animation effects, custom thumbnail selection) editing.
- **Media Viewer**: Zoom support with scroll-wheel zoom, pinch-to-zoom, double-click toggle, and pan when zoomed.
- **Batch Export**: Bulk export with format conversion (Original/PNG/JPEG), size presets (1080p, 720p, Instagram, Twitter, YouTube), client-side canvas resize, and JSZip download.
- **Media Merge/Combine**: Guided workflows for collages, audio concatenation (with crossfade), and video concatenation with 17 transition effects (fade, dissolve, wipe, slide, circle, radial, smooth — all with configurable duration via FFmpeg xfade).
- **Smart Browsing & Organization**: Collections, timeline view, various sorting, date range filtering, bulk actions.
- **AI-Driven Blog System**: Full blog platform with public and admin interfaces, AI content generation via OpenAI.
- **Stripe Subscription System**: Pricing page with 4 tiers, Stripe Checkout, Customer Portal, webhook handling.
- **Spinny AI Agent**: Floating side tab chat panel powered by OpenAI (gpt-5.1), streaming SSE responses, tenant-scoped, media vault context-aware, voice output via ElevenLabs TTS.
- **AI-Powered Media Tools**: Comprehensive AI features via OpenAI gpt-4.1-mini, including:
    - **AI Auto-Tag on Upload**: Vision-based analysis for images, text-based for audio/documents.
    - **AI Smart Search**: Natural language search across media vault metadata.
    - **AI Auto-Enhance**: One-click color grading in image editor.
    - **AI Caption Generator**: Descriptive captions for media items.
    - **AI Background Removal & Smart Erase**: Intelligent background and object removal in image editor.
    - **Voice-Commanded Editing**: Web Speech API integration for image editor.
    - **Social Media Kit**: Generates 5 platform-optimized image sizes.
    - **Audio Visualizer Art**: Real-time Web Audio API visualizations.
    - **Beat-Sync Video Maker**: Auto-detects beats for photo transition synchronization.
    - **Style DNA**: AI analyzes user's photos for aesthetic preferences.
    - **Thumbnail Ranker**: AI scores images for social media impact.
    - **Portfolio Generator**: AI selects best work for a curated portfolio page.
    - **Magic Aspect Ratio Fill**: AI-matched gradient fill for aspect ratio changes.
- **AI Tools Dropdown**: Accessible from main vault toolbar and hamburger menu AI Creative Tools section.
- **Explorer Page**: User-facing landing page at `/explore` with cinematic rotating video hero (6 AI-generated flyover videos with crossfade transitions, parallax scroll fade, navigation dots) and photorealistic card grid covering all main features (Vault, Editors, AI Tools, Blog, Chat, Pricing, Roadmap). First screen after login. Developer Portal link at bottom for admin users.
- **Developer Explorer**: Admin-only portal at `/developer` with cinematic rotating video hero (same 6 videos as Explorer) and photorealistic card grid for platform management (User Management, Blockchain, API Keys, Revenue, Ecosystem, Invites, System Activity, Settings). Cross-navigates to/from User Explorer. Replaces the old Command Center.
- **Founder Mission Statement**: Jason's creator statement in hamburger menu emphasizing affordable professional tools and TrustLayer foundation.
- **Signal Chat**: Real-time, ecosystem-wide chat system at `/chat` with JWT-authenticated SSO, channel-based messaging, WebSockets, typing indicators, and presence tracking.
- **Hallmark System**: Trust Layer ecosystem audit trail with SHA-256 hashed hallmarks (prefix TV, genesis TV-00000001), trust stamps for auth/subscription events, public verification endpoint, genesis badge in hamburger menu.
- **Affiliate Program**: Universal referral system at `/affiliate` with 5 commission tiers (Base 10% → Diamond 20%), referral link tracking via `/ref/:hash`, deduplication, payout requests, cross-platform links, and "Share & Earn" dashboard.

### Backend (Express + Node.js)
- **Runtime**: Node.js with TypeScript.
- **Framework**: Express.js, serving API routes and static SPA.
- **API Design**: RESTful JSON API using Zod for contract validation.
- **Authentication**: Dual system with custom password-based session auth (bcrypt, express-session) and JWT-based TrustLayer SSO for ecosystem (HS256).
- **TrustLayer SSO**: Cross-app single sign-on with `tl-{base36-timestamp}-{random-8-chars}` ID generation.
- **WebSocket Chat Server**: `ws` library at `/ws/chat`, JWT-authenticated.
- **File Storage Interaction**: Generates presigned URLs for client-side uploads to Replit Object Storage, stores metadata.
- **Ecosystem API (TrustHome Connectivity)**: Inter-service API with HMAC authentication, tenant scoping, and webhooks.
- **ORBIT Ecosystem Client**: Outbound integration to ORBIT Staffing OS Financial Hub, handles financial statements, transactions, and webhook reception. Automatically reports all Stripe subscription events (new, upgrade, downgrade, cancellation, payment failure) to ORBIT for bookkeeping under owner Jason Andrews.
- **DarkWave Studio API**: External API layer for DarkWave Studios integration with JWT Bearer auth, CORS, and rate-limiting.
- **Stripe Integration**: Subscription management with Checkout Sessions, Customer Portal, and webhook handling.
- **Transactional Email System**: Resend-powered email notifications via Replit connector, using dark-themed HTML templates for various subscription events.

### Shared Code (`shared/`)
- **Schema**: Drizzle ORM schema definitions for all database tables.
- **API Contract**: Zod schemas defining the full API contract for type safety.

### Database
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM.
- **Key Tables**: `media_items`, `pin_auth`, `sessions`, `collections`, `collection_items`, `api_keys`, `ecosystem_projects`, `blog_posts`, `subscriptions`, `chat_users`, `chat_channels`, `chat_messages`.

### Key Design Patterns
- **Presigned URL Upload Flow**: Offloads direct file transfer to cloud storage.
- **Contract-First API**: Ensures type-safe client-server communication.
- **Storage Abstraction**: Facilitates swapping storage backends via an `IStorage` interface.

## External Dependencies

- **PostgreSQL Database**: Primary database for all application data.
- **Replit Object Storage**: Main storage for uploaded media files (Google Cloud Storage client library).
- **OpenAI API**: Used for AI-driven blog content generation and various AI media tools.
- **Stripe**: Payment processing for subscriptions (Checkout, Customer Portal, webhooks).
- **ElevenLabs**: Text-to-speech for Spinny AI Agent.
- **Resend**: Transactional email service.
- **ORBIT Staffing OS Financial Hub**: Outbound integration for financial operations.
- **DarkWave Ecosystem Widget**: Embeddable widget loaded via `<script src="https://dwsc.io/api/ecosystem/widget.js"></script>`. Widget data API: `GET https://dwsc.io/api/ecosystem/widget-data` with Trust Layer SSO JWT in Authorization header.
- **TrustGen**: 3D model and animation generator integration, handoff documented at `docs/TRUSTGEN_HANDOFF.md`.
- **Verdara (App #28)**: Ecosystem integration handoff documented at `docs/VERDARA_RETURN_HANDOFF.md`.
- **TrustHome**: Media editor ecosystem integration handoff documented at `docs/TRUSTHOME_RETURN_HANDOFF.md`.
- **TrustBook**: ePub publisher platform integration with document/ePub storage capabilities, handoff documented at `docs/TRUSTBOOK_HANDOFF.md`.