import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Film, Music, ImageIcon, FileText } from "lucide-react";

interface GlobalDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
}

const FILE_TYPE_MAP: Record<string, { icon: any; label: string; color: string }> = {
  video: { icon: Film, label: "Video", color: "text-blue-400" },
  audio: { icon: Music, label: "Audio", color: "text-green-400" },
  image: { icon: ImageIcon, label: "Image", color: "text-purple-400" },
  document: { icon: FileText, label: "Document", color: "text-amber-400" },
};

function getFileCategory(type: string): string {
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("image/")) return "image";
  return "document";
}

export function GlobalDropZone({ onFilesDropped, disabled }: GlobalDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [filePreview, setFilePreview] = useState<{ count: number; categories: string[] }>({ count: 0, categories: [] });
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    dragCounter.current++;
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragOver(true);
      const items = e.dataTransfer.items;
      if (items) {
        const cats = new Set<string>();
        let count = 0;
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === "file") {
            count++;
            cats.add(getFileCategory(items[i].type));
          }
        }
        setFilePreview({ count, categories: Array.from(cats) });
      }
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
      onFilesDropped(files);
    }
  }, [disabled, onFilesDropped]);

  useEffect(() => {
    const doc = document.documentElement;
    doc.addEventListener("dragenter", handleDragEnter);
    doc.addEventListener("dragleave", handleDragLeave);
    doc.addEventListener("dragover", handleDragOver);
    doc.addEventListener("drop", handleDrop);

    return () => {
      doc.removeEventListener("dragenter", handleDragEnter);
      doc.removeEventListener("dragleave", handleDragLeave);
      doc.removeEventListener("dragover", handleDragOver);
      doc.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <AnimatePresence>
      {isDragOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
          data-testid="global-drop-zone-overlay"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative z-10 flex flex-col items-center gap-6 p-12"
          >
            <motion.div
              animate={{
                y: [0, -12, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 rounded-2xl bg-primary/20 border-2 border-dashed border-primary/60 flex items-center justify-center shadow-[0_0_60px_rgba(var(--primary),0.3)]"
            >
              <Upload className="w-10 h-10 text-primary" />
            </motion.div>

            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2" data-testid="text-drop-zone-title">
                Drop to Upload
              </h2>
              <p className="text-white/50 text-sm sm:text-base">
                {filePreview.count > 0
                  ? `${filePreview.count} file${filePreview.count !== 1 ? "s" : ""} ready to upload`
                  : "Release to add files to your vault"
                }
              </p>
            </div>

            {filePreview.categories.length > 0 && (
              <div className="flex items-center gap-3">
                {filePreview.categories.map(cat => {
                  const config = FILE_TYPE_MAP[cat] || FILE_TYPE_MAP.document;
                  const Icon = config.icon;
                  return (
                    <div key={cat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                      <span className="text-xs font-medium text-white/70">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-primary/40"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0.3, 0.8, 0.3],
                    scale: [1, 1.5, 1],
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
