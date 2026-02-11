import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { type MediaResponse } from "@shared/routes";
import { type MediaCategory, MEDIA_CATEGORIES } from "@shared/schema";
import { Play, Calendar, Trash2, Heart, Film, Music, ImageIcon, FileText, File, Pencil, Eye, Clock, Wand2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToggleFavorite, useDeleteMedia } from "@/hooks/use-media";
import { useHaptic } from "@/hooks/use-haptic";
import { motion } from "framer-motion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_ICONS: Record<MediaCategory, any> = {
  video: Film,
  audio: Music,
  image: ImageIcon,
  document: FileText,
  other: File,
};

const CATEGORY_COLORS: Record<MediaCategory, string> = {
  video: "text-blue-400",
  audio: "text-green-400",
  image: "text-purple-400",
  document: "text-amber-400",
  other: "text-muted-foreground",
};

const PREMIUM_GRADIENT_CLASS: Record<MediaCategory, string> = {
  video: "premium-gradient-video",
  audio: "premium-gradient-audio",
  image: "premium-gradient-image",
  document: "premium-gradient-document",
  other: "premium-gradient-other",
};

const CATEGORY_ICON_GLOW: Record<MediaCategory, string> = {
  video: "shadow-blue-500/40",
  audio: "shadow-green-500/40",
  image: "shadow-purple-500/40",
  document: "shadow-amber-500/40",
  other: "shadow-white/20",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface MediaGridProps {
  items: MediaResponse[];
  onPlay: (item: MediaResponse) => void;
  onEdit: (item: MediaResponse) => void;
  bento?: boolean;
}

export function MediaGrid({ items, onPlay, onEdit, bento = true }: MediaGridProps) {
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center py-20 text-center opacity-60"
      >
        <div className="w-24 h-24 rounded-2xl premium-gradient-other flex items-center justify-center mb-6 shadow-xl">
          <File className="w-10 h-10 text-white/60" />
        </div>
        <h3 className="text-2xl font-display font-semibold mb-2" data-testid="text-empty-state">No files yet</h3>
        <p className="text-muted-foreground max-w-md">
          Upload your first file to start building your vault.
        </p>
      </motion.div>
    );
  }

  if (bento && items.length >= 3) {
    return <BentoMediaGrid items={items} onPlay={onPlay} onEdit={onEdit} />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {items.map((item, index) => (
        <MediaCard
          key={item.id}
          item={item}
          onPlay={() => onPlay(item)}
          onEdit={() => onEdit(item)}
          index={index}
        />
      ))}
    </div>
  );
}

function BentoMediaGrid({ items, onPlay, onEdit }: { items: MediaResponse[]; onPlay: (item: MediaResponse) => void; onEdit: (item: MediaResponse) => void }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 auto-rows-auto">
      {items.map((item, index) => {
        const isFeature = index === 0 || (index > 0 && index % 7 === 0);
        return (
          <div
            key={item.id}
            className={isFeature ? "col-span-2 row-span-2" : "col-span-1"}
          >
            <MediaCard
              item={item}
              onPlay={() => onPlay(item)}
              onEdit={() => onEdit(item)}
              index={index}
              featured={isFeature}
            />
          </div>
        );
      })}
    </div>
  );
}

