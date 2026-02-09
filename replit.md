# replit.md

## Overview

This is a personal **universal media vault** — a full-stack web application that allows a user (Madeline) to upload, store, organize, and preview any type of digital media: videos, audio, images, documents (PDF, DOC, etc.), and other files. The app features password-based authentication (SSO-compatible: 8+ chars, 1 uppercase, 1 special character), file upload via presigned URLs to Replit Object Storage, a dark-themed media-focused UI with category filtering and tagging, and multi-format preview in a modal viewer. It's a single-user/personal app with a password login flow and mandatory password reset on first use.

## User Preferences

- Preferred communication style: Simple, everyday language.
- Very strict, consistent UI/UX requirements across all builds — tight, professional layouts with grid systems, skeleton loading, smooth transitions, hover effects.
- Premium Protocol UI/UX Standard: All apps in the ecosystem follow the standard defined in `docs/PREMIUM_UI_PROTOCOL.md` — includes glassmorphism, 3D hover effects, shimmer loading, haptic feedback, tooltips, dynamic theming, micro-interactions, and scroll-triggered animations.
- This project is part of a larger ecosystem: TrustLayer (trust-based engagement platform) / Dark Wave Studios (darkwavestudios.io) — the architectural arm of a Layer One blockchain.
- Future target platform: React Native + Expo for standalone native app.
- A full master roadmap exists at `MASTER_ROADMAP.md` covering phases from current MVP through blockchain integration and native app deployment.
- A strategic architecture plan exists at `ARCHITECTURE_PLAN.md` covering the modular architecture strategy, build order, workspace separation, and how the media vault fits into the broader TrustLayer ecosystem (Dark Wave Studios, TrustShield, Signal asset).

## Recent Changes

