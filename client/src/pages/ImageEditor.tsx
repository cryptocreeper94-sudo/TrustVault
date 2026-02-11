import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { useCreateMedia } from "@/hooks/use-media";
import { useToast } from "@/hooks/use-toast";
import { buildUrl, api } from "@shared/routes";
import type { MediaResponse } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Palette,
  SlidersHorizontal,
  Save,
  ArrowLeft,
  Lock,
  Unlock,
  Loader2,
  Undo,
  Check,
  X,
} from "lucide-react";

type EditorTool = "crop" | "rotate" | "resize" | "filters" | "adjustments";

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
}

interface FilterPreset {
  name: string;
  id: string;
  filter: string;
}

const FILTER_PRESETS: FilterPreset[] = [
  { name: "None", id: "none", filter: "none" },
  { name: "Grayscale", id: "grayscale", filter: "grayscale(100%)" },
  { name: "Sepia", id: "sepia", filter: "sepia(100%)" },
  { name: "Vintage", id: "vintage", filter: "sepia(40%) contrast(85%) brightness(110%) saturate(75%)" },
  { name: "Cool", id: "cool", filter: "saturate(80%) hue-rotate(180deg) brightness(105%)" },
  { name: "Vivid", id: "vivid", filter: "saturate(180%) contrast(120%)" },
  { name: "Fade", id: "fade", filter: "contrast(75%) brightness(115%) saturate(80%)" },
];

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
};

function buildFilterString(adjustments: Adjustments, filterPreset: string): string {
  const parts: string[] = [];
  if (filterPreset !== "none") {
    parts.push(filterPreset);
  }
  if (adjustments.brightness !== 100) parts.push(`brightness(${adjustments.brightness}%)`);
  if (adjustments.contrast !== 100) parts.push(`contrast(${adjustments.contrast}%)`);
  if (adjustments.saturation !== 100) parts.push(`saturate(${adjustments.saturation}%)`);
  if (adjustments.blur > 0) parts.push(`blur(${adjustments.blur}px)`);
  return parts.length > 0 ? parts.join(" ") : "none";
}

