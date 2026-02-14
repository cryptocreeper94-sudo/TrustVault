import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft, Lock, LogOut, Loader2,
  Vault, Upload, FolderOpen, HardDrive,
  Image, Music, Video, Layers,
  Sparkles, Search, Wand2, MessageSquareText,
  FileText, PenTool, Bot,
  Globe, Wallet, Radio, Shield,
  Users, UserPlus, Mail, KeyRound,
  Map, BarChart3, Activity, CreditCard,
  Newspaper, Send, Settings, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import ccVaultOps from "@assets/images/cc-vault-ops.png";
import ccMediaStudio from "@assets/images/cc-media-studio.png";
import ccAiTools from "@assets/images/cc-ai-tools.png";
import ccPublishing from "@assets/images/cc-publishing.png";
import ccEcosystem from "@assets/images/cc-ecosystem.png";
import ccAccess from "@assets/images/cc-access.png";
import ccFinance from "@assets/images/cc-finance.png";
import ccRoadmap from "@assets/images/cc-roadmap.png";
import trustlayerEmblem from "@assets/images/trustvault-emblem.png";

interface LaunchCard {
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
  image: string;
  glowColor: string;
  badge?: string;
  featured?: boolean;
}

interface Category {
  title: string;
  icon: ReactNode;
  gradient: string;
  description: string;
  cards: LaunchCard[];
}