- **PWA Conversion** (Feb 2026) — Converted app to Progressive Web App:
  - **Web App Manifest**: `client/public/manifest.json` — standalone display, dark theme (#0a0a0f background, #7c3aed theme), maskable icons
  - **Icons**: 192x192 and 512x512 PWA icons, Apple Touch icon — all in `client/public/`
  - **Service Worker**: `client/public/sw.js` — stale-while-revalidate caching strategy, offline SPA navigation fallback, excludes API/upload routes
  - **Splash Screen**: Native HTML splash in `index.html` with animated logo, progress bar, fade-out transition (1.2s before dismiss)
  - **iOS Support**: apple-mobile-web-app-capable, black-translucent status bar, apple-touch-icon
  - **Service Worker Registration**: In `client/src/main.tsx`, registers on window load
- **Ecosystem API: TrustHome Connectivity** (Feb 2026) — Added inter-service API for DarkWave ecosystem integration:
  - **HMAC Authentication**: `Authorization: DW <apiKey>:<timestamp>:<signature>` scheme with HMAC-SHA256, 5-minute timestamp tolerance, constant-time signature comparison
  - **Tenant Scoping**: All ecosystem data isolated by `tenantId`; API key tied to specific tenant
  - **New tables**: `api_keys` (tenant credentials, webhook URL, capabilities), `ecosystem_projects` (tenant-scoped projects with status tracking)
  - **Ecosystem API module**: `server/ecosystem/` — auth.ts (HMAC middleware + signature utilities), storage.ts (project/tenant CRUD), routes.ts (all endpoints), webhook.ts (callback with retry)
  - **Endpoints**: GET `/api/ecosystem/status`, GET `/api/ecosystem/projects`, GET `/api/ecosystem/projects/:id`, GET `/api/ecosystem/projects/:id/status`, POST `/api/ecosystem/walkthrough-request`, POST `/api/ecosystem/projects/:id/cancel`, POST `/api/ecosystem/provision` (vault-auth-protected)
  - **Webhook callbacks**: POST to tenant webhook URL on job completion/cancellation with HMAC-signed requests, 3 retries with exponential backoff
  - **Capabilities**: video_walkthrough, video_editing, audio_editing, media_combining, branded_intros, voiceover, multi_angle_stitch, thumbnail_generation
- **Auth System Redesign** (Feb 2026) — Removed pre-seeded default password; users create own account via 3-step setup flow (name, password, confirm). Added change-password feature via key icon in vault header.
- **Phase 1 Expansion: Media Editors & Merge** (Feb 2026) — Added full-featured standalone editors:
  - **Image Editor** (`/editor/image/:id`): Crop, rotate, resize, 7 filters (grayscale/sepia/vintage/cool/vivid/fade), brightness/contrast/saturation/blur adjustments, canvas-based processing, saves as new media item
  - **Audio Editor** (`/editor/audio/:id`): Waveform visualization, trim/cut with draggable handles, fade in/out, volume control, playback speed, WAV encoding via OfflineAudioContext, saves as new media item
  - **Video Editor** (`/editor/video/:id`): Timeline/trim bar, custom playback controls, frame capture (saves as new image), visual adjustments (brightness/contrast), saves clip info as new media item
  - **Merge/Combine** (`/merge`): 4-step guided workflow — select type (image collage/audio concat/video concat), select items, configure, process & save. Image collage uses canvas, audio concat uses Web Audio API with crossfade support
  - **Batch Upload**: Multi-file queue with per-file progress, client-side thumbnail extraction for images/videos, duration detection for videos, event detail fields (artist/venue/tour)
  - **Schema additions**: thumbnailUrl, durationSeconds, artist, venue, tour, eventDate fields on media_items
  - **Media cards**: Show thumbnails, duration badges, artist info; "Open in editor" button (Wand2 icon) navigates to appropriate editor
  - **Edit dialog**: Added artist/venue/tour/eventDate fields
  - **Mobile polish**: All pages audited and fixed for responsive layouts, touch targets, stacking panels on small screens
- **Phase 1: Smart Browsing & Organization** (Feb 2026) — Added collections system (create/manage albums), timeline view (group media by year/month), grid/timeline view toggle, sort options (date/name/size), date range filtering, bulk select mode with floating action bar (batch favorite/unfavorite, batch delete, set label, add/remove from collections). Collections use junction table (`collection_items`). Batch API routes (`PATCH /api/media/batch`, `DELETE /api/media/batch`). React hooks for all CRUD operations in `client/src/hooks/use-media.ts`.

## System Architecture

### Frontend (React SPA)
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router) — routes: `/` (home), `/editor/image/:id`, `/editor/audio/:id`, `/editor/video/:id`, `/merge`, plus 404 page
- **State Management**: TanStack React Query for server state (data fetching, caching, mutations)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives, styled with Tailwind CSS and CSS variables for theming
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Styling**: Tailwind CSS with a dark-mode-first design using CSS custom properties. Custom fonts: Outfit (display) and Plus Jakarta Sans (body)
- **File Upload**: Uppy library with AWS S3 plugin for presigned URL uploads, plus a custom `useUpload` hook for simpler cases
- **Icons**: Lucide React
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend (Express + Node.js)
- **Runtime**: Node.js with TypeScript (tsx for development, esbuild for production builds)
- **Framework**: Express.js serving both API routes and the static SPA
- **API Design**: RESTful JSON API under `/api/` prefix. API contracts are defined in `shared/routes.ts` using Zod schemas for request/response validation
- **Session Management**: express-session with connect-pg-simple (PostgreSQL-backed sessions), 30-day TTL
- **Authentication**: Custom password-based auth (SSO-compatible). A single password stored (bcrypt hashed) in a `pin_auth` table. Password requirements: 8+ chars, 1 uppercase, 1 special character. Supports password reset flow on first login. Session cookie tracks authentication state. Login endpoint: POST `/api/auth/login` (body: `{password}`). Reset endpoint: POST `/api/auth/reset-password` (body: `{newPassword}`). There is also a Replit Auth integration present in `server/replit_integrations/auth/` but the active auth system is the password-based one.
- **File Storage**: Replit Object Storage (Google Cloud Storage under the hood) accessed via `@google-cloud/storage`. Files are uploaded using presigned URLs — the backend generates a presigned upload URL, the client uploads directly to storage, then saves metadata to the database.
- **Dev Server**: Vite dev server is used as middleware in development for HMR

