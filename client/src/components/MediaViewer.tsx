import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { type MediaResponse } from "@shared/routes";
import { type MediaCategory } from "@shared/schema";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  X, Loader2, Download, ExternalLink, Scissors, SlidersHorizontal, Crop,
  ChevronLeft, ChevronRight, Info, Tag, Shield, Calendar, HardDrive,
  FileType, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface MediaViewerProps {
  item: MediaResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items?: MediaResponse[];
  onNavigate?: (item: MediaResponse) => void;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function MediaViewer({ item, open, onOpenChange, items, onNavigate }: MediaViewerProps) {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (!open) {
      videoRef.current?.pause();
      audioRef.current?.pause();
      setShowInfo(false);
    }
  }, [open]);

  const currentIndex = items && item ? items.findIndex(i => i.id === item.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = items ? currentIndex < items.length - 1 : false;

  const goNext = useCallback(() => {
    if (hasNext && items && onNavigate) {
      onNavigate(items[currentIndex + 1]);
    }
  }, [hasNext, items, currentIndex, onNavigate]);

  const goPrev = useCallback(() => {
    if (hasPrev && items && onNavigate) {
      onNavigate(items[currentIndex - 1]);
    }
  }, [hasPrev, items, currentIndex, onNavigate]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, goNext, goPrev]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }, [goNext, goPrev]);

  if (!item) return null;

  const cat = (item.category as MediaCategory) || "other";
  const mediaUrl = `/objects/${item.url}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full p-0 bg-black border-none overflow-hidden rounded-xl sm:rounded-2xl ring-0 focus:outline-none">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-50 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white/70 hover:text-white transition-all backdrop-blur-sm"
          data-testid="button-close-viewer"
        >
          <X className="w-5 h-5" />
        </button>

        <div
          className="relative w-full flex flex-col items-center justify-center bg-black min-h-[50vh] max-h-[85vh]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
          </div>

          {hasPrev && (
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/80 transition-all"
              data-testid="button-viewer-prev"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {hasNext && (
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/80 transition-all"
              data-testid="button-viewer-next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {items && items.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
              <span className="text-[10px] text-white/50 font-medium">{currentIndex + 1} / {items.length}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full flex items-center justify-center"
            >
              {cat === "video" && (
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  className="w-full h-full max-h-[85vh] object-contain relative z-10"
                  controls
                  autoPlay
                  playsInline
                  data-testid="viewer-video"
                />
              )}

              {cat === "audio" && (
                <div className="relative z-10 flex flex-col items-center justify-center gap-8 p-12 w-full">
                  <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center border border-green-500/20">
                    <div className="absolute inset-0 rounded-full bg-green-500/5 animate-ping" style={{ animationDuration: "2s" }} />
                    <div className="flex items-end gap-1 h-12">
                      {[0.6, 1, 0.4, 0.8, 0.5, 0.9, 0.3].map((h, i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 rounded-full bg-gradient-to-t from-green-500 to-emerald-300"
                          animate={{ height: [`${h * 100}%`, `${h * 40}%`, `${h * 100}%`] }}
                          transition={{ duration: 0.6 + i * 0.1, repeat: Infinity, ease: "easeInOut" }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-display font-bold text-white">{item.title}</h3>
                    {item.description && <p className="text-white/60 text-sm max-w-md">{item.description}</p>}
                  </div>
                  <audio
                    ref={audioRef}
                    src={mediaUrl}
                    controls
                    autoPlay
                    className="w-full max-w-lg"
                    data-testid="viewer-audio"
                  />
                </div>
              )}

              {cat === "image" && (
                <img
                  src={mediaUrl}
                  alt={item.title}
                  className="max-w-full max-h-[85vh] object-contain relative z-10"
                  data-testid="viewer-image"
                />
              )}

              {cat === "document" && (
                <div className="relative z-10 flex flex-col items-center justify-center gap-6 p-12 w-full">
                  {item.contentType === "application/pdf" ? (
                    <iframe
                      src={mediaUrl}
                      className="w-full h-[75vh] rounded-lg bg-white"
                      title={item.title}
                      data-testid="viewer-pdf"
                    />
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="w-24 h-24 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                        <span className="text-3xl font-mono font-bold text-amber-400">
                          {item.filename.split(".").pop()?.toUpperCase() || "DOC"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-display font-bold text-white">{item.title}</h3>
                        <p className="text-white/50 text-sm">{item.filename}</p>
                      </div>
                      <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="gap-2 border-white/20">
                          <ExternalLink className="w-4 h-4" />
                          Open File
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {cat === "other" && (
                <div className="relative z-10 flex flex-col items-center justify-center gap-6 p-12">
                  <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-2xl font-mono font-bold text-muted-foreground">
                      {item.filename.split(".").pop()?.toUpperCase() || "FILE"}
                    </span>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-display font-bold text-white">{item.title}</h3>
                    <p className="text-white/50 text-sm">{item.filename}</p>
                  </div>
                  <a href={mediaUrl} download={item.filename}>
                    <Button variant="outline" className="gap-2 border-white/20">
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </a>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-4 bg-black/80 backdrop-blur-xl border-t border-white/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-display font-bold text-white truncate">{item.title}</h2>
              {item.description && <p className="text-white/60 text-sm mt-1">{item.description}</p>}
              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
                  {item.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInfo(prev => !prev)}
                className={`toggle-elevate ${showInfo ? "toggle-elevated" : ""}`}
                data-testid="button-viewer-info"
              >
                <Info className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-white/20 text-white/80"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = `/objects/${item.url}`;
                  link.download = item.filename || item.title;
                  link.click();
                }}
                data-testid="button-viewer-download"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
              {(cat === "video" || cat === "audio" || cat === "image") && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/editor/${cat}/${item.id}`);
                  }}
                  data-testid="button-viewer-edit-studio"
                >
                  {cat === "video" && <Scissors className="w-3.5 h-3.5" />}
                  {cat === "audio" && <SlidersHorizontal className="w-3.5 h-3.5" />}
                  {cat === "image" && <Crop className="w-3.5 h-3.5" />}
                  {cat === "video" ? "Trim & Edit" : cat === "audio" ? "Edit Audio" : "Edit Image"}
                </Button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <FileType className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Type</p>
                      <p className="text-xs text-white/80 truncate">{item.contentType || "Unknown"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Size</p>
                      <p className="text-xs text-white/80">{formatFileSize((item as any).fileSize)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Uploaded</p>
                      <p className="text-xs text-white/80">{item.createdAt ? format(new Date(item.createdAt), "MMM d, yyyy") : "Unknown"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                      <Tag className="w-3.5 h-3.5 text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Category</p>
                      <p className="text-xs text-white/80 capitalize">{item.category}</p>
                    </div>
                  </div>
                  {item.label && (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Label</p>
                        <p className="text-xs text-white/80">{item.label}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/40 uppercase tracking-wider">Provenance</p>
                      <p className="text-xs text-white/80">
                        {(item as any).blockchainHash ? "On-chain" : "Local"}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
