# Premium Protocol UI/UX Standard

**Last Updated:** February 2026  
**Applies To:** All TrustLayer Ecosystem Projects (Media Vault, Dark Wave Studios, TrustShield, Signal)

This document defines the premium UI/UX standard ("Protocol Layout") used across all projects in the TrustLayer ecosystem. Copy this into any new project as the design reference.

---

## Philosophy

- **Information-dense, never cluttered** — every element serves a purpose
- **Feature-rich, always intuitive** — powerful tools that feel simple
- **Visually premium, functionally grounded** — beauty in service of usability
- **Unified across the ecosystem** — consistent feel whether you're in the Vault, Studio, or Shield

---

## Core UI/UX Features

### 1. Haptic Feedback
Small vibrations triggered on mobile devices when the user taps buttons, toggles, selects items, or completes actions. Provides tactile confirmation that an input was registered. Implemented via the Web Vibration API (`navigator.vibrate()`).

### 2. Skeleton Loading (Shimmer)
Gray placeholder shapes that match the layout of incoming content, displayed while data loads. Often paired with a shimmer effect — a light sweep animation across the placeholder — to indicate activity. Prevents layout shift and feels faster than a spinner.

### 3. Page Transitions
Smooth animated shifts between views (fade, slide, scale) instead of hard page swaps. Creates a sense of spatial continuity. Implemented with Framer Motion's `AnimatePresence` for enter/exit animations on route changes.

### 4. Micro-Interactions
Tiny animations on interactive elements — button press scales, toggle flips, input focus glows, checkbox bounces, progress bar fills. These provide instant visual feedback and make the app feel alive and responsive. Subtle is key — just enough to notice.

### 5. Carousels
Horizontally scrollable content rows, swipeable on touch devices. Used for browsing collections of media, categories, or related items. Two types:

- **Standard Carousel** — edge-to-edge, content peeks from sides to signal scrollability
- **Self-Contained Carousel** — bounded within a card or section, with its own navigation arrows and dot indicators, operates independently within its container

### 6. Bento Grid
A modern asymmetric grid layout where cards are different sizes, arranged like compartments in a Japanese bento box. Larger feature items get more visual weight, smaller items fill remaining space. Creates visual hierarchy without strict uniformity. Think Apple product pages.

### 7. Accordion Sections
Expandable/collapsible content blocks. Click a header to reveal or hide its content. Used for FAQs, settings panels, metadata details, or any information that should be accessible but not always visible. Smooth height animation on open/close.

### 8. Dropdowns & Action Menus
Refined select menus and contextual action menus that appear on click. Animated open/close, proper focus management, keyboard navigation support. Used for filters, sort options, bulk actions, and context-specific operations.

### 9. Glassmorphism
Frosted glass effect on panels and overlays — translucent backgrounds with backdrop blur. Creates depth and layering. Used selectively on modals, floating toolbars, navigation overlays, and feature panels. Not overused — applied where it enhances hierarchy.

### 10. 3D Hover Effects (Tilt/Perspective)
Subtle 3D tilt effect on cards when hovering — the card appears to angle toward the cursor, creating a sense of physical depth. Combined with dynamic lighting/shadow shifts. Implemented via CSS transforms (`perspective`, `rotateX`, `rotateY`) tracking cursor position.

### 11. Tooltips & Info Bubbles
Contextual help that appears on hover (desktop) or tap (mobile) without cluttering the screen. Used wherever elements need descriptions, explanations, or additional context. Clean, consistent styling with subtle entrance animation. Positioned intelligently to avoid viewport edges.

### 12. Toast Notifications
Small slide-in messages that confirm completed actions ("File uploaded", "Changes saved", "Item deleted"). Appear briefly, auto-dismiss, and stack if multiple fire. Non-blocking — they don't interrupt workflow.

### 13. Pull-to-Refresh (Mobile)
Native-feeling gesture on mobile: pull down on content to trigger a refresh. Visual indicator (spinner or custom animation) appears during the pull and refresh cycle. Standard mobile UX pattern.

### 14. Parallax Scrolling
Depth effect where background elements move at a different speed than foreground content during scroll. Creates a sense of immersion and visual layering. Used sparingly — hero sections, landing pages, feature showcases. Not on every page.

### 15. Scroll-Triggered Animations
Elements animate into view as the user scrolls — fade up, slide in, scale up. Creates a sense of progressive reveal. Implemented with Intersection Observer API or Framer Motion's `whileInView`. Elements only animate on first appearance.

### 16. Loading Spinners & Progress Indicators
Custom-branded loading animations for operations that take time (file uploads, data processing). Progress bars with percentage for uploads. Skeleton loading for content, spinners for actions.

### 17. Floating Action Button (FAB)
A persistent, prominent button (usually bottom-right on mobile) for the primary action on each screen. In the vault: upload. Includes subtle hover/press animation and optional expanding menu for secondary actions.