### Shared Code (`shared/`)
- **Schema**: Drizzle ORM schema definitions in `shared/schema.ts` — defines `mediaItems`, `pinAuth`, `users`, `sessions`, `collections`, and `collectionItems` tables
- **Routes Contract**: `shared/routes.ts` defines the full API contract with Zod schemas, used by both client and server for type safety
- **Models**: `shared/models/auth.ts` contains Replit Auth user/session models (kept for compatibility)

### Database
- **Database**: PostgreSQL (required, via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-kit` for migrations
- **Schema Push**: Use `npm run db:push` to push schema changes to the database (uses `drizzle-kit push`)
- **Tables**:
  - `media_items` — stores all media metadata (title, description, url/object path, filename, content type, category, size, label, tags, file_date, favorite flag, thumbnailUrl, durationSeconds, artist, venue, tour, eventDate)
  - `pin_auth` — single-row table for PIN authentication (pin, must_reset flag, name)
  - `sessions` — express-session storage
  - `users` — kept from Replit Auth integration, not actively used by PIN auth
  - `collections` — user-created albums/collections (name, description, coverMediaId)
  - `collection_items` — junction table linking media_items to collections (collectionId, mediaItemId, addedAt)
  - `api_keys` — ecosystem tenant API credentials (tenantId, appName, apiKey, apiSecret, webhookUrl, capabilities, active)
  - `ecosystem_projects` — tenant-scoped media projects (tenantId, title, status, propertyAddress, propertyId, requestType, notes, agentId, thumbnailUrl, outputUrl, duration, timeline, assets, renderStatus, errorMessage, estimatedTurnaround)

### Build System
- **Development**: `npm run dev` — runs tsx with Vite middleware for HMR
- **Production Build**: `npm run build` — runs `script/build.ts` which builds the client with Vite and bundles the server with esbuild. Key server dependencies are bundled (allowlisted) to reduce cold start times; others are externalized.
- **Production Start**: `npm run start` — runs the built `dist/index.cjs`
- **Type Checking**: `npm run check` — runs tsc with noEmit

### Key Design Patterns
- **Presigned URL Upload Flow**: Client requests a presigned URL from `/api/uploads/request-url` (sending only JSON metadata), then uploads the file directly to the presigned URL, then saves media metadata to the database via `/api/media`
- **Contract-First API**: Shared Zod schemas in `shared/routes.ts` define the API contract, enabling type-safe API calls on both client and server
- **Storage Abstraction**: `IStorage` interface in `server/storage.ts` with `DatabaseStorage` implementation, making it possible to swap storage backends

## External Dependencies

### Required Services
- **PostgreSQL Database**: Required. Connection via `DATABASE_URL` environment variable. Used for media metadata, session storage, and PIN authentication.
- **Replit Object Storage**: Used for storing uploaded media files. Accessed via Google Cloud Storage client library through Replit's sidecar service at `http://127.0.0.1:1106`. Configured via environment (no explicit credentials needed in Replit environment).

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required)
- `SESSION_SECRET` — Secret for express-session signing (falls back to a default in development)
- `PUBLIC_OBJECT_SEARCH_PATHS` — Configures public object storage paths (optional)

### Key NPM Dependencies
- **Server**: express, drizzle-orm, pg, express-session, connect-pg-simple, @google-cloud/storage, zod
- **Client**: react, @tanstack/react-query, wouter, framer-motion, date-fns, lucide-react, @uppy/core, @uppy/aws-s3, @uppy/dashboard, @uppy/react
- **UI**: Full shadcn/ui component library (Radix UI primitives, tailwindcss, class-variance-authority, cmdk, vaul, embla-carousel, recharts, react-day-picker, react-resizable-panels, input-otp)
- **Build**: vite, esbuild, tsx, drizzle-kit, typescript