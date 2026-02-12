import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Lock, ExternalLink, Layers, Zap, ArrowRight, Fingerprint, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import trustlayerEmblem from "@assets/images/trustvault-emblem.png";

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

        <div className="relative z-10 max-w-lg mx-auto px-5 py-8 sm:py-16 flex flex-col items-center min-h-[100dvh]">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-10"
          >
            <img src={trustlayerEmblem} alt="TrustLayer" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Dark Wave Studios</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-center mb-8"
          >
            <img src={trustlayerEmblem} alt="TrustLayer Emblem" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6 shadow-2xl shadow-primary/30" />
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-3" data-testid="text-invite-title">
              I Made This For You
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-sm mx-auto" data-testid="text-invite-description">
              Your own private media vault is ready. A place to store, organize, and keep your most valuable photos, videos, music, and files — all in one safe spot.
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
            <div className="w-full flex flex-col gap-3">
              <Button
                asChild
                size="lg"
                className="flex-1 gap-2"
                data-testid="button-invite-login"
              >
                <a href="/?setup=1">
                  Set Up My Account
                  <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="flex-1 gap-2"
                data-testid="button-invite-login-existing"
              >
                <a href="/">
                  Already set up? Log in
                  <ArrowRight className="w-5 h-5" />
                </a>
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground/60 mt-3" data-testid="text-invite-instructions">
              Use the temporary password below, then you'll create your own.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="w-full mb-8"
          >
            <Card className="p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">How To Get Started</p>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-primary shrink-0">1.</span>
                  <p className="text-sm text-muted-foreground">Tap <strong className="text-foreground">"Set Up My Account"</strong> above</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-primary shrink-0">2.</span>
                  <p className="text-sm text-muted-foreground">Enter your <strong className="text-foreground">first name</strong> (exactly as shown below)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-primary shrink-0">3.</span>
                  <p className="text-sm text-muted-foreground">Add your email and create your own password</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-sm text-muted-foreground">Your Name</span>
                  <span className="text-sm font-medium font-mono" data-testid="text-invite-username">Your first name</span>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-sm text-muted-foreground">Temp Password</span>
                  <span className="text-sm font-medium font-mono" data-testid="text-invite-password">Temp12345!</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-3">The temporary password is only needed if you use the regular login instead of the setup button.</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="w-full mb-10 text-center"
          >
            <p className="text-lg italic text-muted-foreground/80 font-display" data-testid="text-invite-love">
              Love, Dad
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
                    <img src={trustlayerEmblem} alt="" className="w-4 h-4 rounded-sm object-cover" />
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
