import { useState } from "react";
import { type VideoResponse } from "@shared/routes";
import { Play, Calendar, Trash2, Heart } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToggleFavorite, useDeleteVideo } from "@/hooks/use-videos";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface VideoGridProps {
  videos: VideoResponse[];
  onPlay: (video: VideoResponse) => void;
}

export function VideoGrid({ videos, onPlay }: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <Play className="w-10 h-10 text-muted-foreground ml-1" />
        </div>
        <h3 className="text-2xl font-display font-semibold mb-2">No videos yet</h3>
        <p className="text-muted-foreground max-w-md">
          Upload your first concert memory to start building your collection.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video, index) => (
        <VideoCard 
          key={video.id} 
          video={video} 
          onPlay={() => onPlay(video)}
          index={index}
        />
      ))}
    </div>
  );
}

function VideoCard({ video, onPlay, index }: { video: VideoResponse; onPlay: () => void; index: number }) {
  const toggleFavorite = useToggleFavorite();
  const deleteVideo = useDeleteVideo();
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteVideo.mutateAsync(video.id);
      toast({
        title: "Deleted",
        description: "Video removed from your collection.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete video.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative bg-card/40 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail Area - Using actual video element for preview or just a nice placeholder */}
      <div 
        className="aspect-video bg-black/40 relative cursor-pointer overflow-hidden"
        onClick={onPlay}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
        
        {/* Placeholder Gradient if we don't have a thumbnail URL yet (could generate later) */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-purple-900/40" />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
            <Play className="w-6 h-6 text-white ml-1 fill-white" />
          </div>
        </div>

        {/* Video Duration / Type Badge (Mock for now) */}
        <div className="absolute top-3 left-3 z-20">
          <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-mono uppercase tracking-wider text-white/80 border border-white/10">
            {video.contentType.split('/')[1]?.toUpperCase() || 'VIDEO'}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite.mutate({ id: video.id, isFavorite: !video.isFavorite });
          }}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors border border-white/10"
        >
          <Heart 
            className={`w-4 h-4 transition-colors ${video.isFavorite ? "fill-red-500 text-red-500" : "text-white/70 hover:text-white"}`} 
          />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-5">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h3 
              className="font-display font-semibold text-lg text-white truncate group-hover:text-primary transition-colors cursor-pointer"
              onClick={onPlay}
              title={video.title}
            >
              {video.title}
            </h3>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{video.createdAt ? format(new Date(video.createdAt), 'MMM d, yyyy') : 'Unknown date'}</span>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-2"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this memory?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the video "{video.title}" from your collection.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="hover:bg-white/5">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {video.description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {video.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}
