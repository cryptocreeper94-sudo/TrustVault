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

### Ecosystem Structure Summary
```
TrustLayer (Master Brand / Ecosystem)
├── Dark Wave Studios (darkwavestudios.io) — Architecture & Product Development
├── TrustShield (trustshield.tech) — Security & Verification
├── Signal — Native Asset
├── Media Vault (this product) — Trust-Gated IP Storage (name TBD)
└── [Future products aligned to verticals]
```

### Key Integration Points
- Identity: TrustLayer blockchain identity replaces/extends PIN auth
- Trust: Access control based on verified trust relationships
- Provenance: Media ownership and origination tracked on-chain
- Security: TrustShield infrastructure protects vaults and verifies access
- Value: Signal asset may serve as the medium for transactions, licensing, access rights
- Ecosystem: Shared UI/UX patterns, navigation, and user experience across all TrustLayer products

### Founding Principles
- Build something with real utility — not speculative hype
- Trust is earned through personal responsibility and verified action
- Every product must serve people and have genuine value
- The ecosystem exists to help people, not extract from them
- Provenance, presence, and purpose drive every decision

---

## UI/UX Standards (To Be Defined)

- Consistent design language across all TrustLayer / Dark Wave Studios products
- Dark-themed, professional, tight layouts
- Grid layouts, skeleton loading, smooth transitions, subtle hover effects
- To be formally documented based on existing build patterns and preferences

---

## Industry Verticals & Stakeholder Map

Every digital file that could be considered intellectual property — video, audio, visual art, documents — touches a web of people, companies, and industries. This product sits at the center of all of them. Below is the full vertical map.

### 1. Live Music & Concerts
- **Fans / Attendees** — Personal memories, fan-shot footage, shared experiences
- **Artists / Performers** — Controlled distribution of live performance footage, fan engagement
- **Touring Crews** — Behind-the-scenes content, rehearsal footage, tour documentation
- **Tour Managers / Booking Agents** — Event documentation, promotional material archiving
- **Venues** — House recordings, event archives, marketing content libraries
- **Promoters / Event Companies** — Multi-event archives, promotional reels, investor materials
- **Ticketing Platforms** — Verified attendee access tied to ticket purchase (trust-gated content)

### 2. Music Production & Recording
- **Producers / Engineers** — Session recordings, mix versions, stem archives
- **Studios** — Client project vaults, master recording storage with provenance
- **Session Musicians** — Performance archives, portfolio reels
- **Songwriters / Composers** — Demo vaults, writing session recordings, timestamped proof of creation
- **Labels / Distributors** — Master catalog management, licensing-ready asset libraries
- **Music Publishers** — Sync licensing catalogs, rights documentation

### 3. Film, Video & Visual Production
- **Filmmakers / Directors** — Rushes, dailies, cut archives, director's reels
- **Cinematographers / DPs** — Portfolio vaults, shot libraries
- **Editors / Post-Production** — Version control for edits, client review portals
- **VFX / Animation Studios** — Asset libraries, project archives
- **Production Companies** — Multi-project archives, client deliverables
- **Actors / Talent** — Audition tapes, showreels, self-tape vaults

### 4. Photography & Visual Art
- **Photographers** — Client galleries, proof vaults, portfolio archives
- **Digital Artists / Illustrators** — Portfolio storage, commission deliverables
- **Galleries / Curators** — Digital exhibition archives, provenance tracking
- **Art Directors / Creative Directors** — Campaign asset libraries, mood board vaults

### 5. Audio & Podcasting
- **Podcasters** — Episode archives, raw recording vaults, guest content libraries
- **Voice Actors** — Demo reels, project deliverables
- **Audiobook Narrators / Publishers** — Chapter archives, master recordings
- **Sound Designers** — Sound libraries, project assets
- **Radio / Broadcast** — Show archives, segment libraries

### 6. Education & Training
- **Instructors / Coaches** — Lesson recordings, curriculum libraries
- **Online Course Creators** — Module vaults, student-gated content
- **Schools / Universities** — Lecture archives, recital recordings, student portfolios
- **Corporate Training** — Onboarding video libraries, compliance training archives

### 7. Legal & Intellectual Property
- **IP Attorneys** — Timestamped proof of creation, chain of custody documentation
- **Rights Management Organizations** — Catalog tracking, licensing documentation
- **Copyright Registrars** — On-chain provenance as supplemental registration evidence
- **Dispute Resolution** — Immutable creation timestamps for ownership disputes

