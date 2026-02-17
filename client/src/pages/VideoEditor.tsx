import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { useCreateMedia } from "@/hooks/use-media";
import { useToast } from "@/hooks/use-toast";
import { buildUrl, api } from "@shared/routes";
import type { MediaResponse } from "@shared/routes";
import { detectCategory } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEditorShortcuts, type ShortcutAction } from "@/hooks/use-editor-shortcuts";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { ShortcutHelp } from "@/components/ShortcutHelp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Camera,
  Scissors,
  SlidersHorizontal,
  ArrowLeft,
  Save,
  Loader2,
  Undo2,
  Redo2,
  RotateCcw,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Keyboard,
} from "lucide-react";

interface VideoPreset {
  name: string;
  id: string;
  description: string;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  temperature: number;
  vignette: number;
}

interface VideoEditorState {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  temperature: number;
  vignette: number;
  trimStart: number;
  trimEnd: number;
  playbackRate: number;
}

const VIDEO_PRESETS: VideoPreset[] = [
  { id: "cinematic", name: "Cinematic", description: "Hollywood film look", brightness: 95, contrast: 125, saturation: 85, hue: 0, temperature: 10, vignette: 35 },
  { id: "bright-airy", name: "Bright & Airy", description: "Light and clean aesthetic", brightness: 115, contrast: 90, saturation: 110, hue: 0, temperature: 5, vignette: 0 },
  { id: "moody", name: "Moody", description: "Dark and dramatic", brightness: 85, contrast: 130, saturation: 70, hue: 0, temperature: -10, vignette: 40 },
  { id: "vintage-film", name: "Vintage Film", description: "Classic retro film grain look", brightness: 105, contrast: 95, saturation: 75, hue: 15, temperature: 20, vignette: 25 },
  { id: "cool-tones", name: "Cool Tones", description: "Blue-shifted cool palette", brightness: 100, contrast: 110, saturation: 90, hue: -10, temperature: -25, vignette: 15 },
  { id: "warm-sunset", name: "Warm Sunset", description: "Golden warm tones", brightness: 105, contrast: 105, saturation: 120, hue: 10, temperature: 30, vignette: 20 },
  { id: "noir", name: "Noir", description: "Black and white drama", brightness: 90, contrast: 140, saturation: 20, hue: 0, temperature: 0, vignette: 45 },
  { id: "pastel-dream", name: "Pastel Dream", description: "Soft muted colors", brightness: 112, contrast: 85, saturation: 80, hue: 5, temperature: 8, vignette: 10 },
];

type VideoTool = "trim" | "adjustments" | "capture";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

