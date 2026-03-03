import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Copy, Check, Share2, ArrowLeft, Users, TrendingUp, Wallet, DollarSign,
  ChevronRight, Shield, Star, Crown, Gem, Award, ExternalLink, Loader2,
} from "lucide-react";
import { AFFILIATE_TIER_CONFIG, type AffiliateTier } from "@shared/schema";
import { motion } from "framer-motion";

const TIER_ORDER: AffiliateTier[] = ["base", "silver", "gold", "platinum", "diamond"];

const TIER_COLORS: Record<AffiliateTier, { bg: string; text: string; border: string; icon: any }> = {
  base: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20", icon: Shield },
  silver: { bg: "bg-slate-400/10", text: "text-slate-300", border: "border-slate-400/20", icon: Star },
  gold: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: Award },
  platinum: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", icon: Crown },
  diamond: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", icon: Gem },
};

function getTierProgress(convertedCount: number, currentTier: AffiliateTier) {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  if (currentIndex === TIER_ORDER.length - 1) return { progress: 100, nextTier: null, needed: 0 };
  const nextTier = TIER_ORDER[currentIndex + 1];
  const nextMin = AFFILIATE_TIER_CONFIG[nextTier].minReferrals;
  const currentMin = AFFILIATE_TIER_CONFIG[currentTier].minReferrals;
  const progress = Math.min(100, ((convertedCount - currentMin) / (nextMin - currentMin)) * 100);
  return { progress, nextTier, needed: nextMin - convertedCount };
}

interface AffiliateDashboardData {
  uniqueHash: string;
  referralLink: string;
  crossPlatformLinks: Record<string, string>;
  tier: AffiliateTier;
  tierLabel: string;
  commissionRate: number;
  totalReferrals: number;
  convertedReferrals: number;
  pendingEarnings: string;
  paidEarnings: string;
  referrals: Array<{
    id: number;
    referralHash: string;
    platform: string;
    status: string;
    convertedAt: string | null;
    createdAt: string;
  }>;
  commissions: Array<{
    id: number;
    amount: string;
    currency: string;
    tier: string;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }>;
}

