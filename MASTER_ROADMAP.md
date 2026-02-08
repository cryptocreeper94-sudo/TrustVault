# Master Roadmap — Concert Memory Vault / TrustLayer Media Platform

**Project Origin**: Private concert video gallery for Madeline
**Parent Ecosystem**: TrustLayer / Dark Wave Studios (darkwavestudios.io)
**Blockchain Layer**: Layer One blockchain (TrustLayer)
**Target Platform (Future)**: React Native + Expo (standalone native app)
**Date Created**: February 8, 2026

---

## Current State (Phase 0 — MVP)

- Private video gallery web app (React + Express + PostgreSQL)
- PIN-based authentication (bcrypt-hashed, session-backed)
- Forced PIN reset on first login
- Video upload via Replit Object Storage (presigned URL flow)
- Video playback in modal player
- Favorite/unfavorite videos
- Search/filter videos
- Time-of-day personalized greeting (Central Time)
- Dark-themed, media-focused UI
- Skeleton loading states, transitions, hover effects
- Link back to darkwavestudios.io

---

## Phase 1 — Polish & Foundation

- [ ] Thumbnail generation (extract frame from uploaded video)
- [ ] Video duration display on cards
- [ ] Sorting options (date, name, favorites first)
- [ ] Tags / categories (by artist, venue, tour, date)
- [ ] Batch upload support
- [ ] Mobile-responsive refinements
- [ ] Establish core UI/UX design system documentation (colors, spacing, typography, component standards) to ensure consistency across all future builds

---

## Phase 2 — Multi-User & Sharing

- [ ] Multi-user support (multiple PINs or user accounts)
- [ ] Role-based access (owner vs. viewer)
- [ ] Shareable gallery links (trust-gated, expiring or permanent)
- [ ] Shared collections between trusted users
- [ ] Activity log (who viewed what, when)

---

## Phase 3 — TrustLayer Blockchain Integration

- [ ] Connect authentication to TrustLayer identity layer
- [ ] On-chain identity verification for gallery access
- [ ] Trust-gated sharing: access based on trust scores or verified relationships
- [ ] Verified attendee access: artists/venues share footage only with confirmed attendees
- [ ] Business use case: private event clips shared only with confirmed partners
- [ ] Media provenance: on-chain proof of ownership/origination for uploaded content
- [ ] Integration with Dark Wave Studios ecosystem (shared navigation, unified identity)

---

## Phase 4 — React Native + Expo (Standalone Native App)

- [ ] Port frontend to React Native + Expo
- [ ] Native video capture and upload (direct from phone camera)
- [ ] Offline viewing / downloaded favorites
- [ ] Push notifications (new shared content, trust requests)
- [ ] Native media player with gesture controls
- [ ] App Store and Google Play deployment
- [ ] Maintain consistent UI/UX standards from web version

---

## Phase 5 — Platform & Marketplace

- [ ] Concert community features: organize clips by artist, venue, tour
- [ ] Small venue / indie artist tools: offer fans private galleries as digital merch
- [ ] Event keepsakes: weddings, graduations, reunions with private access
- [ ] Content licensing framework tied to blockchain provenance
- [ ] Creator monetization options (pay-per-view, subscription galleries)
- [ ] API for third-party integrations within TrustLayer ecosystem

---

## Ecosystem Context

### TrustLayer
- Full ecosystem centered on trust-based engagement between people and businesses
- Self-described trust model verified on-chain
- Layer One blockchain

### Dark Wave Studios (darkwavestudios.io)
- Architectural arm of the Layer One blockchain
- Where this product fits within the broader platform

### Key Integration Points
- Identity: TrustLayer blockchain identity replaces/extends PIN auth
- Trust: Access control based on verified trust relationships
- Provenance: Media ownership and origination tracked on-chain
- Ecosystem: Shared UI/UX patterns, navigation, and user experience across all Dark Wave Studios products

---

## UI/UX Standards (To Be Defined)

- Consistent design language across all TrustLayer / Dark Wave Studios products
- Dark-themed, professional, tight layouts
- Grid layouts, skeleton loading, smooth transitions, subtle hover effects
- To be formally documented based on existing build patterns and preferences

---

## Notes

- Current web version serves as functional prototype and Madeline's personal vault
- React Native + Expo is the target for production standalone app
- All future development should align with TrustLayer ecosystem architecture
- UI/UX requirements are strict and consistent — document and enforce across builds