const categories: Category[] = [
  {
    title: "Vault Operations",
    icon: <Vault className="size-4" />,
    gradient: "from-violet-500 to-purple-500",
    description: "Your central media vault. Upload, organize, browse, and manage all your digital files from one powerful hub.",
    cards: [
      {
        label: "Open Vault",
        description: "Browse your complete media library",
        href: "/",
        icon: <Vault className="size-5" />,
        image: ccVaultOps,
        glowColor: "shadow-violet-500/30",
        badge: "Core",
        featured: true,
      },
      {
        label: "Upload Center",
        description: "Upload files to your vault",
        href: "/?action=upload",
        icon: <Upload className="size-5" />,
        image: ccVaultOps,
        glowColor: "shadow-blue-500/20",
      },
      {
        label: "Collections",
        description: "Organize files into smart collections",
        href: "/?view=collections",
        icon: <FolderOpen className="size-5" />,
        image: ccVaultOps,
        glowColor: "shadow-cyan-500/20",
      },
      {
        label: "Storage Usage",
        description: "Monitor your vault capacity",
        href: "/?view=storage",
        icon: <HardDrive className="size-5" />,
        image: ccVaultOps,
        glowColor: "shadow-emerald-500/20",
      },
    ],
  },
  {
    title: "Media Studio",
    icon: <Layers className="size-4" />,
    gradient: "from-pink-500 to-rose-500",
    description: "Professional editing tools for images, audio, and video. Create, transform, and enhance your content with studio-grade editors.",
    cards: [
      {
        label: "Image Editor",
        description: "Crop, filter, annotate, and transform images",
        href: "/editor/image/0",
        icon: <Image className="size-5" />,
        image: ccMediaStudio,
        glowColor: "shadow-pink-500/30",
        featured: true,
      },
      {
        label: "Audio Editor",
        description: "Trim, EQ, effects, and audio mastering",
        href: "/editor/audio/0",
        icon: <Music className="size-5" />,
        image: ccMediaStudio,
        glowColor: "shadow-rose-500/20",
      },
      {
        label: "Video Editor",
        description: "Trim, color grade, and capture frames",
        href: "/editor/video/0",
        icon: <Video className="size-5" />,
        image: ccMediaStudio,
        glowColor: "shadow-orange-500/20",
      },
      {
        label: "Merge Studio",
        description: "Combine images, audio, and video files",
        href: "/merge",
        icon: <Layers className="size-5" />,
        image: ccMediaStudio,
        glowColor: "shadow-amber-500/20",
        badge: "Pro",
      },
    ],
  },
  {
    title: "AI & Automation",
    icon: <Sparkles className="size-4" />,
    gradient: "from-cyan-500 to-blue-500",
    description: "AI-powered tools that work behind the scenes. Auto-tag uploads, search with natural language, enhance images, and generate captions.",
    cards: [
      {
        label: "AI Auto-Tag",
        description: "Automatically tag and describe uploads",
        href: "/?ai=autotag",
        icon: <Sparkles className="size-5" />,
        image: ccAiTools,
        glowColor: "shadow-cyan-500/30",
        badge: "Smart",
        featured: true,
      },
      {
        label: "AI Smart Search",
        description: "Find files with natural language queries",
        href: "/?ai=search",
        icon: <Search className="size-5" />,
        image: ccAiTools,
        glowColor: "shadow-blue-500/20",
      },
      {
        label: "AI Auto-Enhance",
        description: "One-click intelligent image optimization",
        href: "/?ai=enhance",
        icon: <Wand2 className="size-5" />,
        image: ccAiTools,
        glowColor: "shadow-indigo-500/20",
      },
      {
        label: "AI Captions",
        description: "Generate descriptive captions for media",
        href: "/?ai=captions",
        icon: <MessageSquareText className="size-5" />,
        image: ccAiTools,
        glowColor: "shadow-purple-500/20",
      },
    ],
  },
  {
    title: "Publishing & Blog",
    icon: <FileText className="size-4" />,
    gradient: "from-emerald-500 to-teal-500",
    description: "Content creation and publishing platform. Write blog posts, use AI to generate content, and manage your public presence.",
    cards: [
      {
        label: "Blog Admin",
        description: "Create and manage blog posts",
        href: "/blog/admin",
        icon: <PenTool className="size-5" />,
        image: ccPublishing,
        glowColor: "shadow-emerald-500/30",
        featured: true,
      },
      {
        label: "View Blog",
        description: "See your published articles",
        href: "/blog",
        icon: <Newspaper className="size-5" />,
        image: ccPublishing,
        glowColor: "shadow-teal-500/20",
        badge: "Live",
      },
      {
        label: "AI Content Writer",
        description: "Generate SEO-optimized articles with AI",
        href: "/blog/admin",
        icon: <Bot className="size-5" />,
        image: ccPublishing,
        glowColor: "shadow-green-500/20",
        badge: "AI",
      },
    ],
  },
  {
    title: "Ecosystem & Integrations",
    icon: <Globe className="size-4" />,
    gradient: "from-orange-500 to-amber-500",
    description: "Connect to the broader DarkWave ecosystem. ORBIT financial hub, DarkWave Studio API, TrustLayer SSO, and Signal Chat.",
    cards: [
      {
        label: "ORBIT Hub",
        description: "Financial tracking and ecosystem analytics",
        href: "/admin",
        icon: <Wallet className="size-5" />,
        image: ccEcosystem,
        glowColor: "shadow-orange-500/30",
        badge: "Earn",
        featured: true,
      },
      {
        label: "Signal Chat",
        description: "Real-time ecosystem-wide messaging",
        href: "/chat",
        icon: <Radio className="size-5" />,
        image: ccEcosystem,
        glowColor: "shadow-amber-500/20",
        badge: "Live",
      },
      {
        label: "TrustLayer SSO",
        description: "Cross-app single sign-on identity",
        href: "/admin",
        icon: <Shield className="size-5" />,
        image: ccEcosystem,
        glowColor: "shadow-yellow-500/20",
      },
      {
        label: "DarkWave Studio",
        description: "External studio API integrations",
        href: "/admin",
        icon: <Globe className="size-5" />,
        image: ccEcosystem,
        glowColor: "shadow-red-500/20",
      },
    ],
  },
  {
    title: "Finance & Subscriptions",
    icon: <CreditCard className="size-4" />,
    gradient: "from-yellow-500 to-orange-500",
    description: "Manage subscription tiers, view pricing, and monitor revenue. Stripe-powered billing for Free, Personal, Pro, and Studio plans.",
    cards: [
      {
        label: "Pricing Plans",
        description: "View and manage subscription tiers",
        href: "/pricing",
        icon: <CreditCard className="size-5" />,
        image: ccFinance,
        glowColor: "shadow-yellow-500/30",
        featured: true,
      },
      {
        label: "Revenue Dashboard",
        description: "Track subscription revenue and metrics",
        href: "/admin",
        icon: <BarChart3 className="size-5" />,
        image: ccFinance,
        glowColor: "shadow-orange-500/20",
      },
      {
        label: "Send Invites",
        description: "Invite new members to the platform",
        href: "/invite",
        icon: <Send className="size-5" />,
        image: ccFinance,
        glowColor: "shadow-emerald-500/20",
      },
    ],
  },
  {
    title: "Access & Family",
    icon: <Users className="size-4" />,
    gradient: "from-blue-500 to-indigo-500",
    description: "Manage family member accounts, invite codes, whitelist entries, and access permissions for the entire vault ecosystem.",
    cards: [
      {
        label: "User Management",
        description: "View and manage all family accounts",
        href: "/admin",
        icon: <Users className="size-5" />,
        image: ccAccess,
        glowColor: "shadow-blue-500/30",
        featured: true,
      },
      {
        label: "Invite System",
        description: "Create and manage invite codes",
        href: "/invite",
        icon: <UserPlus className="size-5" />,
        image: ccAccess,
        glowColor: "shadow-indigo-500/20",
      },
      {
        label: "Join Links",
        description: "Generate public join pages",
        href: "/join",
        icon: <Mail className="size-5" />,
        image: ccAccess,
        glowColor: "shadow-purple-500/20",
      },
      {
        label: "API Keys",
        description: "Manage ecosystem API credentials",
        href: "/admin",
        icon: <KeyRound className="size-5" />,
        image: ccAccess,
        glowColor: "shadow-violet-500/20",
      },
    ],
  },
  {
    title: "Roadmap & Status",
    icon: <Map className="size-4" />,
    gradient: "from-fuchsia-500 to-pink-500",
    description: "Track the product roadmap, monitor system health, and stay updated on what's coming next for DW Media Studio.",
    cards: [
      {
        label: "Product Roadmap",
        description: "View upcoming features and milestones",
        href: "/roadmap",
        icon: <Map className="size-5" />,
        image: ccRoadmap,
        glowColor: "shadow-fuchsia-500/30",
        featured: true,
      },
      {
        label: "System Activity",
        description: "Recent platform events and logs",
        href: "/admin",
        icon: <Activity className="size-5" />,
        image: ccRoadmap,
        glowColor: "shadow-pink-500/20",
      },
      {
        label: "Platform Settings",
        description: "Global configuration and preferences",
        href: "/admin",
        icon: <Settings className="size-5" />,
        image: ccRoadmap,
        glowColor: "shadow-rose-500/20",
      },
    ],
  },
];