### 8. Sports & Athletics
- **Athletes** — Game film, highlight reels, training footage
- **Coaches / Teams** — Practice archives, scouting footage, game breakdowns
- **Sports Agencies** — Client recruitment reels, contract documentation
- **Fans** — Personal recordings from games, tailgates, events

### 9. Corporate & Business
- **Businesses** — Private event documentation, product demos, investor presentations
- **Marketing / Ad Agencies** — Campaign asset vaults, client deliverables
- **PR Firms** — Media appearance archives, press event footage
- **Real Estate** — Property tour vaults, staging documentation
- **Construction / Architecture** — Project documentation, time-lapse archives

### 10. Personal & Family
- **Families** — Milestone vaults (weddings, births, graduations, reunions)
- **Memorial / Legacy** — Preserved memories for future generations
- **Travel** — Trip documentation, personal travel reels
- **Hobbyists / Creators** — Personal project archives

### 11. Platform & Infrastructure Partners
- **Cloud Storage Providers** — Backend storage infrastructure
- **CDN / Streaming Services** — Content delivery for playback
- **Blockchain / Web3 Infrastructure** — Provenance, identity, trust verification
- **Payment Processors** — Subscription billing, pay-per-view transactions
- **App Stores** — Distribution (Apple App Store, Google Play)
- **Device Manufacturers** — Camera/phone integration, hardware encoding

### 12. Regulatory & Compliance
- **Data Privacy (GDPR, CCPA)** — User content rights, data portability, deletion compliance
- **Content Moderation** — Terms of service enforcement, flagging systems
- **Age Verification** — Gated access for certain content categories
- **Export Controls** — International content distribution compliance

---

## Core Value Proposition Across All Verticals

The common thread: **any digital file that represents intellectual property needs a secure, immutable, trust-verified vault with provenance tracking — and the ability to showcase it when the creator chooses.**

This product is not just a video gallery. It is not just storage. It is a **creator's permanent, immutable showcase and vault** — where:
- **Ownership** is provable (blockchain provenance)
- **Access** is controlled by trust relationships (TrustLayer)
- **Identity** is verified (on-chain identity)
- **Files** are stored securely (encrypted, private, with audit trails)
- **Sharing** is intentional, not accidental (trust-gated, not public-by-default)
- **Permanence** is guaranteed — immutable, cannot be erased, altered, or disputed
- **Showcase mode** lets creators go public on their terms — editable presentation, curated galleries, professional portfolio view
- **Vault mode** keeps everything locked, private, and protected until the creator decides otherwise

### The Dual Nature: Vault + Showcase

Every creator needs two things:
1. A **vault** — where the raw work lives, protected, permanent, provable. Demos, drafts, masters, originals, contracts, session recordings. Private by default. Immutable.
2. A **showcase** — where the finished work shines. A curated, editable, professional presentation the creator controls completely. Public when they choose. Their portfolio, their gallery, their storefront.

Most platforms force you to choose one or the other. This does both — and the creator controls the line between them.

### What "Immutable and Permanent" Means
- Once a file enters the vault, its existence and timestamp are recorded on-chain
- The original file cannot be altered or deleted from the provenance record
- The creator can choose to hide, archive, or remove from showcase — but the proof of creation remains forever
- This protects creators in disputes, licensing negotiations, and rights management
- This is not "cloud storage that might shut down" — this is permanent record, backed by blockchain

### All Media Types
The vault and showcase support every form of digital intellectual property:
- Video (concerts, films, reels, demos, tutorials)
- Audio (music, podcasts, voice work, sound design)
- Images (photography, art, design, architecture)
- Documents (contracts, scripts, manuscripts, blueprints)
- Mixed media (presentations, portfolios, collections)

This positions the product as infrastructure for the creator economy, the legal profession, corporate enterprise, education, sports, and personal use — all unified under the TrustLayer ecosystem.

---

## Notes

- Current web version serves as functional prototype and Madeline's personal vault
- React Native + Expo is the target for production standalone app
- All future development should align with TrustLayer ecosystem architecture
- UI/UX requirements are strict and consistent — document and enforce across builds
- Every vertical identified above represents a potential market segment, partnership opportunity, or feature branch
- The product name may evolve beyond "Concert Memories" as it expands to cover all verticals
