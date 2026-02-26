import { type ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "wouter";
import {
  Vault, Image, Music, Video, Layers,
  Sparkles, FolderOpen, Radio, CreditCard,
  FileText, Map, LogOut, Wrench,
  ArrowRight, X, Check, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useMediaItems, useCollections } from "@/hooks/use-media";
import { TiltCard } from "@/components/TiltCard";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { VideoHero } from "@/components/VideoHero";

import trustlayerEmblem from "../assets/images/trustvault-emblem.png";
import exploreVault from "../assets/images/explore-vault.png";
import exploreImageEditor from "../assets/images/explore-image-editor.png";
import exploreAudioEditor from "../assets/images/explore-audio-editor.png";
import exploreVideoEditor from "../assets/images/explore-video-editor.png";
import exploreAiTools from "../assets/images/explore-ai-tools.png";
import exploreBlog from "../assets/images/explore-blog.png";
import exploreChat from "../assets/images/explore-chat.png";
import explorePricing from "../assets/images/explore-pricing.png";
import exploreMerge from "../assets/images/explore-merge.png";
import exploreRoadmap from "../assets/images/explore-roadmap.png";

function getGreeting(): string {
  const now = new Date();
  const centralHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Chicago",
    }).format(now),
    10
  );
  if (centralHour >= 5 && centralHour < 12) return "Good morning";
  if (centralHour >= 12 && centralHour < 17) return "Good afternoon";
  return "Good evening";
}

interface ExploreCard {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  image: string;
  gradient: string;
  glowColor: string;
  badge?: string;
  stat?: string;
  featured?: boolean;
  demoFeatures?: string[];
  demoDescription?: string;
}

