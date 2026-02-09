import { useState, useRef, useCallback } from "react";
import { type MediaResponse } from "@shared/routes";
import { type MediaCategory, MEDIA_CATEGORIES } from "@shared/schema";
import { Play, Calendar, Trash2, Heart, Film, Music, ImageIcon, FileText, File, Pencil, Eye } from "lucide-react";
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

const CATEGORY_BG: Record<MediaCategory, string> = {
  video: "bg-blue-500/10 border-blue-500/20",
  audio: "bg-green-500/10 border-green-500/20",
  image: "bg-purple-500/10 border-purple-500/20",
  document: "bg-amber-500/10 border-amber-500/20",
  other: "bg-white/5 border-white/10",
};

interface MediaGridProps {
  items: MediaResponse[];
  onPlay: (item: MediaResponse) => void;
  onEdit: (item: MediaResponse) => void;
}

export function MediaGrid({ items, onPlay, onEdit }: MediaGridProps) {
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center py-20 text-center opacity-60"
      >
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <File className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-display font-semibold mb-2" data-testid="text-empty-state">No files yet</h3>
        <p className="text-muted-foreground max-w-md">
          Upload your first file to start building your vault.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
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

function MediaCard({ item, onPlay, onEdit, index }: { item: MediaResponse; onPlay: () => void; onEdit: () => void; index: number }) {
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
  const catBg = CATEGORY_BG[cat];

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (y - 0.5) * -5, y: (x - 0.5) * 5 });
    setGlare({ x: x * 100, y: y * 100, opacity: 0.1 });
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
      className="group relative glass-card rounded-xl overflow-visible hover:border-primary/20 transition-[border-color] duration-300"
      data-testid={`card-media-${item.id}`}
    >
      <div className="rounded-xl overflow-hidden">
        <div
          className="aspect-[4/3] relative cursor-pointer overflow-hidden flex items-center justify-center"
          onClick={() => { haptic("tap"); onPlay(); }}
          style={{ background: "linear-gradient(135deg, rgba(30,30,40,0.8), rgba(15,15,25,0.9))" }}
        >
          {cat === "image" ? (
            <img
              src={`/objects/${item.url}`}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent z-10" />

          {cat !== "image" && (
            <div className={`relative z-20 p-4 rounded-full ${catBg} border`}>
              <CatIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${catColor}`} />
            </div>
          )}

          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              {cat === "video" ? (
                <Play className="w-5 h-5 text-white ml-0.5 fill-white" />
              ) : (
                <Eye className="w-5 h-5 text-white" />
              )}
            </div>
          </div>

          <div className="absolute top-2 left-2 z-20">
            <Badge variant="secondary" className="text-[10px] font-mono uppercase tracking-wider bg-black/50 backdrop-blur-md border-white/10 no-default-hover-elevate no-default-active-elevate">
              <CatIcon className={`w-3 h-3 mr-1 ${catColor}`} />
              {cat}
            </Badge>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleFavorite}
                className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10"
                data-testid={`button-favorite-${item.id}`}
              >
                <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-red-500 text-red-500" : "text-white/60"}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {item.isFavorite ? "Remove from favorites" : "Add to favorites"}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="p-3 sm:p-4">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3
                className="font-display font-semibold text-sm sm:text-base text-white truncate cursor-pointer group-hover:text-primary transition-colors duration-200"
                onClick={onPlay}
                title={item.title}
                data-testid={`text-title-${item.id}`}
              >
                {item.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
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
