# DWTL Premium UI System — Training Reference
## Purpose
This is the mandatory UI standard for every page, component, and feature across the DarkWave Trust Layer ecosystem. No exceptions. Every screen must feel like a premium fintech app — dark, glassy, responsive, animated, and polished.
---
## 1. Layout: True Bento Grid (3-Column)
```tsx
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
    {/* Cards go here */}
  </div>
</div>
```
Rules
- Mobile: 1 column, full-width cards
- Tablet (md): 2 columns
- Desktop (lg+): 3 columns
- Gap: gap-4 minimum, gap-6 preferred
- Container: Always container mx-auto px-4 sm:px-6 lg:px-8
- Featured/hero cards can span: md:col-span-2 or lg:col-span-3

## 2. Glassmorphism (GlassCard)
Always use `<GlassCard glow>` from `@/components/glass-card`.

```tsx
import { GlassCard } from "@/components/glass-card";
<GlassCard glow className="p-4 sm:p-6">
  {/* Content */}
</GlassCard>
```

Manual Glassmorphism (when GlassCard isn't suitable)
```tsx
<div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-6 shadow-2xl">
  {/* Content */}
</div>
```

Variants
- Default card: `bg-[rgba(12,18,36,0.65)] backdrop-blur-2xl border border-white/[0.08]`
- Stat card: `bg-white/[0.03] backdrop-blur-xl border border-white/5`
- Feature card: `bg-white/5 backdrop-blur-xl border border-white/10`
- Elevated card: Add `shadow-[0_0_40px_rgba(0,255,255,0.15)]`

## 3. Glow & 3D Hover Effects
GlassCard with glow prop
```tsx
<GlassCard glow> {/* Adds cyan glow border behind card */}
```

Hover border transitions
```tsx
className="hover:border-cyan-500/30 transition-all duration-300"
```

3D hover with Framer Motion
```tsx
import { motion } from "framer-motion";
<motion.div
  whileHover={{ scale: 1.02, y: -2 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>
  {/* Card content */}
</motion.div>
```

Shadow depth
```tsx
className="shadow-2xl hover:shadow-[0_0_60px_rgba(6,182,212,0.2)]"
```

## 4. Spacing & Padding
Page-level
```tsx
className="pt-20 pb-12" // Standard page with SiteNav
className="pb-12"       // Pages without SiteNav (Command Center)
```

Section margins
```tsx
className="mb-8"    // Between major sections
className="mb-4"    // Between sub-sections
className="mb-16"   // Between page-level sections with headers
```

Card padding
```tsx
className="p-4 sm:p-6"       // Standard card
className="p-6 sm:p-8"       // Feature/hero card
className="p-8 sm:p-10"      // Large showcase card
```

CRITICAL: Text never touches card edges
- Minimum p-4 on every card
- Content inside cards always has its own padding/margins
- Use px-4 or px-6 for text inside cards

## 5. Mobile-First Responsive Design
Breakpoint Strategy
- Base (mobile):  0px+     → 1 column, compact spacing
- sm:             640px+   → Slightly larger text/padding
- md:             768px+   → 2 columns, expanded layouts
- lg:             1024px+  → 3 columns, full desktop
- xl:             1280px+  → Maximum widths, extra spacing

Touch Targets
- Minimum 44px height/width for all interactive elements
- Buttons: h-10 sm:h-11 minimum
- Icon buttons: w-10 h-10 minimum
- List items with tap: py-3 minimum

Font Sizes (Responsive)
```tsx
// Headlines
className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
// Section headers
className="text-xl sm:text-2xl"
// Body text
className="text-sm sm:text-base"
// Small labels
className="text-[10px] sm:text-xs"
```

## 6. Carousels
Use Shadcn Carousel (embla-based) or Swiper for horizontal scrollable content:
```tsx
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

<Carousel opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}>
  <CarouselContent className="-ml-4">
    {items.map((item) => (
      <CarouselItem key={item.id} className="pl-4 basis-full sm:basis-[300px] md:basis-[340px]">
        <GlassCard glow className="p-4 sm:p-6">
          {/* Item content */}
        </GlassCard>
      </CarouselItem>
    ))}
  </CarouselContent>
  <CarouselPrevious className="bg-white/5 border-white/10 text-white hover:bg-white/10" />
  <CarouselNext className="bg-white/5 border-white/10 text-white hover:bg-white/10" />
</Carousel>
```

Mobile dots indicator
```tsx
<div className="flex sm:hidden items-center justify-center gap-1.5 mt-4">
  {Array.from({ length: count }).map((_, i) => (
    <button
      key={i}
      onClick={() => api?.scrollTo(i)}
      className={`rounded-full transition-all ${
        i === current
          ? "w-3 h-3 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
          : "w-2 h-2 bg-white/20 hover:bg-white/40"
      }`}
    />
  ))}
</div>
```

## 7. Accordions
```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

<Accordion type="single" collapsible className="space-y-2">
  <AccordionItem value="section-1" className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.03] backdrop-blur-xl">
    <AccordionTrigger className="px-4 sm:px-6 py-4 hover:bg-white/5 text-white font-semibold">
      Section Title
    </AccordionTrigger>
    <AccordionContent className="px-4 sm:px-6 pb-4 text-white/60 text-sm leading-relaxed">
      Content here
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

## 8. Animations & Motion
Page entrance
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
```

Staggered children
```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

<motion.div variants={container} initial="hidden" animate="show">
  {items.map(i => (
    <motion.div key={i} variants={item}>
      {/* Content */}
    </motion.div>
  ))}
</motion.div>
```

Scroll-triggered animations
```tsx
<motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-50px" }}
  transition={{ duration: 0.5 }}
>
```

Micro-interactions
```tsx
// Button press
<motion.button whileTap={{ scale: 0.95 }}>
// Icon hover
<motion.div whileHover={{ rotate: 15, scale: 1.1 }}>
// Badge pulse
<span className="animate-pulse" />
```

## 9. Shimmer/Skeleton Loading
```tsx
<div className="animate-pulse space-y-4">
  <div className="h-6 w-40 bg-white/5 rounded" />
  <div className="h-4 w-full bg-white/5 rounded" />
  <div className="h-4 w-3/4 bg-white/5 rounded" />
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-48 bg-white/[0.03] rounded-xl border border-white/5" />
    ))}
  </div>
</div>
```

## 10. Color Palette (DARK THEME ONLY)
Backgrounds
- Page background:     `bg-slate-950`  (#020617)
- Card background:     `bg-slate-900`  (#0f172a)
- Surface:             `bg-slate-900/50` or `bg-white/5`
- Elevated surface:    `bg-white/[0.03]` to `bg-white/[0.08]`

Brand Colors
- Primary (Cyan):      `text-cyan-400`   (#22d3ee)  — borders: `border-cyan-500/30`
- Secondary (Purple):  `text-purple-400` (#a78bfa)  — borders: `border-purple-500/30`
- Accent (Pink):       `text-pink-400`   (#f472b6)  — borders: `border-pink-500/30`

Text
- Primary text:        `text-white`
- Secondary text:      `text-white/70` or `text-slate-300`
- Muted text:          `text-white/50` or `text-slate-400`
- Subtle text:         `text-white/30` or `text-slate-500`

Semantic
- Success:             `text-green-400`   `bg-green-500/10`  `border-green-500/20`
- Warning:             `text-amber-400`   `bg-amber-500/10`  `border-amber-500/20`
- Error:               `text-red-400`     `bg-red-500/10`    `border-red-500/20`
- Info:                `text-blue-400`    `bg-blue-500/10`   `border-blue-500/20`

Gradients
```tsx
// Primary gradient text
className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
// Button gradients
className="bg-gradient-to-r from-cyan-500 to-purple-500"
className="bg-gradient-to-r from-purple-500 to-pink-500"
// Card icon backgrounds
className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20"
```

## 11. Premium Badges
```tsx
// Status badge with glow
<span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-500/15 border border-cyan-500/25 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.2)]">
  Live
</span>

// Gradient badge
<span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
  Premium
</span>

// Dot indicator badge
<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
  <span className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Active</span>
</div>
```

## 12. Tooltips
```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button className="...">Hover me</button>
    </TooltipTrigger>
    <TooltipContent className="bg-slate-800 border-white/10 text-white text-xs">
      <p>Helpful tooltip text</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## 13. Dynamic Theming
Each PWA sets its own theme color and accent:
```tsx
// Trust Layer (default)
Primary: cyan-400/500, Secondary: purple-400/500
// The Veil
Primary: purple-400/500, Secondary: pink-400/500
// Chronicles
Primary: amber-400/500, Secondary: orange-400/500
// Guardian
Primary: green-400/500, Secondary: cyan-400/500
```

## 14. Component Checklist
Every interactive component MUST include:
- [ ] `<GlassCard glow>` wrapper (or manual glassmorphism)
- [ ] `data-testid` on all interactive elements
- [ ] `motion.div` wrapper for entrance animations
- [ ] Responsive padding: `p-4 sm:p-6`
- [ ] Responsive text: mobile-first sizing
- [ ] Minimum 44px touch targets
- [ ] Hover states with transitions
- [ ] Loading/skeleton state
- [ ] Error state display

## 15. Page Template
```tsx
import { motion } from "framer-motion";
import { GlassCard } from "@/components/glass-card";

export default function PageName() {
  return (
    <div className="min-h-screen pt-20 pb-12" style={{ background: "linear-gradient(180deg, #020617, #0c1222, #020617)" }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero / Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Page Title
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-2xl mx-auto">
            Page description goes here
          </p>
        </motion.div>

        {/* Bento Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <GlassCard glow className="p-4 sm:p-6">
            {/* Card content */}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
```

## 16. Anti-Patterns (NEVER DO THESE)
- Never use `bg-white` or light backgrounds
- Never use `text-black` as primary text
- Never leave text touching card edges (always pad)
- Never use cards without borders (`border border-white/10` minimum)
- Never skip `backdrop-blur` on glass cards
- Never use raw `<div>` for cards — use `<GlassCard>` or manual glassmorphism
- Never hardcode pixel widths on responsive layouts
- Never use animation loops that cause strobing/flashing on mobile
- Never skip `data-testid` on interactive elements
- Never use font sizes below `text-[9px]` — readability matters
- Never use horizontal scroll on pages without explicit carousel patterns

---
**HOW TO USE:** This skill is automatically referenced for every page built in the DarkWave Trust Layer ecosystem. All pages, components, and features must follow these standards.