const DEMO_DATA: Record<string, { description: string; features: string[] }> = {
  "Media Vault": {
    description: "Your central hub for all digital media. Upload, organize, preview, and manage images, audio, video, and documents — all in one secure, multi-tenant space.",
    features: [
      "Drag & drop upload with presigned URL streaming",
      "Grid and list view with live previews",
      "Category filtering — images, audio, video, documents",
      "Tag-based organization with smart search",
      "Collections for grouping related files",
      "Timeline view for chronological browsing",
      "Bulk actions — download, delete, tag multiple files",
      "Date range filtering and advanced sorting",
      "Full modal media viewer with playback controls",
      "Multi-tenant isolation — your files stay private",
    ],
  },
  "Image Editor": {
    description: "A full-featured image editor rivaling professional tools. From quick adjustments to AI-powered enhancements, everything runs right in your browser.",
    features: [
      "Crop, rotate, flip, and resize",
      "16 built-in filters — Vintage, Noir, Vivid, Retro Pop, and more",
      "Manual color grading — brightness, contrast, saturation, temperature",
      "AI Auto-Enhance — one-click professional optimization",
      "AI Background Removal — isolate subjects instantly",
      "AI Smart Erase — remove unwanted objects",
      "Magic Aspect Ratio Fill — AI-matched gradient expansion",
      "Voice-commanded editing via Web Speech API",
      "Text overlays with custom fonts, sizes, and colors",
      "Freehand drawing with adjustable brush and eraser",
      "Sticker overlays — stars, hearts, arrows, lightning",
      "Style presets — Portrait, Landscape, Food, Night, Cinematic",
      "Full undo/redo history",
      "Before/after comparison mode",
    ],
  },
  "Audio Editor": {
    description: "Professional audio editing powered by the Web Audio API. Trim, mix, and master your tracks with real-time effects and a visual waveform editor.",
    features: [
      "Interactive waveform visualizer with trim handles",
      "Fade in and fade out controls",
      "3-band EQ — bass, mid, treble adjustments",
      "Reverb with adjustable wet/dry mix",
      "Noise gate for cleaning up audio",
      "Volume control from 0% to 200%",
      "Adjustable playback speed (0.5x to 2.0x)",
      "Audio presets — Podcast Voice, Music Boost, Lo-Fi, Concert Hall",
      "Full undo/redo history",
      "Export to WAV format",
    ],
  },
  "Video Editor": {
    description: "Color grade and trim your video clips with real-time preview. Apply cinematic looks and capture perfect frames from any moment in your footage.",
    features: [
      "Timeline trimming with visual handles",
      "Color grading — brightness, contrast, saturation, hue",
      "Temperature and vignette adjustments",
      "Cinematic presets — Film, Vintage, Noir, Warm Sunset",
      "Frame capture — save any moment as a still image",
      "Adjustable playback speed (0.5x to 2.0x)",
      "Before/after comparison toggle",
      "Skip forward/backward, mute, fullscreen controls",
      "Full undo/redo history",
    ],
  },
  "Merge Studio": {
    description: "Combine your media into finished projects. Create image collages, join audio tracks, or concatenate video clips — all in one guided workflow.",
    features: [
      "Image collage — 2x2, 3x3, 2x1, 1x2, auto layouts",
      "Adjustable gap and background color for collages",
      "Audio concatenation with crossfade transitions",
      "Video merging with 17 transition effects (fade, dissolve, wipe, slide, circle, radial, smooth)",
      "Configurable transition duration (0.2s to 3s)",
      "Smart aspect ratio handling across all merge types",
      "Real-time preview before exporting",
      "Automatic upload of finished projects to your vault",
    ],
  },
  "AI Creative Tools": {
    description: "A suite of AI-powered creative tools that analyze, enhance, and transform your media using advanced vision and language models.",
    features: [
      "AI Auto-Tag — automatic tagging on upload using vision analysis",
      "AI Smart Search — find files with natural language queries",
      "AI Caption Generator — descriptive, social, or professional captions",
      "Social Media Kit — generate 5 platform-optimized image sizes",
      "Audio Visualizer — real-time visualization with 5 styles",
      "Beat-Sync Video Maker — sync photo transitions to music beats",
      "Thumbnail Ranker — AI scores images for social media impact",
      "Portfolio Generator — AI curates your best work",
      "Style DNA — analyze your aesthetic across all your photos",
    ],
  },
  "Collections": {
    description: "Organize your files into themed collections. Group related media together for easy access and streamlined project management.",
    features: [
      "Create unlimited collections",
      "Add any media type to a collection",
      "Browse collections in a dedicated view",
      "Drag and drop to organize",
      "Quick access from the vault sidebar",
    ],
  },
  "Blog": {
    description: "A built-in content platform with AI-powered article creation. Write, edit, and publish blog posts to share with your audience.",
    features: [
      "AI-powered content generation via OpenAI",
      "Rich text editing with formatting tools",
      "Public blog with SEO-friendly URLs",
      "Admin dashboard for managing posts",
      "Draft and publish workflow",
    ],
  },
  "Signal Chat": {
    description: "Real-time secure messaging across the entire TrustLayer ecosystem. Connect with other users through channel-based conversations.",
    features: [
      "Real-time WebSocket messaging",
      "Channel-based conversations",
      "Typing indicators and presence tracking",
      "JWT-authenticated single sign-on",
      "Cross-app ecosystem messaging",
    ],
  },
  "Plans & Pricing": {
    description: "Choose the plan that fits your creative needs. From free to studio-level, each tier unlocks more storage, features, and AI capabilities.",
    features: [
      "Free tier — get started with basic features",
      "Personal — expanded storage and editing tools",
      "Pro — full AI suite and advanced features",
      "Studio — unlimited everything, priority support",
      "Stripe-powered secure checkout",
      "Manage subscriptions via customer portal",
    ],
  },
  "Roadmap": {
    description: "See what's coming next for TrustVault. Explore upcoming features, planned integrations, and the vision for the platform.",
    features: [
      "Phase-by-phase development timeline",
      "Upcoming feature previews",
      "Blockchain integration roadmap",
      "Native app development plans",
      "Community feedback integration",
    ],
  },
};