### 18. Smooth Scrolling & Snap Points
CSS scroll-snap for carousel sections and full-page sections. Smooth scrolling behavior on anchor links. Creates a polished, controlled scrolling experience.

### 19. Blur & Depth Effects
Strategic use of backdrop blur, drop shadows, and layering to create visual depth hierarchy. Foreground elements float above background. Modals dim and blur the background. Important actions feel elevated.

### 20. Dynamic Theming / Color Switching
Ability to change the app's color scheme — not just dark/light mode but full palette customization. Predefined theme presets (e.g., "Midnight", "Ocean", "Ember", "Frost") and potentially custom color picker. Stored per user preference.

---

## Animation & Motion Guidelines

| Context | Duration | Easing | Notes |
|---------|----------|--------|-------|
| Button press | 100-150ms | ease-out | Scale down slightly, return |
| Page transition | 200-300ms | ease-in-out | Fade + slide direction |
| Modal open/close | 200-250ms | spring (light) | Scale + fade |
| Skeleton shimmer | 1.5-2s loop | linear | Continuous until loaded |
| Hover tilt (3D) | Real-time | none (tracking) | Follows cursor position |
| Toast appear | 300ms | spring | Slide in from edge |
| Accordion expand | 200-300ms | ease-out | Height animation |
| Scroll-triggered | 400-600ms | ease-out | One-time on first view |

### Motion Principles
- **Fast for feedback** — interactions respond in under 150ms
- **Medium for transitions** — page/view changes at 200-300ms
- **Slow for dramatic** — scroll reveals and hero animations at 400-600ms
- **Never block** — animations don't prevent the user from acting
- **Reduce motion** — respect `prefers-reduced-motion` system setting

---

## Layout Patterns

### Bento Grid Specifications
```
3-Column Desktop:
[ Large 2x2 ] [ Small 1x1 ]
              [ Small 1x1 ]
[ Small 1x1 ] [ Wide 2x1  ]

2-Column Tablet:
[ Large 2x2 ]
[ Small ] [ Small ]
[ Wide 2x1      ]

1-Column Mobile:
[ Full width ]
[ Full width ]
[ Full width ]
```

### Spacing System
- **Tight (4-8px):** Between related inline elements
- **Standard (12-16px):** Between cards, list items, form fields
- **Spacious (24-32px):** Between sections, major content blocks
- **Generous (48-64px):** Page-level section separation

---

## Color & Theming

### Theme Presets
Each theme defines a full palette of CSS custom properties:

| Theme | Primary | Accent | Background | Vibe |
|-------|---------|--------|------------|------|
| Midnight (Default) | Deep purple | Electric blue | Near-black | Dark, premium |
| Ocean | Teal | Cyan | Dark navy | Cool, deep |
| Ember | Warm orange | Gold | Dark charcoal | Warm, bold |
| Frost | Ice blue | Silver | Dark slate | Clean, minimal |
| Neon | Hot pink | Lime green | True black | Vibrant, edgy |
| Monochrome | White | Gray | Black | Stark, modern |

### Customization
- Theme selector in settings
- Preference persisted to database / local storage
- Smooth transition between themes (CSS transition on custom properties)
- All ecosystem apps share the same theme presets for consistency

---

## Responsive Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| Mobile | < 640px | Phone (primary upload device) |
| Tablet | 640-1024px | iPad, small laptops |
| Desktop | 1024-1440px | Standard monitors |
| Wide | > 1440px | Ultra-wide, 4K displays |

---

## Accessibility Requirements

- All interactive elements keyboard-navigable
- Focus indicators visible and styled consistently
- `prefers-reduced-motion` disables non-essential animations
- `prefers-color-scheme` respected for initial theme
- Minimum contrast ratios met (WCAG AA)
- Screen reader labels on icon-only buttons
- Touch targets minimum 44x44px on mobile

---

## Implementation Stack

| Feature | Library / Method |
|---------|-----------------|
| Page transitions | Framer Motion (`AnimatePresence`) |
| Micro-interactions | Framer Motion (`motion` components) |
| 3D hover effects | CSS `perspective` + `transform` with mouse tracking |
| Glassmorphism | CSS `backdrop-filter: blur()` + `bg-opacity` |
| Skeleton loading | Custom CSS animation or Tailwind pulse |
| Haptic feedback | Web Vibration API (`navigator.vibrate()`) |
| Carousels | Embla Carousel (already in deps) |
| Tooltips | Radix UI Tooltip (already in deps via shadcn) |
| Accordions | Radix UI Accordion (already in deps via shadcn) |
| Scroll animations | Framer Motion `whileInView` |
| Theming | CSS custom properties + React context |
| Toast notifications | shadcn/ui toast (already implemented) |

---

## Usage

Copy this file into any new TrustLayer ecosystem project's `docs/` folder. Reference it during design and development to ensure consistency across all products.
