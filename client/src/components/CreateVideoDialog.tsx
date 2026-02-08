import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateVideo } from "@/hooks/use-videos";
import { useUpload } from "@/hooks/use-upload";
import { Loader2, UploadCloud, Video, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export function CreateVideoDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const createVideo = useCreateVideo();
  const { uploadFile, isUploading, progress, error: uploadError } = useUpload();
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Auto-fill title if empty
      if (!title) {
        setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      // 1. Upload file to Object Storage
      const uploadResult = await uploadFile(selectedFile);
      
      if (!uploadResult) {
        throw new Error("Upload failed - no result returned");
      }

      // 2. Save metadata to Database
      await createVideo.mutateAsync({
        title,
        description,
        url: uploadResult.objectPath,
        filename: uploadResult.metadata.name,
        contentType: uploadResult.metadata.contentType,
        size: uploadResult.metadata.size,
      });

      toast({
        title: "Success!",
        description: "Your video has been uploaded successfully.",
      });
      
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Upload process failed:", error);
      toast({
        title: "Error",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedFile(null);
  };

  const isPending = isUploading || createVideo.isPending;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!isPending) {
        setOpen(val);
        if (!val) resetForm();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Upload Concert Video
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            {/* File Selection Area */}
            <div className={`
              relative group border-2 border-dashed rounded-xl p-8 
              transition-all duration-300 ease-out cursor-pointer
              ${selectedFile 
                ? "border-primary/50 bg-primary/5" 
                : "border-white/10 hover:border-primary/50 hover:bg-white/5"
              }
            `}>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isPending}
              />
              
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <div className={`
                  p-4 rounded-full transition-colors duration-300
                  ${selectedFile ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"}
                `}>
                  {selectedFile ? <CheckCircle className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
                </div>
                
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {selectedFile ? selectedFile.name : "Click to select video"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedFile 
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` 
                      : "MP4, MOV, or WebM up to 500MB"
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Taylor Swift - Love Story"
                className="bg-white/5 border-white/10 focus:border-primary/50 h-11"
                disabled={isPending}
                required
              />
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add some memories about this moment..."
                className="bg-white/5 border-white/10 focus:border-primary/50 min-h-[100px] resize-none"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Progress Bar */}
          <AnimatePresence>
            {isUploading && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Error Message */}
          {uploadError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>{uploadError.message}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedFile || !title || isPending}
              className="bg-primary hover:bg-primary/90 text-white min-w-[120px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {createVideo.isPending ? "Saving..." : "Uploading..."}
                </>
              ) : (
                "Upload Video"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
