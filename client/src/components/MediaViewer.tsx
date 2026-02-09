import { useEffect, useRef } from "react";
import { type MediaResponse } from "@shared/routes";
import { type MediaCategory } from "@shared/schema";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Loader2, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface MediaViewerProps {
  item: MediaResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaViewer({ item, open, onOpenChange }: MediaViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!open) {
      videoRef.current?.pause();
      audioRef.current?.pause();
    }
  }, [open]);

  if (!item) return null;

  const cat = (item.category as MediaCategory) || "other";
  const mediaUrl = `/objects/${item.url}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full p-0 bg-black border-none overflow-hidden sm:rounded-2xl ring-0 focus:outline-none">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-50 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white/70 hover:text-white transition-all backdrop-blur-sm"
          data-testid="button-close-viewer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative w-full flex flex-col items-center justify-center bg-black min-h-[50vh] max-h-[85vh]">
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
          </div>

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
        </div>

        <div className="p-4 bg-black/80 backdrop-blur-xl border-t border-white/5">
          <h2 className="text-lg font-display font-bold text-white">{item.title}</h2>
          {item.description && <p className="text-white/60 text-sm mt-1">{item.description}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
