import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMediaItems, useCreateMedia } from "@/hooks/use-media";
import { useUpload } from "@/hooks/use-upload";
import { useToast } from "@/hooks/use-toast";
import { detectCategory } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MediaResponse } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Grid,
  Music,
  Film,
  ImageIcon,
  Check,
  Search,
  ArrowUp,
  ArrowDown,
  Trash2,
  Layers,
  Plus,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type MergeType = "image-collage" | "audio-concat" | "video-concat";
type CollageLayout = "2x2" | "3x3" | "2x1" | "1x2" | "auto";
type BgColor = "black" | "white" | "transparent";

const STEPS = ["Select Type", "Select Items", "Configure", "Process"];

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const fmt = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = buffer.length;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, fmt, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const val = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, val, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function MergeEditor() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: allMedia, isLoading: mediaLoading } = useMediaItems(undefined, isAuthenticated);
  const { uploadFile, isUploading, progress } = useUpload();
  const createMedia = useCreateMedia();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [mergeType, setMergeType] = useState<MergeType | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState(false);

  const [videoJobId, setVideoJobId] = useState<number | null>(null);
  const [videoJobStatus, setVideoJobStatus] = useState<string>("");
  const [videoJobProgress, setVideoJobProgress] = useState(0);
  const [videoJobError, setVideoJobError] = useState<string | null>(null);
  const videoPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [collageLayout, setCollageLayout] = useState<CollageLayout>("2x2");
  const [collageGap, setCollageGap] = useState(4);
  const [collageBg, setCollageBg] = useState<BgColor>("black");
  const [crossfade, setCrossfade] = useState(0);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/dashboard");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      if (videoPollRef.current) clearInterval(videoPollRef.current);
    };
  }, []);

  const categoryFilter = useMemo(() => {
    if (mergeType === "image-collage") return "image";
    if (mergeType === "audio-concat") return "audio";
    if (mergeType === "video-concat") return "video";
    return null;
  }, [mergeType]);

  const filteredMedia = useMemo(() => {
    if (!allMedia || !categoryFilter) return [];
    let items = allMedia.filter((m) => m.category === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((m) => m.title.toLowerCase().includes(q));
    }
    return items;
  }, [allMedia, categoryFilter, searchQuery]);

  const selectedItems = useMemo(() => {
    if (!allMedia) return [];
    return selectedIds
      .map((id) => allMedia.find((m) => m.id === id))
      .filter(Boolean) as MediaResponse[];
  }, [allMedia, selectedIds]);

  const toggleItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeItem = (id: number) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const canProceed = () => {
    if (step === 0) return mergeType !== null;
    if (step === 1) return selectedIds.length >= 2;
    if (step === 2) return true;
    return false;
  };

  const drawCollagePreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || mergeType !== "image-collage" || selectedItems.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 600;
    canvas.width = size;
    canvas.height = size;

    if (collageBg === "black") {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);
    } else if (collageBg === "white") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
    } else {
      ctx.clearRect(0, 0, size, size);
    }

    let cols: number, rows: number;
    if (collageLayout === "2x2") { cols = 2; rows = 2; }
    else if (collageLayout === "3x3") { cols = 3; rows = 3; }
    else if (collageLayout === "2x1") { cols = 2; rows = 1; }
    else if (collageLayout === "1x2") { cols = 1; rows = 2; }
    else {
      cols = Math.ceil(Math.sqrt(selectedItems.length));
      rows = Math.ceil(selectedItems.length / cols);
    }

    const gap = collageGap;
    const cellW = (size - gap * (cols + 1)) / cols;
    const cellH = (size - gap * (rows + 1)) / rows;

    let loaded = 0;
    const images: HTMLImageElement[] = [];

    selectedItems.forEach((item, i) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        loaded++;
        images[i] = img;
        if (loaded === selectedItems.length) {
          if (collageBg === "black") {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, size, size);
          } else if (collageBg === "white") {
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, size, size);
          } else {
            ctx.clearRect(0, 0, size, size);
          }

          for (let idx = 0; idx < Math.min(selectedItems.length, cols * rows); idx++) {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = gap + col * (cellW + gap);
            const y = gap + row * (cellH + gap);

            if (images[idx]) {
              const imgEl = images[idx];
              const imgRatio = imgEl.width / imgEl.height;
              const cellRatio = cellW / cellH;
              let sx = 0, sy = 0, sw = imgEl.width, sh = imgEl.height;
              if (imgRatio > cellRatio) {
                sw = imgEl.height * cellRatio;
                sx = (imgEl.width - sw) / 2;
              } else {
                sh = imgEl.width / cellRatio;
                sy = (imgEl.height - sh) / 2;
              }
              ctx.drawImage(imgEl, sx, sy, sw, sh, x, y, cellW, cellH);
            }
          }
        }
      };
      img.onerror = () => {
        loaded++;
      };
      img.src = `/objects/${item.url}`;
    });
  }, [selectedItems, collageLayout, collageGap, collageBg, mergeType]);

  useEffect(() => {
    if (step === 2 && mergeType === "image-collage") {
      drawCollagePreview();
    }
  }, [step, mergeType, drawCollagePreview]);

  const totalDuration = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (item.durationSeconds || 0), 0);
  }, [selectedItems]);

  const handleProcess = async () => {
    if (processing) return;
    setProcessing(true);

    try {
      if (mergeType === "image-collage") {
        const canvas = previewCanvasRef.current;
        if (!canvas) throw new Error("Canvas not ready");

        drawCollagePreview();

        await new Promise((resolve) => setTimeout(resolve, 500));

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to export canvas"));
          }, "image/png");
        });

        const fileName = `collage_${Date.now()}.png`;
        const file = new File([blob], fileName, { type: "image/png" });
        const uploadResult = await uploadFile(file);
        if (!uploadResult) throw new Error("Upload failed");

        const sourceTitles = selectedItems.map((i) => i.title).join(", ");
        await createMedia.mutateAsync({
          title: `Collage (${selectedItems.length} images)`,
          description: `Collage of: ${sourceTitles}`,
          url: uploadResult.objectPath,
          filename: fileName,
          contentType: "image/png",
          category: detectCategory("image/png"),
          size: blob.size,
          tags: ["collage", "merge"],
        });

        toast({ title: "Collage saved successfully" });
        navigate("/dashboard");
      } else if (mergeType === "audio-concat") {
        const audioCtx = new AudioContext();
        const buffers: AudioBuffer[] = [];

        for (const item of selectedItems) {
          const response = await fetch(`/objects/${item.url}`);
          const arrayBuf = await response.arrayBuffer();
          const decoded = await audioCtx.decodeAudioData(arrayBuf);
          buffers.push(decoded);
        }

        const sampleRate = buffers[0].sampleRate;
        const numChannels = Math.max(...buffers.map((b) => b.numberOfChannels));
        const crossfadeSamples = Math.floor(crossfade * sampleRate);

        let totalLength = 0;
        buffers.forEach((buf, i) => {
          totalLength += buf.length;
          if (i > 0 && crossfadeSamples > 0) {
            totalLength -= Math.min(crossfadeSamples, buf.length, buffers[i - 1].length);
          }
        });

        const offlineCtx = new OfflineAudioContext(numChannels, totalLength, sampleRate);
        const outputBuffer = offlineCtx.createBuffer(numChannels, totalLength, sampleRate);

        let writeOffset = 0;
        for (let bIdx = 0; bIdx < buffers.length; bIdx++) {
          const buf = buffers[bIdx];
          for (let ch = 0; ch < numChannels; ch++) {
            const srcData = ch < buf.numberOfChannels ? buf.getChannelData(ch) : buf.getChannelData(0);
            const outData = outputBuffer.getChannelData(ch);

            for (let i = 0; i < buf.length; i++) {
              const outIdx = writeOffset + i;
              if (outIdx < 0 || outIdx >= totalLength) continue;

              let sample = srcData[i];

              if (bIdx > 0 && crossfadeSamples > 0 && i < crossfadeSamples) {
                const fadeIn = i / crossfadeSamples;
                sample *= fadeIn;
              }

              if (bIdx < buffers.length - 1 && crossfadeSamples > 0) {
                const fadeStart = buf.length - crossfadeSamples;
                if (i >= fadeStart) {
                  const fadeOut = 1 - (i - fadeStart) / crossfadeSamples;
                  sample *= fadeOut;
                }
              }

              outData[outIdx] += sample;
            }
          }

          writeOffset += buf.length;
          if (bIdx < buffers.length - 1 && crossfadeSamples > 0) {
            writeOffset -= Math.min(crossfadeSamples, buf.length);
          }
        }

        const wavBlob = audioBufferToWav(outputBuffer);
        const fileName = `merged_audio_${Date.now()}.wav`;
        const file = new File([wavBlob], fileName, { type: "audio/wav" });
        const uploadResult = await uploadFile(file);
        if (!uploadResult) throw new Error("Upload failed");

        const sourceTitles = selectedItems.map((i) => i.title).join(", ");
        await createMedia.mutateAsync({
          title: `Merged Audio (${selectedItems.length} tracks)`,
          description: `Concatenation of: ${sourceTitles}`,
          url: uploadResult.objectPath,
          filename: fileName,
          contentType: "audio/wav",
          category: detectCategory("audio/wav"),
          size: wavBlob.size,
          tags: ["merged", "concat"],
          durationSeconds: Math.round(outputBuffer.duration),
        });

        audioCtx.close();
        toast({ title: "Audio merged successfully" });
        navigate("/dashboard");
      } else if (mergeType === "video-concat") {
        setVideoJobError(null);
        setVideoJobStatus("queued");
        setVideoJobProgress(0);

        const res = await apiRequest("POST", "/api/video/merge", {
          mediaIds: selectedItems.map((i) => i.id),
          title: `Merged Video (${selectedItems.length} clips)`,
        });
        const job = await res.json();
        setVideoJobId(job.id);

        if (videoPollRef.current) clearInterval(videoPollRef.current);
        videoPollRef.current = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/video/jobs/${job.id}`, { credentials: "include" });
            if (!statusRes.ok) return;
            const jobData = await statusRes.json();
            setVideoJobStatus(jobData.status);
            setVideoJobProgress(jobData.progress || 0);

            if (jobData.status === "complete") {
              if (videoPollRef.current) clearInterval(videoPollRef.current);
              queryClient.invalidateQueries({ queryKey: ["/api/media"] });
              toast({ title: "Videos merged successfully!" });
              setTimeout(() => navigate("/dashboard"), 1500);
            } else if (jobData.status === "failed") {
              if (videoPollRef.current) clearInterval(videoPollRef.current);
              setVideoJobError(jobData.errorMessage || "Processing failed");
              setProcessing(false);
            }
          } catch {}
        }, 2000);
        return;
      }
    } catch (err) {
      toast({
        title: "Processing failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || mediaLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background" data-testid="merge-loading">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden" data-testid="merge-editor">
      {videoJobId && (processing || videoJobStatus) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" data-testid="merge-processing-overlay">
          <div className="bg-card border border-white/10 rounded-lg p-8 max-w-md w-full mx-4 text-center space-y-4">
            {videoJobError ? (
              <>
                <XCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold text-foreground">Merge Failed</h3>
                <p className="text-sm text-muted-foreground">{videoJobError}</p>
                <Button onClick={() => { setProcessing(false); setVideoJobId(null); setVideoJobError(null); setVideoJobStatus(""); }} data-testid="button-dismiss-merge-error">
                  Try Again
                </Button>
              </>
            ) : videoJobStatus === "complete" ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold text-foreground">Videos Merged!</h3>
                <p className="text-sm text-muted-foreground">Redirecting to your vault...</p>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <h3 className="text-lg font-semibold text-foreground">Merging Videos</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {videoJobStatus === "queued" ? "Preparing..." :
                   videoJobStatus === "downloading" ? "Downloading clips..." :
                   videoJobStatus === "processing" ? "Concatenating videos..." :
                   videoJobStatus === "uploading" ? "Saving to vault..." :
                   "Working..."}
                </p>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${videoJobProgress}%` }}
                    data-testid="merge-progress-bar"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{videoJobProgress}%</p>
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b glass-morphism z-50" data-testid="merge-topbar">
        <div className="flex items-center gap-3 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back</TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium" data-testid="text-merge-title">
              Merge & Combine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium transition-colors ${
                  i < step
                    ? "bg-primary text-white"
                    : i === step
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-white/5 text-muted-foreground"
                }`}
                data-testid={`step-indicator-${i}`}
              >
                {i < step ? <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-3 sm:w-6 h-0.5 ${i < step ? "bg-primary" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {(processing || isUploading) && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
            data-testid="progress-bar"
          />
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {step === 0 && (
            <div className="space-y-6" data-testid="step-select-type">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold mb-2" data-testid="text-step-title">
                  Choose Merge Type
                </h2>
                <p className="text-muted-foreground">
                  Select what kind of merge operation you want to perform.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {([
                  {
                    type: "image-collage" as MergeType,
                    icon: ImageIcon,
                    title: "Image Collage",
                    desc: "Combine multiple images into a grid or collage",
                  },
                  {
                    type: "audio-concat" as MergeType,
                    icon: Music,
                    title: "Audio Concat",
                    desc: "Join multiple audio files end to end",
                  },
                  {
                    type: "video-concat" as MergeType,
                    icon: Film,
                    title: "Video Concat",
                    desc: "Join multiple video clips end to end",
                  },
                ]).map((opt) => (
                  <Card
                    key={opt.type}
                    className={`p-6 cursor-pointer transition-all text-center ${
                      mergeType === opt.type
                        ? "border-primary/50 bg-primary/5"
                        : ""
                    }`}
                    onClick={() => setMergeType(opt.type)}
                    data-testid={`card-merge-type-${opt.type}`}
                  >
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                        mergeType === opt.type
                          ? "bg-primary/20"
                          : "bg-white/5"
                      }`}
                    >
                      <opt.icon
                        className={`w-7 h-7 ${
                          mergeType === opt.type
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <h3 className="font-semibold mb-1">{opt.title}</h3>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    {mergeType === opt.type && (
                      <Badge className="mt-3 no-default-hover-elevate no-default-active-elevate">
                        Selected
                      </Badge>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4" data-testid="step-select-items">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-display font-bold mb-2" data-testid="text-step-title">
                  Select Items
                </h2>
                <p className="text-muted-foreground">
                  Choose at least 2 items to merge. Selected: {selectedIds.length}
                </p>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      data-testid="input-search-items"
                      placeholder="Search by title..."
                      className="pl-9 bg-white/5 border-white/10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-auto pr-1">
                    {filteredMedia.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={`relative cursor-pointer rounded-lg overflow-hidden border transition-all ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-white/10"
                          }`}
                          data-testid={`item-select-${item.id}`}
                        >
                          <div className="aspect-square bg-white/5 flex items-center justify-center overflow-hidden">
                            {item.category === "image" ? (
                              <img
                                src={`/objects/${item.url}`}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : item.thumbnailUrl ? (
                              <img
                                src={`/objects/${item.thumbnailUrl}`}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                {item.category === "audio" ? (
                                  <Music className="w-8 h-8" />
                                ) : (
                                  <Film className="w-8 h-8" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{item.title}</p>
                            {item.durationSeconds && (
                              <p className="text-[10px] text-muted-foreground">
                                {formatDuration(item.durationSeconds)}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {filteredMedia.length === 0 && (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        No items found
                      </div>
                    )}
                  </div>
                </div>

                {selectedIds.length > 0 && (
                  <div className="lg:w-72 shrink-0">
                    <h3 className="text-sm font-semibold mb-3">
                      Selected Order ({selectedIds.length})
                    </h3>
                    <div className="space-y-2 max-h-[60vh] overflow-auto">
                      {selectedItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
                          data-testid={`selected-item-${item.id}`}
                        >
                          <span className="text-xs text-muted-foreground w-5 shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{item.title}</p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={idx === 0}
                              onClick={() => moveItem(idx, "up")}
                              data-testid={`button-move-up-${item.id}`}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={idx === selectedItems.length - 1}
                              onClick={() => moveItem(idx, "down")}
                              data-testid={`button-move-down-${item.id}`}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              data-testid={`button-remove-${item.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && mergeType === "image-collage" && (
            <div className="space-y-6" data-testid="step-configure-collage">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-display font-bold mb-2" data-testid="text-step-title">
                  Configure Collage
                </h2>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-72 shrink-0 space-y-6">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">
                      Layout
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["2x2", "3x3", "2x1", "1x2", "auto"] as CollageLayout[]).map((layout) => (
                        <Button
                          key={layout}
                          variant={collageLayout === layout ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCollageLayout(layout)}
                          data-testid={`button-layout-${layout}`}
                        >
                          {layout}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">
                      Gap: {collageGap}px
                    </label>
                    <Slider
                      value={[collageGap]}
                      onValueChange={([v]) => setCollageGap(v)}
                      min={0}
                      max={20}
                      step={1}
                      data-testid="slider-gap"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">
                      Background
                    </label>
                    <div className="flex gap-2">
                      {(["black", "white", "transparent"] as BgColor[]).map((bg) => (
                        <Button
                          key={bg}
                          variant={collageBg === bg ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCollageBg(bg)}
                          data-testid={`button-bg-${bg}`}
                        >
                          {bg}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <canvas
                    ref={previewCanvasRef}
                    className="max-w-full rounded-lg border border-white/10"
                    style={{ maxHeight: "500px", width: "auto", height: "auto" }}
                    data-testid="canvas-preview"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && mergeType === "audio-concat" && (
            <div className="space-y-6" data-testid="step-configure-audio">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-display font-bold mb-2" data-testid="text-step-title">
                  Configure Audio Merge
                </h2>
                <p className="text-muted-foreground">
                  Total duration: {formatDuration(totalDuration)}
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">
                    Crossfade: {crossfade}s
                  </label>
                  <Slider
                    value={[crossfade]}
                    onValueChange={([v]) => setCrossfade(v)}
                    min={0}
                    max={3}
                    step={0.1}
                    data-testid="slider-crossfade"
                  />
                </div>

                <div className="space-y-2">
                  {selectedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                      data-testid={`audio-item-${item.id}`}
                    >
                      <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">
                        {idx + 1}
                      </span>
                      <Music className="w-4 h-4 text-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                      </div>
                      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs font-mono">
                        {item.durationSeconds ? formatDuration(item.durationSeconds) : "--:--"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && mergeType === "video-concat" && (
            <div className="space-y-6" data-testid="step-configure-video">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-display font-bold mb-2" data-testid="text-step-title">
                  Video Compilation Preview
                </h2>
                <p className="text-muted-foreground">
                  Total duration: {formatDuration(totalDuration)}
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-2">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                    data-testid={`video-item-${item.id}`}
                  >
                    <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="w-16 h-10 rounded bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.thumbnailUrl ? (
                        <img
                          src={`/objects/${item.thumbnailUrl}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Film className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                    </div>
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs font-mono">
                      {item.durationSeconds ? formatDuration(item.durationSeconds) : "--:--"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-20" data-testid="step-process">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  {processing || isUploading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  ) : (
                    <Save className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold mb-2" data-testid="text-step-title">
                    {processing || isUploading ? "Processing..." : "Ready to Create"}
                  </h2>
                  <p className="text-muted-foreground">
                    {processing || isUploading
                      ? "Please wait while your files are being processed and uploaded."
                      : `${selectedItems.length} items will be merged into a new ${
                          mergeType === "image-collage"
                            ? "collage image"
                            : mergeType === "audio-concat"
                            ? "audio file"
                            : "video compilation"
                        }.`}
                  </p>
                </div>
                {!processing && !isUploading && (
                  <Button
                    onClick={handleProcess}
                    className="bg-primary text-white"
                    data-testid="button-create-merge"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t glass-morphism px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-3 sticky bottom-0 z-40">
        <Button
          variant="outline"
          onClick={() => {
            if (step === 0) navigate("/dashboard");
            else setStep(step - 1);
          }}
          disabled={processing || isUploading}
          data-testid="button-prev-step"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 0 ? "Cancel" : "Back"}
        </Button>

        <div className="text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </div>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed() || processing}
            data-testid="button-next-step"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleProcess}
            disabled={processing || isUploading}
            className="bg-primary text-white"
            data-testid="button-process"
          >
            {processing || isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Create
          </Button>
        )}
      </div>
    </div>
  );
}
