import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "wouter";
import {
  Vault, Image, Music, Video, Layers,
  Sparkles, FolderOpen, Radio, CreditCard,
  FileText, Map, LogOut, Wrench,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useMediaItems, useCollections } from "@/hooks/use-media";
import { TiltCard } from "@/components/TiltCard";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";

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

function ExploreCardComponent({ card, index }: { card: ExploreCard; index: number }) {
  const [, navigate] = useLocation();
  const soundFeedback = useSoundFeedback();

  return (
    <TiltCard
      tiltAmount={6}
      glareEnabled
      onClick={() => { soundFeedback("click"); navigate(card.href); }}
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

  if (!user) {
    navigate("/");
    return null;
  }

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
              <span className="text-white/50 text-xs hidden sm:block" data-testid="text-explore-greeting">
                {getGreeting()}, {user.name}
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
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 pt-20 pb-20">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-6"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-display" data-testid="text-explore-heading">
              Explore TrustVault
            </h2>
            <p className="text-white/50 text-sm mt-2 max-w-md mx-auto">
              Your complete creative studio. Pick a tool to get started.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
              <ExploreCardComponent key={card.title} card={card} index={i} />
            ))}
          </div>

          {user.isAdmin && (
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
    </>
  );
}
