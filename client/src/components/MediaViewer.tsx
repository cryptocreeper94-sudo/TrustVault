import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { type MediaResponse } from "@shared/routes";
import { type MediaCategory } from "@shared/schema";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  X, Loader2, Download, ExternalLink, Scissors, SlidersHorizontal, Crop,
  ChevronLeft, ChevronRight, Info, Tag, Shield, Calendar, HardDrive,
  FileType, Clock, ZoomIn, ZoomOut, Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

function EpubReader({ url, title }: { url: string; title: string }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState("");

  useEffect(() => {
    let book: any = null;

    async function loadEpub() {
      try {
        const ePub = (await import("epubjs")).default;
        book = ePub(url);
        const rendition = book.renderTo(viewerRef.current!, {
          width: "100%",
          height: "100%",
          spread: "none",
          flow: "paginated",
        });
        renditionRef.current = rendition;

        rendition.themes.default({
          body: {
            color: "#e5e5e5 !important",
            background: "transparent !important",
            "font-family": "Georgia, serif !important",
            "font-size": "16px !important",
            "line-height": "1.7 !important",
            padding: "0 8px !important",
          },
          "p, div, span, li, td, th, h1, h2, h3, h4, h5, h6": {
            color: "#e5e5e5 !important",
          },
          "a": { color: "#22d3ee !important" },
          "img": { "max-width": "100% !important" },
        });

        rendition.on("relocated", (location: any) => {
          const displayed = location?.start?.displayed;
          if (displayed) {
            setCurrentPage(`${displayed.page} / ${displayed.total}`);
          }
        });

        await rendition.display();
        setLoading(false);
      } catch (e: any) {
        console.error("ePub load error:", e);
        setError(e.message || "Failed to load ePub");
        setLoading(false);
      }
    }

    loadEpub();

    return () => {
      if (book) {
        try { book.destroy(); } catch {}
      }
    };
  }, [url]);

  const prevPage = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const nextPage = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prevPage();
      if (e.key === "ArrowRight") nextPage();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prevPage, nextPage]);

  if (error) {
    return (
      <div className="text-center space-y-4 w-full" data-testid="epub-error">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <span className="text-2xl">📕</span>
        </div>
        <p className="text-white/70 text-sm">Could not load this ePub file</p>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="gap-2 border-white/20">
            <Download className="w-4 h-4" />
            Download Instead
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-3" data-testid="epub-reader">
      <div className="w-full max-w-2xl rounded-lg overflow-hidden bg-[#1a1a2e] border border-white/10 relative" style={{ height: "clamp(50vh, 65vh, 75vh)" }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e] z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-white/50">Loading book...</p>
            </div>
          </div>
        )}
        <div ref={viewerRef} className="w-full h-full" />
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={prevPage} className="border-white/20 gap-1" data-testid="button-epub-prev">
          <ChevronLeft className="w-4 h-4" /> Prev
        </Button>
        {currentPage && (
          <span className="text-xs text-white/50 font-mono min-w-[5rem] text-center" data-testid="text-epub-page">
            {currentPage}
          </span>
        )}
        <Button variant="outline" size="sm" onClick={nextPage} className="border-white/20 gap-1" data-testid="button-epub-next">
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

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

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;