function DemoModal({ card, onClose, onSignIn }: { card: ExploreCard; onClose: () => void; onSignIn: () => void }) {
  const demo = DEMO_DATA[card.title];
  if (!demo) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10"
        style={{ background: "linear-gradient(135deg, #0c1222, #111827, #0c1222)" }}
      >
        <div className="relative h-48 overflow-hidden rounded-t-2xl">
          <img src={card.image} alt={card.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c1222] via-black/40 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
            data-testid="button-demo-close"
          >
            <X className="size-4" />
          </button>
          <div className="absolute bottom-4 left-5 flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${card.gradient} text-white shadow-lg`}>
              {card.icon}
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">{card.title}</h3>
              {card.badge && (
                <Badge className="text-[10px] bg-white/15 text-white border-white/20 mt-1 no-default-hover-elevate no-default-active-elevate">
                  {card.badge}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-white/70 text-sm leading-relaxed">{demo.description}</p>

          <div>
            <h4 className="text-white/90 text-xs font-semibold uppercase tracking-wider mb-3">What's included</h4>
            <div className="space-y-2">
              {demo.features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="flex items-start gap-2.5"
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-gradient-to-br ${card.gradient}`}>
                    <Check className="size-3 text-white" />
                  </div>
                  <span className="text-white/65 text-sm leading-snug">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="pt-2 pb-1 space-y-3">
            <Button
              onClick={onSignIn}
              className={`w-full bg-gradient-to-r ${card.gradient} hover:opacity-90 text-white font-semibold h-11`}
              data-testid="button-demo-signin"
            >
              <Lock className="size-4 mr-2" />
              Sign In to Use {card.title}
            </Button>
            <button
              onClick={onClose}
              className="w-full text-center text-white/40 text-xs hover:text-white/60 transition-colors"
              data-testid="button-demo-back"
            >
              Back to Explorer
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function useStats() {
  const { data: mediaItems } = useMediaItems();
  const { data: collections } = useCollections();
  const items = mediaItems || [];
  return {
    totalCount: items.length,
    imageCount: items.filter((m: any) => m.category === "image").length,
    audioCount: items.filter((m: any) => m.category === "audio").length,
    videoCount: items.filter((m: any) => m.category === "video").length,
    collectionCount: (collections || []).length,
  };
}

function ExploreCardComponent({ card, index, loggedIn, onDemo }: { card: ExploreCard; index: number; loggedIn: boolean; onDemo: (card: ExploreCard) => void }) {
  const [, navigate] = useLocation();
  const soundFeedback = useSoundFeedback();

  return (
    <TiltCard
      tiltAmount={6}
      glareEnabled
      onClick={() => { soundFeedback("click"); if (loggedIn) navigate(card.href); else onDemo(card); }}
      className={`group rounded-2xl overflow-hidden cursor-pointer ${card.featured ? "sm:col-span-2 sm:row-span-2" : ""}`}
      style={{ minHeight: card.featured ? "280px" : "220px" }}
      data-testid={`card-explore-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, delay: index * 0.05, ease: "easeOut" }}
        className="h-full"
      >
        <img
          src={card.image}
          alt={card.title}
          className="absolute inset-0 w-full h-full object-cover brightness-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/15" />

        {card.badge && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="text-[10px] bg-white/15 text-white border-white/20 backdrop-blur-sm no-default-hover-elevate no-default-active-elevate">
              {card.badge}
            </Badge>
          </div>
        )}

        {card.stat && (
          <div className="absolute top-3 left-3 z-10">
            <Badge className="text-[10px] bg-white/10 text-white/80 border-white/10 backdrop-blur-sm no-default-hover-elevate no-default-active-elevate">
              {card.stat}
            </Badge>
          </div>
        )}

        <div className="relative z-10 h-full flex flex-col justify-end p-5 gap-2">
          <div className={`
            w-11 h-11 rounded-xl flex items-center justify-center
            bg-gradient-to-br ${card.gradient}
            text-white shadow-lg
          `}>
            {card.icon}
          </div>
          <div>
            <h3 className="text-white font-bold text-base leading-tight">{card.title}</h3>
            <p className="text-white/55 text-sm mt-1 leading-snug">{card.description}</p>
          </div>
        </div>

        <div className={`
          absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
          transition-opacity duration-300 shadow-2xl ${card.glowColor}
          pointer-events-none
        `} />
      </motion.div>
    </TiltCard>
  );
}

