import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCreateMedia } from "@/hooks/use-media";
import { useUpload } from "@/hooks/use-upload";
import { detectCategory, type MediaCategory } from "@shared/schema";
import {
  Loader2, UploadCloud, CheckCircle, AlertCircle, Film, Music,
  ImageIcon, FileText, File, X, ChevronDown, ChevronUp, Clock,
  MapPin, Mic2, Route, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_CONFIG: Record<MediaCategory, { icon: any; color: string; label: string }> = {
  video: { icon: Film, color: "text-blue-400", label: "Video" },
  audio: { icon: Music, color: "text-green-400", label: "Audio" },
  image: { icon: ImageIcon, color: "text-purple-400", label: "Image" },
  document: { icon: FileText, color: "text-amber-400", label: "Document" },
  other: { icon: File, color: "text-muted-foreground", label: "File" },
};

const ALL_ACCEPT = "video/*,audio/*,image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv,.zip,.rar";

type FileStatus = "pending" | "extracting" | "uploading" | "complete" | "error";

interface QueuedFile {
  id: string;
  file: File;
  category: MediaCategory;
  status: FileStatus;
  progress: number;
  error?: string;
  thumbnailBlob?: Blob | null;
  durationSeconds?: number;
  title: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractVideoMetadata(file: File): Promise<{ thumbnail: Blob | null; duration: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onloadedmetadata = () => {
      const duration = Math.round(video.duration);
      const seekTime = Math.min(1, video.duration * 0.25);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(video.videoWidth, 400);
        canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            resolve({ thumbnail: blob, duration: Math.round(video.duration) });
          }, "image/jpeg", 0.8);
        } else {
          URL.revokeObjectURL(url);
          resolve({ thumbnail: null, duration: Math.round(video.duration) });
        }
      } catch {
        URL.revokeObjectURL(url);
        resolve({ thumbnail: null, duration: Math.round(video.duration) });
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ thumbnail: null, duration: 0 });
    };
  });
}

function extractImageThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const maxSize = 200;
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) {
            h = Math.round((maxSize / w) * h);
            w = maxSize;
          } else {
            w = Math.round((maxSize / h) * w);
            h = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            resolve(blob);
          }, "image/jpeg", 0.8);
        } else {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

async function uploadBlobAsFile(blob: Blob, filename: string): Promise<string | null> {
  try {
    const response = await fetch("/api/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: filename,
        size: blob.size,
        contentType: blob.type || "image/jpeg",
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();

    const putRes = await fetch(data.uploadURL, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": blob.type || "image/jpeg" },
    });
    if (!putRes.ok) return null;
    return data.objectPath;
  } catch {
    return null;
  }
}

export function UploadDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [description, setDescription] = useState("");
  const [label, setLabel] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [fileDate, setFileDate] = useState<string>("");
  const [artist, setArtist] = useState("");
  const [venue, setVenue] = useState("");
  const [tour, setTour] = useState("");
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMedia = useCreateMedia();
  const { uploadFile } = useUpload();
  const { toast } = useToast();

  const isSingleFile = queue.length === 1;
  const hasFiles = queue.length > 0;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    const newItems: QueuedFile[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      category: detectCategory(file.type),
      status: "pending" as FileStatus,
      progress: 0,
      title: file.name.replace(/\.[^/.]+$/, ""),
    }));

    setQueue((prev) => [...prev, ...newItems]);
    setUploadComplete(false);

    if (!fileDate && files[0]?.lastModified) {
      const d = new Date(files[0].lastModified);
      setFileDate(d.toISOString().split("T")[0]);
    }

    if (e.target) e.target.value = "";
  }, [fileDate]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateQueueItem = useCallback((id: string, updates: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleAutoTag = async () => {
    if (queue.length === 0) return;
    
    const file = queue[0].file;
    const category = queue[0].category;
    
    setIsAutoTagging(true);
    try {
      let imageUrl: string | undefined;
      
      // For images, convert to base64 data URL
      if (category === "image") {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            reject(new Error("Failed to read file"));
          };
          reader.readAsDataURL(file);
        });
      }
      
      const response = await fetch("/api/ai/auto-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageUrl,
          filename: file.name,
          category: category,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate tags");
      }
      
      const data = await response.json();
      
      // Merge tags (avoid duplicates)
      if (data.tags && Array.isArray(data.tags)) {
        const newTags = data.tags.filter((tag: string) => !tags.includes(tag));
        setTags([...tags, ...newTags]);
      }
      
      // Set description if empty
      if (!description && data.description) {
        setDescription(data.description);
      }
      
      toast({
        title: "Tags Generated",
        description: "AI-generated tags and description added successfully.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate tags";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsAutoTagging(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (queue.length === 0) return;

    setIsProcessing(true);
    let completed = 0;
    let errors = 0;

    for (const item of queue) {
      if (item.status === "complete") {
        completed++;
        continue;
      }

      updateQueueItem(item.id, { status: "extracting", progress: 5 });

      let thumbnailUrl: string | undefined;
      let durationSeconds: number | undefined;

      try {
        if (item.category === "video") {
          updateQueueItem(item.id, { progress: 10 });
          const meta = await extractVideoMetadata(item.file);
          durationSeconds = meta.duration || undefined;

          if (meta.thumbnail) {
            updateQueueItem(item.id, { progress: 20 });
            const thumbFilename = `thumb_${item.file.name.replace(/\.[^/.]+$/, "")}.jpg`;
            const thumbPath = await uploadBlobAsFile(meta.thumbnail, thumbFilename);
            if (thumbPath) thumbnailUrl = thumbPath;
          }
        } else if (item.category === "image") {
          updateQueueItem(item.id, { progress: 10 });
          const thumbBlob = await extractImageThumbnail(item.file);
          if (thumbBlob) {
            updateQueueItem(item.id, { progress: 20 });
            const thumbFilename = `thumb_${item.file.name.replace(/\.[^/.]+$/, "")}.jpg`;
            const thumbPath = await uploadBlobAsFile(thumbBlob, thumbFilename);
            if (thumbPath) thumbnailUrl = thumbPath;
          }
        }

        updateQueueItem(item.id, { status: "uploading", progress: 30 });
        const uploadResult = await uploadFile(item.file);
        if (!uploadResult) throw new Error("Upload failed");

        updateQueueItem(item.id, { progress: 70 });

        const titleToUse = isSingleFile
          ? (queue[0].title || item.file.name.replace(/\.[^/.]+$/, ""))
          : item.title;

        await createMedia.mutateAsync({
          title: titleToUse,
          description: description || undefined,
          url: uploadResult.objectPath,
          filename: uploadResult.metadata.name,
          contentType: uploadResult.metadata.contentType,
          size: uploadResult.metadata.size,
          label: label || undefined,
          tags: tags.length > 0 ? tags : undefined,
          fileDate: fileDate ? new Date(fileDate) : undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          durationSeconds: durationSeconds || undefined,
          artist: artist || undefined,
          venue: venue || undefined,
          tour: tour || undefined,
        });

        updateQueueItem(item.id, { status: "complete", progress: 100 });
        completed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        updateQueueItem(item.id, { status: "error", error: msg, progress: 0 });
        errors++;
      }

      setCompletedCount(completed);
      setErrorCount(errors);
    }

    setIsProcessing(false);
    setUploadComplete(true);

    if (errors === 0) {
      toast({
        title: "Upload Complete",
        description: `${completed} file${completed !== 1 ? "s" : ""} uploaded successfully.`,
      });
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);
    } else {
      toast({
        title: "Upload Finished",
        description: `${completed} succeeded, ${errors} failed.`,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setQueue([]);
    setDescription("");
    setLabel("");
    setTagInput("");
    setTags([]);
    setFileDate("");
    setArtist("");
    setVenue("");
    setTour("");
    setShowEventDetails(false);
    setIsProcessing(false);
    setUploadComplete(false);
    setCompletedCount(0);
    setErrorCount(0);
  };

  const isPending = isProcessing || createMedia.isPending;

  const StatusIcon = ({ status }: { status: FileStatus }) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "uploading":
      case "extracting":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: FileStatus) => {
    switch (status) {
      case "complete": return "Done";
      case "error": return "Failed";
      case "uploading": return "Uploading";
      case "extracting": return "Processing";
      default: return "Pending";
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!isPending) {
          setOpen(val);
          if (!val) resetForm();
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background border-white/10 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold">
            Upload to Vault
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div
            className={`
              relative group border-2 border-dashed rounded-xl p-6
              transition-all duration-300 ease-out cursor-pointer
              ${hasFiles
                ? "border-primary/50 bg-primary/5"
                : "border-white/10"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ALL_ACCEPT}
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={isPending}
              data-testid="input-file"
            />
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div
                className={`p-3 rounded-full transition-colors duration-300 ${
                  hasFiles
                    ? "bg-primary/20 text-primary"
                    : "bg-white/5 text-muted-foreground"
                }`}
              >
                {hasFiles ? (
                  <CheckCircle className="w-7 h-7" />
                ) : (
                  <UploadCloud className="w-7 h-7" />
                )}
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {hasFiles
                    ? `${queue.length} file${queue.length !== 1 ? "s" : ""} selected`
                    : "Tap to select files"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasFiles
                    ? "Tap again to add more files"
                    : "Video, audio, images, PDFs, documents"}
                </p>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {queue.length > 1 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  File Queue
                </Label>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto rounded-lg">
                  {queue.map((item) => {
                    const CatIcon = CATEGORY_CONFIG[item.category].icon;
                    const catColor = CATEGORY_CONFIG[item.category].color;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
                        data-testid={`queue-item-${item.id}`}
                      >
                        <CatIcon className={`w-4 h-4 shrink-0 ${catColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {formatFileSize(item.file.size)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {statusLabel(item.status)}
                            </span>
                          </div>
                          {(item.status === "uploading" || item.status === "extracting") && (
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                              <motion.div
                                className="h-full bg-primary rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${item.progress}%` }}
                              />
                            </div>
                          )}
                          {item.status === "complete" && (
                            <div className="h-1 bg-green-500/30 rounded-full overflow-hidden mt-1">
                              <div className="h-full bg-green-500 rounded-full w-full" />
                            </div>
                          )}
                        </div>
                        <StatusIcon status={item.status} />
                        {item.status === "pending" && !isPending && (
                          <button
                            type="button"
                            onClick={() => removeFromQueue(item.id)}
                            className="p-0.5 rounded-full"
                            data-testid={`button-remove-${item.id}`}
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isSingleFile && (
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Title
              </Label>
              <Input
                id="title"
                data-testid="input-title"
                value={queue[0]?.title || ""}
                onChange={(e) => updateQueueItem(queue[0].id, { title: e.target.value })}
                placeholder="Name this file"
                className="bg-white/5 border-white/10 focus:border-primary/50"
                disabled={isPending}
                required
              />
            </div>
          )}

          {isSingleFile && (
            <AnimatePresence>
              {(queue[0]?.status === "uploading" || queue[0]?.status === "extracting") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{queue[0].status === "extracting" ? "Processing..." : "Uploading..."}</span>
                    <span>{Math.round(queue[0].progress)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${queue[0].progress}%` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {hasFiles && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="label" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Label
                  </Label>
                  <Input
                    id="label"
                    data-testid="input-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Concert, Demo"
                    className="bg-white/5 border-white/10 focus:border-primary/50"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileDate" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    File Date
                  </Label>
                  <Input
                    id="fileDate"
                    data-testid="input-file-date"
                    type="date"
                    value={fileDate}
                    onChange={(e) => setFileDate(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-primary/50"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tags
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    data-testid="input-tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Type and press Enter"
                    className="bg-white/5 border-white/10 focus:border-primary/50 flex-1"
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTag}
                    disabled={isPending || !tagInput.trim()}
                    className="border-white/10"
                    data-testid="button-add-tag"
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoTag}
                    disabled={isPending || isAutoTagging || queue.length === 0}
                    className="border-white/10"
                    data-testid="button-ai-auto-tag"
                  >
                    {isAutoTagging ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    AI
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-0.5 rounded-full p-0.5"
                          data-testid={`button-remove-tag-${tag}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="description"
                  data-testid="input-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add context or memories..."
                  className="bg-white/5 border-white/10 focus:border-primary/50 min-h-[80px] resize-none"
                  disabled={isPending}
                />
              </div>

              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEventDetails(!showEventDetails)}
                  className="w-full justify-between text-xs text-muted-foreground uppercase tracking-wider"
                  data-testid="button-toggle-event-details"
                >
                  <span className="flex items-center gap-1.5">
                    <Mic2 className="w-3.5 h-3.5" />
                    Event Details
                  </span>
                  {showEventDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </Button>
                <AnimatePresence>
                  {showEventDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 pt-3"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="artist" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mic2 className="w-3 h-3" /> Artist
                          </span>
                        </Label>
                        <Input
                          id="artist"
                          data-testid="input-artist"
                          value={artist}
                          onChange={(e) => setArtist(e.target.value)}
                          placeholder="Artist or performer"
                          className="bg-white/5 border-white/10 focus:border-primary/50"
                          disabled={isPending}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="venue" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Venue
                            </span>
                          </Label>
                          <Input
                            id="venue"
                            data-testid="input-venue"
                            value={venue}
                            onChange={(e) => setVenue(e.target.value)}
                            placeholder="Venue name"
                            className="bg-white/5 border-white/10 focus:border-primary/50"
                            disabled={isPending}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tour" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Route className="w-3 h-3" /> Tour
                            </span>
                          </Label>
                          <Input
                            id="tour"
                            data-testid="input-tour"
                            value={tour}
                            onChange={(e) => setTour(e.target.value)}
                            placeholder="Tour name"
                            className="bg-white/5 border-white/10 focus:border-primary/50"
                            disabled={isPending}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          <AnimatePresence>
            {uploadComplete && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-lg bg-primary/10 text-sm"
                data-testid="upload-summary"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  <span>
                    {completedCount} file{completedCount !== 1 ? "s" : ""} uploaded
                    {errorCount > 0 && `, ${errorCount} failed`}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="button-upload-submit"
              disabled={
                !hasFiles ||
                (isSingleFile && !queue[0]?.title) ||
                isPending ||
                uploadComplete
              }
              className="bg-primary text-white min-w-[100px]"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Upload${queue.length > 1 ? ` (${queue.length})` : ""}`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
