# replit.md

## Overview

This is a personal **universal media vault** — a full-stack web application that allows a user (Madeline) to upload, store, organize, and preview any type of digital media: videos, audio, images, documents (PDF, DOC, etc.), and other files. The app features PIN-based authentication (not traditional user/password), file upload via presigned URLs to Replit Object Storage, a dark-themed media-focused UI with category filtering and tagging, and multi-format preview in a modal viewer. It's a single-user/personal app with a simple PIN login flow and optional PIN reset on first use.

## User Preferences

- Preferred communication style: Simple, everyday language.
- Very strict, consistent UI/UX requirements across all builds — tight, professional layouts with grid systems, skeleton loading, smooth transitions, hover effects.
- Premium Protocol UI/UX Standard: All apps in the ecosystem follow the standard defined in `docs/PREMIUM_UI_PROTOCOL.md` — includes glassmorphism, 3D hover effects, shimmer loading, haptic feedback, tooltips, dynamic theming, micro-interactions, and scroll-triggered animations.
- This project is part of a larger ecosystem: TrustLayer (trust-based engagement platform) / Dark Wave Studios (darkwavestudios.io) — the architectural arm of a Layer One blockchain.
- Future target platform: React Native + Expo for standalone native app.
- A full master roadmap exists at `MASTER_ROADMAP.md` covering phases from current MVP through blockchain integration and native app deployment.
- A strategic architecture plan exists at `ARCHITECTURE_PLAN.md` covering the modular architecture strategy, build order, workspace separation, and how the media vault fits into the broader TrustLayer ecosystem (Dark Wave Studios, TrustShield, Signal asset).

## Recent Changes

- **Phase 1: Smart Browsing & Organization** (Feb 2026) — Added collections system (create/manage albums), timeline view (group media by year/month), grid/timeline view toggle, sort options (date/name/size), date range filtering, bulk select mode with floating action bar (batch favorite/unfavorite, batch delete, set label, add/remove from collections). Collections use junction table (`collection_items`). Batch API routes (`PATCH /api/media/batch`, `DELETE /api/media/batch`). React hooks for all CRUD operations in `client/src/hooks/use-media.ts`.

## System Architecture

### Frontend (React SPA)
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router) — single main route (`/`) plus a 404 page
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
- **Authentication**: Custom PIN-based auth (not Replit Auth). A single PIN stored in a `pin_auth` table. Supports PIN reset flow on first login. Session cookie tracks authentication state. There is also a Replit Auth integration present in `server/replit_integrations/auth/` but the active auth system is the PIN-based one.
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
  - `media_items` — stores all media metadata (title, description, url/object path, filename, content type, category, size, label, tags, file_date, favorite flag)
  - `pin_auth` — single-row table for PIN authentication (pin, must_reset flag, name)
  - `sessions` — express-session storage
  - `users` — kept from Replit Auth integration, not actively used by PIN auth
  - `collections` — user-created albums/collections (name, description, coverMediaId)
  - `collection_items` — junction table linking media_items to collections (collectionId, mediaItemId, addedAt)

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