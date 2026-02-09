import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Check, ArrowLeft, Shield, Zap, Crown, Sparkles, Loader2, Award, ExternalLink, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import {
  TIER_PRICING,
  TIER_LIMITS,
  type SubscriptionTier,
  type Subscription,
} from "@shared/schema";

const TIER_ICONS: Record<SubscriptionTier, typeof Shield> = {
  free: Shield,
  personal: Zap,
  pro: Crown,
  studio: Sparkles,
};

const TIER_ORDER: SubscriptionTier[] = ["free", "personal", "pro", "studio"];

export default function Pricing() {
  const [interval, setInterval] = useState<"month" | "year">("year");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  const { data: subscription, isLoading: subLoading } = useQuery<Subscription | { tier: string; status: string } | null>({
    queryKey: ["/api/subscription"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (success) {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    }
  }, [success]);

  const checkoutMutation = useMutation({
    mutationFn: async ({ tier, interval }: { tier: SubscriptionTier; interval: "month" | "year" }) => {
      const res = await apiRequest("POST", "/api/stripe/checkout", { tier, interval });
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/portal", {});
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      window.location.href = data.url;
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLoggedIn = subscription !== null;
  const currentTier = (subscription?.tier || "free") as SubscriptionTier;

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pricing | DW Media Studio</title>
        <meta name="description" content="Choose the perfect plan for your creative needs. From free media storage to professional studio tools." />
        <meta property="og:title" content="DW Media Studio Pricing" />
        <meta property="og:description" content="Affordable plans for every creator. Start free, upgrade anytime." />
      </Helmet>

      <header className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back-home">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Vault
            </Button>
          </Link>
          {currentTier !== "free" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              data-testid="button-manage-subscription"
            >
              {portalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Manage Subscription
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-md bg-green-500/10 border border-green-500/20 text-center"
          >
            <p className="text-sm font-medium text-green-400" data-testid="text-success-message">
              Subscription activated! Your plan has been upgraded.
            </p>
          </motion.div>
        )}

        {canceled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-md bg-muted border border-border text-center"
          >
            <p className="text-sm text-muted-foreground" data-testid="text-canceled-message">
              Checkout was canceled. No charges were made.
            </p>
          </motion.div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold font-display mb-3" data-testid="text-pricing-title">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From basic media storage to a full creative studio. All plans include secure cloud storage and our premium dark-themed interface.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-10">
          <Button
            variant={interval === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setInterval("month")}
            data-testid="button-monthly"
          >
            Monthly
          </Button>
          <Button
            variant={interval === "year" ? "default" : "outline"}
            size="sm"
            onClick={() => setInterval("year")}
            data-testid="button-annual"
          >
            Annual
            <Badge variant="secondary" className="ml-2 text-[10px]">Save ~17%</Badge>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIER_ORDER.map((tier, index) => {
            const pricing = TIER_PRICING[tier];
            const limits = TIER_LIMITS[tier];
            const Icon = TIER_ICONS[tier];
            const isCurrentPlan = currentTier === tier;
            const isPopular = tier === "pro";
            const price = interval === "month" ? pricing.monthly : pricing.annual;
            const monthlyEquivalent = interval === "year" && pricing.annual > 0
              ? (pricing.annual / 12 / 100).toFixed(2)
              : null;

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`relative flex flex-col p-5 h-full ${isPopular ? "border-primary/50 shadow-lg shadow-primary/5" : ""}`}
                  data-testid={`card-tier-${tier}`}
                >
                  {isPopular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                      Most Popular
                    </Badge>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${isPopular ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`w-4 h-4 ${isPopular ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold font-display" data-testid={`text-tier-name-${tier}`}>{pricing.name}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">{pricing.description}</p>

                  <div className="mb-4">
                    {price === 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold" data-testid={`text-price-${tier}`}>Free</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold" data-testid={`text-price-${tier}`}>
                            {formatPrice(interval === "month" ? price : Math.round(price / 12))}
                          </span>
                          <span className="text-sm text-muted-foreground">/mo</span>
                        </div>
                        {interval === "year" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatPrice(price)} billed annually
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <ul className="flex-1 space-y-2 mb-5">
                    {limits.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled
                      data-testid={`button-current-${tier}`}
                    >
                      Current Plan
                    </Button>
                  ) : tier === "free" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={currentTier !== "free"}
                      onClick={() => {
                        if (currentTier !== "free") {
                          portalMutation.mutate();
                        }
                      }}
                      data-testid={`button-select-${tier}`}
                    >
                      {currentTier !== "free" ? "Downgrade" : "Current"}
                    </Button>
                  ) : !isLoggedIn ? (
                    <Link href="/">
                      <Button
                        variant={isPopular ? "default" : "outline"}
                        className="w-full"
                        data-testid={`button-login-${tier}`}
                      >
                        Sign in to Subscribe
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant={isPopular ? "default" : "outline"}
                      className="w-full"
                      onClick={() => checkoutMutation.mutate({ tier, interval })}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-select-${tier}`}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : null}
                      {TIER_ORDER.indexOf(currentTier) > TIER_ORDER.indexOf(tier) ? "Downgrade" : "Upgrade"}
                    </Button>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-xl font-semibold font-display mb-3">Compare Plans</h2>
          <div className="max-w-3xl mx-auto overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-comparison">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium">Feature</th>
                  {TIER_ORDER.map((tier) => (
                    <th key={tier} className="text-center py-3 px-3 font-medium">
                      {TIER_PRICING[tier].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Storage", values: ["500MB", "5GB", "50GB", "Unlimited"] },
                  { label: "Media Items", values: ["50", "500", "5,000", "Unlimited"] },
                  { label: "Media Editors", values: ["View only", "All editors", "All editors", "All editors"] },
                  { label: "Collections & Tags", values: ["-", "Yes", "Yes", "Yes"] },
                  { label: "Merge & Combine", values: ["-", "-", "Yes", "Yes"] },
                  { label: "AI Blog Platform", values: ["-", "-", "Yes", "Yes"] },
                  { label: "Ecosystem API", values: ["-", "-", "-", "Yes"] },
                  { label: "TrustLayer Membership", values: ["-", "Yes", "Yes", "Yes"] },
                  { label: "Support", values: ["Standard", "Standard", "Priority", "Dedicated"] },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-border/50">
                    <td className="text-left py-3 px-3 text-muted-foreground">{row.label}</td>
                    {row.values.map((val, i) => (
                      <td key={i} className="text-center py-3 px-3">
                        {val === "Yes" ? (
                          <Check className="w-4 h-4 text-primary mx-auto" />
                        ) : val === "-" ? (
                          <span className="text-muted-foreground/40">-</span>
                        ) : (
                          <span className="text-foreground">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-16 max-w-2xl mx-auto"
        >
          <Card className="overflow-hidden">
            <div className="p-1">
              <div className="rounded-lg theme-gradient p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-display">Become a TrustLayer Member</h3>
                    <p className="text-xs text-white/70">Part of the Dark Wave Studios ecosystem</p>
                  </div>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  When you subscribe to any paid plan, you automatically become a TrustLayer member — 
                  giving you access to the full Dark Wave Studios ecosystem.
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Membership Card</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">Get your digital membership card and ecosystem identity</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Member Dashboard</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">Access your full TrustLayer dashboard and tools</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Ecosystem Access</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">Use the same login across all DW Studio apps</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <a
                  href="https://dwtl.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-trustlayer-pricing"
                >
                  <Button variant="outline" className="gap-2">
                    <Shield className="w-4 h-4" />
                    Visit TrustLayer Dashboard
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
                <p className="text-xs text-muted-foreground">
                  Log in at{" "}
                  <a href="https://dwtl.io" target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary transition-colors font-medium" data-testid="link-dwtl-text">
                    dwtl.io
                  </a>{" "}
                  to set up your dashboard and membership card
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="mt-8 text-center text-xs text-muted-foreground/60 max-w-xl mx-auto space-y-1">
          <p>All plans include secure cloud storage, PWA access, and our premium interface.</p>
          <p>Prices shown in USD. Cancel anytime from the Manage Subscription portal.</p>
          <p className="pt-2">
            Powered by{" "}
            <a href="https://darkwavestudios.io" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary transition-colors">
              Dark Wave Studios
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