export default function ImageEditor() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { uploadFile, isUploading, progress } = useUpload();
  const createMedia = useCreateMedia();
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const filterPreviewCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const [activeTool, setActiveTool] = useState<EditorTool | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [adjustments, setAdjustments] = useState<Adjustments>({ ...DEFAULT_ADJUSTMENTS });
  const [activeFilter, setActiveFilter] = useState("none");

  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [originalAspect, setOriginalAspect] = useState(1);

  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [croppedImage, setCroppedImage] = useState<HTMLImageElement | null>(null);

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

  const currentSourceImage = croppedImage || originalImageRef.current;

  const getEffectiveDimensions = useCallback(() => {
    if (!currentSourceImage) return { width: 0, height: 0 };
    const w = currentSourceImage.naturalWidth || currentSourceImage.width;
    const h = currentSourceImage.naturalHeight || currentSourceImage.height;
    if (rotation === 90 || rotation === 270) {
      return { width: h, height: w };
    }
    return { width: w, height: h };
  }, [currentSourceImage, rotation]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = currentSourceImage;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

    let cw = imgW;
    let ch = imgH;
    if (rotation === 90 || rotation === 270) {
      cw = imgH;
      ch = imgW;
    }

    if (resizeWidth > 0 && resizeHeight > 0) {
      cw = resizeWidth;
      ch = resizeHeight;
    }

    canvas.width = cw;
    canvas.height = ch;

    ctx.clearRect(0, 0, cw, ch);

    const filterPreset = FILTER_PRESETS.find((f) => f.id === activeFilter);
    const filterStr = buildFilterString(adjustments, filterPreset?.filter || "none");
    ctx.filter = filterStr;

    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.rotate((rotation * Math.PI) / 180);

    const drawW = resizeWidth > 0 && resizeHeight > 0
      ? (rotation === 90 || rotation === 270 ? resizeHeight : resizeWidth)
      : imgW;
    const drawH = resizeWidth > 0 && resizeHeight > 0
      ? (rotation === 90 || rotation === 270 ? resizeWidth : resizeHeight)
      : imgH;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [currentSourceImage, rotation, flipH, flipV, adjustments, activeFilter, resizeWidth, resizeHeight]);

  useEffect(() => {
    if (!mediaItem?.url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;
      setResizeWidth(img.naturalWidth);
      setResizeHeight(img.naturalHeight);
      setOriginalAspect(img.naturalWidth / img.naturalHeight);
      setImageLoaded(true);
    };
    img.onerror = () => {
      toast({ title: "Failed to load image", variant: "destructive" });
    };
    img.src = `/objects/${mediaItem.url}`;
  }, [mediaItem?.url, toast]);

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [imageLoaded, drawCanvas]);

  useEffect(() => {
    if (imageLoaded && currentSourceImage) {
      const dims = getEffectiveDimensions();
      setResizeWidth(dims.width);
      setResizeHeight(dims.height);
      if (dims.height > 0) {
        setOriginalAspect(dims.width / dims.height);
      }
    }
  }, [rotation, croppedImage, imageLoaded, currentSourceImage, getEffectiveDimensions]);

  const generateFilterPreviews = useCallback(() => {
    const img = currentSourceImage;
    if (!img) return;

    const size = 80;
    FILTER_PRESETS.forEach((preset) => {
      const canvas = filterPreviewCanvasRefs.current.get(preset.id);
      if (!canvas) return;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.filter = preset.filter;
      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      const scale = Math.max(size / imgW, size / imgH);
      const sw = imgW * scale;
      const sh = imgH * scale;
      ctx.drawImage(img, (size - sw) / 2, (size - sh) / 2, sw, sh);
    });
  }, [currentSourceImage]);

  useEffect(() => {
    if (imageLoaded && activeTool === "filters") {
      requestAnimationFrame(generateFilterPreviews);
    }
  }, [imageLoaded, activeTool, generateFilterPreviews]);

  const handleResizeWidth = (val: string) => {
    const w = parseInt(val) || 0;
    setResizeWidth(w);
    if (aspectLocked && w > 0) {
      setResizeHeight(Math.round(w / originalAspect));
    }
  };

  const handleResizeHeight = (val: string) => {
    const h = parseInt(val) || 0;
    setResizeHeight(h);
    if (aspectLocked && h > 0) {
      setResizeWidth(Math.round(h * originalAspect));
    }
  };

  const handleRotateCW = () => setRotation((r) => (r + 90) % 360);
  const handleRotateCCW = () => setRotation((r) => (r + 270) % 360);
  const handleFlipH = () => setFlipH((f) => !f);
  const handleFlipV = () => setFlipV((f) => !f);

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setActiveFilter("none");
    setCroppedImage(null);
    setCropRect(null);
    setIsCropping(false);
    if (originalImageRef.current) {
      setResizeWidth(originalImageRef.current.naturalWidth);
      setResizeHeight(originalImageRef.current.naturalHeight);
      setOriginalAspect(originalImageRef.current.naturalWidth / originalImageRef.current.naturalHeight);
    }
  };

  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "crop" || !isCropping) return;
    const pos = getCanvasMousePos(e);
    setCropStart(pos);
    setCropRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "crop" || !isCropping || !cropStart) return;
    const pos = getCanvasMousePos(e);
    const x = Math.min(cropStart.x, pos.x);
    const y = Math.min(cropStart.y, pos.y);
    const width = Math.abs(pos.x - cropStart.x);
    const height = Math.abs(pos.y - cropStart.y);
    setCropRect({ x, y, width, height });
  };

  const handleCropMouseUp = () => {
    setCropStart(null);
  };

  const applyCrop = () => {
    if (!cropRect || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = cropRect.width;
    tempCanvas.height = cropRect.height;
    const tCtx = tempCanvas.getContext("2d");
    if (!tCtx) return;
    tCtx.drawImage(
      canvas,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      cropRect.width,
      cropRect.height
    );
    const newImg = new Image();
    newImg.onload = () => {
      setCroppedImage(newImg);
      setCropRect(null);
      setIsCropping(false);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
    };
    newImg.src = tempCanvas.toDataURL("image/png");
  };

  const cancelCrop = () => {
    setCropRect(null);
    setIsCropping(false);
    setCropStart(null);
  };

  const drawCropOverlay = useCallback(() => {
    if (!cropRect || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    return {
      left: cropRect.x * scaleX,
      top: cropRect.y * scaleY,
      width: cropRect.width * scaleX,
      height: cropRect.height * scaleY,
    };
  }, [cropRect]);

  const cropOverlayStyle = drawCropOverlay();

  const handleSave = async () => {
    if (!canvasRef.current || !mediaItem) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvasRef.current!.toBlob(resolve, "image/png");
      });
      if (!blob) throw new Error("Failed to export canvas");

      const fileName = `edited_${mediaItem.filename || "image.png"}`;
      const file = new File([blob], fileName, { type: "image/png" });

      const uploadResult = await uploadFile(file);
      if (!uploadResult) throw new Error("Upload failed");

      await createMedia.mutateAsync({
        title: `${mediaItem.title} (Edited)`,
        description: mediaItem.description || undefined,
        url: uploadResult.objectPath,
        filename: fileName,
        contentType: "image/png",
        category: "image",
        size: blob.size,
        tags: mediaItem.tags || undefined,
        label: mediaItem.label || undefined,
      });

      toast({ title: "Image saved successfully" });
      navigate("/");
    } catch (err) {
      toast({
        title: "Failed to save image",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const canvasDisplayStyle = useMemo(() => {
    if (!canvasRef.current) return {};
    return { maxWidth: "100%", maxHeight: "100%" };
  }, []);

  const tools: { id: EditorTool; icon: typeof Crop; label: string }[] = [
    { id: "crop", icon: Crop, label: "Crop" },
    { id: "rotate", icon: RotateCw, label: "Rotate" },
    { id: "resize", icon: Maximize, label: "Resize" },
    { id: "filters", icon: Palette, label: "Filters" },
    { id: "adjustments", icon: SlidersHorizontal, label: "Adjustments" },
  ];

  if (authLoading || mediaLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background" data-testid="editor-loading">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden" data-testid="image-editor">
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b glass-morphism z-50" data-testid="editor-topbar">
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
          <span className="text-sm font-medium truncate max-w-[200px]" data-testid="text-image-name">
            {mediaItem?.title || "Image Editor"}
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
            <TooltipContent>Reset to Original</TooltipContent>
          </Tooltip>
          <Button
            onClick={handleSave}
            disabled={saving || isUploading || !imageLoaded}
            data-testid="button-save"
          >
            {saving || isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save as New
          </Button>
        </div>
      </div>

      {(saving || isUploading) && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
            data-testid="progress-bar"
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
        <div className="flex sm:flex-col gap-0.5 p-2 border-b sm:border-b-0 sm:border-r glass-morphism z-40 overflow-x-auto sm:overflow-x-visible sm:w-[88px]" data-testid="editor-toolbar">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(isActive ? null : tool.id);
                  if (tool.id === "crop" && !isActive) {
                    setIsCropping(true);
                    setCropRect(null);
                  } else if (tool.id !== "crop") {
                    setIsCropping(false);
                    setCropRect(null);
                  }
                }}
                className={`flex flex-col items-center gap-1 px-2 py-2 rounded-md text-xs transition-colors min-w-[64px] sm:min-w-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover-elevate"
                }`}
                data-testid={`button-tool-${tool.id}`}
              >
                <Icon className="w-5 h-5" />
                <span className="leading-none">{tool.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden relative" ref={containerRef} data-testid="editor-canvas-area">
            {!imageLoaded ? (
              <div className="flex flex-col items-center gap-3" data-testid="canvas-loading">
                <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading image...</span>
              </div>
            ) : (
              <div className="relative inline-block" style={{ maxWidth: "100%", maxHeight: "100%" }}>
                <canvas
                  ref={canvasRef}
                  className="block rounded-md"
                  style={{ maxWidth: "100%", maxHeight: "calc(100vh - 200px)", objectFit: "contain", cursor: isCropping ? "crosshair" : "default" }}
                  onMouseDown={handleCropMouseDown}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  data-testid="editor-canvas"
                />
                {isCropping && cropOverlayStyle && cropRect && cropRect.width > 0 && (
                  <div
                    className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
                    style={{
                      left: cropOverlayStyle.left,
                      top: cropOverlayStyle.top,
                      width: cropOverlayStyle.width,
                      height: cropOverlayStyle.height,
                    }}
                    data-testid="crop-overlay"
                  >
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-sm" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-sm" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary rounded-sm" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-sm" />
                  </div>
                )}
              </div>
            )}
          </div>

          {activeTool ? (
            <div className="w-full sm:w-64 border-t sm:border-t-0 sm:border-l glass-morphism p-3 sm:p-4 overflow-y-auto z-40 max-h-[40vh] sm:max-h-none" data-testid="editor-panel">
            {activeTool === "crop" && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold" data-testid="text-panel-title">Crop Your Photo</h3>
                <div className="rounded-md bg-primary/5 border border-primary/10 p-2.5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Click and drag on your photo to select the area you want to keep. You'll see a highlighted box — adjust it until it looks right, then hit Apply.
                  </p>
                </div>
                {cropRect && cropRect.width > 0 && (
                  <div className="flex flex-col gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(cropRect.width)} x {Math.round(cropRect.height)}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={applyCrop}
                        data-testid="button-apply-crop"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelCrop}
                        data-testid="button-cancel-crop"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTool === "rotate" && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold" data-testid="text-panel-title">Rotate & Flip</h3>
                <p className="text-xs text-muted-foreground">Straighten or flip your photo with one tap.</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" onClick={handleRotateCCW} data-testid="button-rotate-ccw">
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Left
                  </Button>
                  <Button variant="ghost" onClick={handleRotateCW} data-testid="button-rotate-cw">
                    <RotateCw className="w-4 h-4 mr-1" />
                    Right
                  </Button>
                  <Button variant="ghost" onClick={handleFlipH} data-testid="button-flip-h">
                    <FlipHorizontal className="w-4 h-4 mr-1" />
                    Mirror
                  </Button>
                  <Button variant="ghost" onClick={handleFlipV} data-testid="button-flip-v">
                    <FlipVertical className="w-4 h-4 mr-1" />
                    Flip
                  </Button>
                </div>
                {(rotation !== 0 || flipH || flipV) && (
                  <Badge variant="secondary" className="text-xs self-start">
                    {rotation !== 0 ? `Rotated ${rotation}°` : ""}{flipH ? " Mirrored" : ""}{flipV ? " Flipped" : ""}
                  </Badge>
                )}
              </div>
            )}

            {activeTool === "resize" && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold" data-testid="text-panel-title">Resize</h3>
                <p className="text-xs text-muted-foreground">Change the dimensions of your photo. Lock the ratio to keep proportions.</p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Width</label>
                    <Input
                      type="number"
                      value={resizeWidth}
                      onChange={(e) => handleResizeWidth(e.target.value)}
                      data-testid="input-resize-width"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={aspectLocked ? "default" : "ghost"}
                          onClick={() => setAspectLocked(!aspectLocked)}
                          data-testid="button-aspect-lock"
                        >
                          {aspectLocked ? <Lock /> : <Unlock />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {aspectLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Height</label>
                    <Input
                      type="number"
                      value={resizeHeight}
                      onChange={(e) => handleResizeHeight(e.target.value)}
                      data-testid="input-resize-height"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTool === "filters" && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold" data-testid="text-panel-title">Filters</h3>
                <p className="text-xs text-muted-foreground">Tap a style to instantly change the look of your photo.</p>
                <div className="grid grid-cols-2 gap-2">
                  {FILTER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setActiveFilter(preset.id)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-md transition-colors ${
                        activeFilter === preset.id
                          ? "bg-primary/20 ring-2 ring-primary"
                          : "hover-elevate"
                      }`}
                      data-testid={`button-filter-${preset.id}`}
                    >
                      <canvas
                        ref={(el) => {
                          if (el) filterPreviewCanvasRefs.current.set(preset.id, el);
                        }}
                        className="w-full aspect-square rounded-sm"
                        width={80}
                        height={80}
                      />
                      <span className="text-xs font-medium">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === "adjustments" && (
              <div className="flex flex-col gap-5">
                <h3 className="text-sm font-semibold" data-testid="text-panel-title">Adjustments</h3>
                <p className="text-xs text-muted-foreground">Fine-tune how your photo looks. Drag any slider to see changes instantly.</p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Brightness</label>
                    <span className="text-xs text-muted-foreground" data-testid="text-brightness-value">{adjustments.brightness}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={200}
                    step={1}
                    value={[adjustments.brightness]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, brightness: v }))}
                    data-testid="slider-brightness"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Contrast</label>
                    <span className="text-xs text-muted-foreground" data-testid="text-contrast-value">{adjustments.contrast}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={200}
                    step={1}
                    value={[adjustments.contrast]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, contrast: v }))}
                    data-testid="slider-contrast"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Saturation</label>
                    <span className="text-xs text-muted-foreground" data-testid="text-saturation-value">{adjustments.saturation}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={200}
                    step={1}
                    value={[adjustments.saturation]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, saturation: v }))}
                    data-testid="slider-saturation"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Blur</label>
                    <span className="text-xs text-muted-foreground" data-testid="text-blur-value">{adjustments.blur}px</span>
                  </div>
                  <Slider
                    min={0}
                    max={10}
                    step={0.1}
                    value={[adjustments.blur]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, blur: v }))}
                    data-testid="slider-blur"
                  />
                </div>
              </div>
            )}
            </div>
          ) : imageLoaded ? (
            <div className="w-full sm:w-64 border-t sm:border-t-0 sm:border-l glass-morphism p-3 sm:p-4 z-40 flex items-center justify-center" data-testid="editor-hint">
              <div className="text-center space-y-2">
                <Crop className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                <p className="text-xs text-muted-foreground leading-relaxed">Pick a tool from the left to start editing your photo</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
