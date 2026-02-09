# replit.md

## Overview

This project is a **universal media vault** (TrustVault / DW Media Studio), a full-stack multi-tenant web application designed for a family of users to upload, store, organize, and preview various digital media types including videos, audio, images, and documents. Key features include multi-user authentication with tenant isolation, file uploads to Replit Object Storage via presigned URLs, a dark-themed UI with category filtering and tagging, and a multi-format modal media viewer. It emphasizes a premium user experience and is envisioned as a core component within a broader ecosystem (TrustLayer / Dark Wave Studios), with future plans for blockchain integration and native mobile applications. The project aims to provide robust media management capabilities, including advanced editing tools and smart organization features, making it a comprehensive solution for digital content.

### Users & Tenants
- **Jason** (developer/owner, admin): PIN 0424, tenant `jason`, isAdmin=true — has master access to all tenant spaces
- **Madeline** (daughter): tenant `madeline` — has own isolated media space
- **Natalie** (daughter): tenant `natalie` — has own isolated media space (must reset password on first login)
- **Avery** (daughter): tenant `avery` — has own isolated media space (must reset password on first login)
- Multi-user login: when 4+ accounts exist, login shows Name + Password fields
- Admin accounts can view/manage all tenant spaces (planned dev portal feature)

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
- **Framework**: React 18 with TypeScript, bundled by Vite.
- **Routing**: Wouter for client-side navigation.
- **State Management**: TanStack React Query for server state.
- **UI Components**: shadcn/ui (new-york style) built on Radix UI, styled with Tailwind CSS and CSS variables.
- **Animations**: Framer Motion for transitions and micro-interactions.
- **Styling**: Tailwind CSS, dark-mode-first design, custom fonts (Outfit, Plus Jakarta Sans).
- **File Upload**: Uppy library with AWS S3 plugin for presigned URL uploads.
- **Progressive Web App (PWA)**: Implemented with web app manifest, service worker for offline capabilities (stale-while-revalidate caching), and native splash screen.
- **Media Editors**: Dedicated pages for image, audio, and video editing (crop, rotate, filters, trim, frame capture, etc.), allowing saves as new media items.
- **Media Merge/Combine**: Guided workflow for creating image collages, audio concatenations, and video concatenations.
- **Smart Browsing & Organization**: Collections system, timeline view, grid/timeline toggle, various sort options, date range filtering, and bulk selection with batch actions.
- **AI-Driven Blog System**: Full blog platform with public and admin interfaces for SEO-optimized content, including AI content generation via OpenAI.
- **Stripe Subscription System**: Pricing page with 4 tiers (Free/Personal/Pro/Studio), Stripe Checkout for payments, Customer Portal for management, webhook handling for subscription lifecycle.
- **Spinny AI Agent**: Vinyl record mascot (googly eyes, smiley face) that lives as a floating side tab. Opens into a full chat panel powered by OpenAI (gpt-5.1) with streaming SSE responses. Tenant-scoped conversations with media vault context awareness. Uses `conversations` and `messages` tables with tenant isolation.

### Backend (Express + Node.js)
- **Runtime**: Node.js with TypeScript (tsx/esbuild).
- **Framework**: Express.js, serving API routes and static SPA.
- **API Design**: RESTful JSON API using Zod for contract validation (`shared/routes.ts`).
- **Authentication**: Custom password-based authentication (8+ chars, 1 uppercase, 1 special character) with bcrypt hashing and password reset flow. Express-session with PostgreSQL-backed storage.
- **File Storage Interaction**: Generates presigned URLs for direct client uploads to Replit Object Storage, then stores metadata in the database.
- **Ecosystem API (TrustHome Connectivity)**: Inter-service API for DarkWave ecosystem integration, featuring HMAC authentication, tenant scoping, project management, and webhook callbacks with retry mechanisms.
- **Stripe Integration**: Subscription management with Checkout Sessions, Customer Portal, and webhook event handling (`server/stripe/routes.ts`).

### Shared Code (`shared/`)
- **Schema**: Drizzle ORM schema definitions (`shared/schema.ts`) for all database tables.
- **API Contract**: Zod schemas defining the full API contract (`shared/routes.ts`) for type safety.

### Database
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM for schema management and migrations.
- **Key Tables**: `media_items` (media metadata), `pin_auth` (authentication), `sessions`, `collections`, `collection_items` (for media organization), `api_keys` (ecosystem credentials), `ecosystem_projects` (tenant-scoped projects), `blog_posts` (blog content), `subscriptions` (Stripe subscription state).

### Key Design Patterns
- **Presigned URL Upload Flow**: Efficient file upload by offloading direct file transfer to cloud storage.
- **Contract-First API**: Ensures type-safe communication between client and server.
- **Storage Abstraction**: Facilitates swapping storage backends via an `IStorage` interface.

## External Dependencies

### Required Services
- **PostgreSQL Database**: Essential for all application data; connected via `DATABASE_URL`.
- **Replit Object Storage**: Primary storage for uploaded media files; accessed via Google Cloud Storage client library.
- **OpenAI API**: Used for AI-driven blog content generation.

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string.
- `SESSION_SECRET`: Secret for `express-session` signing.
- `STRIPE_SECRET_KEY`: Stripe secret API key for server-side operations.
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key exposed to frontend.
- `STRIPE_WEBHOOK_SECRET`: (Optional) Stripe webhook signing secret for signature verification.

### Key NPM Dependencies
- **Server**: `express`, `drizzle-orm`, `pg`, `express-session`, `connect-pg-simple`, `@google-cloud/storage`, `zod`.
- **Client**: `react`, `@tanstack/react-query`, `wouter`, `framer-motion`, `@uppy/core`, `@uppy/aws-s3`, `@uppy/react`, `shadcn/ui` components.
- **Build**: `vite`, `esbuild`, `tsx`, `drizzle-kit`, `typescript`.