function MediaCard({ item, onPlay, onEdit, index, featured = false }: {
  item: MediaResponse;
  onPlay: () => void;
  onEdit: () => void;
  index: number;
  featured?: boolean;
}) {
  const [, navigate] = useLocation();
  const toggleFavorite = useToggleFavorite();
  const deleteMedia = useDeleteMedia();
  const { toast } = useToast();
  const haptic = useHaptic();
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const cat = (item.category as MediaCategory) || "other";
  const CatIcon = CATEGORY_ICONS[cat];
  const catColor = CATEGORY_COLORS[cat];
  const gradientClass = PREMIUM_GRADIENT_CLASS[cat];
  const glowClass = CATEGORY_ICON_GLOW[cat];

  const hasVisual = cat === "image" || ((cat === "video" || cat === "audio") && item.thumbnailUrl);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (y - 0.5) * -6, y: (x - 0.5) * 6 });
    setGlare({ x: x * 100, y: y * 100, opacity: 0.12 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
  }, []);

  const handleDelete = async () => {
    try {
      haptic("warning");
      await deleteMedia.mutateAsync(item.id);
      toast({ title: "Deleted", description: "Removed from your vault." });
    } catch {
      haptic("error");
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic("tap");
    toggleFavorite.mutate({ id: item.id, isFavorite: !item.isFavorite });
  };

  const displayDate = item.fileDate
    ? format(new Date(item.fileDate), "MMM d, yyyy")
    : item.createdAt
    ? format(new Date(item.createdAt), "MMM d, yyyy")
    : null;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: "preserve-3d", perspective: "800px" }}
      className="group relative rounded-xl overflow-visible card-glow transition-shadow duration-500 h-full"
      data-testid={`card-media-${item.id}`}
    >
      <div className="rounded-xl overflow-hidden h-full flex flex-col">
        <div
          className={`${featured ? "aspect-square" : "aspect-[4/3]"} relative cursor-pointer overflow-hidden flex items-center justify-center ${gradientClass}`}
          onClick={() => { haptic("tap"); onPlay(); }}
        >
          {cat === "image" ? (
            <img
              src={`/objects/${item.url}`}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (cat === "video" || cat === "audio") && item.thumbnailUrl ? (
            <img
              src={`/objects/${item.thumbnailUrl}`}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />

          {!hasVisual && (
            <div className="relative z-20 flex flex-col items-center gap-3">
              <div className={`p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl ${glowClass}`}>
                <CatIcon className={`${featured ? "w-12 h-12" : "w-10 h-10"} text-white drop-shadow-lg`} />
              </div>
              <span className="text-white/50 text-xs font-medium uppercase tracking-widest">{cat}</span>
            </div>
          )}

          {(cat === "video" || cat === "audio") && item.durationSeconds && (
            <div className="absolute bottom-2 right-2 z-20">
              <Badge variant="secondary" className="text-[10px] font-mono bg-black/60 backdrop-blur-md border-white/10 text-white no-default-hover-elevate no-default-active-elevate">
                <Clock className="w-3 h-3 mr-1" />
                {formatDuration(item.durationSeconds)}
              </Badge>
            </div>
          )}

          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
              {cat === "video" ? (
                <Play className="w-6 h-6 text-white ml-0.5 fill-white" />
              ) : (
                <Eye className="w-6 h-6 text-white" />
              )}
            </div>
          </div>

          <div className="absolute top-2.5 left-2.5 z-20">
            <Badge variant="secondary" className="text-[10px] font-mono uppercase tracking-wider bg-black/50 backdrop-blur-md border-white/10 no-default-hover-elevate no-default-active-elevate">
              <CatIcon className={`w-3 h-3 mr-1 ${catColor}`} />
              {cat}
            </Badge>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleFavorite}
                className="absolute top-2.5 right-2.5 z-20 p-2 sm:p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10"
                data-testid={`button-favorite-${item.id}`}
              >
                <Heart className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${item.isFavorite ? "fill-red-500 text-red-500" : "text-white/60"}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {item.isFavorite ? "Remove from favorites" : "Add to favorites"}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="p-3.5 sm:p-4 bg-gradient-to-b from-black/60 to-card/90 backdrop-blur-sm flex-1">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3
                className={`font-display font-semibold ${featured ? "text-base sm:text-lg" : "text-sm sm:text-base"} text-white truncate cursor-pointer group-hover:text-primary transition-colors duration-200`}
                onClick={onPlay}
                title={item.title}
                data-testid={`text-title-${item.id}`}
              >
                {item.title}
              </h3>
              {item.artist && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5" data-testid={`text-artist-${item.id}`}>
                  {item.artist}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                {displayDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {displayDate}
                  </span>
                )}
                {item.label && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-white/10 no-default-hover-elevate no-default-active-elevate">
                    {item.label}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); haptic("tap"); onEdit(); }}
                    data-testid={`button-edit-${item.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Edit details</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={cat === "document" || cat === "other"}
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic("tap");
                      navigate(`/editor/${cat}/${item.id}`);
                    }}
                    data-testid={`button-open-editor-${item.id}`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Open in editor</TooltipContent>
              </Tooltip>
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`button-delete-${item.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Delete file</TooltipContent>
                </Tooltip>
                <AlertDialogContent className="glass-morphism">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently remove "{item.title}" from your vault.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5 no-default-hover-elevate no-default-active-elevate">{tag}</Badge>
              ))}
              {item.tags.length > 3 && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 no-default-hover-elevate no-default-active-elevate">+{item.tags.length - 3}</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="absolute inset-0 rounded-xl pointer-events-none z-30"
        style={{
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}), transparent 60%)`,
          transition: "opacity 0.3s ease",
        }}
      />
    </motion.div>
  );
}
