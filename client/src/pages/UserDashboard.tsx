import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, LogOut,
  Vault, Image, Music, Video, Layers,
  Sparkles, FolderOpen, User, Search,
  Wand2, MessageSquareText, CreditCard,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useMediaItems, useCollections } from "@/hooks/use-media";
import trustlayerEmblem from "../assets/images/trustvault-emblem.png";
import dashVault from "../assets/images/dash-vault.png";
import dashImageEditor from "../assets/images/dash-image-editor.png";
import dashAudioEditor from "../assets/images/dash-audio-editor.png";
import dashVideoEditor from "../assets/images/dash-video-editor.png";
import dashCombine from "../assets/images/dash-combine.png";
import dashCollections from "../assets/images/dash-collections.png";
import dashAiTools from "../assets/images/dash-ai-tools.png";
import dashAccount from "../assets/images/dash-account.png";

interface DashCard {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  image: string;
  gradient: string;
  glowColor: string;
  badge?: string;
  stat?: string;
}

function useStats() {
  const { data: mediaItems } = useMediaItems();
  const { data: collections } = useCollections();

  const items = mediaItems || [];
  const imageCount = items.filter((m: any) => m.category === "image").length;
  const audioCount = items.filter((m: any) => m.category === "audio").length;
  const videoCount = items.filter((m: any) => m.category === "video").length;
  const totalCount = items.length;
  const collectionCount = (collections || []).length;

  return { totalCount, imageCount, audioCount, videoCount, collectionCount };
}

