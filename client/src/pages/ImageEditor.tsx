import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { useCreateMedia } from "@/hooks/use-media";
import { useToast } from "@/hooks/use-toast";
import { useEditorShortcuts, type ShortcutAction } from "@/hooks/use-editor-shortcuts";
import { useSoundFeedback } from "@/hooks/use-sound-feedback";
import { ShortcutHelp } from "@/components/ShortcutHelp";
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
  Undo2,
  Redo2,
  Check,
  X,
  Type,
  Pencil,
  Eraser,
  Sparkles,
  Trash2,
  Bold,
  ChevronDown,
  Eye,
  Wand2,
  Keyboard,
  Scissors,
  ImageOff,
  Mic,
  MicOff,
} from "lucide-react";
import { InfoBubble } from "@/components/InfoBubble";

type EditorTool = "crop" | "rotate" | "resize" | "filters" | "adjustments" | "text" | "draw" | "stickers";

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
  hue: number;
  temperature: number;
  vignette: number;
  sharpen: number;
}

interface FilterPreset {
  name: string;
  id: string;
  filter: string;
}

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
}

interface StickerLayer {
  id: string;
  type: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
}

interface StylePreset {
  name: string;
  id: string;
  adjustments: Adjustments;
  filter: string;
}

interface EditorState {
  adjustments: Adjustments;
  activeFilter: string;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  textLayers: TextLayer[];
  stickerLayers: StickerLayer[];
}

const FILTER_PRESETS: FilterPreset[] = [
  { name: "None", id: "none", filter: "none" },
  { name: "Grayscale", id: "grayscale", filter: "grayscale(100%)" },
  { name: "Sepia", id: "sepia", filter: "sepia(100%)" },
  { name: "Vintage", id: "vintage", filter: "sepia(40%) contrast(85%) brightness(110%) saturate(75%)" },
  { name: "Cool", id: "cool", filter: "saturate(80%) hue-rotate(180deg) brightness(105%)" },
  { name: "Vivid", id: "vivid", filter: "saturate(180%) contrast(120%)" },
  { name: "Fade", id: "fade", filter: "contrast(75%) brightness(115%) saturate(80%)" },
  { name: "Golden Hour", id: "golden-hour", filter: "sepia(20%) brightness(115%) saturate(130%) contrast(95%)" },
  { name: "Midnight", id: "midnight", filter: "brightness(85%) contrast(130%) saturate(60%) hue-rotate(210deg)" },
  { name: "Film Noir", id: "film-noir", filter: "grayscale(80%) contrast(140%) brightness(95%)" },
  { name: "Dreamy", id: "dreamy", filter: "brightness(110%) contrast(85%) saturate(120%) blur(0.5px)" },
  { name: "Retro Pop", id: "retro-pop", filter: "saturate(160%) contrast(110%) hue-rotate(330deg) brightness(105%)" },
  { name: "Arctic", id: "arctic", filter: "brightness(110%) saturate(70%) hue-rotate(190deg) contrast(105%)" },
  { name: "Sunset Glow", id: "sunset-glow", filter: "sepia(30%) saturate(140%) brightness(108%) contrast(105%)" },
  { name: "Noir & Gold", id: "noir-gold", filter: "sepia(50%) contrast(130%) brightness(90%) saturate(110%)" },
  { name: "Pastel", id: "pastel", filter: "brightness(115%) saturate(80%) contrast(85%)" },
];

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  hue: 0,
  temperature: 0,
  vignette: 0,
  sharpen: 0,
};

const STYLE_PRESETS: StylePreset[] = [
  {
    name: "Portrait", id: "portrait",
    adjustments: { brightness: 105, contrast: 95, saturation: 90, blur: 0, hue: 0, temperature: 15, vignette: 20, sharpen: 15 },
    filter: "none",
  },
  {
    name: "Landscape", id: "landscape",
    adjustments: { brightness: 100, contrast: 115, saturation: 130, blur: 0, hue: 0, temperature: 5, vignette: 10, sharpen: 20 },
    filter: "none",
  },
  {
    name: "Food", id: "food",
    adjustments: { brightness: 108, contrast: 105, saturation: 140, blur: 0, hue: 0, temperature: 20, vignette: 15, sharpen: 10 },
    filter: "none",
  },
  {
    name: "Night Mode", id: "night-mode",
    adjustments: { brightness: 115, contrast: 120, saturation: 80, blur: 0, hue: 0, temperature: -15, vignette: 30, sharpen: 25 },
    filter: "none",
  },
  {
    name: "Cinematic", id: "cinematic",
    adjustments: { brightness: 95, contrast: 125, saturation: 85, blur: 0, hue: 0, temperature: 10, vignette: 35, sharpen: 5 },
    filter: "none",
  },
];

const FONT_FAMILIES = ["Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Verdana"];

const BRUSH_PRESET_COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Purple", value: "#a855f7" },
];

const STICKER_TYPES = [
  "star", "heart", "arrow-right", "arrow-left", "circle", "triangle",
  "diamond", "checkmark", "x-mark", "lightning",
];

