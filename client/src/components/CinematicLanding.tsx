import { useState, useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Shield, Zap, Sparkles, Film, Music, ImageIcon, FileText, Lock, ArrowDown, ChevronRight, Layers, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import trustlayerEmblem from "@assets/images/trustvault-emblem.png";

function ScrollSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, description, color, delay }: { icon: any; title: string; description: string; color: string; delay: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative rounded-xl p-6 bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all duration-500"
      data-testid={`card-feature-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{description}</p>
    </motion.div>
  );
}

function StatCounter({ value, label, delay }: { value: string; label: string; delay: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="text-3xl sm:text-4xl font-bold theme-gradient-text mb-1">{value}</div>
      <div className="text-xs sm:text-sm text-white/40 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

export function CinematicLanding({ onGetStarted }: { onGetStarted: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);
  const parallaxY1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const parallaxY2 = useTransform(scrollYProgress, [0, 1], [0, -100]);

  const features = [
    { icon: Shield, title: "Military-Grade Security", description: "End-to-end encryption with tenant isolation. Your files are yours alone.", color: "bg-blue-600" },
    { icon: Film, title: "Video Studio", description: "Trim, color grade, and enhance your videos with professional editing tools.", color: "bg-purple-600" },
    { icon: Music, title: "Audio Engineering", description: "EQ, reverb, noise gate, and precision trimming for perfect audio.", color: "bg-pink-600" },
    { icon: ImageIcon, title: "Image Editor Pro", description: "Crop, filters, color grading, text overlays, annotations, and stickers.", color: "bg-emerald-600" },
    { icon: Sparkles, title: "AI-Powered", description: "Auto-tagging, smart search, caption generation, and auto-enhance with AI.", color: "bg-amber-600" },
    { icon: Layers, title: "Smart Collections", description: "Organize media into collections, playlists, and favorites with bulk actions.", color: "bg-cyan-600" },
  ];

  return (
    <div ref={containerRef} className="relative bg-background" data-testid="cinematic-landing">
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            style={{ y: parallaxY1 }}
            className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/15 rounded-full blur-[160px]"
          />
          <motion.div
            style={{ y: parallaxY2 }}
            className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px]"
          />
          <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-cyan-600/5 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent_50%)]" />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 flex flex-col items-center text-center px-4 sm:px-8"
        >
          <motion.img
            initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            src={trustlayerEmblem}
            alt="TrustVault"
            className="w-24 h-24 sm:w-32 sm:h-32 object-cover mb-6"
            data-testid="img-hero-emblem"
          />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white leading-tight mb-4" data-testid="text-hero-title">
              Your Digital Assets,
              <br />
              <span className="theme-gradient-text">Secured Forever.</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="text-lg sm:text-xl text-white/50 max-w-lg mb-8 leading-relaxed"
            data-testid="text-hero-subtitle"
          >
            A premium private vault for your most valuable media. Upload, edit, organize, and protect
            your creative work with military-grade security.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Button
              size="lg"
              onClick={onGetStarted}
              className="text-base px-8 gap-2"
              data-testid="button-hero-get-started"
            >
              Get Started
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 gap-2 border-white/10 backdrop-blur-sm"
              onClick={() => {
                document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              data-testid="button-hero-learn-more"
            >
              Learn More
              <ArrowDown className="w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ArrowDown className="w-5 h-5 text-white/30" />
          </motion.div>
        </motion.div>
      </section>

      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 flex flex-wrap justify-center gap-12 sm:gap-20">
          <StatCounter value="256-bit" label="Encryption" delay={0} />
          <StatCounter value="4K+" label="Media Support" delay={0.1} />
          <StatCounter value="AI" label="Powered" delay={0.2} />
          <StatCounter value="99.9%" label="Uptime" delay={0.3} />
        </div>
      </section>

      <section id="features-section" className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[200px]" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 relative z-10">
          <ScrollSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4" data-testid="text-features-title">
              Everything You Need,
              <br />
              <span className="theme-gradient-text">Nothing You Don't.</span>
            </h2>
            <p className="text-white/40 text-lg max-w-md mx-auto">
              Professional-grade tools for managing your entire digital media library.
            </p>
          </ScrollSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <ScrollSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4" data-testid="text-ecosystem-title">
              Part of the{" "}
              <span className="theme-gradient-text">Dark Wave Ecosystem</span>
            </h2>
            <p className="text-white/40 text-lg max-w-lg mx-auto">
              Built on TrustLayer blockchain identity, connected to the Dark Wave Studios creative platform.
            </p>
          </ScrollSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <ScrollSection delay={0} className="text-center p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-2">TrustLayer SSO</h3>
              <p className="text-sm text-white/40">Single sign-on across the entire ecosystem with blockchain identity.</p>
            </ScrollSection>
            <ScrollSection delay={0.15} className="text-center p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Globe className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-2">Signal Chat</h3>
              <p className="text-sm text-white/40">Real-time communication built into every app in the network.</p>
            </ScrollSection>
            <ScrollSection delay={0.3} className="text-center p-6 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <Zap className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-2">On-Chain Provenance</h3>
              <p className="text-sm text-white/40">Track ownership and authenticity of your digital assets via dwtl.io.</p>
            </ScrollSection>
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[180px]" />
        </div>
        <div className="max-w-md mx-auto px-4 sm:px-8 relative z-10 text-center">
          <ScrollSection>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4" data-testid="text-cta-title">
              Ready to <span className="theme-gradient-text">secure your vault?</span>
            </h2>
            <p className="text-white/40 text-lg mb-8">
              Join the family. Your private media space awaits.
            </p>
            <Button
              size="lg"
              onClick={onGetStarted}
              className="text-base px-10 gap-2"
              data-testid="button-cta-get-started"
            >
              Sign In
              <ChevronRight className="w-4 h-4" />
            </Button>
          </ScrollSection>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={trustlayerEmblem} alt="DW" className="w-6 h-6 object-cover" />
            <span className="text-sm text-white/30">TrustVault</span>
          </div>
          <p className="text-xs text-white/20">Dark Wave Studios. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}