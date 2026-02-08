import { useEffect, useRef } from "react";
import { type VideoResponse } from "@shared/routes";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Loader2 } from "lucide-react";

interface VideoPlayerModalProps {
  video: VideoResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoPlayerModal({ video, open, onOpenChange }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset video when opened/closed or changed
  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
    }
  }, [open]);

  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full p-0 bg-black border-none overflow-hidden aspect-video sm:rounded-2xl ring-0 focus:outline-none">
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white/70 hover:text-white transition-all backdrop-blur-sm"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative w-full h-full flex items-center justify-center bg-black">
           {/* Loading indicator behind video */}
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <Loader2 className="w-10 h-10 text-white/20 animate-spin" />
          </div>

          <video
            ref={videoRef}
            src={`/objects/${video.url}`} // Using the proxy route from routes.ts
            className="w-full h-full object-contain relative z-10"
            controls
            autoPlay
            playsInline
          >
            Your browser does not support the video tag.
          </video>

          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent z-20 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300">
            <h2 className="text-2xl font-display font-bold text-white mb-2">{video.title}</h2>
            {video.description && (
              <p className="text-white/80 max-w-2xl text-sm leading-relaxed">{video.description}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
