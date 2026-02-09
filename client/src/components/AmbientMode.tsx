import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pause, Play, Clock, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaResponse } from "@shared/routes";

function AmbientProgress({ isPaused, intervalSec, slideKey }: { isPaused: boolean; intervalSec: number; slideKey: number }) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());
  const pausedAtRef = useRef(0);

  useEffect(() => {
    setProgress(0);
    startRef.current = Date.now();
    pausedAtRef.current = 0;
  }, [slideKey]);

  useEffect(() => {
    if (isPaused) {
      pausedAtRef.current = progress;
      return;
    }
    startRef.current = Date.now() - (pausedAtRef.current * intervalSec * 10);
    let raf: number;
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / (intervalSec * 1000)) * 100, 100);
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPaused, intervalSec, slideKey]);

  return (
    <div
      className="h-full bg-white/40 rounded-full transition-none"
      style={{ width: `${progress}%` }}
    />
  );
}

interface AmbientModeProps {
  items: MediaResponse[];
  open: boolean;
  onClose: () => void;
}

export function AmbientMode({ items, open, onClose }: AmbientModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [intervalSec] = useState(8);

  const imageItems = items.filter(i => i.category === "image");

  const nextSlide = useCallback(() => {
    if (imageItems.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % imageItems.length);
  }, [imageItems.length]);

  useEffect(() => {
    if (!open || isPaused || imageItems.length === 0) return;
    const timer = setInterval(nextSlide, intervalSec * 1000);
    return () => clearInterval(timer);
  }, [open, isPaused, intervalSec, nextSlide, imageItems.length]);

  useEffect(() => {
    if (!open) return;
    let hideTimer: ReturnType<typeof setTimeout>;

    const handleMove = () => {
      setShowControls(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchstart", handleMove);
    hideTimer = setTimeout(() => setShowControls(false), 3000);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchstart", handleMove);
      clearTimeout(hideTimer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") { e.preventDefault(); setIsPaused(p => !p); }
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") setCurrentIndex(prev => prev <= 0 ? imageItems.length - 1 : prev - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose, nextSlide, imageItems.length]);

  if (!open) return null;

  const currentItem = imageItems[currentIndex];

  if (imageItems.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center"
      >
        <div className="text-center space-y-4 p-6">
          <Image className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-display font-semibold">No Images Yet</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Upload some images to your vault to use Ambient Mode. Your photos will cycle as a beautiful screensaver display.
          </p>
          <Button onClick={onClose} data-testid="button-close-ambient-empty">
            Go Back
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black cursor-none"
      style={{ cursor: showControls ? "default" : "none" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem?.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {currentItem && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110"
                style={{ backgroundImage: `url(/objects/${currentItem.url})` }}
              />
              <img
                src={`/objects/${currentItem.url}`}
                alt={currentItem.title}
                className="absolute inset-0 w-full h-full object-contain z-10"
                data-testid="ambient-image"
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/80"
                  data-testid="button-close-ambient"
                >
                  <X className="h-5 w-5" />
                </Button>
                <span className="text-xs text-white/60 uppercase tracking-wider font-medium">Ambient Mode</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPaused(!isPaused)}
                  className="text-white/80"
                  data-testid="button-pause-ambient"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/70 to-transparent">
              <div className="max-w-2xl mx-auto space-y-3">
                {currentItem && (
                  <div>
                    <h3 className="text-white text-lg font-display font-semibold" data-testid="ambient-title">
                      {currentItem.title}
                    </h3>
                    {currentItem.description && (
                      <p className="text-white/50 text-sm mt-1">{currentItem.description}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <AmbientProgress isPaused={isPaused} intervalSec={intervalSec} slideKey={currentIndex} />
                  </div>
                  <div className="flex items-center gap-1.5 text-white/40 text-xs shrink-0">
                    <Clock className="h-3 w-3" />
                    <span>{currentIndex + 1} / {imageItems.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
