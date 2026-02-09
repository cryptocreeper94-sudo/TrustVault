import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { useCreateMedia } from "@/hooks/use-media";
import { useToast } from "@/hooks/use-toast";
import { buildUrl, api } from "@shared/routes";
import type { MediaResponse } from "@shared/routes";
import { detectCategory } from "@shared/schema";
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
  Undo,
  Clock,
} from "lucide-react";

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

  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);

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
      navigate("/");
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

  useEffect(() => {
    if (!isDraggingTrim) return;

    const handleMouseMove = (e: MouseEvent) => {
      const timeline = timelineRef.current;
      if (!timeline || !duration) return;
      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const time = ratio * duration;

      if (isDraggingTrim === "start") {
        setTrimStart(Math.min(time, trimEnd - 0.1));
      } else {
        setTrimEnd(Math.max(time, trimStart + 0.1));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingTrim(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingTrim, duration, trimStart, trimEnd]);

  const handleApplyTrim = useCallback(() => {
    setTrimApplied(true);
    const video = videoRef.current;
    if (video && (video.currentTime < trimStart || video.currentTime > trimEnd)) {
      video.currentTime = trimStart;
      setCurrentTime(trimStart);
    }
    toast({ title: "Trim applied" });
  }, [trimStart, trimEnd, toast]);

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
    setCapturedFrame(null);
    video.currentTime = 0;
    setCurrentTime(0);
    setPlaybackRate(1);
    video.playbackRate = 1;
  }, [duration]);

  const handleCaptureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setCapturedFrame(dataUrl);
    toast({ title: "Frame captured" });
  }, [brightness, contrast, toast]);

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

  const handleSaveClipInfo = async () => {
    if (!mediaItem) return;
    setSaving(true);
    try {
      const editInfo = [
        `Trim: ${formatTime(trimStart)} - ${formatTime(trimEnd)}`,
        `Brightness: ${brightness}%`,
        `Contrast: ${contrast}%`,
      ].join(" | ");

      await createMedia.mutateAsync({
        title: `${mediaItem.title} (edited)`,
        description: `${mediaItem.description || ""}\n${editInfo}`.trim(),
        url: mediaItem.url,
        filename: mediaItem.filename,
        contentType: mediaItem.contentType,
        category: "video",
        size: mediaItem.size || undefined,
        tags: [...(mediaItem.tags || []), "edited"],
        label: mediaItem.label || undefined,
      });

      toast({ title: "Clip info saved" });
      navigate("/");
    } catch (err) {
      toast({
        title: "Failed to save clip info",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const videoFilterStyle = `brightness(${brightness}%) contrast(${contrast}%)`;

  const speedOptions = [0.5, 1, 1.5, 2];

  const timelineTicks = [];
  if (duration > 0) {
    const tickInterval = duration <= 10 ? 1 : duration <= 60 ? 5 : duration <= 300 ? 15 : 30;
    for (let t = 0; t <= duration; t += tickInterval) {
      timelineTicks.push(t);
    }
  }

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
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/10 glass-morphism z-50" data-testid="editor-topbar">
        <div className="flex items-center gap-3 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => navigate("/")}
                data-testid="button-back"
              >
                <ArrowLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back</TooltipContent>
          </Tooltip>
          <span className="text-sm font-medium truncate max-w-[200px] text-white" data-testid="text-video-name">
            {mediaItem?.title || "Video Editor"}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleReset}
                data-testid="button-reset"
              >
                <Undo />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            onClick={handleSaveClipInfo}
            disabled={saving || isUploading}
            data-testid="button-save-clip"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Clip Info
          </Button>
        </div>
      </div>

      {(saving || isUploading) && (
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
            data-testid="progress-bar"
          />
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
          <video
            ref={videoRef}
            className="max-w-full max-h-[50vh] rounded-md"
            style={{ filter: videoFilterStyle, display: videoLoaded ? "block" : "none" }}
            playsInline
            data-testid="video-player"
          />
        </div>

        {videoLoaded && (
          <>
            <div className="px-4 pb-2">
              <div
                ref={timelineRef}
                className="relative h-12 bg-white/5 rounded-md cursor-pointer select-none"
                onClick={handleTimelineClick}
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
                  className="absolute top-0 w-1 h-full bg-primary cursor-ew-resize z-10 rounded-sm"
                  style={{ left: `${(trimStart / duration) * 100}%`, transform: "translateX(-50%)" }}
                  onMouseDown={(e) => handleTrimMouseDown("start", e)}
                  data-testid="trim-handle-start"
                >
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-4 h-6 bg-primary rounded-sm flex items-center justify-center">
                    <div className="w-0.5 h-3 bg-primary-foreground rounded-full" />
                  </div>
                </div>

                <div
                  className="absolute top-0 w-1 h-full bg-primary cursor-ew-resize z-10 rounded-sm"
                  style={{ left: `${(trimEnd / duration) * 100}%`, transform: "translateX(-50%)" }}
                  onMouseDown={(e) => handleTrimMouseDown("end", e)}
                  data-testid="trim-handle-end"
                >
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-4 h-6 bg-primary rounded-sm flex items-center justify-center">
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
                  size="icon"
                  variant="ghost"
                  onClick={isPlaying ? handlePause : handlePlay}
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

            <div className="border-t border-white/10 glass-morphism" data-testid="tools-panel">
              <div className="flex border-b border-white/10">
                {([
                  { id: "trim" as VideoTool, icon: Scissors, label: "Trim" },
                  { id: "adjustments" as VideoTool, icon: SlidersHorizontal, label: "Adjustments" },
                  { id: "capture" as VideoTool, icon: Camera, label: "Capture" },
                ]).map((tool) => {
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
                  </div>
                )}

                {activeTool === "capture" && (
                  <div className="flex flex-col gap-3" data-testid="panel-capture">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button onClick={handleCaptureFrame} data-testid="button-capture-frame">
                        <Camera className="w-4 h-4 mr-2" />
                        Capture Frame
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