export default function Explorer() {
  const { user, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const stats = useStats();
  const [demoCard, setDemoCard] = useState<ExploreCard | null>(null);

  if (isLoading) {
    return (
      <>
        <Helmet><title>Explore | TrustVault</title></Helmet>
        <div className="min-h-screen px-4 py-20" style={{ background: "linear-gradient(135deg, #070b16, #0c1222, #070b16)" }}>
          <div className="max-w-6xl mx-auto">
            <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse mx-auto mb-2" />
            <div className="h-4 w-72 bg-white/5 rounded animate-pulse mx-auto mb-10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4,5,6,7,8,9,10].map(i => (
                <div key={i} className={`rounded-2xl bg-white/5 animate-pulse ${i === 1 ? "sm:col-span-2 sm:row-span-2 h-[280px]" : "h-[220px]"}`} />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  const loggedIn = !!user;

  const cards: ExploreCard[] = [
    {
      title: "Media Vault",
      description: "Browse, upload, and organize all your digital media in one secure place",
      href: "/vault",
      icon: <Vault className="size-6" />,
      image: exploreVault,
      gradient: "from-violet-500 to-purple-600",
      glowColor: "shadow-violet-500/30",
      badge: "Home Base",
      stat: stats.totalCount > 0 ? `${stats.totalCount} files` : undefined,
      featured: true,
    },
    {
      title: "Image Editor",
      description: "Crop, filter, color grade, and transform your images",
      href: "/vault?category=image",
      icon: <Image className="size-5" />,
      image: exploreImageEditor,
      gradient: "from-pink-500 to-rose-500",
      glowColor: "shadow-pink-500/30",
      stat: stats.imageCount > 0 ? `${stats.imageCount} images` : undefined,
    },
    {
      title: "Audio Editor",
      description: "Trim, EQ, fade, reverb, and master your audio",
      href: "/vault?category=audio",
      icon: <Music className="size-5" />,
      image: exploreAudioEditor,
      gradient: "from-emerald-500 to-teal-500",
      glowColor: "shadow-emerald-500/30",
      stat: stats.audioCount > 0 ? `${stats.audioCount} tracks` : undefined,
    },
    {
      title: "Video Editor",
      description: "Trim, color grade, and capture frames from video",
      href: "/vault?category=video",
      icon: <Video className="size-5" />,
      image: exploreVideoEditor,
      gradient: "from-orange-500 to-amber-500",
      glowColor: "shadow-orange-500/30",
      stat: stats.videoCount > 0 ? `${stats.videoCount} videos` : undefined,
    },
    {
      title: "Merge Studio",
      description: "Combine images, audio, and video into finished projects",
      href: "/merge",
      icon: <Layers className="size-5" />,
      image: exploreMerge,
      gradient: "from-cyan-500 to-blue-500",
      glowColor: "shadow-cyan-500/30",
      badge: "Pro",
    },
    {
      title: "AI Creative Tools",
      description: "Auto-tag, smart search, enhance, captions, and more",
      href: "/vault?ai=search",
      icon: <Sparkles className="size-5" />,
      image: exploreAiTools,
      gradient: "from-indigo-500 to-violet-500",
      glowColor: "shadow-indigo-500/30",
      badge: "AI",
    },
    {
      title: "Collections",
      description: "Organize your files into smart collections",
      href: "/vault?view=collections",
      icon: <FolderOpen className="size-5" />,
      image: explorePricing,
      gradient: "from-yellow-500 to-orange-500",
      glowColor: "shadow-yellow-500/30",
      stat: stats.collectionCount > 0 ? `${stats.collectionCount} collections` : undefined,
    },
    {
      title: "Blog",
      description: "Read and publish articles with AI-powered content creation",
      href: "/blog",
      icon: <FileText className="size-5" />,
      image: exploreBlog,
      gradient: "from-emerald-500 to-green-500",
      glowColor: "shadow-emerald-500/30",
      badge: "Live",
    },
    {
      title: "Signal Chat",
      description: "Real-time ecosystem-wide secure messaging",
      href: "/chat",
      icon: <Radio className="size-5" />,
      image: exploreChat,
      gradient: "from-amber-500 to-orange-500",
      glowColor: "shadow-amber-500/30",
      badge: "Live",
    },
    {
      title: "Plans & Pricing",
      description: "View subscription tiers and manage your account",
      href: "/pricing",
      icon: <CreditCard className="size-5" />,
      image: explorePricing,
      gradient: "from-yellow-500 to-amber-500",
      glowColor: "shadow-yellow-500/30",
    },
    {
      title: "Roadmap",
      description: "See what's coming next and share your feedback",
      href: "/roadmap",
      icon: <Map className="size-5" />,
      image: exploreRoadmap,
      gradient: "from-fuchsia-500 to-pink-500",
      glowColor: "shadow-fuchsia-500/30",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Explore | TrustVault</title>
        <meta name="description" content="Explore all of TrustVault's creative tools, media management, AI features, and more." />
      </Helmet>

      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #070b16, #0c1222, #070b16)" }}>
        <header
          className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
          style={{ background: "rgba(7, 11, 22, 0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
        >
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <img src={trustlayerEmblem} alt="TrustVault" className="w-8 h-8 rounded-lg object-cover shrink-0" />
              <div className="min-w-0">
                <h1 className="text-white font-bold text-sm truncate" data-testid="text-explore-title">Explore</h1>
                <p className="text-white/40 text-[10px] truncate">TrustVault</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {loggedIn ? (
                <>
                  <span className="text-white/50 text-xs hidden sm:block" data-testid="text-explore-greeting">
                    {getGreeting()}, {user!.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/60"
                    onClick={() => { logout(); navigate("/"); }}
                    data-testid="button-explore-logout"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-500 text-white text-xs px-4"
                    data-testid="button-explore-signin"
                  >
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        <VideoHero>
          <h2 className="text-4xl sm:text-5xl font-bold text-white font-display drop-shadow-lg" data-testid="text-explore-heading">
            Explore TrustVault
          </h2>
          <p className="text-white/60 text-base mt-3 max-w-lg mx-auto drop-shadow">
            Your complete creative studio. Pick a tool to get started.
          </p>
        </VideoHero>

        <main className="max-w-6xl mx-auto px-4 pt-10 pb-20">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
              <ExploreCardComponent key={card.title} card={card} index={i} loggedIn={loggedIn} onDemo={setDemoCard} />
            ))}
          </div>

          {user?.isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="mt-12 flex justify-center"
            >
              <Link href="/developer">
                <button
                  className="group flex items-center gap-3 px-6 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300"
                  data-testid="button-developer-portal"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Wrench className="size-4 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-white text-sm font-semibold block">Developer Portal</span>
                    <span className="text-white/40 text-xs">Admin tools, ecosystem, and settings</span>
                  </div>
                  <ArrowRight className="size-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all duration-300" />
                </button>
              </Link>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center"
          >
            <p className="text-white/20 text-xs">
              Part of the Dark Wave Studios ecosystem &middot; darkwavestudios.io
            </p>
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {demoCard && (
          <DemoModal
            card={demoCard}
            onClose={() => setDemoCard(null)}
            onSignIn={() => { setDemoCard(null); navigate("/login"); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