function DashboardCard({ card, index }: { card: DashCard; index: number }) {
  const [, navigate] = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
      onClick={() => navigate(card.href)}
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ minHeight: "220px" }}
      data-testid={`card-dash-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <img
        src={card.image}
        alt={card.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />

      {card.badge && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="text-[10px] bg-white/15 text-white border-white/20">
            {card.badge}
          </Badge>
        </div>
      )}

      {card.stat && (
        <div className="absolute top-3 left-3 z-10">
          <Badge variant="secondary" className="text-[10px] bg-white/10 text-white/80 border-white/10">
            {card.stat}
          </Badge>
        </div>
      )}

      <div className="relative z-10 h-full flex flex-col justify-end p-4 gap-2">
        <div className={`
          w-10 h-10 rounded-xl flex items-center justify-center
          bg-gradient-to-br ${card.gradient}
          text-white shadow-lg
        `}>
          {card.icon}
        </div>
        <div>
          <h3 className="text-white font-semibold text-base leading-tight">{card.title}</h3>
          <p className="text-white/55 text-xs mt-1 leading-snug">{card.description}</p>
        </div>
      </div>

      <div className={`
        absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
        transition-opacity duration-300 shadow-2xl ${card.glowColor}
        pointer-events-none
      `} />
    </motion.div>
  );
}

export default function UserDashboard() {
  const { user, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const stats = useStats();

  if (isLoading) {
    return (
      <>
        <Helmet><title>My Studio | DW Media Studio</title></Helmet>
        <div className="min-h-screen px-4 py-20" style={{ background: "linear-gradient(135deg, #070b16, #0c1222, #070b16)" }}>
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-10">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="h-[220px] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  const cards: DashCard[] = [
    {
      title: "My Vault",
      description: "Browse, upload, and organize all your media files",
      href: "/vault",
      icon: <Vault className="size-5" />,
      image: dashVault,
      gradient: "from-violet-500 to-purple-600",
      glowColor: "shadow-violet-500/30",
      badge: "Home Base",
      stat: `${stats.totalCount} files`,
    },
    {
      title: "Image Editor",
      description: "Crop, filter, color grade, annotate, and transform your images",
      href: "/vault?category=image",
      icon: <Image className="size-5" />,
      image: dashImageEditor,
      gradient: "from-pink-500 to-rose-500",
      glowColor: "shadow-pink-500/30",
      stat: stats.imageCount > 0 ? `${stats.imageCount} images` : undefined,
    },
    {
      title: "Audio Editor",
      description: "Trim, EQ, fade, reverb, and master your audio tracks",
      href: "/vault?category=audio",
      icon: <Music className="size-5" />,
      image: dashAudioEditor,
      gradient: "from-emerald-500 to-teal-500",
      glowColor: "shadow-emerald-500/30",
      stat: stats.audioCount > 0 ? `${stats.audioCount} tracks` : undefined,
    },
    {
      title: "Video Editor",
      description: "Trim, color grade, and capture frames from your videos",
      href: "/vault?category=video",
      icon: <Video className="size-5" />,
      image: dashVideoEditor,
      gradient: "from-orange-500 to-amber-500",
      glowColor: "shadow-orange-500/30",
      stat: stats.videoCount > 0 ? `${stats.videoCount} videos` : undefined,
    },
    {
      title: "Combine Media",
      description: "Merge images, audio, and video into finished projects",
      href: "/merge",
      icon: <Layers className="size-5" />,
      image: dashCombine,
      gradient: "from-cyan-500 to-blue-500",
      glowColor: "shadow-cyan-500/30",
      badge: "Pro",
    },
    {
      title: "Collections",
      description: "Organize your files into groups and share them",
      href: "/vault?view=collections",
      icon: <FolderOpen className="size-5" />,
      image: dashCollections,
      gradient: "from-yellow-500 to-orange-500",
      glowColor: "shadow-yellow-500/30",
      stat: stats.collectionCount > 0 ? `${stats.collectionCount} collections` : undefined,
    },
    {
      title: "AI Tools",
      description: "Smart search, auto-tagging, enhance, and caption generation",
      href: "/vault?ai=search",
      icon: <Sparkles className="size-5" />,
      image: dashAiTools,
      gradient: "from-indigo-500 to-violet-500",
      glowColor: "shadow-indigo-500/30",
      badge: "AI",
    },
    {
      title: "My Account",
      description: "Subscription, profile settings, and password management",
      href: "/pricing",
      icon: <User className="size-5" />,
      image: dashAccount,
      gradient: "from-slate-500 to-zinc-500",
      glowColor: "shadow-slate-500/30",
    },
  ];

  return (
    <>
      <Helmet>
        <title>My Studio | DW Media Studio</title>
        <meta name="description" content="Your personal creative studio dashboard - access all your media tools from one place." />
      </Helmet>

      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #070b16, #0c1222, #070b16)" }}>
        <header
          className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
          style={{ background: "rgba(7, 11, 22, 0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
        >
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <img src={trustlayerEmblem} alt="DW Media Studio" className="w-8 h-8 rounded-lg object-cover shrink-0" />
              <div className="min-w-0">
                <h1 className="text-white font-bold text-sm truncate" data-testid="text-dashboard-title">My Studio</h1>
                <p className="text-white/40 text-[10px] truncate">DW Media Studio</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/50 text-xs hidden sm:block" data-testid="text-welcome-user">
                Welcome, {user.name}
              </span>
              {user.isAdmin && (
                <Link href="/command-center">
                  <Button variant="ghost" size="icon" className="text-white/60" data-testid="button-command-center">
                    <LayoutGrid className="size-4" />
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white/60"
                onClick={() => { logout(); navigate("/"); }}
                data-testid="button-dashboard-logout"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-6"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-display" data-testid="text-studio-heading">
              Your Creative Studio
            </h2>
            <p className="text-white/50 text-sm mt-2 max-w-md mx-auto">
              Pick a tool to get started. Edit your pieces, then combine them into finished projects.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
              <DashboardCard key={card.title} card={card} index={i} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 text-center"
          >
            <p className="text-white/30 text-xs">
              Edit individually, then combine. All your creative work flows through here.
            </p>
          </motion.div>
        </main>
      </div>
    </>
  );
}
