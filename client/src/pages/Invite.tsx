import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Shield, Lock, ExternalLink, Layers, Zap, ArrowRight, Fingerprint, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

export default function Invite() {
  return (
    <>
      <Helmet>
        <title>You're Invited | DW Media Studio — TrustVault</title>
        <meta name="description" content="You've been invited to DW Media Studio — your private digital vault for media and memories. Powered by Dark Wave Studios." />
        <meta property="og:title" content="You're Invited to DW Media Studio" />
        <meta property="og:description" content="Your private digital vault for media and memories. Secure, beautiful, and built for you." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/8 rounded-full blur-[180px]" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px]" />
          <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-lg mx-auto px-5 py-10 sm:py-16 flex flex-col items-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-10"
          >
            <div className="w-8 h-8 rounded-lg theme-gradient flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Dark Wave Studios</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 rounded-2xl theme-gradient flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-3" data-testid="text-invite-title">
              You're Invited
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-sm mx-auto" data-testid="text-invite-description">
              Your private media vault is ready. Store, organize, and preview your most valuable digital content — all in one place.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="w-full mb-8"
          >
            <Card className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Fingerprint className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground" data-testid="text-feature-private">Your Own Private Space</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Your files are stored in your personal tenant — completely isolated and secure.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground" data-testid="text-feature-media">All Your Media in One Vault</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Videos, photos, audio, documents — upload, organize, and preview everything.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground" data-testid="text-feature-editing">Built-In Editing Tools</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Crop, trim, filter, and combine your media right inside the app.</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="w-full mb-10"
          >
            <div className="w-full flex">
              <Button
                asChild
                size="lg"
                className="flex-1 gap-2"
                data-testid="button-invite-login"
              >
                <Link href="/">
                  Open TrustVault
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground/60 mt-3" data-testid="text-invite-instructions">
              Use the name and password you were given to log in.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="w-full mt-auto"
          >
            <div className="border-t border-border/50 pt-6 space-y-4">
              <p className="text-center text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium" data-testid="text-ecosystem-label">
                Part of the Ecosystem
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                <Button asChild variant="ghost" size="sm" data-testid="link-invite-trustlayer">
                  <a href="https://dwtl.io" target="_blank" rel="noopener noreferrer" className="gap-2 text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    TrustLayer
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" data-testid="link-invite-trustshield">
                  <a href="https://trustshield.io" target="_blank" rel="noopener noreferrer" className="gap-2 text-muted-foreground">
                    <Fingerprint className="w-4 h-4" />
                    TrustShield
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" data-testid="link-invite-darkwave">
                  <a href="https://darkwavestudios.io" target="_blank" rel="noopener noreferrer" className="gap-2 text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    Dark Wave Studios
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
