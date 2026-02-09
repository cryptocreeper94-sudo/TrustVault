import { useState, useEffect, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload, FolderOpen, Play, Pencil, Layers, LayoutGrid, List,
  Search, Heart, Shield, ChevronRight, ChevronLeft, Sparkles, X,
  HelpCircle,
} from "lucide-react";

export interface OnboardingSlide {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  tips?: string[];
}

const DEFAULT_SLIDES: OnboardingSlide[] = [
  {
    icon: Shield,
    iconColor: "from-primary to-primary/60",
    title: "Welcome to DW Media Studio",
    description: "Your personal vault for all your digital media — videos, music, photos, and documents. Everything is securely stored and organized in your own private space.",
    tips: [
      "Each family member gets their own private vault",
      "Your files are encrypted and backed up automatically",
      "Access your media from any device, anytime",
    ],
  },
  {
    icon: Upload,
    iconColor: "from-blue-500 to-cyan-400",
    title: "Uploading Files",
    description: "Tap the Upload button to add files to your vault. You can upload videos, music, photos, and documents all in one place.",
    tips: [
      "Drag and drop files or tap to browse",
      "Add titles, descriptions, and tags to stay organized",
      "Upload multiple files at once",
    ],
  },
  {
    icon: FolderOpen,
    iconColor: "from-amber-500 to-orange-400",
    title: "Collections",
    description: "Group your files into collections to keep things organized. Think of collections like folders or albums for your media.",
    tips: [
      "Create collections like \"Vacation Photos\" or \"Favorite Songs\"",
      "Add files to collections from the media menu",
      "One file can belong to multiple collections",
    ],
  },
  {
    icon: LayoutGrid,
    iconColor: "from-emerald-500 to-green-400",
    title: "Browse & Filter",
    description: "Use the filter tabs at the top to view specific types of media. Switch between grid and timeline views to browse your files the way you like.",
    tips: [
      "Filter by Videos, Audio, Images, or Documents",
      "Use the search bar to find files quickly",
      "Mark favorites with a heart for quick access",
    ],
  },
  {
    icon: Play,
    iconColor: "from-violet-500 to-purple-400",
    title: "Preview & Play",
    description: "Tap any file to open the media viewer. Play videos and audio, view images full-screen, and preview documents — all right inside the app.",
    tips: [
      "Videos and audio play directly in the viewer",
      "Swipe through images in full-screen mode",
      "Documents open in a built-in reader",
    ],
  },
  {
    icon: Pencil,
    iconColor: "from-pink-500 to-rose-400",
    title: "Edit & Enhance",
    description: "Use the built-in editors to crop images, trim audio, cut video clips, and more. Save your edits as new files so you never lose the original.",
    tips: [
      "Image editor: crop, rotate, filters, and adjustments",
      "Audio editor: trim, adjust volume, and effects",
      "Video editor: trim clips, capture frames",
    ],
  },
  {
    icon: Layers,
    iconColor: "from-sky-500 to-blue-400",
    title: "Merge & Combine",
    description: "Combine multiple files together — create photo collages, stitch audio clips, or merge video segments into one file using the Merge tool.",
    tips: [
      "Tap \"Merge\" in the toolbar to get started",
      "Select files to combine them into one",
      "Great for creating compilations",
    ],
  },
  {
    icon: Sparkles,
    iconColor: "from-yellow-500 to-amber-400",
    title: "You're All Set!",
    description: "That's everything you need to get started. You can revisit this guide anytime from the help button in the menu. Now go ahead and start building your media vault!",
    tips: [
      "Tap the help icon in the menu to see this guide again",
      "Your vault grows with you — upgrade plans for more features",
      "Have fun and keep your memories safe!",
    ],
  },
];

interface OnboardingGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slides?: OnboardingSlide[];
  brandName?: string;
  onComplete?: () => void;
}