export function MediaViewer({ item, open, onOpenChange, items, onNavigate }: MediaViewerProps) {
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const lastPinchDist = useRef<number | null>(null);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    panOffset.current = { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    if (!open) {
      videoRef.current?.pause();
      audioRef.current?.pause();
      setShowInfo(false);
      resetZoom();
    }
  }, [open, resetZoom]);

  useEffect(() => {
    resetZoom();
  }, [item?.id, resetZoom]);

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
    if (zoom > 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }, [goNext, goPrev, zoom]);

  const clampZoom = useCallback((z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const cat = (item?.category as MediaCategory) || "other";
    if (cat !== "image") return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => {
      const next = clampZoom(prev + delta * prev);
      if (next <= 1) {
        setPan({ x: 0, y: 0 });
        panOffset.current = { x: 0, y: 0 };
      }
      return next;
    });
  }, [item?.category, clampZoom]);

  const handleImageDoubleClick = useCallback(() => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      resetZoom();
    }
  }, [zoom, resetZoom]);

  const handlePanMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    isPanning.current = true;
    panStart.current = { x: e.clientX - panOffset.current.x, y: e.clientY - panOffset.current.y };
  }, [zoom]);

  const handlePanMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current || zoom <= 1) return;
    const nx = e.clientX - panStart.current.x;
    const ny = e.clientY - panStart.current.y;
    panOffset.current = { x: nx, y: ny };
    setPan({ x: nx, y: ny });
  }, [zoom]);

  const handlePanMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleImageTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1 && zoom > 1) {
      isPanning.current = true;
      panStart.current = { x: e.touches[0].clientX - panOffset.current.x, y: e.touches[0].clientY - panOffset.current.y };
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, [zoom]);

  const handleImageTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastPinchDist.current !== null) {
        const scale = dist / lastPinchDist.current;
        setZoom(prev => {
          const next = clampZoom(prev * scale);
          if (next <= 1) {
            setPan({ x: 0, y: 0 });
            panOffset.current = { x: 0, y: 0 };
          }
          return next;
        });
      }
      lastPinchDist.current = dist;
    } else if (e.touches.length === 1 && isPanning.current && zoom > 1) {
      const nx = e.touches[0].clientX - panStart.current.x;
      const ny = e.touches[0].clientY - panStart.current.y;
      panOffset.current = { x: nx, y: ny };
      setPan({ x: nx, y: ny });
    }
  }, [zoom, clampZoom]);

  const handleImageTouchEnd = useCallback((e: React.TouchEvent) => {
    lastPinchDist.current = null;
    isPanning.current = false;
    if (zoom <= 1) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
        if (dx < 0) goNext();
        else goPrev();
      }
    }
  }, [zoom, goNext, goPrev]);

  const zoomIn = useCallback(() => {
    setZoom(prev => clampZoom(prev + ZOOM_STEP * prev));
  }, [clampZoom]);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const next = clampZoom(prev - ZOOM_STEP * prev);
      if (next <= 1) {
        setPan({ x: 0, y: 0 });
        panOffset.current = { x: 0, y: 0 };
      }
      return next;
    });
  }, [clampZoom]);

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

          {cat === "image" && (
            <div className="absolute bottom-2 right-2 z-40 flex items-center gap-1 px-1 py-0.5 rounded-md bg-black/60 backdrop-blur-sm" data-testid="zoom-controls">
              <button
                onClick={zoomOut}
                className="p-1 text-white/60 hover:text-white transition-colors"
                data-testid="button-zoom-out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-white/70 font-mono min-w-[3rem] text-center" data-testid="text-zoom-level">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="p-1 text-white/60 hover:text-white transition-colors"
                data-testid="button-zoom-in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetZoom}
                className="p-1 text-white/60 hover:text-white transition-colors"
                title="Fit to view"
                data-testid="button-zoom-fit"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
              {zoom === 1 && (
                <span className="text-[9px] text-white/30 ml-1 hidden sm:inline">Scroll to zoom</span>
              )}
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
                <div
                  ref={imageContainerRef}
                  className="w-full h-full flex items-center justify-center relative z-10 overflow-hidden"
                  style={{ cursor: zoom > 1 ? (isPanning.current ? "grabbing" : "grab") : "zoom-in" }}
                  onWheel={handleWheel}
                  onDoubleClick={handleImageDoubleClick}
                  onMouseDown={handlePanMouseDown}
                  onMouseMove={handlePanMouseMove}
                  onMouseUp={handlePanMouseUp}
                  onMouseLeave={handlePanMouseUp}
                  onTouchStart={handleImageTouchStart}
                  onTouchMove={handleImageTouchMove}
                  onTouchEnd={handleImageTouchEnd}
                  data-testid="viewer-image-container"
                >
                  <img
                    src={mediaUrl}
                    alt={item.title}
                    className="max-w-full max-h-[85vh] object-contain select-none"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                      transformOrigin: "center center",
                      transition: isPanning.current ? "none" : "transform 0.15s ease-out",
                    }}
                    draggable={false}
                    data-testid="viewer-image"
                  />
                </div>
              )}

              {cat === "document" && (
                <div className="relative z-10 flex flex-col items-center justify-center gap-6 p-4 sm:p-12 w-full">
                  {item.contentType === "application/pdf" ? (
                    <iframe
                      src={mediaUrl}
                      className="w-full h-[75vh] rounded-lg bg-white"
                      title={item.title}
                      data-testid="viewer-pdf"
                    />
                  ) : (item.contentType === "application/epub+zip" || item.filename?.endsWith(".epub")) ? (
                    <EpubReader url={mediaUrl} title={item.title} />
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
