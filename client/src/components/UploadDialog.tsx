import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCreateMedia } from "@/hooks/use-media";
import { useUpload } from "@/hooks/use-upload";
import { detectCategory, type MediaCategory } from "@shared/schema";
import { Loader2, UploadCloud, CheckCircle, AlertCircle, Film, Music, ImageIcon, FileText, File, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_CONFIG: Record<MediaCategory, { icon: any; color: string; accept: string; label: string }> = {
  video: { icon: Film, color: "text-blue-400", accept: "video/*", label: "Video" },
  audio: { icon: Music, color: "text-green-400", accept: "audio/*", label: "Audio" },
  image: { icon: ImageIcon, color: "text-purple-400", accept: "image/*", label: "Image" },
  document: { icon: FileText, color: "text-amber-400", accept: ".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv", label: "Document" },
  other: { icon: File, color: "text-muted-foreground", accept: "*/*", label: "File" },
};

const ALL_ACCEPT = "video/*,audio/*,image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv,.zip,.rar";

export function UploadDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [label, setLabel] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedCategory, setDetectedCategory] = useState<MediaCategory | null>(null);
  const [fileDate, setFileDate] = useState<string>("");

  const createMedia = useCreateMedia();
  const { uploadFile, isUploading, progress, error: uploadError } = useUpload();
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const cat = detectCategory(file.type);
      setDetectedCategory(cat);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      if (file.lastModified) {
        const d = new Date(file.lastModified);
        setFileDate(d.toISOString().split("T")[0]);
      }
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      const uploadResult = await uploadFile(selectedFile);
      if (!uploadResult) throw new Error("Upload failed");

      await createMedia.mutateAsync({
        title,
        description: description || undefined,
        url: uploadResult.objectPath,
        filename: uploadResult.metadata.name,
        contentType: uploadResult.metadata.contentType,
        size: uploadResult.metadata.size,
        label: label || undefined,
        tags: tags.length > 0 ? tags : undefined,
        fileDate: fileDate ? new Date(fileDate).toISOString() : undefined,
      });

      toast({ title: "Uploaded", description: `${title} has been added to your vault.` });
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Upload failed:", error);
      toast({ title: "Error", description: "Failed to upload. Please try again.", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLabel("");
    setTagInput("");
    setTags([]);
    setSelectedFile(null);
    setDetectedCategory(null);
    setFileDate("");
  };

  const isPending = isUploading || createMedia.isPending;
  const CategoryIcon = detectedCategory ? CATEGORY_CONFIG[detectedCategory].icon : UploadCloud;
  const categoryColor = detectedCategory ? CATEGORY_CONFIG[detectedCategory].color : "text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isPending) {
        setOpen(val);
        if (!val) resetForm();
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-white/10 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold">
            Upload to Vault
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className={`
            relative group border-2 border-dashed rounded-xl p-6
            transition-all duration-300 ease-out cursor-pointer
            ${selectedFile
              ? "border-primary/50 bg-primary/5"
              : "border-white/10 hover:border-primary/50 hover:bg-white/5"
            }
          `}>
            <input
              type="file"
              accept={ALL_ACCEPT}
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={isPending}
              data-testid="input-file"
            />
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className={`p-3 rounded-full transition-colors duration-300 ${selectedFile ? `bg-primary/20 ${categoryColor}` : "bg-white/5 text-muted-foreground"}`}>
                {selectedFile ? <CheckCircle className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {selectedFile ? selectedFile.name : "Tap to select a file"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedFile ? (
                    <span className="flex items-center justify-center gap-2">
                      <CategoryIcon className={`w-3 h-3 ${categoryColor}`} />
                      {CATEGORY_CONFIG[detectedCategory || "other"].label} — {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  ) : (
                    "Video, audio, images, PDFs, documents"
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input
              id="title"
              data-testid="input-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name this file"
              className="bg-white/5 border-white/10 focus:border-primary/50"
              disabled={isPending}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="label" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Label</Label>
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
              <Label htmlFor="fileDate" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">File Date</Label>
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
            <Label htmlFor="tags" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</Label>
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
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag} disabled={isPending || !tagInput.trim()} className="border-white/10">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-0.5 rounded-full p-0.5 hover:bg-white/10">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes (Optional)</Label>
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

          <AnimatePresence>
            {isUploading && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {uploadError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError.message}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" data-testid="button-upload-submit" disabled={!selectedFile || !title || isPending} className="bg-primary text-white min-w-[100px]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