export function OnboardingGuide({
  open,
  onOpenChange,
  slides = DEFAULT_SLIDES,
  brandName,
  onComplete,
}: OnboardingGuideProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (open) setCurrentSlide(0);
  }, [open]);

  const totalSlides = slides.length;
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === totalSlides - 1;
  const slide = slides[currentSlide];

  const goNext = useCallback(() => {
    if (isLast) {
      onOpenChange(false);
      onComplete?.();
      return;
    }
    setDirection(1);
    setCurrentSlide(prev => prev + 1);
  }, [isLast, onOpenChange, onComplete]);

  const goPrev = useCallback(() => {
    if (isFirst) return;
    setDirection(-1);
    setCurrentSlide(prev => prev - 1);
  }, [isFirst]);

  const actualSlides = brandName
    ? slides.map((s, i) =>
        i === 0 ? { ...s, title: `Welcome to ${brandName}` } : s
      )
    : slides;

  const activeSlide = actualSlides[currentSlide];
  const Icon = activeSlide.icon;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md w-full p-0 border-none overflow-hidden sm:rounded-2xl bg-card"
        aria-describedby="onboarding-description"
        aria-labelledby="onboarding-title"
      >
        <DialogTitle className="sr-only" id="onboarding-title">
          {activeSlide.title}
        </DialogTitle>
        <DialogDescription className="sr-only" id="onboarding-description">
          {activeSlide.description}
        </DialogDescription>
        <div className="relative">
          <div className={`h-44 sm:h-52 bg-gradient-to-br ${activeSlide.iconColor} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentSlide}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col items-center"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow-lg">
                    <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-md" />
                  </div>
                  <p className="text-white/70 text-xs font-medium tracking-wide uppercase">
                    {currentSlide + 1} of {totalSlides}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {actualSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > currentSlide ? 1 : -1);
                    setCurrentSlide(i);
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentSlide
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/40"
                  }`}
                  data-testid={`button-onboarding-dot-${i}`}
                />
              ))}
            </div>

            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close guide"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white/80 transition-colors hover:text-white hover:bg-black/30"
              data-testid="button-onboarding-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <h2
                  className="text-xl sm:text-2xl font-display font-bold text-foreground mb-2"
                  data-testid="text-onboarding-title"
                >
                  {activeSlide.title}
                </h2>
                <p
                  id="onboarding-description"
                  className="text-sm text-muted-foreground leading-relaxed mb-4"
                  data-testid="text-onboarding-description"
                >
                  {activeSlide.description}
                </p>

                {activeSlide.tips && activeSlide.tips.length > 0 && (
                  <div className="space-y-2">
                    {activeSlide.tips.map((tip, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <div className={`mt-1 w-1.5 h-1.5 rounded-full bg-gradient-to-br ${activeSlide.iconColor} shrink-0`} />
                        <span className="text-muted-foreground">{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-2 mt-6">
              {!isFirst && (
                <Button
                  variant="outline"
                  onClick={goPrev}
                  className="gap-1"
                  data-testid="button-onboarding-prev"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <div className="flex-1" />
              {isLast ? (
                <Button
                  onClick={goNext}
                  className="bg-primary text-white gap-1"
                  data-testid="button-onboarding-finish"
                >
                  <Sparkles className="w-4 h-4" />
                  Get Started
                </Button>
              ) : (
                <Button
                  onClick={goNext}
                  className="bg-primary text-white gap-1"
                  data-testid="button-onboarding-next"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface HelpTooltipProps {
  content: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function HelpTooltip({ content, side = "top" }: HelpTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipId = useId();

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onBlur={() => setTimeout(() => setShowTooltip(false), 200)}
        aria-label="Show help info"
        aria-expanded={showTooltip}
        aria-describedby={showTooltip ? tooltipId : undefined}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted/50 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
        data-testid="button-help-tooltip"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95, y: side === "bottom" ? -4 : 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-56 p-3 rounded-lg bg-popover border border-border shadow-lg text-xs text-popover-foreground leading-relaxed ${
              side === "top" ? "bottom-full mb-2 left-1/2 -translate-x-1/2" :
              side === "bottom" ? "top-full mt-2 left-1/2 -translate-x-1/2" :
              side === "left" ? "right-full mr-2 top-1/2 -translate-y-1/2" :
              "left-full ml-2 top-1/2 -translate-y-1/2"
            }`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function useOnboarding(userId?: string | number) {
  const storageKey = userId ? `onboarding_seen_${userId}` : "onboarding_seen";
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  });

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(timer);
    }
  }, [hasSeenOnboarding]);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
    setHasSeenOnboarding(true);
  }, [storageKey]);

  const openGuide = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  const closeGuide = useCallback(() => {
    setShowOnboarding(false);
    markSeen();
  }, [markSeen]);

  return {
    showOnboarding,
    setShowOnboarding: (open: boolean) => {
      if (!open) closeGuide();
      else openGuide();
    },
    openGuide,
    hasSeenOnboarding,
    markSeen,
  };
}