function CommandCard({ card, index }: { card: LaunchCard; index: number }) {
  const [, navigate] = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={() => navigate(card.href)}
      className={`
        relative overflow-hidden rounded-2xl cursor-pointer group
        border border-white/5 
        ${card.featured ? "min-h-[220px]" : "min-h-[200px]"}
        transition-all duration-300 hover:scale-[1.03]
      `}
      data-testid={`card-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <img
        src={card.image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover brightness-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />

      {card.badge && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 text-[10px] px-2 py-0.5 no-default-hover-elevate no-default-active-elevate">
            {card.badge}
          </Badge>
        </div>
      )}

      <div className="relative z-10 h-full flex flex-col justify-end p-4 gap-2">
        <div className={`
          w-9 h-9 rounded-lg flex items-center justify-center
          bg-gradient-to-br ${categories.find(c => c.cards.includes(card))?.gradient || "from-violet-500 to-purple-500"}
          text-white shadow-lg
        `}>
          {card.icon}
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm leading-tight">{card.label}</h3>
          <p className="text-white/60 text-xs mt-0.5 leading-snug">{card.description}</p>
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

function CategorySection({ category, categoryIndex }: { category: Category; categoryIndex: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
      className="space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className={`
          w-10 h-10 rounded-xl flex items-center justify-center shrink-0
          bg-gradient-to-br ${category.gradient} text-white shadow-lg
        `}>
          {category.icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-white font-bold text-lg leading-tight">{category.title}</h2>
          <p className="text-white/50 text-sm mt-1 leading-relaxed">{category.description}</p>
        </div>
      </div>

      <Carousel
        opts={{ align: "start", dragFree: true }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {category.cards.map((card, i) => (
            <CarouselItem key={card.label} className="pl-3 basis-[260px] sm:basis-[280px]">
              <CommandCard card={card} index={i} />
            </CarouselItem>
          ))}
        </CarouselContent>
        {category.cards.length > 2 && (
          <>
            <CarouselPrevious className="hidden sm:flex -left-4 bg-white/10 border-white/10 text-white hover:bg-white/20" />
            <CarouselNext className="hidden sm:flex -right-4 bg-white/10 border-white/10 text-white hover:bg-white/20" />
          </>
        )}
      </Carousel>
    </motion.section>
  );
}

function PinGate({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        setError("Invalid PIN. Access denied.");
        setPin("");
      }
    } catch {
      setError("Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #070b16, #0c1222, #070b16)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
            <Lock className="size-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-display" data-testid="text-command-center-title">Command Center</h1>
          <p className="text-white/50 text-sm mt-2">Enter your admin PIN to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter PIN"
            className="text-center text-2xl tracking-[0.5em] bg-white/5 border-white/10 text-white h-14 focus:border-violet-500/50"
            autoFocus
            data-testid="input-command-pin"
          />

          {error && (
            <p className="text-center text-sm text-red-400" data-testid="text-pin-error">{error}</p>
          )}

          <Button
            type="submit"
            disabled={pin.length < 4 || loading}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0"
            data-testid="button-pin-submit"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Unlock"}
          </Button>
        </form>

        <Link href="/" className="block text-center mt-6">
          <Button variant="ghost" className="text-white/40 text-sm">
            <ArrowLeft className="size-4 mr-2" />
            Back to Vault
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="min-h-screen px-4 py-20 space-y-10" style={{ background: "linear-gradient(135deg, #070b16, #0c1222, #070b16)" }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
              <div className="h-3 w-72 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="w-[260px] h-[200px] rounded-2xl bg-white/5 animate-pulse shrink-0" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommandCenter() {
  const { user, isLoading, logout } = useAuth();
  const [pinVerified, setPinVerified] = useState(false);
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Command Center | DW Media Studio</title>
        </Helmet>
        <SkeletonLoader />
      </>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  if (!user.isAdmin && !pinVerified) {
    return (
      <>
        <Helmet>
          <title>Access Denied | DW Media Studio</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #070b16, #0c1222, #070b16)" }}>
          <div className="text-center space-y-4">
            <Shield className="size-12 text-white/20 mx-auto" />
            <h1 className="text-xl font-bold text-white">Access Restricted</h1>
            <p className="text-white/50 text-sm">Command Center is available to administrators only.</p>
            <Link href="/">
              <Button variant="ghost" className="text-white/40">
                <ArrowLeft className="size-4 mr-2" />
                Back to Vault
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!pinVerified) {
    return (
      <>
        <Helmet>
          <title>Command Center | DW Media Studio</title>
        </Helmet>
        <PinGate onSuccess={() => setPinVerified(true)} />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Command Center | DW Media Studio</title>
        <meta name="description" content="DW Media Studio Command Center - central admin dashboard for managing your entire media vault ecosystem." />
      </Helmet>

      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #070b16, #0c1222, #070b16)" }}>
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5" style={{ background: "rgba(7, 11, 22, 0.8)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-white/60 shrink-0" data-testid="button-back-vault">
                  <ArrowLeft className="size-5" />
                </Button>
              </Link>
              <img src={trustlayerEmblem} alt="TrustVault" className="w-8 h-8 rounded-lg object-cover shrink-0" />
              <div className="min-w-0">
                <h1 className="text-white font-bold text-sm truncate">Command Center</h1>
                <p className="text-white/40 text-[10px] truncate">DW Media Studio</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white/50 text-xs hidden sm:block">Welcome, {user.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/60"
                onClick={() => { logout(); navigate("/"); }}
                data-testid="button-command-logout"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 pt-20 pb-16 space-y-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-4"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-display" data-testid="text-mission-control">
              Mission Control
            </h2>
            <p className="text-white/50 text-sm mt-2 max-w-lg mx-auto">
              Every tool, feature, and management page in one place. Launch into any part of your ecosystem.
            </p>
          </motion.div>

          {categories.map((category, i) => (
            <CategorySection key={category.title} category={category} categoryIndex={i} />
          ))}
        </main>
      </div>
    </>
  );
}
