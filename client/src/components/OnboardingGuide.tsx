import { useState, useEffect, useCallback, useId } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload, FolderOpen, Play, Pencil, Layers, LayoutGrid,
  Shield, ChevronRight, ChevronLeft, Sparkles, X,
  HelpCircle,
} from "lucide-react";

import imgWelcome from "../assets/images/onboarding-welcome.jpg";
import imgUpload from "../assets/images/onboarding-upload.jpg";
import imgCollections from "../assets/images/onboarding-collections.jpg";
import imgBrowse from "../assets/images/onboarding-browse.jpg";
import imgPreview from "../assets/images/onboarding-preview.jpg";
import imgEdit from "../assets/images/onboarding-edit.jpg";
import imgMerge from "../assets/images/onboarding-merge.jpg";
import imgReady from "../assets/images/onboarding-ready.jpg";

export interface OnboardingSlide {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  tips?: string[];
  image?: string;
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
    image: imgWelcome,
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
    image: imgUpload,
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
    image: imgCollections,
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
    image: imgBrowse,
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
    image: imgPreview,
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
    image: imgEdit,
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
    image: imgMerge,
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
    image: imgReady,
  },
];

const SWIPE_THRESHOLD = 50;

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
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const dragX = useMotionValue(0);
  const dragOpacity = useTransform(dragX, [-150, 0, 150], [0.5, 1, 0.5]);

  useEffect(() => {
    if (open) {
      setCurrentSlide(0);
      setImageLoaded({});
    }
  }, [open]);

  useEffect(() => {
    slides.forEach((slide, i) => {
      if (slide.image) {
        const img = new Image();
        img.onload = () => setImageLoaded(prev => ({ ...prev, [i]: true }));
        img.src = slide.image;
      }
    });
  }, [slides]);

  const totalSlides = slides.length;
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === totalSlides - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      onOpenChange(false);
      onComplete?.();
      return;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
    setDirection(1);
    setCurrentSlide(prev => prev + 1);
  }, [isLast, onOpenChange, onComplete]);

  const goPrev = useCallback(() => {
    if (isFirst) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
    setDirection(-1);
    setCurrentSlide(prev => prev - 1);
  }, [isFirst]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -SWIPE_THRESHOLD && !isLast) {
        goNext();
      } else if (info.offset.x > SWIPE_THRESHOLD && !isFirst) {
        goPrev();
      }
    },
    [goNext, goPrev, isLast, isFirst]
  );

  const actualSlides = brandName
    ? slides.map((s, i) =>
        i === 0 ? { ...s, title: `Welcome to ${brandName}` } : s
      )
    : slides;

  const activeSlide = actualSlides[currentSlide];
  const Icon = activeSlide.icon;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
      scale: 0.96,
    }),
  };

  const progressPercent = ((currentSlide + 1) / totalSlides) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100vw-2rem)] sm:max-w-md w-full p-0 border-none overflow-hidden rounded-2xl bg-card shadow-2xl"
        aria-describedby="onboarding-description"
        aria-labelledby="onboarding-title"
      >
        <DialogTitle className="sr-only" id="onboarding-title">
          {activeSlide.title}
        </DialogTitle>
        <DialogDescription className="sr-only" id="onboarding-description">
          {activeSlide.description}
        </DialogDescription>

        <div className="relative select-none">
          <motion.div
            className="relative h-48 sm:h-56 overflow-hidden cursor-grab active:cursor-grabbing"
            style={{ opacity: dragOpacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            dragMomentum={false}
            onDrag={(_, info) => dragX.set(info.offset.x)}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute inset-0"
              >
                {activeSlide.image && (
                  <>
                    {!imageLoaded[currentSlide] && (
                      <div className="absolute inset-0 shimmer" />
                    )}
                    <img
                      src={activeSlide.image}
                      alt=""
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                        imageLoaded[currentSlide] ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="flex flex-col items-center gap-3"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl glass-morphism flex items-center justify-center shadow-2xl">
                      <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-lg" />
                    </div>
                    <span className="text-white/60 text-[11px] font-medium tracking-widest uppercase">
                      {currentSlide + 1} / {totalSlides}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-10">
              <motion.div
                className={`h-full bg-gradient-to-r ${activeSlide.iconColor}`}
                initial={false}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex z-10">
              {actualSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                      navigator.vibrate(5);
                    }
                    setDirection(i > currentSlide ? 1 : -1);
                    setCurrentSlide(i);
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                  className="flex items-center justify-center w-[44px] h-[44px] sm:w-8 sm:h-8"
                  data-testid={`button-onboarding-dot-${i}`}
                >
                  <span className={`block rounded-full transition-all duration-300 ${
                    i === currentSlide
                      ? "w-7 h-2.5 bg-white shadow-lg shadow-white/30"
                      : "w-2.5 h-2.5 bg-white/30"
                  }`} />
                </button>
              ))}
            </div>
          </motion.div>

          <div className="absolute top-3 right-3 z-20">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              aria-label="Close guide"
              className="rounded-full glass-morphism text-white/80"
              data-testid="button-onboarding-close"
            >
              <X className="w-4 h-4" />
            </Button>
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
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <h2
                  className="text-xl sm:text-2xl font-display font-bold text-foreground mb-2 text-balance"
                  data-testid="text-onboarding-title"
                >
                  {activeSlide.title}
                </h2>
                <p
                  className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed mb-4"
                  data-testid="text-onboarding-description"
                >
                  {activeSlide.description}
                </p>

                {activeSlide.tips && activeSlide.tips.length > 0 && (
                  <div className="space-y-2.5">
                    {activeSlide.tips.map((tip, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
                        className="flex items-start gap-3 text-sm"
                      >
                        <div className={`mt-1.5 w-2 h-2 rounded-full bg-gradient-to-br ${activeSlide.iconColor} shrink-0 shadow-sm`} />
                        <span className="text-muted-foreground leading-snug">{tip}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-3 mt-6">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={goPrev}
                  className="gap-1"
                  data-testid="button-onboarding-prev"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              )}
              <div className="flex-1" />
              {isLast ? (
                <Button
                  size="lg"
                  onClick={goNext}
                  className="gap-1.5"
                  data-testid="button-onboarding-finish"
                >
                  <Sparkles className="w-4 h-4" />
                  Get Started
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={goNext}
                  className="gap-1"
                  data-testid="button-onboarding-next"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground/50 text-center mt-4 sm:hidden">
              Swipe left or right to navigate
            </p>
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
        className="inline-flex items-center justify-center w-[44px] h-[44px] sm:w-7 sm:h-7 rounded-full bg-muted/50 text-muted-foreground transition-colors"
        data-testid="button-help-tooltip"
      >
        <HelpCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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
            className={`absolute z-50 w-60 p-3.5 rounded-xl glass-morphism shadow-2xl text-xs text-foreground leading-relaxed ${
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
