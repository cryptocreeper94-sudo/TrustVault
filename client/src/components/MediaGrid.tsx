import { useState } from "react";
import { type MediaResponse } from "@shared/routes";
import { type MediaCategory, MEDIA_CATEGORIES } from "@shared/schema";
import { Play, Calendar, Trash2, Heart, Film, Music, ImageIcon, FileText, File, Pencil } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToggleFavorite, useDeleteMedia } from "@/hooks/use-media";
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
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <File className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-display font-semibold mb-2" data-testid="text-empty-state">No files yet</h3>
        <p className="text-muted-foreground max-w-md">
          Upload your first file to start building your vault.
        </p>
      </div>
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

  const cat = (item.category as MediaCategory) || "other";
  const CatIcon = CATEGORY_ICONS[cat];
  const catColor = CATEGORY_COLORS[cat];
  const catBg = CATEGORY_BG[cat];

  const handleDelete = async () => {
    try {
      await deleteMedia.mutateAsync(item.id);
      toast({ title: "Deleted", description: "Removed from your vault." });
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const displayDate = item.fileDate
    ? format(new Date(item.fileDate), "MMM d, yyyy")
    : item.createdAt
    ? format(new Date(item.createdAt), "MMM d, yyyy")
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.35 }}
      className="group relative bg-card/40 backdrop-blur-sm border border-white/5 rounded-xl overflow-hidden hover:border-primary/20 transition-all duration-200"
      data-testid={`card-media-${item.id}`}
    >
      <div
        className="aspect-[4/3] relative cursor-pointer overflow-hidden flex items-center justify-center"
        onClick={onPlay}
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

        {cat === "video" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <Play className="w-6 h-6 text-white ml-0.5 fill-white" />
            </div>
          </div>
        )}

        <div className="absolute top-2 left-2 z-20">
          <Badge variant="secondary" className="text-[10px] font-mono uppercase tracking-wider bg-black/50 backdrop-blur-md border-white/10 no-default-hover-elevate no-default-active-elevate">
            <CatIcon className={`w-3 h-3 mr-1 ${catColor}`} />
            {cat}
          </Badge>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite.mutate({ id: item.id, isFavorite: !item.isFavorite });
          }}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors border border-white/10"
          data-testid={`button-favorite-${item.id}`}
        >
          <Heart className={`w-3.5 h-3.5 transition-colors ${item.isFavorite ? "fill-red-500 text-red-500" : "text-white/60"}`} />
        </button>
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3
              className="font-display font-semibold text-sm sm:text-base text-white truncate cursor-pointer group-hover:text-primary transition-colors"
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-white"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              data-testid={`button-edit-${item.id}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" data-testid={`button-delete-${item.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-white/10">
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
    </motion.div>
  );
}