function drawStickerShape(
  ctx: CanvasRenderingContext2D,
  type: string,
  cx: number,
  cy: number,
  size: number,
  color: string,
  rotation: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const r = size / 2;

  switch (type) {
    case "star": {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.4;
        if (i === 0) ctx.moveTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
        else ctx.lineTo(Math.cos(angle) * rad, Math.sin(angle) * rad);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "heart": {
      ctx.beginPath();
      const topY = -r * 0.4;
      ctx.moveTo(0, r * 0.7);
      ctx.bezierCurveTo(-r, r * 0.1, -r, topY, -r * 0.5, topY);
      ctx.bezierCurveTo(-r * 0.2, topY, 0, -r * 0.1, 0, -r * 0.1);
      ctx.bezierCurveTo(0, -r * 0.1, r * 0.2, topY, r * 0.5, topY);
      ctx.bezierCurveTo(r, topY, r, r * 0.1, 0, r * 0.7);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "arrow-right": {
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.25);
      ctx.lineTo(r * 0.3, -r * 0.25);
      ctx.lineTo(r * 0.3, -r * 0.5);
      ctx.lineTo(r, 0);
      ctx.lineTo(r * 0.3, r * 0.5);
      ctx.lineTo(r * 0.3, r * 0.25);
      ctx.lineTo(-r, r * 0.25);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "arrow-left": {
      ctx.beginPath();
      ctx.moveTo(r, -r * 0.25);
      ctx.lineTo(-r * 0.3, -r * 0.25);
      ctx.lineTo(-r * 0.3, -r * 0.5);
      ctx.lineTo(-r, 0);
      ctx.lineTo(-r * 0.3, r * 0.5);
      ctx.lineTo(-r * 0.3, r * 0.25);
      ctx.lineTo(r, r * 0.25);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "circle": {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "triangle": {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, r * 0.7);
      ctx.lineTo(-r, r * 0.7);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "diamond": {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "checkmark": {
      ctx.beginPath();
      ctx.lineWidth = r * 0.3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(-r * 0.6, 0);
      ctx.lineTo(-r * 0.1, r * 0.5);
      ctx.lineTo(r * 0.6, -r * 0.4);
      ctx.stroke();
      break;
    }
    case "x-mark": {
      ctx.beginPath();
      ctx.lineWidth = r * 0.3;
      ctx.lineCap = "round";
      ctx.moveTo(-r * 0.5, -r * 0.5);
      ctx.lineTo(r * 0.5, r * 0.5);
      ctx.moveTo(r * 0.5, -r * 0.5);
      ctx.lineTo(-r * 0.5, r * 0.5);
      ctx.stroke();
      break;
    }
    case "lightning": {
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r);
      ctx.lineTo(-r * 0.4, r * 0.1);
      ctx.lineTo(0, r * 0.1);
      ctx.lineTo(-r * 0.1, r);
      ctx.lineTo(r * 0.4, -r * 0.1);
      ctx.lineTo(0, -r * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function drawStickerPreview(
  canvas: HTMLCanvasElement,
  type: string,
  color: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const s = canvas.width;
  ctx.clearRect(0, 0, s, s);
  drawStickerShape(ctx, type, s / 2, s / 2, s * 0.7, color, 0);
}

function buildFilterString(adjustments: Adjustments, filterPreset: string): string {
  const parts: string[] = [];
  if (filterPreset !== "none") {
    parts.push(filterPreset);
  }
  if (adjustments.brightness !== 100) parts.push(`brightness(${adjustments.brightness}%)`);
  if (adjustments.contrast !== 100) parts.push(`contrast(${adjustments.contrast}%)`);
  if (adjustments.saturation !== 100) parts.push(`saturate(${adjustments.saturation}%)`);
  if (adjustments.blur > 0) parts.push(`blur(${adjustments.blur}px)`);
  if (adjustments.hue !== 0) parts.push(`hue-rotate(${adjustments.hue}deg)`);
  return parts.length > 0 ? parts.join(" ") : "none";
}

function applyVignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  if (strength <= 0) return;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.max(cx, cy);
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${strength / 100})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function applyTemperature(ctx: CanvasRenderingContext2D, w: number, h: number, temp: number) {
  if (temp === 0) return;
  if (temp > 0) {
    ctx.fillStyle = `rgba(255,140,0,${temp / 500})`;
  } else {
    ctx.fillStyle = `rgba(0,100,255,${Math.abs(temp) / 500})`;
  }
  ctx.globalCompositeOperation = "overlay";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
}

function applySharpen(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, amount: number) {
  if (amount <= 0) return;
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  const factor = amount / 10;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = copy[i + c] * (1 + 4 * factor);
        const neighbors =
          (copy[((y - 1) * w + x) * 4 + c] +
            copy[((y + 1) * w + x) * 4 + c] +
            copy[(y * w + x - 1) * 4 + c] +
            copy[(y * w + x + 1) * 4 + c]) *
          factor;
        data[i + c] = Math.min(255, Math.max(0, center - neighbors));
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
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
  const drawingLayerRef = useRef<HTMLCanvasElement | null>(null);

  const [activeTool, setActiveTool] = useState<EditorTool | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (activeTool && ["resize", "text", "draw", "stickers"].includes(activeTool)) {
      setShowAdvanced(true);
    }
  }, [activeTool]);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAiEnhancing, setIsAiEnhancing] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isSmartErasing, setIsSmartErasing] = useState(false);
  const [isMagicFilling, setIsMagicFilling] = useState(false);
  const [magicFillRatio, setMagicFillRatio] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

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

  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [textDragOffset, setTextDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [newTextInput, setNewTextInput] = useState("");
  const [textFontFamily, setTextFontFamily] = useState("Arial");
  const [textFontSize, setTextFontSize] = useState(32);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textBold, setTextBold] = useState(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [brushColor, setBrushColor] = useState("#ffffff");
  const [isEraser, setIsEraser] = useState(false);

  const [stickerLayers, setStickerLayers] = useState<StickerLayer[]>([]);
  const [activeStickerIndex, setActiveStickerIndex] = useState<number | null>(null);
  const [isDraggingSticker, setIsDraggingSticker] = useState(false);
  const [stickerDragOffset, setStickerDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stickerColor, setStickerColor] = useState("#ffffff");
  const [stickerSize, setStickerSize] = useState(60);

  const [history, setHistory] = useState<EditorState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const [showOriginal, setShowOriginal] = useState(false);

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

  const ensureDrawingLayer = useCallback((w: number, h: number) => {
    if (!drawingLayerRef.current) {
      drawingLayerRef.current = document.createElement("canvas");
    }
    const dl = drawingLayerRef.current;
    if (dl.width !== w || dl.height !== h) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = dl.width;
      tempCanvas.height = dl.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) tempCtx.drawImage(dl, 0, 0);
      dl.width = w;
      dl.height = h;
      const dlCtx = dl.getContext("2d");
      if (dlCtx) dlCtx.drawImage(tempCanvas, 0, 0);
    }
  }, []);

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

    ctx.filter = "none";

    applyTemperature(ctx, cw, ch, adjustments.temperature);
    applyVignette(ctx, cw, ch, adjustments.vignette);
    applySharpen(ctx, canvas, adjustments.sharpen);

    ensureDrawingLayer(cw, ch);
    if (drawingLayerRef.current) {
      ctx.drawImage(drawingLayerRef.current, 0, 0);
    }

    for (const tl of textLayers) {
      ctx.save();
      ctx.font = `${tl.bold ? "bold " : ""}${tl.fontSize}px "${tl.fontFamily}"`;
      ctx.fillStyle = tl.color;
      ctx.textBaseline = "top";
      ctx.fillText(tl.text, tl.x, tl.y);
      if (tl.id === activeTextId) {
        const metrics = ctx.measureText(tl.text);
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(tl.x - 2, tl.y - 2, metrics.width + 4, tl.fontSize + 4);
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    for (const sl of stickerLayers) {
      drawStickerShape(ctx, sl.type, sl.x, sl.y, sl.size, sl.color, sl.rotation);
      if (stickerLayers.indexOf(sl) === activeStickerIndex) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(sl.x - sl.size / 2 - 2, sl.y - sl.size / 2 - 2, sl.size + 4, sl.size + 4);
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }, [currentSourceImage, rotation, flipH, flipV, adjustments, activeFilter, resizeWidth, resizeHeight, textLayers, activeTextId, stickerLayers, activeStickerIndex, ensureDrawingLayer]);

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
      const initialState: EditorState = {
        adjustments: { brightness: 100, contrast: 100, saturation: 100, blur: 0, hue: 0, temperature: 0, vignette: 0, sharpen: 0 },
        activeFilter: "none",
        rotation: 0,
        flipH: false,
        flipV: false,
        textLayers: [],
        stickerLayers: [],
      };
      setHistory([initialState]);
      setHistoryIndex(0);
      historyIndexRef.current = 0;
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

  const pushHistory = useCallback(() => {
    const state: EditorState = {
      adjustments: { ...adjustments },
      activeFilter,
      rotation,
      flipH,
      flipV,
      textLayers: textLayers.map((tl) => ({ ...tl })),
      stickerLayers: stickerLayers.map((sl) => ({ ...sl })),
    };
    const idx = historyIndexRef.current;
    setHistory((prev) => {
      const truncated = prev.slice(0, idx + 1);
      return [...truncated, state];
    });
    historyIndexRef.current = idx + 1;
    setHistoryIndex(idx + 1);
  }, [adjustments, activeFilter, rotation, flipH, flipV, textLayers, stickerLayers]);

  const restoreImageState = useCallback((s: EditorState) => {
    setAdjustments({ ...s.adjustments });
    setActiveFilter(s.activeFilter);
    setRotation(s.rotation);
    setFlipH(s.flipH);
    setFlipV(s.flipV);
    setTextLayers(s.textLayers.map((tl) => ({ ...tl })));
    setStickerLayers(s.stickerLayers.map((sl) => ({ ...sl })));
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    const newIdx = historyIndexRef.current - 1;
    const prevState = history[newIdx];
    if (!prevState) return;
    restoreImageState(prevState);
    historyIndexRef.current = newIdx;
    setHistoryIndex(newIdx);
  }, [history, restoreImageState]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= history.length - 1) return;
    const newIdx = historyIndexRef.current + 1;
    const nextState = history[newIdx];
    if (!nextState) return;
    restoreImageState(nextState);
    historyIndexRef.current = newIdx;
    setHistoryIndex(newIdx);
  }, [history, restoreImageState]);

  const applyStylePreset = useCallback((preset: StylePreset) => {
    pushHistory();
    const startAdj = { ...adjustments };
    const target = preset.adjustments;
    setActiveFilter(preset.filter);
    const duration = 500;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setAdjustments({
        brightness: Math.round(startAdj.brightness + (target.brightness - startAdj.brightness) * ease),
        contrast: Math.round(startAdj.contrast + (target.contrast - startAdj.contrast) * ease),
        saturation: Math.round(startAdj.saturation + (target.saturation - startAdj.saturation) * ease),
        blur: +(startAdj.blur + (target.blur - startAdj.blur) * ease).toFixed(1),
        hue: Math.round(startAdj.hue + (target.hue - startAdj.hue) * ease),
        temperature: Math.round(startAdj.temperature + (target.temperature - startAdj.temperature) * ease),
        vignette: Math.round(startAdj.vignette + (target.vignette - startAdj.vignette) * ease),
        sharpen: Math.round(startAdj.sharpen + (target.sharpen - startAdj.sharpen) * ease),
      });
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    setActiveTool("adjustments");
    toast({ title: `${preset.name} preset applied` });
  }, [adjustments, pushHistory, toast]);

  const handleRotateCW = () => { pushHistory(); setRotation((r) => (r + 90) % 360); };
  const handleRotateCCW = () => { pushHistory(); setRotation((r) => (r + 270) % 360); };
  const handleFlipH = () => { pushHistory(); setFlipH((f) => !f); };
  const handleFlipV = () => { pushHistory(); setFlipV((f) => !f); };

  const handleReset = () => {
    pushHistory();
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setActiveFilter("none");
    setCroppedImage(null);
    setCropRect(null);
    setIsCropping(false);
    setTextLayers([]);
    setActiveTextId(null);
    setStickerLayers([]);
    setActiveStickerIndex(null);
    if (drawingLayerRef.current) {
      const dlCtx = drawingLayerRef.current.getContext("2d");
      if (dlCtx) dlCtx.clearRect(0, 0, drawingLayerRef.current.width, drawingLayerRef.current.height);
    }
    if (originalImageRef.current) {
      setResizeWidth(originalImageRef.current.naturalWidth);
      setResizeHeight(originalImageRef.current.naturalHeight);
      setOriginalAspect(originalImageRef.current.naturalWidth / originalImageRef.current.naturalHeight);
    }
  };

  const drawOriginal = useCallback(() => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    canvas.width = imgW;
    canvas.height = imgH;
    ctx.clearRect(0, 0, imgW, imgH);
    ctx.filter = "none";
    ctx.drawImage(img, 0, 0, imgW, imgH);
  }, []);

  useEffect(() => {
    if (!imageLoaded) return;
    if (showOriginal) {
      drawOriginal();
    } else {
      drawCanvas();
    }
  }, [showOriginal, imageLoaded, drawOriginal, drawCanvas]);

  const handleAiEnhance = async () => {
    if (!mediaItem) return;
    pushHistory();
    setIsAiEnhancing(true);
    setAiExplanation(null);
    try {
      const imageUrl = `/objects/${mediaItem.url}`;
      const resp = await fetch("/api/ai/enhance-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (!resp.ok) throw new Error("Failed to get AI suggestions");
      const data = await resp.json();
      const target: Adjustments = {
        brightness: 100 + (data.brightness || 0),
        contrast: 100 + (data.contrast || 0),
        saturation: 100 + (data.saturation || 0),
        blur: 0,
        hue: data.hue || 0,
        temperature: data.temperature || 0,
        vignette: data.vignette || 0,
        sharpen: data.sharpen || 0,
      };
      const startAdj = { ...adjustments };
      const duration = 500;
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        setAdjustments({
          brightness: Math.round(startAdj.brightness + (target.brightness - startAdj.brightness) * ease),
          contrast: Math.round(startAdj.contrast + (target.contrast - startAdj.contrast) * ease),
          saturation: Math.round(startAdj.saturation + (target.saturation - startAdj.saturation) * ease),
          blur: +(startAdj.blur + (target.blur - startAdj.blur) * ease).toFixed(1),
          hue: Math.round(startAdj.hue + (target.hue - startAdj.hue) * ease),
          temperature: Math.round(startAdj.temperature + (target.temperature - startAdj.temperature) * ease),
          vignette: Math.round(startAdj.vignette + (target.vignette - startAdj.vignette) * ease),
          sharpen: Math.round(startAdj.sharpen + (target.sharpen - startAdj.sharpen) * ease),
        });
        if (t < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
      setAiExplanation(data.explanation || null);
      setActiveTool("adjustments");
      toast({ title: "AI Enhancement Applied", description: data.explanation || "Settings optimized by AI" });
    } catch (err) {
      toast({ title: "AI Enhance Failed", description: "Could not analyze the image right now.", variant: "destructive" });
    } finally {
      setIsAiEnhancing(false);
    }
  };

  const handleVoiceCommand = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Not Supported", description: "Voice commands require Chrome or Edge browser.", variant: "destructive" });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast({ title: "Voice Error", description: "Could not hear you. Please try again.", variant: "destructive" });
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
      setIsListening(false);

      try {
        const resp = await fetch("/api/ai/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: transcript }),
        });
        if (!resp.ok) throw new Error("Failed to parse command");
        const data = await resp.json();

        if (data.actions && data.actions.length > 0) {
          pushHistory();
          for (const action of data.actions) {
            switch (action.type) {
              case "brightness":
                setAdjustments(a => ({ ...a, brightness: action.params.value }));
                setActiveTool("adjustments");
                break;
              case "contrast":
                setAdjustments(a => ({ ...a, contrast: action.params.value }));
                setActiveTool("adjustments");
                break;
              case "saturation":
                setAdjustments(a => ({ ...a, saturation: action.params.value }));
                setActiveTool("adjustments");
                break;
              case "blur":
                setAdjustments(a => ({ ...a, blur: action.params.value }));
                setActiveTool("adjustments");
                break;
              case "hue":
                setAdjustments(a => ({ ...a, hue: action.params.value }));
                setActiveTool("adjustments");
                break;
              case "temperature":
                setAdjustments(a => ({ ...a, temperature: action.params.value }));
                setActiveTool("adjustments");
                break;
              case "vignette":
                setAdjustments(a => ({ ...a, vignette: action.params.value }));
                setActiveTool("adjustments");
                break;
              case "sharpen":
                setAdjustments(a => ({ ...a, sharpen: action.params.value }));
                setActiveTool("adjustments");
                break;
              case "rotate_left":
                handleRotateCCW();
                break;
              case "rotate_right":
                handleRotateCW();
                break;
              case "flip_horizontal":
                handleFlipH();
                break;
              case "flip_vertical":
                handleFlipV();
                break;
              case "reset":
                setAdjustments({ ...DEFAULT_ADJUSTMENTS });
                setRotation(0);
                setFlipH(false);
                setFlipV(false);
                setActiveFilter("none");
                break;
            }
          }
          toast({ title: "Voice Command Applied", description: data.explanation || `Applied ${data.actions.length} change(s)` });
        }
        setTimeout(() => setVoiceTranscript(null), 3000);
      } catch (err) {
        toast({ title: "Command Failed", description: "Could not process that command.", variant: "destructive" });
      }
    };

    recognition.start();
  }, [isListening, pushHistory, toast, handleRotateCCW, handleRotateCW, handleFlipH, handleFlipV]);

  const handleRemoveBackground = async () => {
    if (!mediaItem || !canvasRef.current || !originalImageRef.current) return;
    pushHistory();
    setIsRemovingBg(true);
    try {
      const imageUrl = `/objects/${mediaItem.url}`;
      const resp = await fetch("/api/ai/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (!resp.ok) throw new Error("Failed to analyze image");
      const data = await resp.json();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = originalImageRef.current;
      const { subject } = data;
      const sx = subject.x * img.naturalWidth;
      const sy = subject.y * img.naturalHeight;
      const sw = subject.width * img.naturalWidth;
      const sh = subject.height * img.naturalHeight;

      const margin = 0.05;
      const mx = margin * img.naturalWidth;
      const my = margin * img.naturalHeight;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const checkSize = 8;
      for (let y = 0; y < canvas.height; y += checkSize) {
        for (let x = 0; x < canvas.width; x += checkSize) {
          ctx.fillStyle = ((x / checkSize + y / checkSize) % 2 === 0) ? "#cccccc" : "#ffffff";
          ctx.fillRect(x, y, checkSize, checkSize);
        }
      }

      ctx.save();
      ctx.beginPath();
      const rx = Math.max(0, sx - mx);
      const ry = Math.max(0, sy - my);
      const rw = Math.min(img.naturalWidth - rx, sw + mx * 2);
      const rh = Math.min(img.naturalHeight - ry, sh + my * 2);
      const radius = Math.min(rw, rh) * 0.02;
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + rw - radius, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
      ctx.lineTo(rx + rw, ry + rh - radius);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
      ctx.lineTo(rx + radius, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
      ctx.lineTo(rx, ry + radius);
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      toast({ title: "Background Removed", description: data.description || "Subject extracted from background." });
    } catch (err) {
      toast({ title: "Background Removal Failed", description: "Could not process the image right now.", variant: "destructive" });
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleSmartErase = async () => {
    if (!mediaItem || !canvasRef.current) return;
    if (!cropRect) {
      toast({ title: "Select Area First", description: "Use the Crop tool to select the area you want to erase, then use Smart Erase.", variant: "destructive" });
      return;
    }
    pushHistory();
    setIsSmartErasing(true);
    try {
      const canvas = canvasRef.current;
      const eraseRect = { ...cropRect };
      const imageUrl = `/objects/${mediaItem.url}`;
      const region = {
        x: eraseRect.x / canvas.width,
        y: eraseRect.y / canvas.height,
        width: eraseRect.width / canvas.width,
        height: eraseRect.height / canvas.height,
      };

      const resp = await fetch("/api/ai/smart-erase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, region }),
      });
      if (!resp.ok) throw new Error("Failed to analyze region");
      const data = await resp.json();

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.fillStyle = data.fillColor || "#808080";
      ctx.fillRect(eraseRect.x, eraseRect.y, eraseRect.width, eraseRect.height);

      const edgeBlur = Math.min(eraseRect.width, eraseRect.height) * 0.1;
      const gradient = ctx.createRadialGradient(
        eraseRect.x + eraseRect.width / 2,
        eraseRect.y + eraseRect.height / 2,
        Math.min(eraseRect.width, eraseRect.height) / 2 - edgeBlur,
        eraseRect.x + eraseRect.width / 2,
        eraseRect.y + eraseRect.height / 2,
        Math.min(eraseRect.width, eraseRect.height) / 2
      );
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(1, data.fillColor || "#808080");
      ctx.fillStyle = gradient;
      ctx.fillRect(eraseRect.x - edgeBlur, eraseRect.y - edgeBlur, eraseRect.width + edgeBlur * 2, eraseRect.height + edgeBlur * 2);
      ctx.restore();

      setCropRect(null);
      setIsCropping(false);

      toast({ title: "Smart Erase Applied", description: data.description || "Area filled with surrounding content." });
    } catch (err) {
      toast({ title: "Smart Erase Failed", description: "Could not process the selected area.", variant: "destructive" });
    } finally {
      setIsSmartErasing(false);
    }
  };

  const handleMagicFill = async (targetRatio: string) => {
    if (!mediaItem || !canvasRef.current || !originalImageRef.current) return;
    pushHistory();
    setIsMagicFilling(true);
    setMagicFillRatio(targetRatio);
    try {
      const img = originalImageRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const [tw, th] = targetRatio.split(":").map(Number);
      const targetAspect = tw / th;
      const currentAspect = img.naturalWidth / img.naturalHeight;

      let newWidth = img.naturalWidth;
      let newHeight = img.naturalHeight;

      if (targetAspect > currentAspect) {
        newWidth = Math.round(img.naturalHeight * targetAspect);
      } else {
        newHeight = Math.round(img.naturalWidth / targetAspect);
      }

      const imageUrl = `/objects/${mediaItem.url}`;
      const resp = await fetch("/api/ai/style-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      let fillColor = "#1a1a2e";
      let secondaryColor = "#16213e";
      if (resp.ok) {
        const data = await resp.json();
        if (data.style?.colorPalette?.length > 0) {
          fillColor = data.style.colorPalette[0];
          secondaryColor = data.style.colorPalette.length > 1 ? data.style.colorPalette[1] : fillColor;
        }
      }

      canvas.width = newWidth;
      canvas.height = newHeight;

      const gradient = ctx.createLinearGradient(0, 0, newWidth, newHeight);
      gradient.addColorStop(0, fillColor);
      gradient.addColorStop(0.5, secondaryColor);
      gradient.addColorStop(1, fillColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, newWidth, newHeight);

      const offsetX = Math.round((newWidth - img.naturalWidth) / 2);
      const offsetY = Math.round((newHeight - img.naturalHeight) / 2);

      const edgeSize = 30;

      if (offsetX > 0) {
        const lg = ctx.createLinearGradient(offsetX, 0, offsetX + edgeSize, 0);
        lg.addColorStop(0, "transparent");
        lg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.drawImage(img, 0, 0, edgeSize, img.naturalHeight, offsetX - edgeSize, offsetY, edgeSize, img.naturalHeight);
        ctx.drawImage(img, img.naturalWidth - edgeSize, 0, edgeSize, img.naturalHeight, offsetX + img.naturalWidth, offsetY, edgeSize, img.naturalHeight);
        ctx.globalAlpha = 0.15;
        ctx.drawImage(img, 0, 0, edgeSize, img.naturalHeight, offsetX - edgeSize * 2, offsetY, edgeSize, img.naturalHeight);
        ctx.drawImage(img, img.naturalWidth - edgeSize, 0, edgeSize, img.naturalHeight, offsetX + img.naturalWidth + edgeSize, offsetY, edgeSize, img.naturalHeight);
        ctx.restore();
      }

      if (offsetY > 0) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.drawImage(img, 0, 0, img.naturalWidth, edgeSize, offsetX, offsetY - edgeSize, img.naturalWidth, edgeSize);
        ctx.drawImage(img, 0, img.naturalHeight - edgeSize, img.naturalWidth, edgeSize, offsetX, offsetY + img.naturalHeight, img.naturalWidth, edgeSize);
        ctx.globalAlpha = 0.15;
        ctx.drawImage(img, 0, 0, img.naturalWidth, edgeSize, offsetX, offsetY - edgeSize * 2, img.naturalWidth, edgeSize);
        ctx.drawImage(img, 0, img.naturalHeight - edgeSize, img.naturalWidth, edgeSize, offsetX, offsetY + img.naturalHeight + edgeSize, img.naturalWidth, edgeSize);
        ctx.restore();
      }

      ctx.drawImage(img, offsetX, offsetY);

      toast({ title: "Magic Fill Applied", description: `Extended to ${targetRatio} with AI-matched colors from your image.` });
    } catch (err) {
      toast({ title: "Magic Fill Failed", description: "Could not extend the image.", variant: "destructive" });
    } finally {
      setIsMagicFilling(false);
      setMagicFillRatio(null);
    }
  };

  const getCanvasPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    return getCanvasPos(e.clientX, e.clientY);
  };

  const getCanvasTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0] || e.changedTouches[0];
    return getCanvasPos(touch.clientX, touch.clientY);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);

    if (activeTool === "crop" && isCropping) {
      setCropStart(pos);
      setCropRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }

    if (activeTool === "text") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      for (let i = textLayers.length - 1; i >= 0; i--) {
        const tl = textLayers[i];
        ctx.font = `${tl.bold ? "bold " : ""}${tl.fontSize}px "${tl.fontFamily}"`;
        const metrics = ctx.measureText(tl.text);
        if (
          pos.x >= tl.x &&
          pos.x <= tl.x + metrics.width &&
          pos.y >= tl.y &&
          pos.y <= tl.y + tl.fontSize
        ) {
          setActiveTextId(tl.id);
          setIsDraggingText(true);
          setTextDragOffset({ x: pos.x - tl.x, y: pos.y - tl.y });
          return;
        }
      }
      setActiveTextId(null);
      return;
    }

    if (activeTool === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      ensureDrawingLayer(canvas.width, canvas.height);
      const dl = drawingLayerRef.current;
      if (!dl) return;
      const dlCtx = dl.getContext("2d");
      if (!dlCtx) return;
      setIsDrawing(true);
      dlCtx.lineCap = "round";
      dlCtx.lineJoin = "round";
      dlCtx.lineWidth = brushSize;
      if (isEraser) {
        dlCtx.globalCompositeOperation = "destination-out";
        dlCtx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        dlCtx.globalCompositeOperation = "source-over";
        dlCtx.strokeStyle = brushColor;
      }
      dlCtx.beginPath();
      dlCtx.moveTo(pos.x, pos.y);
      return;
    }

    if (activeTool === "stickers") {
      for (let i = stickerLayers.length - 1; i >= 0; i--) {
        const sl = stickerLayers[i];
        const half = sl.size / 2;
        if (
          pos.x >= sl.x - half &&
          pos.x <= sl.x + half &&
          pos.y >= sl.y - half &&
          pos.y <= sl.y + half
        ) {
          setActiveStickerIndex(i);
          setIsDraggingSticker(true);
          setStickerDragOffset({ x: pos.x - sl.x, y: pos.y - sl.y });
          return;
        }
      }
      setActiveStickerIndex(null);
      return;
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);

    if (activeTool === "crop" && isCropping && cropStart) {
      const x = Math.min(cropStart.x, pos.x);
      const y = Math.min(cropStart.y, pos.y);
      const width = Math.abs(pos.x - cropStart.x);
      const height = Math.abs(pos.y - cropStart.y);
      setCropRect({ x, y, width, height });
      return;
    }

    if (activeTool === "text" && isDraggingText && activeTextId) {
      setTextLayers((prev) =>
        prev.map((tl) =>
          tl.id === activeTextId
            ? { ...tl, x: pos.x - textDragOffset.x, y: pos.y - textDragOffset.y }
            : tl
        )
      );
      return;
    }

    if (activeTool === "draw" && isDrawing) {
      const dl = drawingLayerRef.current;
      if (!dl) return;
      const dlCtx = dl.getContext("2d");
      if (!dlCtx) return;
      dlCtx.lineTo(pos.x, pos.y);
      dlCtx.stroke();
      drawCanvas();
      return;
    }

    if (activeTool === "stickers" && isDraggingSticker && activeStickerIndex !== null) {
      setStickerLayers((prev) =>
        prev.map((sl, i) =>
          i === activeStickerIndex
            ? { ...sl, x: pos.x - stickerDragOffset.x, y: pos.y - stickerDragOffset.y }
            : sl
        )
      );
      return;
    }
  };

  const handleCanvasMouseUp = () => {
    if (activeTool === "crop") {
      setCropStart(null);
    }
    if (isDraggingText) {
      setIsDraggingText(false);
    }
    if (isDrawing) {
      setIsDrawing(false);
      const dl = drawingLayerRef.current;
      if (dl) {
        const dlCtx = dl.getContext("2d");
        if (dlCtx) {
          dlCtx.globalCompositeOperation = "source-over";
        }
      }
    }
    if (isDraggingSticker) {
      setIsDraggingSticker(false);
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTool === "draw" || activeTool === "crop" || activeTool === "text" || activeTool === "stickers") {
      e.preventDefault();
    }
    const pos = getCanvasTouchPos(e);

    if (activeTool === "crop" && isCropping) {
      setCropStart(pos);
      setCropRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }

    if (activeTool === "text") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      for (let i = textLayers.length - 1; i >= 0; i--) {
        const tl = textLayers[i];
        ctx.font = `${tl.bold ? "bold " : ""}${tl.fontSize}px "${tl.fontFamily}"`;
        const metrics = ctx.measureText(tl.text);
        if (pos.x >= tl.x && pos.x <= tl.x + metrics.width && pos.y >= tl.y && pos.y <= tl.y + tl.fontSize) {
          setActiveTextId(tl.id);
          setIsDraggingText(true);
          setTextDragOffset({ x: pos.x - tl.x, y: pos.y - tl.y });
          return;
        }
      }
      setActiveTextId(null);
      return;
    }

    if (activeTool === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      ensureDrawingLayer(canvas.width, canvas.height);
      const dl = drawingLayerRef.current;
      if (!dl) return;
      const dlCtx = dl.getContext("2d");
      if (!dlCtx) return;
      setIsDrawing(true);
      dlCtx.lineCap = "round";
      dlCtx.lineJoin = "round";
      dlCtx.lineWidth = brushSize;
      if (isEraser) {
        dlCtx.globalCompositeOperation = "destination-out";
        dlCtx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        dlCtx.globalCompositeOperation = "source-over";
        dlCtx.strokeStyle = brushColor;
      }
      dlCtx.beginPath();
      dlCtx.moveTo(pos.x, pos.y);
      return;
    }

    if (activeTool === "stickers") {
      for (let i = stickerLayers.length - 1; i >= 0; i--) {
        const sl = stickerLayers[i];
        const half = sl.size / 2;
        if (pos.x >= sl.x - half && pos.x <= sl.x + half && pos.y >= sl.y - half && pos.y <= sl.y + half) {
          setActiveStickerIndex(i);
          setIsDraggingSticker(true);
          setStickerDragOffset({ x: pos.x - sl.x, y: pos.y - sl.y });
          return;
        }
      }
      setActiveStickerIndex(null);
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTool === "draw" || activeTool === "crop" || activeTool === "text" || activeTool === "stickers") {
      e.preventDefault();
    }
    const pos = getCanvasTouchPos(e);

    if (activeTool === "crop" && isCropping && cropStart) {
      const x = Math.min(cropStart.x, pos.x);
      const y = Math.min(cropStart.y, pos.y);
      const width = Math.abs(pos.x - cropStart.x);
      const height = Math.abs(pos.y - cropStart.y);
      setCropRect({ x, y, width, height });
      return;
    }

    if (activeTool === "text" && isDraggingText && activeTextId) {
      setTextLayers((prev) =>
        prev.map((tl) =>
          tl.id === activeTextId
            ? { ...tl, x: pos.x - textDragOffset.x, y: pos.y - textDragOffset.y }
            : tl
        )
      );
      return;
    }

    if (activeTool === "draw" && isDrawing) {
      const dl = drawingLayerRef.current;
      if (!dl) return;
      const dlCtx = dl.getContext("2d");
      if (!dlCtx) return;
      dlCtx.lineTo(pos.x, pos.y);
      dlCtx.stroke();
      drawCanvas();
      return;
    }

    if (activeTool === "stickers" && isDraggingSticker && activeStickerIndex !== null) {
      setStickerLayers((prev) =>
        prev.map((sl, i) =>
          i === activeStickerIndex
            ? { ...sl, x: pos.x - stickerDragOffset.x, y: pos.y - stickerDragOffset.y }
            : sl
        )
      );
    }
  };

  const handleCanvasTouchEnd = () => {
    handleCanvasMouseUp();
  };

  const addTextLayer = () => {
    if (!newTextInput.trim()) return;
    pushHistory();
    const canvas = canvasRef.current;
    const centerX = canvas ? canvas.width / 2 - 50 : 100;
    const centerY = canvas ? canvas.height / 2 : 100;
    const layer: TextLayer = {
      id: `text_${Date.now()}`,
      text: newTextInput.trim(),
      x: centerX,
      y: centerY,
      fontFamily: textFontFamily,
      fontSize: textFontSize,
      color: textColor,
      bold: textBold,
    };
    setTextLayers((prev) => [...prev, layer]);
    setActiveTextId(layer.id);
    setNewTextInput("");
  };

  const removeTextLayer = (id: string) => {
    pushHistory();
    setTextLayers((prev) => prev.filter((tl) => tl.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  const addSticker = (type: string) => {
    pushHistory();
    const canvas = canvasRef.current;
    const centerX = canvas ? canvas.width / 2 : 100;
    const centerY = canvas ? canvas.height / 2 : 100;
    const layer: StickerLayer = {
      id: `sticker_${Date.now()}`,
      type,
      x: centerX,
      y: centerY,
      size: stickerSize,
      rotation: 0,
      color: stickerColor,
    };
    setStickerLayers((prev) => [...prev, layer]);
    setActiveStickerIndex(stickerLayers.length);
  };

  const removeSticker = (index: number) => {
    pushHistory();
    setStickerLayers((prev) => prev.filter((_, i) => i !== index));
    if (activeStickerIndex === index) setActiveStickerIndex(null);
    else if (activeStickerIndex !== null && activeStickerIndex > index) {
      setActiveStickerIndex(activeStickerIndex - 1);
    }
  };

  const clearDrawing = () => {
    if (drawingLayerRef.current) {
      const dlCtx = drawingLayerRef.current.getContext("2d");
      if (dlCtx) dlCtx.clearRect(0, 0, drawingLayerRef.current.width, drawingLayerRef.current.height);
    }
    drawCanvas();
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
      drawCanvas();
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

      soundFeedback("success");
      toast({ title: "Image saved successfully" });
      navigate("/dashboard");
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

  const getCanvasCursor = () => {
    if (isCropping) return "crosshair";
    if (activeTool === "draw") return "crosshair";
    if (activeTool === "text") return "text";
    if (activeTool === "stickers") return "pointer";
    return "default";
  };

  const essentialTools: { id: EditorTool; icon: typeof Crop; label: string }[] = [
    { id: "crop", icon: Crop, label: "Crop" },
    { id: "rotate", icon: RotateCw, label: "Rotate" },
    { id: "filters", icon: Palette, label: "Filters" },
    { id: "adjustments", icon: SlidersHorizontal, label: "Adjust" },
  ];

  const advancedTools: { id: EditorTool; icon: typeof Crop; label: string }[] = [
    { id: "resize", icon: Maximize, label: "Resize" },
    { id: "text", icon: Type, label: "Text" },
    { id: "draw", icon: Pencil, label: "Draw" },
    { id: "stickers", icon: Sparkles, label: "Stickers" },
  ];

  const soundFeedback = useSoundFeedback();

  const editorShortcuts: ShortcutAction[] = useMemo(() => [
    { key: "z", ctrl: true, label: "Undo", category: "History", action: handleUndo },
    { key: "y", ctrl: true, label: "Redo", category: "History", action: handleRedo },
    { key: "z", ctrl: true, shift: true, label: "Redo", category: "History", action: handleRedo },
    { key: "s", ctrl: true, label: "Save as New", category: "File", action: () => { soundFeedback("save"); handleSave(); } },
    { key: "r", ctrl: true, label: "Reset All", category: "Edit", action: handleReset },
    { key: "b", label: "Before / After", category: "View", action: () => setShowOriginal(prev => !prev) },
  ], [handleUndo, handleRedo, handleSave, handleReset, soundFeedback]);

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
    <div className="flex flex-col h-screen bg-background overflow-hidden" data-testid="image-editor">
      <ShortcutHelp open={showHelp} onClose={() => setShowHelp(false)} shortcuts={editorShortcuts} title="Image Editor Shortcuts" />
      <div className="flex items-center justify-between gap-2 sm:gap-3 px-2 sm:px-4 py-2 border-b glass-morphism z-50" data-testid="editor-topbar">
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
          <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-[200px]" data-testid="text-image-name">
            {mediaItem?.title || "Image Editor"}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
            <TooltipContent>Reset to Original</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onMouseLeave={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
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
                variant={isListening ? "default" : "ghost"}
                onClick={handleVoiceCommand}
                className={isListening ? "animate-pulse bg-red-500 hover:bg-red-600" : ""}
                data-testid="button-voice-command"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isListening ? "Stop listening" : "Voice command"}</TooltipContent>
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
            onClick={handleSave}
            disabled={saving || isUploading || !imageLoaded}
            data-testid="button-save"
          >
            {saving || isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin sm:mr-2" />
            ) : (
              <Save className="w-4 h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Save as New</span>
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
        <div className="flex sm:flex-col gap-1 p-2 border-b sm:border-b-0 sm:border-r glass-morphism z-40 overflow-x-auto sm:overflow-x-visible sm:w-[88px]" data-testid="editor-toolbar">
          {essentialTools.map((tool) => {
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
                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-md text-xs transition-colors min-w-[68px] sm:min-w-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover-elevate"
                }`}
                data-testid={`button-tool-${tool.id}`}
              >
                <Icon className="w-5 h-5 sm:w-5 sm:h-5" />
                <span className="leading-none text-[11px]">{tool.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-md text-xs transition-colors min-w-[68px] sm:min-w-0 ${
              showAdvanced || advancedTools.some(t => t.id === activeTool)
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
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(isActive ? null : tool.id);
                  setIsCropping(false);
                  setCropRect(null);
                }}
                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-md text-xs transition-colors min-w-[68px] sm:min-w-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover-elevate"
                }`}
                data-testid={`button-tool-${tool.id}`}
              >
                <Icon className="w-5 h-5 sm:w-5 sm:h-5" />
                <span className="leading-none text-[11px]">{tool.label}</span>
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
                  style={{ maxWidth: "100%", maxHeight: "calc(100vh - 200px)", objectFit: "contain", cursor: getCanvasCursor() }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                  data-testid="editor-canvas"
                />
                {voiceTranscript && (
                  <div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-morphism px-4 py-2 rounded-full text-sm text-white/80 z-50 animate-in fade-in slide-in-from-bottom-2"
                    data-testid="text-voice-transcript"
                  >
                    "{voiceTranscript}"
                  </div>
                )}
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
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold" data-testid="text-panel-title">Crop Your Photo</h3>
                  <InfoBubble text="Crop removes unwanted areas from the edges of your photo. Click and drag to select what to keep, then hit Apply. Great for reframing shots or removing distractions." />
                </div>
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
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold" data-testid="text-panel-title">Rotate & Flip</h3>
                  <InfoBubble text="Rotate turns your image 90 degrees left or right. Mirror flips it horizontally (like a reflection), and Flip turns it upside down." />
                </div>
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
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold" data-testid="text-panel-title">Resize</h3>
                  <InfoBubble text="Changes your photo's pixel dimensions. Lock the aspect ratio to prevent stretching. Smaller sizes reduce file size; larger sizes may reduce quality." />
                </div>
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
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold" data-testid="text-panel-title">Filters</h3>
                  <InfoBubble text="One-tap photo filters that transform the overall mood. Tap a preview thumbnail to apply. Use with Adjustments for fine-tuning." />
                </div>
                <p className="text-xs text-muted-foreground">Tap a style to instantly change the look of your photo.</p>
                <div className="grid grid-cols-2 gap-2">
                  {FILTER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => { pushHistory(); setActiveFilter(preset.id); }}
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
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold" data-testid="text-panel-title">Adjustments</h3>
                  <InfoBubble text="Fine-tune your photo's look with precise controls for brightness, color, and more. Use AI Auto-Enhance for instant optimization, or adjust each slider manually." />
                </div>
                <p className="text-xs text-muted-foreground">Fine-tune how your photo looks. Drag any slider to see changes instantly.</p>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Wand2 className="w-3 h-3" />
                    Style Presets
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {STYLE_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        size="sm"
                        variant="outline"
                        onClick={() => applyStylePreset(preset)}
                        data-testid={`button-style-preset-${preset.id}`}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleAiEnhance}
                  disabled={isAiEnhancing || !imageLoaded}
                  className="w-full gap-2 border-primary/30 text-primary"
                  data-testid="button-ai-enhance"
                >
                  {isAiEnhancing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isAiEnhancing ? "Analyzing..." : "AI Auto-Enhance"}
                </Button>
                {aiExplanation && (
                  <p className="text-xs text-muted-foreground italic" data-testid="text-ai-explanation">{aiExplanation}</p>
                )}
                <Button
                  variant="outline"
                  onClick={handleRemoveBackground}
                  disabled={isRemovingBg || !imageLoaded}
                  className="w-full gap-2 border-purple-500/30 text-purple-400"
                  data-testid="button-ai-remove-bg"
                >
                  {isRemovingBg ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageOff className="w-4 h-4" />
                  )}
                  {isRemovingBg ? "Removing..." : "AI Remove Background"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSmartErase}
                  disabled={isSmartErasing || !imageLoaded}
                  className="w-full gap-2 border-cyan-500/30 text-cyan-400"
                  data-testid="button-ai-smart-erase"
                >
                  {isSmartErasing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Scissors className="w-4 h-4" />
                  )}
                  {isSmartErasing ? "Erasing..." : "AI Smart Erase"}
                </Button>
                <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
                  Smart Erase: Select an area with the Crop tool first, then tap Smart Erase to fill it in.
                </p>
                <div className="border-t border-white/5 pt-3 mt-1">
                  <div className="flex items-center gap-1 mb-2">
                    <label className="text-xs text-muted-foreground font-medium">Magic Aspect Ratio Fill</label>
                    <InfoBubble text="Extend your image to a new aspect ratio. AI analyzes your photo's colors and fills the new space with matching gradients. The original image stays centered and untouched." />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "16:9", desc: "Landscape" },
                      { label: "9:16", desc: "Portrait" },
                      { label: "1:1", desc: "Square" },
                      { label: "4:3", desc: "Standard" },
                      { label: "3:2", desc: "Photo" },
                      { label: "21:9", desc: "Ultra Wide" },
                    ].map((ratio) => (
                      <Button
                        key={ratio.label}
                        size="sm"
                        variant="outline"
                        onClick={() => handleMagicFill(ratio.label)}
                        disabled={isMagicFilling || !imageLoaded}
                        className="flex flex-col h-auto py-1.5 text-[10px] gap-0.5"
                        data-testid={`button-magic-fill-${ratio.label.replace(":", "x")}`}
                      >
                        {isMagicFilling && magicFillRatio === ratio.label ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <span className="font-medium">{ratio.label}</span>
                            <span className="text-muted-foreground/60">{ratio.desc}</span>
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">Brightness</label>
                      <InfoBubble text="Makes the entire image lighter or darker. Increase to brighten underexposed photos, decrease for a moodier look." />
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid="text-brightness-value">{adjustments.brightness}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={200}
                    step={1}
                    value={[adjustments.brightness]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, brightness: v }))}
                    onValueCommit={() => pushHistory()}
                    data-testid="slider-brightness"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">Contrast</label>
                      <InfoBubble text="Controls the difference between light and dark areas. Higher contrast makes colors pop, lower gives a flat, filmic look." />
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid="text-contrast-value">{adjustments.contrast}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={200}
                    step={1}
                    value={[adjustments.contrast]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, contrast: v }))}
                    onValueCommit={() => pushHistory()}
                    data-testid="slider-contrast"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">Saturation</label>
                      <InfoBubble text="Controls color intensity. Turn it up for vivid, punchy colors or turn it down for a desaturated or black-and-white look." />
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid="text-saturation-value">{adjustments.saturation}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={200}
                    step={1}
                    value={[adjustments.saturation]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, saturation: v }))}
                    onValueCommit={() => pushHistory()}
                    data-testid="slider-saturation"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">Blur</label>
                      <InfoBubble text="Softens the image by reducing sharpness. Use subtle blur for a dreamy effect or high blur for privacy/background effects." />
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid="text-blur-value">{adjustments.blur}px</span>
                  </div>
                  <Slider
                    min={0}
                    max={10}
                    step={0.1}
                    value={[adjustments.blur]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, blur: v }))}
                    onValueCommit={() => pushHistory()}
                    data-testid="slider-blur"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">Hue Shift</label>
                      <InfoBubble text="Rotates all colors around the color wheel. Use for creative color effects or to correct unwanted color casts in your photo." />
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid="text-hue-value">{adjustments.hue}°</span>
                  </div>
                  <Slider
                    min={-180}
                    max={180}
                    step={1}
                    value={[adjustments.hue]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, hue: v }))}
                    onValueCommit={() => pushHistory()}
                    data-testid="slider-hue"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">Temperature</label>
                      <InfoBubble text="Adjusts color warmth. Slide right for warm golden tones (like sunset), slide left for cool blue tones (like moonlight)." />
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid="text-temperature-value">
                      {adjustments.temperature > 0 ? `+${adjustments.temperature} warm` : adjustments.temperature < 0 ? `${adjustments.temperature} cool` : "neutral"}
                    </span>
                  </div>
                  <Slider
                    min={-100}
                    max={100}
                    step={1}
                    value={[adjustments.temperature]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, temperature: v }))}
                    onValueCommit={() => pushHistory()}
                    data-testid="slider-temperature"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">Vignette</label>
                      <InfoBubble text="Darkens the edges of the frame, drawing the viewer's eye to the center. Creates a cinematic, focused effect." />
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid="text-vignette-value">{adjustments.vignette}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[adjustments.vignette]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, vignette: v }))}
                    onValueCommit={() => pushHistory()}
                    data-testid="slider-vignette"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground">Sharpen</label>
                      <InfoBubble text="Enhances edge detail to make the image crisper. Great for slightly soft photos, but too much can add noise or artifacts." />
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid="text-sharpen-value">{adjustments.sharpen}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[adjustments.sharpen]}
                    onValueChange={([v]) => setAdjustments((a) => ({ ...a, sharpen: v }))}
                    onValueCommit={() => pushHistory()}
                    data-testid="slider-sharpen"
                  />
                </div>
              </div>
            )}

            {activeTool === "text" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold" data-testid="text-panel-title">Text Overlay</h3>
                  <InfoBubble text="Add text captions, titles, or watermarks to your photo. Type your message, style it, then drag to position. Great for social media or branding." />
                </div>
                <div className="rounded-md bg-primary/5 border border-primary/10 p-2.5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Add text to your photo. Type your message, pick a style, then drag it into position.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Text</label>
                    <Input
                      value={newTextInput}
                      onChange={(e) => setNewTextInput(e.target.value)}
                      placeholder="Enter your text..."
                      data-testid="input-text-content"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Font Family</label>
                    <select
                      value={textFontFamily}
                      onChange={(e) => setTextFontFamily(e.target.value)}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid="select-text-font"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">Font Size</label>
                      <Badge variant="secondary" className="text-xs" data-testid="text-font-size-value">{textFontSize}px</Badge>
                    </div>
                    <Slider
                      min={12}
                      max={120}
                      step={1}
                      value={[textFontSize]}
                      onValueChange={([v]) => setTextFontSize(v)}
                      data-testid="slider-text-font-size"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Color</label>
                    <Input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="h-9 cursor-pointer"
                      data-testid="input-text-color"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={textBold ? "default" : "ghost"}
                      onClick={() => setTextBold(!textBold)}
                      className="toggle-elevate"
                      data-testid="button-text-bold"
                    >
                      <Bold className="w-4 h-4 mr-1" />
                      Bold
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    onClick={addTextLayer}
                    disabled={!newTextInput.trim()}
                    data-testid="button-add-text"
                  >
                    Add Text
                  </Button>
                </div>
                {textLayers.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-xs text-muted-foreground font-medium">Text Layers</label>
                    {textLayers.map((tl) => (
                      <div
                        key={tl.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded-md text-xs cursor-pointer ${
                          activeTextId === tl.id ? "bg-primary/20 ring-1 ring-primary" : "hover-elevate"
                        }`}
                        onClick={() => setActiveTextId(tl.id)}
                        data-testid={`text-layer-${tl.id}`}
                      >
                        <span className="truncate flex-1">{tl.text}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTextLayer(tl.id);
                          }}
                          data-testid={`button-delete-text-${tl.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTool === "draw" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold" data-testid="text-panel-title">Draw</h3>
                  <InfoBubble text="Freehand drawing and annotation. Pick a brush color and thickness, then draw directly on your photo. Switch to eraser mode to fix mistakes." />
                </div>
                <div className="rounded-md bg-primary/5 border border-primary/10 p-2.5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Draw freely on your photo. Pick a color and brush size, then draw with your mouse.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Color</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BRUSH_PRESET_COLORS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => { setBrushColor(c.value); setIsEraser(false); }}
                          className={`w-full aspect-square rounded-md border-2 transition-colors ${
                            brushColor === c.value && !isEraser ? "border-primary" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                          data-testid={`button-brush-color-${c.name.toLowerCase()}`}
                        />
                      ))}
                    </div>
                    <Input
                      type="color"
                      value={brushColor}
                      onChange={(e) => { setBrushColor(e.target.value); setIsEraser(false); }}
                      className="h-9 cursor-pointer mt-1"
                      data-testid="input-brush-color-custom"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">Brush Size</label>
                      <Badge variant="secondary" className="text-xs" data-testid="text-brush-size-value">{brushSize}px</Badge>
                    </div>
                    <Slider
                      min={1}
                      max={20}
                      step={1}
                      value={[brushSize]}
                      onValueChange={([v]) => setBrushSize(v)}
                      data-testid="slider-brush-size"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={isEraser ? "default" : "ghost"}
                      onClick={() => setIsEraser(!isEraser)}
                      className="toggle-elevate"
                      data-testid="button-eraser-toggle"
                    >
                      <Eraser className="w-4 h-4 mr-1" />
                      Eraser
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearDrawing}
                      data-testid="button-clear-drawing"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTool === "stickers" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold" data-testid="text-panel-title">Stickers</h3>
                  <InfoBubble text="Add shapes and design elements to your photo. Click a shape to add it, then drag to position and resize. Great for annotations and callouts." />
                </div>
                <div className="rounded-md bg-primary/5 border border-primary/10 p-2.5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Add fun shapes to your photo. Pick a shape, then drag it where you want it.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Color</label>
                    <Input
                      type="color"
                      value={stickerColor}
                      onChange={(e) => setStickerColor(e.target.value)}
                      className="h-9 cursor-pointer"
                      data-testid="input-sticker-color"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">Size</label>
                      <Badge variant="secondary" className="text-xs" data-testid="text-sticker-size-value">{stickerSize}px</Badge>
                    </div>
                    <Slider
                      min={20}
                      max={200}
                      step={1}
                      value={[stickerSize]}
                      onValueChange={([v]) => setStickerSize(v)}
                      data-testid="slider-sticker-size"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Shapes</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {STICKER_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() => addSticker(type)}
                          className="aspect-square rounded-md hover-elevate flex items-center justify-center p-1"
                          title={type}
                          data-testid={`button-sticker-${type}`}
                        >
                          <canvas
                            ref={(el) => {
                              if (el) {
                                el.width = 32;
                                el.height = 32;
                                drawStickerPreview(el, type, stickerColor);
                              }
                            }}
                            width={32}
                            height={32}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {stickerLayers.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-xs text-muted-foreground font-medium">Placed Stickers</label>
                    {stickerLayers.map((sl, idx) => (
                      <div
                        key={sl.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded-md text-xs cursor-pointer ${
                          activeStickerIndex === idx ? "bg-primary/20 ring-1 ring-primary" : "hover-elevate"
                        }`}
                        onClick={() => setActiveStickerIndex(idx)}
                        data-testid={`sticker-layer-${idx}`}
                      >
                        <span className="truncate flex-1">{sl.type}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSticker(idx);
                          }}
                          data-testid={`button-delete-sticker-${idx}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          ) : imageLoaded ? (
            <div className="w-full sm:w-64 border-t sm:border-t-0 sm:border-l glass-morphism p-3 sm:p-4 z-40 overflow-y-auto max-h-[40vh] sm:max-h-none" data-testid="editor-hint">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Ready to Edit</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tap any tool <span className="sm:hidden">above</span><span className="hidden sm:inline">on the left</span> to get started. Here are some ideas:
                  </p>
                </div>
                <div className="space-y-2">
                  {[
                    { id: "filters" as EditorTool, icon: Palette, label: "Filters", desc: "Instantly change the mood" },
                    { id: "crop" as EditorTool, icon: Crop, label: "Crop", desc: "Cut out the perfect frame" },
                    { id: "text" as EditorTool, icon: Type, label: "Text", desc: "Add words to your photo" },
                    { id: "draw" as EditorTool, icon: Pencil, label: "Draw", desc: "Sketch or annotate" },
                  ].map((suggestion) => {
                    const Icon = suggestion.icon;
                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => {
                          setActiveTool(suggestion.id);
                          if (suggestion.id === "crop") {
                            setIsCropping(true);
                            setCropRect(null);
                          }
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-md text-left hover-elevate"
                        data-testid={`button-suggestion-${suggestion.id}`}
                      >
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{suggestion.label}</p>
                          <p className="text-[11px] text-muted-foreground">{suggestion.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground/60 text-center">
                  When you're done, tap Save as New
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