export default function VideoEditor() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { uploadFile, isUploading, progress } = useUpload();
  const createMedia = useCreateMedia();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const [videoLoaded, setVideoLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingJobId, setProcessingJobId] = useState<number | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [activeTool, setActiveTool] = useState<VideoTool>("trim");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimApplied, setTrimApplied] = useState(false);
  const [isDraggingTrim, setIsDraggingTrim] = useState<"start" | "end" | null>(null);

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [hue, setHue] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [vignette, setVignette] = useState(0);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);

  const [history, setHistory] = useState<VideoEditorState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const [showingBefore, setShowingBefore] = useState(false);

  const essentialTools: { id: VideoTool; icon: typeof Scissors; label: string }[] = [
    { id: "trim", icon: Scissors, label: "Trim" },
  ];

  const advancedTools: { id: VideoTool; icon: typeof Scissors; label: string }[] = [
    { id: "adjustments", icon: SlidersHorizontal, label: "Color" },
    { id: "capture", icon: Camera, label: "Screenshot" },
  ];

  const advancedToolIds = advancedTools.map(t => t.id);

  useEffect(() => {
    if (advancedToolIds.includes(activeTool)) {
      setShowAdvanced(true);
    }
  }, [activeTool]);

  const { data: mediaItem, isLoading: mediaLoading } = useQuery<MediaResponse>({
    queryKey: ["/api/media", id],
    queryFn: async () => {
      const url = buildUrl(api.media.get.path, { id: Number(id) });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch media item");
      return res.json();
    },
    enabled: !!id && isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/dashboard");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaItem?.url) return;

    video.src = `/objects/${mediaItem.url}`;
    video.load();

    const onLoaded = () => {
      setDuration(video.duration);
      setTrimEnd(video.duration);
      setVideoLoaded(true);
      const initialState: VideoEditorState = {
        brightness: 100, contrast: 100, saturation: 100, hue: 0,
        temperature: 0, vignette: 0, trimStart: 0, trimEnd: video.duration, playbackRate: 1,
      };
      setHistory([initialState]);
      setHistoryIndex(0);
      historyIndexRef.current = 0;
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("ended", onEnded);
    };
  }, [mediaItem?.url]);

  const updatePlayhead = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const time = video.currentTime;
    setCurrentTime(time);

    if (time >= trimEnd) {
      video.pause();
      video.currentTime = trimStart;
      setIsPlaying(false);
      setCurrentTime(trimStart);
      return;
    }

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updatePlayhead);
    }
  }, [isPlaying, trimEnd, trimStart]);

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updatePlayhead);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, updatePlayhead]);

  const handlePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
      video.currentTime = trimStart;
    }

    video.play();
    setIsPlaying(true);
  }, [trimStart, trimEnd]);

  const handlePause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
  }, []);

  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleSkipBack = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(trimStart, video.currentTime - 5);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [trimStart]);

  const handleSkipForward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.min(trimEnd, video.currentTime + 5);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [trimEnd]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  const handleToggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  }, []);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDraggingTrim) return;
      const timeline = timelineRef.current;
      if (!timeline || !duration) return;
      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const time = ratio * duration;
      handleSeek(time);
    },
    [duration, isDraggingTrim, handleSeek]
  );

  const handleTrimMouseDown = useCallback(
    (handle: "start" | "end", e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsDraggingTrim(handle);
    },
    []
  );

  const handleTrimTouchStart = useCallback(
    (handle: "start" | "end", e: React.TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsDraggingTrim(handle);
    },
    []
  );

  const handleTimelineTouch = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (isDraggingTrim) return;
      const timeline = timelineRef.current;
      if (!timeline || !duration) return;
      const touch = e.touches[0];
      const rect = timeline.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const time = ratio * duration;
      handleSeek(time);
    },
    [duration, isDraggingTrim, handleSeek]
  );

  useEffect(() => {
    if (!isDraggingTrim) return;

    const getTimeFromClient = (clientX: number) => {
      const timeline = timelineRef.current;
      if (!timeline || !duration) return null;
      const rect = timeline.getBoundingClientRect();
      const x = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      return ratio * duration;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const time = getTimeFromClient(e.clientX);
      if (time === null) return;
      if (isDraggingTrim === "start") {
        setTrimStart(Math.min(time, trimEnd - 0.1));
      } else {
        setTrimEnd(Math.max(time, trimStart + 0.1));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const time = getTimeFromClient(touch.clientX);
      if (time === null) return;
      if (isDraggingTrim === "start") {
        setTrimStart(Math.min(time, trimEnd - 0.1));
      } else {
        setTrimEnd(Math.max(time, trimStart + 0.1));
      }
    };

    const handleUp = () => {
      setIsDraggingTrim(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isDraggingTrim, duration, trimStart, trimEnd]);

  const pushHistory = useCallback(() => {
    const state: VideoEditorState = { brightness, contrast, saturation, hue, temperature, vignette, trimStart, trimEnd, playbackRate };
    const idx = historyIndexRef.current;
    setHistory((prev) => {
      const newHistory = [...prev.slice(0, idx + 1), state];
      return newHistory;
    });
    historyIndexRef.current = idx + 1;
    setHistoryIndex(idx + 1);
  }, [brightness, contrast, saturation, hue, temperature, vignette, trimStart, trimEnd, playbackRate]);

  const handleApplyTrim = useCallback(() => {
    pushHistory();
    setTrimApplied(true);
    const video = videoRef.current;
    if (video && (video.currentTime < trimStart || video.currentTime > trimEnd)) {
      video.currentTime = trimStart;
      setCurrentTime(trimStart);
    }
    toast({ title: "Trim applied" });
  }, [trimStart, trimEnd, toast, pushHistory]);

  const handleReset = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    setTrimStart(0);
    setTrimEnd(duration);
    setTrimApplied(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHue(0);
    setTemperature(0);
    setVignette(0);
    setCapturedFrame(null);
    video.currentTime = 0;
    setCurrentTime(0);
    setPlaybackRate(1);
    video.playbackRate = 1;
  }, [duration]);

  const restoreState = useCallback((state: VideoEditorState) => {
    setBrightness(state.brightness);
    setContrast(state.contrast);
    setSaturation(state.saturation);
    setHue(state.hue);
    setTemperature(state.temperature);
    setVignette(state.vignette);
    setTrimStart(state.trimStart);
    setTrimEnd(state.trimEnd);
    setPlaybackRate(state.playbackRate);
    const video = videoRef.current;
    if (video) video.playbackRate = state.playbackRate;
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current < 0) return;
    const state = history[historyIndexRef.current];
    if (state) restoreState(state);
    historyIndexRef.current -= 1;
    setHistoryIndex(historyIndexRef.current);
  }, [history, restoreState]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= history.length - 1) return;
    historyIndexRef.current += 1;
    const nextState = history[historyIndexRef.current];
    if (nextState) restoreState(nextState);
    setHistoryIndex(historyIndexRef.current);
  }, [history, restoreState]);

  const handleApplyPreset = useCallback((preset: VideoPreset) => {
    pushHistory();
    const startVals = { brightness, contrast, saturation, hue, temperature, vignette };
    const target = { brightness: preset.brightness, contrast: preset.contrast, saturation: preset.saturation, hue: preset.hue, temperature: preset.temperature, vignette: preset.vignette };
    const duration = 400;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setBrightness(Math.round(startVals.brightness + (target.brightness - startVals.brightness) * ease));
      setContrast(Math.round(startVals.contrast + (target.contrast - startVals.contrast) * ease));
      setSaturation(Math.round(startVals.saturation + (target.saturation - startVals.saturation) * ease));
      setHue(Math.round(startVals.hue + (target.hue - startVals.hue) * ease));
      setTemperature(Math.round(startVals.temperature + (target.temperature - startVals.temperature) * ease));
      setVignette(Math.round(startVals.vignette + (target.vignette - startVals.vignette) * ease));
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    setActiveTool("adjustments");
    toast({ title: `${preset.name} preset applied` });
  }, [brightness, contrast, saturation, hue, temperature, vignette, pushHistory, toast]);

  const handleCaptureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)${hue !== 0 ? ` hue-rotate(${hue}deg)` : ""}`;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    if (temperature !== 0) {
      if (temperature > 0) {
        ctx.fillStyle = `rgba(255,140,0,${temperature / 500})`;
      } else {
        ctx.fillStyle = `rgba(0,100,255,${Math.abs(temperature) / 500})`;
      }
      ctx.globalCompositeOperation = "overlay";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
    }
    if (vignette > 0) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.max(cx, cy);
      const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const dataUrl = canvas.toDataURL("image/png");
    setCapturedFrame(dataUrl);
    toast({ title: "Frame captured" });
  }, [brightness, contrast, saturation, hue, temperature, vignette, toast]);

  const handleSaveFrame = async () => {
    if (!capturedFrame || !mediaItem) return;
    setSaving(true);
    try {
      const res = await fetch(capturedFrame);
      const blob = await res.blob();
      const fileName = `frame_${mediaItem.filename || "capture"}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      const uploadResult = await uploadFile(file);
      if (!uploadResult) throw new Error("Upload failed");

      await createMedia.mutateAsync({
        title: `${mediaItem.title} (Frame)`,
        description: `Frame captured at ${formatTime(currentTime)}`,
        url: uploadResult.objectPath,
        filename: fileName,
        contentType: "image/png",
        category: detectCategory("image/png"),
        size: blob.size,
        tags: mediaItem.tags || undefined,
        label: mediaItem.label || undefined,
      });

      soundFeedback("success");
      toast({ title: "Frame saved as new image" });
    } catch (err) {
      toast({
        title: "Failed to save frame",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollJobStatus = useCallback((jobId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/video/jobs/${jobId}`, { credentials: "include" });
        if (!res.ok) return;
        const job = await res.json();
        setProcessingStatus(job.status);
        setProcessingProgress(job.progress || 0);

        if (job.status === "complete") {
          if (pollRef.current) clearInterval(pollRef.current);
          queryClient.invalidateQueries({ queryKey: ["/api/media"] });
          soundFeedback("success");
          toast({ title: "Video trimmed successfully!" });
          setTimeout(() => navigate("/dashboard"), 1500);
        } else if (job.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setProcessingError(job.errorMessage || "Processing failed");
          setSaving(false);
        }
      } catch {}
    }, 2000);
  }, [navigate, toast]);

  const handleSaveTrimmedVideo = async () => {
    if (!mediaItem) return;
    if (trimStart === 0 && trimEnd === duration) {
      toast({ title: "No trim applied", description: "Adjust the trim handles first", variant: "destructive" });
      return;
    }
    setSaving(true);
    setProcessingError(null);
    setProcessingStatus("queued");
    setProcessingProgress(0);

    try {
      const res = await apiRequest("POST", "/api/video/trim", {
        mediaId: mediaItem.id,
        trimStart,
        trimEnd,
        title: `${mediaItem.title} (trimmed)`,
      });
      const job = await res.json();
      setProcessingJobId(job.id);
      pollJobStatus(job.id);
    } catch (err) {
      toast({
        title: "Failed to start trim",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  const displayBrightness = showingBefore ? 100 : brightness;
  const displayContrast = showingBefore ? 100 : contrast;
  const displaySaturation = showingBefore ? 100 : saturation;
  const displayHue = showingBefore ? 0 : hue;
  const displayTemperature = showingBefore ? 0 : temperature;
  const displayVignette = showingBefore ? 0 : vignette;

  const videoFilterStyle = `brightness(${displayBrightness}%) contrast(${displayContrast}%) saturate(${displaySaturation}%)${displayHue !== 0 ? ` hue-rotate(${displayHue}deg)` : ""}`;

  const speedOptions = [0.5, 1, 1.5, 2];

  const timelineTicks = [];
  if (duration > 0) {
    const tickInterval = duration <= 10 ? 1 : duration <= 60 ? 5 : duration <= 300 ? 15 : 30;
    for (let t = 0; t <= duration; t += tickInterval) {
      timelineTicks.push(t);
    }
  }

  const soundFeedback = useSoundFeedback();

  const editorShortcuts: ShortcutAction[] = useMemo(() => [
    { key: "z", ctrl: true, label: "Undo", category: "History", action: handleUndo },
    { key: "y", ctrl: true, label: "Redo", category: "History", action: handleRedo },
    { key: "z", ctrl: true, shift: true, label: "Redo", category: "History", action: handleRedo },
    { key: "s", ctrl: true, label: "Save Trimmed Video", category: "File", action: () => { soundFeedback("save"); handleSaveTrimmedVideo(); } },
    { key: " ", label: "Play / Pause", category: "Playback", action: () => { isPlaying ? handlePause() : handlePlay(); } },
    { key: "r", ctrl: true, label: "Reset All", category: "Edit", action: handleReset },
    { key: "f", label: "Capture Frame", category: "Edit", action: handleSaveFrame },
  ], [handleUndo, handleRedo, handleSaveTrimmedVideo, handleReset, soundFeedback, isPlaying, handlePause, handlePlay, handleSaveFrame]);

  const { showHelp, setShowHelp } = useEditorShortcuts(editorShortcuts);

  if (authLoading || mediaLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background" data-testid="editor-loading">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden" data-testid="video-editor">
      <ShortcutHelp open={showHelp} onClose={() => setShowHelp(false)} shortcuts={editorShortcuts} title="Video Editor Shortcuts" />
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-between gap-2 sm:gap-3 px-2 sm:px-4 py-2 border-b border-white/10 glass-morphism z-50" data-testid="editor-topbar">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
          <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[200px] text-white" data-testid="text-video-name">
            {mediaItem?.title || "Video Editor"}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onMouseDown={() => setShowingBefore(true)}
                onMouseUp={() => setShowingBefore(false)}
                onMouseLeave={() => setShowingBefore(false)}
                onTouchStart={() => setShowingBefore(true)}
                onTouchEnd={() => setShowingBefore(false)}
                data-testid="button-before-after"
              >
                <Eye />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hold to see original</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                data-testid="button-undo"
              >
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                data-testid="button-redo"
              >
                <Redo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleReset}
                data-testid="button-reset"
              >
                <RotateCcw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={() => setShowHelp(true)} className="hidden sm:inline-flex" data-testid="button-shortcuts">
                <Keyboard className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Shortcuts (?)</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            onClick={handleSaveTrimmedVideo}
            disabled={saving || isUploading}
            data-testid="button-save-clip"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin sm:mr-2" />
            ) : (
              <Scissors className="w-4 h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Save Trimmed Video</span>
          </Button>
        </div>
      </div>

      {processingJobId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" data-testid="processing-overlay">
          <div className="bg-card border border-white/10 rounded-lg p-8 max-w-md w-full mx-4 text-center space-y-4">
            {processingError ? (
              <>
                <XCircle className="w-12 h-12 text-destructive mx-auto" />
                <h3 className="text-lg font-semibold text-foreground">Processing Failed</h3>
                <p className="text-sm text-muted-foreground">{processingError}</p>
                <Button onClick={() => { setSaving(false); setProcessingJobId(null); setProcessingError(null); }} data-testid="button-dismiss-error">
                  Try Again
                </Button>
              </>
            ) : processingStatus === "complete" ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold text-foreground">Video Trimmed!</h3>
                <p className="text-sm text-muted-foreground">Redirecting to your vault...</p>
              </>
            ) : (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <h3 className="text-lg font-semibold text-foreground">Processing Video</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {processingStatus === "queued" ? "Preparing..." :
                   processingStatus === "downloading" ? "Downloading source..." :
                   processingStatus === "processing" ? "Trimming video..." :
                   processingStatus === "uploading" ? "Saving to vault..." :
                   "Working..."}
                </p>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${processingProgress}%` }}
                    data-testid="processing-progress-bar"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{processingProgress}%</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1 flex items-center justify-center p-4 min-h-0">
          {!videoLoaded && mediaItem?.url ? (
            <div className="flex flex-col items-center gap-3" data-testid="video-loading">
              <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading video...</span>
            </div>
          ) : null}
          <div className="relative inline-block" style={{ display: videoLoaded ? "block" : "none" }}>
            <video
              ref={videoRef}
              className="max-w-full max-h-[35vh] sm:max-h-[50vh] rounded-md"
              style={{ filter: videoFilterStyle }}
              playsInline
              data-testid="video-player"
            />
            {displayTemperature !== 0 && (
              <div
                className="absolute inset-0 rounded-md pointer-events-none"
                style={{
                  backgroundColor: displayTemperature > 0
                    ? `rgba(255,140,0,${displayTemperature / 500})`
                    : `rgba(0,100,255,${Math.abs(displayTemperature) / 500})`,
                  mixBlendMode: "overlay",
                }}
              />
            )}
            {displayVignette > 0 && (
              <div
                className="absolute inset-0 rounded-md pointer-events-none"
                style={{
                  background: `radial-gradient(circle, transparent 30%, rgba(0,0,0,${displayVignette / 100}) 100%)`,
                }}
              />
            )}
          </div>
        </div>

        {videoLoaded && (
          <>
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-white/50">Click on the timeline to jump. Drag handles to trim.</p>
                {(trimStart > 0 || trimEnd < duration) && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Selected: {formatTime(trimEnd - trimStart)}
                  </Badge>
                )}
              </div>
              <div
                ref={timelineRef}
                className="relative h-12 bg-white/5 rounded-md cursor-pointer select-none"
                onClick={handleTimelineClick}
                onTouchStart={handleTimelineTouch}
                data-testid="timeline-bar"
              >
                {timelineTicks.map((t) => (
                  <div
                    key={t}
                    className="absolute top-0 h-full flex flex-col justify-end items-center pointer-events-none"
                    style={{ left: `${(t / duration) * 100}%` }}
                  >
                    <div className="w-px h-2 bg-white/20" />
                    <span className="text-[9px] text-white/30 leading-none pb-0.5">
                      {formatTime(t)}
                    </span>
                  </div>
                ))}

                {trimStart > 0 && (
                  <div
                    className="absolute top-0 h-full bg-black/50 rounded-l-md pointer-events-none"
                    style={{ left: 0, width: `${(trimStart / duration) * 100}%` }}
                  />
                )}
                {trimEnd < duration && (
                  <div
                    className="absolute top-0 h-full bg-black/50 rounded-r-md pointer-events-none"
                    style={{ left: `${(trimEnd / duration) * 100}%`, right: 0 }}
                  />
                )}

                <div
                  className="absolute top-0 h-full bg-primary/20 pointer-events-none"
                  style={{
                    left: `${(trimStart / duration) * 100}%`,
                    width: `${((trimEnd - trimStart) / duration) * 100}%`,
                  }}
                />

                <div
                  className="absolute top-0 w-6 h-full cursor-ew-resize z-10"
                  style={{ left: `${(trimStart / duration) * 100}%`, transform: "translateX(-50%)" }}
                  onMouseDown={(e) => handleTrimMouseDown("start", e)}
                  onTouchStart={(e) => handleTrimTouchStart("start", e)}
                  data-testid="trim-handle-start"
                >
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-1 h-full bg-primary rounded-sm" />
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-4 h-6 bg-primary rounded-sm flex items-center justify-center">
                    <div className="w-0.5 h-3 bg-primary-foreground rounded-full" />
                  </div>
                </div>

                <div
                  className="absolute top-0 w-6 h-full cursor-ew-resize z-10"
                  style={{ left: `${(trimEnd / duration) * 100}%`, transform: "translateX(-50%)" }}
                  onMouseDown={(e) => handleTrimMouseDown("end", e)}
                  onTouchStart={(e) => handleTrimTouchStart("end", e)}
                  data-testid="trim-handle-end"
                >
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-1 h-full bg-primary rounded-sm" />
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-4 h-6 bg-primary rounded-sm flex items-center justify-center">
                    <div className="w-0.5 h-3 bg-primary-foreground rounded-full" />
                  </div>
                </div>

                <div
                  className="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none"
                  style={{ left: `${(currentTime / duration) * 100}%`, transform: "translateX(-50%)" }}
                  data-testid="playhead"
                >
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-t border-white/10" data-testid="playback-controls">
              <div className="flex items-center justify-center sm:justify-start gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={handleSkipBack} data-testid="button-skip-back">
                      <SkipBack className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back 5s</TooltipContent>
                </Tooltip>

                <Button
                  size="lg"
                  onClick={isPlaying ? handlePause : handlePlay}
                  className="rounded-full px-3"
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={handleSkipForward} data-testid="button-skip-forward">
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Forward 5s</TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-1 ml-2">
                  <Badge variant="secondary" className="text-xs font-mono" data-testid="text-current-time">
                    {formatTime(currentTime)}
                  </Badge>
                  <span className="text-white/40 text-xs">/</span>
                  <Badge variant="secondary" className="text-xs font-mono" data-testid="text-duration">
                    {formatTime(duration)}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  {speedOptions.map((speed) => (
                    <Button
                      key={speed}
                      size="sm"
                      variant={playbackRate === speed ? "default" : "ghost"}
                      onClick={() => setPlaybackRate(speed)}
                      className="text-xs px-2"
                      data-testid={`button-speed-${speed}`}
                    >
                      {speed}x
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsMuted((m) => !m)}
                        data-testid="button-mute"
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
                  </Tooltip>
                  <div className="w-20">
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[isMuted ? 0 : volume]}
                      onValueChange={([v]) => {
                        setVolume(v);
                        if (v > 0) setIsMuted(false);
                      }}
                      data-testid="slider-volume"
                    />
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={handleToggleFullscreen} data-testid="button-fullscreen">
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fullscreen</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="border-t border-white/10 glass-morphism max-h-[45vh] sm:max-h-none overflow-y-auto" data-testid="tools-panel">
              <div className="flex border-b border-white/10 overflow-x-auto">
                {essentialTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Button
                      key={tool.id}
                      variant={activeTool === tool.id ? "default" : "ghost"}
                      onClick={() => setActiveTool(tool.id)}
                      className="rounded-none flex-1"
                      data-testid={`button-tool-${tool.id}`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tool.label}
                    </Button>
                  );
                })}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-md text-xs transition-colors min-w-[68px] sm:min-w-0 ${
                    showAdvanced || advancedToolIds.includes(activeTool)
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover-elevate"
                  }`}
                  data-testid="button-toggle-advanced-tools"
                >
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`} />
                  <span className="leading-none text-[11px]">More</span>
                </button>
                {showAdvanced && advancedTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Button
                      key={tool.id}
                      variant={activeTool === tool.id ? "default" : "ghost"}
                      onClick={() => setActiveTool(tool.id)}
                      className="rounded-none flex-1"
                      data-testid={`button-tool-${tool.id}`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tool.label}
                    </Button>
                  );
                })}
              </div>

              <div className="p-3 sm:p-4">
                {activeTool === "trim" && (
                  <div className="flex flex-col gap-3" data-testid="panel-trim">
                    <p className="text-xs text-white/50">Set where you want the video to start and end. You can also drag the handles on the timeline above.</p>
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-white/60">Start</label>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={trimEnd - 0.1}
                          value={trimStart.toFixed(1)}
                          onChange={(e) => setTrimStart(Math.max(0, Math.min(parseFloat(e.target.value) || 0, trimEnd - 0.1)))}
                          className="w-24 text-xs"
                          data-testid="input-trim-start"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-white/60">End</label>
                        <Input
                          type="number"
                          step="0.1"
                          min={trimStart + 0.1}
                          max={duration}
                          value={trimEnd.toFixed(1)}
                          onChange={(e) => setTrimEnd(Math.max(trimStart + 0.1, Math.min(parseFloat(e.target.value) || 0, duration)))}
                          className="w-24 text-xs"
                          data-testid="input-trim-end"
                        />
                      </div>
                      <Badge variant="secondary" className="text-xs" data-testid="text-trim-duration">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(trimEnd - trimStart)}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={handleApplyTrim}
                        disabled={trimApplied && trimStart === 0 && trimEnd === duration}
                        data-testid="button-apply-trim"
                      >
                        <Scissors className="w-4 h-4 mr-1" />
                        Apply Trim
                      </Button>
                    </div>
                  </div>
                )}

                {activeTool === "adjustments" && (
                  <div className="flex flex-col gap-4" data-testid="panel-adjustments">
                    <p className="text-xs text-white/50">Fine-tune how your video looks. Changes apply to the preview and saved output.</p>
                    <div className="flex gap-2 overflow-x-auto pb-2" data-testid="preset-list">
                      {VIDEO_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleApplyPreset(preset)}
                          className="flex-shrink-0 flex flex-col gap-0.5 px-3 py-2 rounded-md border border-white/10 bg-white/5 hover-elevate active-elevate-2 text-left min-w-[100px]"
                          data-testid={`button-preset-${preset.id}`}
                        >
                          <span className="text-xs font-medium text-white">{preset.name}</span>
                          <span className="text-[10px] text-white/40 leading-tight">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white/60">Brightness</label>
                        <Badge variant="secondary" className="text-xs">{brightness}%</Badge>
                      </div>
                      <Slider
                        min={50}
                        max={150}
                        step={1}
                        value={[brightness]}
                        onValueChange={([v]) => setBrightness(v)}
                        data-testid="slider-brightness"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white/60">Contrast</label>
                        <Badge variant="secondary" className="text-xs">{contrast}%</Badge>
                      </div>
                      <Slider
                        min={50}
                        max={150}
                        step={1}
                        value={[contrast]}
                        onValueChange={([v]) => setContrast(v)}
                        data-testid="slider-contrast"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white/60">Saturation</label>
                        <Badge variant="secondary" className="text-xs">{saturation}%</Badge>
                      </div>
                      <Slider
                        min={0}
                        max={200}
                        step={1}
                        value={[saturation]}
                        onValueChange={([v]) => setSaturation(v)}
                        data-testid="slider-saturation"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white/60">Hue Shift</label>
                        <Badge variant="secondary" className="text-xs">{hue}°</Badge>
                      </div>
                      <Slider
                        min={-180}
                        max={180}
                        step={1}
                        value={[hue]}
                        onValueChange={([v]) => setHue(v)}
                        data-testid="slider-hue"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white/60">Temperature</label>
                        <Badge variant="secondary" className="text-xs">
                          {temperature > 0 ? `+${temperature} warm` : temperature < 0 ? `${temperature} cool` : "neutral"}
                        </Badge>
                      </div>
                      <Slider
                        min={-100}
                        max={100}
                        step={1}
                        value={[temperature]}
                        onValueChange={([v]) => setTemperature(v)}
                        data-testid="slider-temperature"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white/60">Vignette</label>
                        <Badge variant="secondary" className="text-xs">{vignette}%</Badge>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[vignette]}
                        onValueChange={([v]) => setVignette(v)}
                        data-testid="slider-vignette"
                      />
                    </div>
                  </div>
                )}

                {activeTool === "capture" && (
                  <div className="flex flex-col gap-3" data-testid="panel-capture">
                    <p className="text-xs text-white/50">Grab a still photo from any moment in your video. Pause at the perfect frame, then capture it.</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button onClick={handleCaptureFrame} data-testid="button-capture-frame">
                        <Camera className="w-4 h-4 mr-2" />
                        Capture This Frame
                      </Button>
                      {capturedFrame && (
                        <Button
                          variant="outline"
                          onClick={handleSaveFrame}
                          disabled={saving || isUploading}
                          data-testid="button-save-frame"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save Frame
                        </Button>
                      )}
                    </div>
                    {capturedFrame && (
                      <div className="flex items-start gap-3">
                        <img
                          src={capturedFrame}
                          alt="Captured frame"
                          className="max-w-[200px] rounded-md border border-white/10"
                          data-testid="img-captured-frame"
                        />
                        <Badge variant="secondary" className="text-xs">
                          {formatTime(currentTime)}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