export default function Affiliate() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: dashboard, isLoading } = useQuery<AffiliateDashboardData>({
    queryKey: ["/api/affiliate/dashboard"],
    enabled: !!user,
  });

  const payoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/affiliate/request-payout");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Payout request failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Payout Requested", description: `${data.amount} SIG is being processed.` });
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/dashboard"] });
    },
    onError: (err: Error) => {
      toast({ title: "Payout Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleCopy = async () => {
    if (!dashboard?.referralLink) return;
    try {
      await navigator.clipboard.writeText(dashboard.referralLink);
      setCopied(true);
      toast({ title: "Link Copied", description: "Referral link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy Failed", description: "Could not copy link.", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!dashboard?.referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on TrustVault",
          text: "Join me on TrustVault — part of the Trust Layer ecosystem!",
          url: dashboard.referralLink,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2" data-testid="text-login-required">Sign in Required</h2>
            <p className="text-sm text-muted-foreground mb-4">Sign in to access the Affiliate Program.</p>
            <Button onClick={() => navigate("/login")} data-testid="button-go-login">Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierInfo = dashboard ? TIER_COLORS[dashboard.tier] : TIER_COLORS.base;
  const TierIcon = tierInfo.icon;
  const tierProgress = dashboard ? getTierProgress(dashboard.convertedReferrals, dashboard.tier) : { progress: 0, nextTier: null, needed: 0 };
  const pendingNum = parseFloat(dashboard?.pendingEarnings || "0");
  const canPayout = pendingNum >= 10;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Affiliate Program | TrustVault</title>
        <meta name="description" content="Earn SIG by referring friends to TrustVault. Share your link across all 32 Trust Layer apps." />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vault")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display" data-testid="text-affiliate-title">
              Share & Earn
            </h1>
            <p className="text-sm text-muted-foreground">Earn SIG across all 32 Trust Layer apps with one link</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : dashboard ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            <Card data-testid="card-referral-link">
              <CardContent className="pt-5 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your Referral Link</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/50 rounded-md px-3 py-2 text-sm font-mono truncate" data-testid="text-referral-link">
                    {dashboard.referralLink}
                  </div>
                  <Button size="icon" variant="outline" onClick={handleCopy} data-testid="button-copy-link">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="outline" onClick={handleShare} data-testid="button-share-link">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Works across every app in the Trust Layer ecosystem
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-tier-progress">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-md flex items-center justify-center ${tierInfo.bg}`}>
                      <TierIcon className={`w-5 h-5 ${tierInfo.text}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" data-testid="text-current-tier">{dashboard.tierLabel} Tier</p>
                      <p className="text-xs text-muted-foreground">{(dashboard.commissionRate * 100).toFixed(1)}% commission rate</p>
                    </div>
                  </div>
                  {tierProgress.nextTier && (
                    <p className="text-xs text-muted-foreground" data-testid="text-tier-needed">
                      {tierProgress.needed} more to {AFFILIATE_TIER_CONFIG[tierProgress.nextTier].label}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {TIER_ORDER.map((t, i) => {
                    const isCurrent = t === dashboard.tier;
                    const isPast = TIER_ORDER.indexOf(t) < TIER_ORDER.indexOf(dashboard.tier);
                    const tc = TIER_COLORS[t];
                    return (
                      <div key={t} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full h-1.5 rounded-full ${isPast || isCurrent ? tc.bg.replace('/10', '/40') : 'bg-muted'}`} />
                        <span className={`text-[10px] ${isCurrent ? tc.text + ' font-bold' : 'text-muted-foreground'}`}>
                          {AFFILIATE_TIER_CONFIG[t].label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card data-testid="card-stat-total">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-muted-foreground">Total Referrals</span>
                  </div>
                  <p className="text-2xl font-bold" data-testid="text-total-referrals">{dashboard.totalReferrals}</p>
                </CardContent>
              </Card>
              <Card data-testid="card-stat-converted">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-muted-foreground">Converted</span>
                  </div>
                  <p className="text-2xl font-bold" data-testid="text-converted-referrals">{dashboard.convertedReferrals}</p>
                </CardContent>
              </Card>
              <Card data-testid="card-stat-pending">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </div>
                  <p className="text-2xl font-bold" data-testid="text-pending-earnings">{dashboard.pendingEarnings} <span className="text-sm font-normal text-muted-foreground">SIG</span></p>
                </CardContent>
              </Card>
              <Card data-testid="card-stat-paid">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-muted-foreground">Paid</span>
                  </div>
                  <p className="text-2xl font-bold" data-testid="text-paid-earnings">{dashboard.paidEarnings} <span className="text-sm font-normal text-muted-foreground">SIG</span></p>
                </CardContent>
              </Card>
            </div>

            <Button
              className="w-full"
              disabled={!canPayout || payoutMutation.isPending}
              onClick={() => payoutMutation.mutate()}
              data-testid="button-request-payout"
            >
              {payoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Wallet className="w-4 h-4 mr-2" />
              )}
              {canPayout ? `Request Payout (${dashboard.pendingEarnings} SIG)` : "Minimum 10 SIG required for payout"}
            </Button>

            <Card data-testid="card-commission-tiers">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Commission Tiers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {TIER_ORDER.map(t => {
                    const cfg = AFFILIATE_TIER_CONFIG[t];
                    const tc = TIER_COLORS[t];
                    const TIcon = tc.icon;
                    const isCurrent = t === dashboard.tier;
                    return (
                      <div
                        key={t}
                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-md ${isCurrent ? tc.bg + ' ring-1 ' + tc.border : ''}`}
                        data-testid={`tier-row-${t}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <TIcon className={`w-4 h-4 ${tc.text}`} />
                          <span className={`text-sm font-medium ${isCurrent ? tc.text : ''}`}>{cfg.label}</span>
                          {isCurrent && <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px]">Current</Badge>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">
                            {cfg.minReferrals === 0 ? "Start" : `${cfg.minReferrals}+ referrals`}
                          </span>
                          <span className={`text-sm font-bold ${tc.text}`}>{(cfg.rate * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card data-testid="card-recent-referrals">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent Referrals</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard.referrals.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-referrals">
                      No referrals yet. Share your link to get started.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dashboard.referrals.map(ref => (
                        <div key={ref.id} className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0" data-testid={`referral-row-${ref.id}`}>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{ref.platform}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(ref.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            variant={ref.status === "converted" ? "default" : "secondary"}
                            className="no-default-hover-elevate no-default-active-elevate text-[10px] shrink-0"
                            data-testid={`badge-referral-status-${ref.id}`}
                          >
                            {ref.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-recent-commissions">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent Commissions</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard.commissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-commissions">
                      No commissions yet. Commissions are earned when referrals subscribe.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dashboard.commissions.map(com => (
                        <div key={com.id} className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0" data-testid={`commission-row-${com.id}`}>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{com.amount} {com.currency}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {AFFILIATE_TIER_CONFIG[com.tier as AffiliateTier]?.label || com.tier} tier &middot; {new Date(com.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            variant={com.status === "paid" ? "default" : "secondary"}
                            className="no-default-hover-elevate no-default-active-elevate text-[10px] shrink-0"
                            data-testid={`badge-commission-status-${com.id}`}
                          >
                            {com.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-cross-platform">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cross-Platform Links</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Your referral link works on every Trust Layer app</p>
                <div className="space-y-1.5">
                  {Object.entries(dashboard.crossPlatformLinks).map(([platform, link]) => (
                    <div key={platform} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="text-sm capitalize">{platform}</span>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground truncate max-w-[200px] flex items-center gap-1"
                        data-testid={`link-cross-platform-${platform}`}
                      >
                        {link}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
