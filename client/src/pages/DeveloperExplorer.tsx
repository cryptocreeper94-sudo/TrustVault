import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "wouter";
import {
  Users, KeyRound, Shield, BarChart3,
  Globe, Activity, Send, Settings,
  LogOut, Compass, ArrowRight,
  Wallet, Radio, Map, CreditCard,
  PenTool, UserPlus, Mail, Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { TiltCard } from "@/components/TiltCard";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";

import trustlayerEmblem from "../assets/images/trustvault-emblem.png";
import devUserMgmt from "../assets/images/dev-user-mgmt.png";
import devApiKeys from "../assets/images/dev-api-keys.png";
import devBlockchain from "../assets/images/dev-blockchain.png";
import devRevenue from "../assets/images/dev-revenue.png";
import devEcosystem from "../assets/images/dev-ecosystem.png";
import devSystem from "../assets/images/dev-system.png";
import devInvites from "../assets/images/dev-invites.png";
import devSettings from "../assets/images/dev-settings.png";

interface DevCard {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  image: string;
  gradient: string;
  glowColor: string;
  badge?: string;
  featured?: boolean;
}

function DevCardComponent({ card, index }: { card: DevCard; index: number }) {
  const [, navigate] = useLocation();
  const soundFeedback = useSoundFeedback();

  return (
    <TiltCard
      tiltAmount={6}
      glareEnabled
      onClick={() => { soundFeedback("click"); navigate(card.href); }}
      className={`group rounded-2xl overflow-hidden cursor-pointer ${card.featured ? "sm:col-span-2 sm:row-span-2" : ""}`}
      style={{ minHeight: card.featured ? "280px" : "220px" }}
      data-testid={`card-dev-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
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

export default function DeveloperExplorer() {
  const { user, isLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <>
        <Helmet><title>Developer Portal | TrustVault</title></Helmet>
        <div className="min-h-screen px-4 py-20" style={{ background: "linear-gradient(135deg, #070b16, #0c1222, #070b16)" }}>
          <div className="max-w-6xl mx-auto">
            <div className="h-8 w-56 bg-white/5 rounded-lg animate-pulse mx-auto mb-2" />
            <div className="h-4 w-80 bg-white/5 rounded animate-pulse mx-auto mb-10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
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

  if (!user.isAdmin) {
    navigate("/explore");
    return null;
  }

  const cards: DevCard[] = [
    {
      title: "User Management",
      description: "View and manage all accounts, permissions, and family member access across the platform",
      href: "/admin",
      icon: <Users className="size-6" />,
      image: devUserMgmt,
      gradient: "from-blue-500 to-indigo-600",
      glowColor: "shadow-blue-500/30",
      badge: "Admin",
      featured: true,
    },
    {
      title: "Blockchain & Identity",
      description: "TrustLayer provenance tracking and chain verification",
      href: "/admin",
      icon: <Shield className="size-5" />,
      image: devBlockchain,
      gradient: "from-orange-500 to-amber-500",
      glowColor: "shadow-orange-500/30",
      badge: "Chain",
    },
    {
      title: "API Keys",
      description: "Manage ecosystem API credentials and access tokens",
      href: "/admin",
      icon: <KeyRound className="size-5" />,
      image: devApiKeys,
      gradient: "from-violet-500 to-purple-500",
      glowColor: "shadow-violet-500/30",
    },
    {
      title: "Revenue Dashboard",
      description: "Track subscription revenue, metrics, and billing analytics",
      href: "/admin",
      icon: <BarChart3 className="size-5" />,
      image: devRevenue,
      gradient: "from-emerald-500 to-green-500",
      glowColor: "shadow-emerald-500/30",
    },
    {
      title: "Ecosystem Hub",
      description: "ORBIT, DarkWave Studio, TrustHome, and partner integrations",
      href: "/admin",
      icon: <Globe className="size-5" />,
      image: devEcosystem,
      gradient: "from-cyan-500 to-teal-500",
      glowColor: "shadow-cyan-500/30",
      badge: "Ecosystem",
    },
    {
      title: "ORBIT Financial Hub",
      description: "Financial statements, transactions, and ecosystem analytics",
      href: "/admin",
      icon: <Wallet className="size-5" />,
      image: devRevenue,
      gradient: "from-yellow-500 to-orange-500",
      glowColor: "shadow-yellow-500/30",
      badge: "Finance",
    },
    {
      title: "Invite System",
      description: "Create invite codes, manage whitelist, and generate join links",
      href: "/invite",
      icon: <UserPlus className="size-5" />,
      image: devInvites,
      gradient: "from-pink-500 to-rose-500",
      glowColor: "shadow-pink-500/30",
    },
    {
      title: "Send Invites",
      description: "Email invitations to new members",
      href: "/invite",
      icon: <Send className="size-5" />,
      image: devInvites,
      gradient: "from-fuchsia-500 to-pink-500",
      glowColor: "shadow-fuchsia-500/30",
    },
    {
      title: "Signal Chat Admin",
      description: "Manage channels, users, and messaging infrastructure",
      href: "/chat",
      icon: <Radio className="size-5" />,
      image: devEcosystem,
      gradient: "from-amber-500 to-orange-500",
      glowColor: "shadow-amber-500/30",
      badge: "Live",
    },
    {
      title: "Blog Admin",
      description: "Create, edit, and publish blog posts with AI content tools",
      href: "/blog/admin",
      icon: <PenTool className="size-5" />,
      image: devSystem,
      gradient: "from-emerald-500 to-teal-500",
      glowColor: "shadow-emerald-500/30",
    },
    {
      title: "Pricing & Subscriptions",
      description: "Manage Stripe tiers and subscription billing",
      href: "/pricing",
      icon: <CreditCard className="size-5" />,
      image: devRevenue,
      gradient: "from-yellow-500 to-amber-500",
      glowColor: "shadow-yellow-500/30",
    },
    {
      title: "System Activity",
      description: "Platform events, logs, and real-time system health",
      href: "/admin",
      icon: <Activity className="size-5" />,
      image: devSystem,
      gradient: "from-red-500 to-rose-500",
      glowColor: "shadow-red-500/30",
    },
    {
      title: "Product Roadmap",
      description: "Track milestones, features, and release planning",
      href: "/roadmap",
      icon: <Map className="size-5" />,
      image: devSettings,
      gradient: "from-fuchsia-500 to-violet-500",
      glowColor: "shadow-fuchsia-500/30",
    },
    {
      title: "Platform Settings",
      description: "Global configuration, preferences, and environment",
      href: "/admin",
      icon: <Settings className="size-5" />,
      image: devSettings,
      gradient: "from-slate-500 to-zinc-500",
      glowColor: "shadow-slate-500/30",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Developer Portal | TrustVault</title>
        <meta name="description" content="TrustVault Developer Portal - admin tools, ecosystem integrations, and platform management." />
      </Helmet>

      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #070b16, #0c1222, #070b16)" }}>
        <header
          className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
          style={{ background: "rgba(7, 11, 22, 0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
        >
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/explore">
                <Button variant="ghost" size="icon" className="text-white/60 shrink-0" data-testid="button-back-explore">
                  <Compass className="size-5" />
                </Button>
              </Link>
              <img src={trustlayerEmblem} alt="TrustVault" className="w-8 h-8 rounded-lg object-cover shrink-0" />
              <div className="min-w-0">
                <h1 className="text-white font-bold text-sm truncate" data-testid="text-dev-title">Developer Portal</h1>
                <p className="text-white/40 text-[10px] truncate">TrustVault Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/explore">
                <Button variant="ghost" size="sm" className="text-white/50 text-xs gap-1.5 hidden sm:flex" data-testid="button-user-view">
                  <Compass className="size-3.5" />
                  User View
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/60"
                onClick={() => { logout(); navigate("/"); }}
                data-testid="button-dev-logout"
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/10 mb-4">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-violet-300 text-xs font-medium">Admin Mode</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-display" data-testid="text-dev-heading">
              Developer Portal
            </h2>
            <p className="text-white/50 text-sm mt-2 max-w-lg mx-auto">
              Platform management, ecosystem integrations, and system administration tools.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
              <DevCardComponent key={`${card.title}-${i}`} card={card} index={i} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="mt-12 flex justify-center"
          >
            <Link href="/explore">
              <button
                className="group flex items-center gap-3 px-6 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300"
                data-testid="button-switch-user-view"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
                  <Compass className="size-4 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-white text-sm font-semibold block">Switch to User View</span>
                  <span className="text-white/40 text-xs">Browse as a regular user</span>
                </div>
                <ArrowRight className="size-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all duration-300" />
              </button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center"
          >
            <p className="text-white/20 text-xs">
              Dark Wave Studios &middot; TrustLayer Ecosystem
            </p>
          </motion.div>
        </main>
      </div>
    </>
  );
}
