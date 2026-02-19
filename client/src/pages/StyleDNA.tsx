import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Loader2, Palette, Thermometer, Eye, SunMedium, Droplets, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { InfoBubble } from "@/components/InfoBubble";
import type { MediaItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface StyleAnalysis {
  style: {
    warmth: number;
    contrast: "low" | "medium" | "high";
    saturation: "muted" | "natural" | "vivid";
    mood: string;
    colorPalette: string[];
    dominantTone: string;
    editingStyle: string;
  };
  description: string;
}

interface StyleDNAProfile {
  warmth: number;
  contrast: "low" | "medium" | "high";
  saturation: "muted" | "natural" | "vivid";
  mood: string;
  colorPalette: string[];
  dominantTone: string;
  editingStyle: string;
  description: string;
  adjustments: {
    brightness: number;
    contrast: number;
    saturation: number;
    temperature: number;
  };
  analyzedAt: string;
  imageCount: number;
}

interface StoredDNA {
  current: StyleDNAProfile;
  history: StyleDNAProfile[];
}

function getStorageKey(): string {
  return "style-dna-default";
}

function getMode<T extends string>(arr: T[]): T {
  const counts: Record<string, number> = {};
  arr.forEach((v) => {
    counts[v] = (counts[v] || 0) + 1;
  });
  let max = 0;
  let result = arr[0];
  Object.entries(counts).forEach(([key, count]) => {
    if (count > max) {
      max = count;
      result = key as T;
    }
  });
  return result;
}

function aggregateResults(results: StyleAnalysis[]): StyleDNAProfile {
  const warmth = Math.round(results.reduce((sum, r) => sum + r.style.warmth, 0) / results.length);
  const contrast = getMode(results.map((r) => r.style.contrast));
  const saturation = getMode(results.map((r) => r.style.saturation));

  const allColors: string[] = [];
  results.forEach((r) => {
    r.style.colorPalette.forEach((c) => {
      if (!allColors.includes(c.toLowerCase())) allColors.push(c.toLowerCase());
    });
  });
  const colorPalette = allColors.slice(0, 8);

  const moods = Array.from(new Set(results.map((r) => r.style.mood)));
  const mood = moods.join(", ");

  const dominantTone = getMode(results.map((r) => r.style.dominantTone));
  const editingStyle = getMode(results.map((r) => r.style.editingStyle));
  const description = results.map((r) => r.description).join(" ");

  const adjustments = {
    brightness: warmth > 0 ? 105 : 95,
    contrast: contrast === "high" ? 120 : contrast === "low" ? 80 : 100,
    saturation: saturation === "vivid" ? 130 : saturation === "muted" ? 70 : 100,
    temperature: warmth,
  };

  return {
    warmth,
    contrast,
    saturation,
    mood,
    colorPalette,
    dominantTone,
    editingStyle,
    description,
    adjustments,
    analyzedAt: new Date().toISOString(),
    imageCount: results.length,
  };
}

function WarmthMeter({ value }: { value: number }) {
  const normalized = ((value + 100) / 200) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Thermometer className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Warmth</span>
          <InfoBubble text="Measures the color temperature of your photos, from cool blues to warm oranges." side="right" />
        </div>
        <span className="text-xs font-mono text-muted-foreground" data-testid="text-warmth-value">{value}</span>
      </div>
      <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "linear-gradient(to right, #3b82f6, #f8fafc, #f97316)" }}>
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg"
          style={{ background: value < 0 ? "#3b82f6" : "#f97316" }}
          initial={{ left: "50%" }}
          animate={{ left: `${normalized}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          data-testid="indicator-warmth"
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/60">
        <span>Cool</span>
        <span>Neutral</span>
        <span>Warm</span>
      </div>
    </div>
  );
}

function DNAHelix() {
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{
            height: `${12 + Math.sin(i * 1.2) * 8}px`,
            background: `hsl(${260 + i * 15}, 70%, 60%)`,
          }}
          animate={{ height: [`${12 + Math.sin(i * 1.2) * 8}px`, `${12 + Math.cos(i * 1.2) * 8}px`, `${12 + Math.sin(i * 1.2) * 8}px`] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function StyleDNA() {
  const { toast } = useToast();
  const [styleDNA, setStyleDNA] = useState<StyleDNAProfile | null>(null);
  const [history, setHistory] = useState<StyleDNAProfile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 });
  const [autoApply, setAutoApply] = useState(false);

  const { data: mediaItems } = useQuery<MediaItem[]>({
    queryKey: ["/api/media"],
  });

  useEffect(() => {
    const key = getStorageKey();
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const stored: StoredDNA = JSON.parse(raw);
        setStyleDNA(stored.current);
        setHistory(stored.history || []);
      }
    } catch {}
    try {
      const autoApplyStored = localStorage.getItem(`${key}-auto-apply`);
      if (autoApplyStored) setAutoApply(JSON.parse(autoApplyStored));
    } catch {}
  }, []);

  const saveProfile = useCallback((profile: StyleDNAProfile, prevHistory: StyleDNAProfile[]) => {
    const key = getStorageKey();
    const newHistory = [...prevHistory, profile].slice(-10);
    const stored: StoredDNA = { current: profile, history: newHistory };
    localStorage.setItem(key, JSON.stringify(stored));
    setStyleDNA(profile);
    setHistory(newHistory);
  }, []);

  const handleAutoApplyChange = useCallback((checked: boolean) => {
    setAutoApply(checked);
    localStorage.setItem(`${getStorageKey()}-auto-apply`, JSON.stringify(checked));
  }, []);

  const analyzeStyle = useCallback(async () => {
    if (!mediaItems) return;
    const images = mediaItems.filter((m) => m.category === "image");
    if (images.length === 0) {
      toast({ title: "No images found", description: "Upload some images to your vault first.", variant: "destructive" });
      return;
    }

    const selected = [...images].sort(() => Math.random() - 0.5).slice(0, 10);
    setIsAnalyzing(true);
    setAnalyzeProgress({ current: 0, total: selected.length });

    const results: StyleAnalysis[] = [];

    for (let i = 0; i < selected.length; i++) {
      setAnalyzeProgress({ current: i + 1, total: selected.length });
      try {
        const res = await apiRequest("POST", "/api/ai/style-analyze", { imageUrl: selected[i].url });
        const data: StyleAnalysis = await res.json();
        results.push(data);
      } catch (err) {
        console.error("Failed to analyze image:", err);
      }
    }

    if (results.length === 0) {
      toast({ title: "Analysis failed", description: "Could not analyze any images. Please try again.", variant: "destructive" });
      setIsAnalyzing(false);
      return;
    }

    const profile = aggregateResults(results);
    saveProfile(profile, history);
    toast({ title: "Style DNA complete", description: `Analyzed ${results.length} images to build your profile.` });
    setIsAnalyzing(false);
  }, [mediaItems, toast, saveProfile, history]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-center gap-3 flex-wrap"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold" data-testid="text-page-title">Your Style DNA</h1>
          </div>
          <InfoBubble text="AI analyzes your photos to learn your unique aesthetic preferences. Your Style DNA captures your visual identity and can auto-apply your signature look." />
        </motion.div>

        {/* Current Style Profile */}
        <AnimatePresence>
          {styleDNA && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
            >
              <Card
                className="p-6 space-y-5 border-white/10 bg-[rgba(15,15,30,0.6)] backdrop-blur-xl"
                data-testid="card-style-profile"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <DNAHelix />
                  <h2 className="text-lg font-semibold" data-testid="text-profile-title">Your Style DNA</h2>
                </div>

                <WarmthMeter value={styleDNA.warmth} />

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Contrast</span>
                    <InfoBubble text="The tonal contrast level found across your photos." side="right" />
                  </div>
                  <Badge variant="secondary" data-testid="badge-contrast">
                    {styleDNA.contrast === "low" ? "Low" : styleDNA.contrast === "high" ? "High" : "Medium"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Saturation</span>
                    <InfoBubble text="How vivid or muted your color preferences tend to be." side="right" />
                  </div>
                  <Badge variant="secondary" data-testid="badge-saturation">
                    {styleDNA.saturation === "muted" ? "Muted" : styleDNA.saturation === "vivid" ? "Vivid" : "Natural"}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <SunMedium className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Mood</span>
                    <InfoBubble text="The overall emotional feel detected in your photography." side="right" />
                  </div>
                  <p className="text-sm font-medium" data-testid="text-mood">{styleDNA.mood}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Color Palette</span>
                    <InfoBubble text="The dominant colors found across your photo collection." side="right" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap" data-testid="container-color-palette">
                    {styleDNA.colorPalette.map((color, i) => (
                      <motion.div
                        key={`${color}-${i}`}
                        className="w-8 h-8 rounded-full border border-white/20 shadow-lg"
                        style={{ backgroundColor: color }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                        title={color}
                        data-testid={`color-swatch-${i}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Dominant Tone</span>
                  <p className="text-sm" data-testid="text-dominant-tone">{styleDNA.dominantTone}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Editing Style</span>
                  <p className="text-sm" data-testid="text-editing-style">{styleDNA.editingStyle}</p>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-ai-description">
                    {styleDNA.description}
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyze Button Area */}
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isAnalyzing ? (
            <div className="flex flex-col items-center gap-3 py-4" data-testid="container-progress">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground" data-testid="text-progress">
                Analyzing image {analyzeProgress.current} of {analyzeProgress.total}...
              </p>
            </div>
          ) : (
            <Button
              onClick={analyzeStyle}
              disabled={!mediaItems || mediaItems.filter((m) => m.category === "image").length === 0}
              data-testid="button-analyze"
            >
              {styleDNA ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-analyze
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze My Style
                </>
              )}
            </Button>
          )}
        </motion.div>

        {/* Style Preview */}
        <AnimatePresence>
          {styleDNA && !isAnalyzing && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <Card className="p-5 space-y-4 border-white/10 bg-[rgba(15,15,30,0.6)] backdrop-blur-xl" data-testid="card-style-preview">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold">Apply My Style</h3>
                  <InfoBubble text="Preview the adjustments your Style DNA would apply to photos." side="right" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 text-center">
                    <div
                      className="aspect-square rounded-md bg-muted/20 flex items-center justify-center text-xs text-muted-foreground border border-white/5"
                      data-testid="preview-before"
                    >
                      Original
                    </div>
                    <span className="text-[10px] text-muted-foreground">Before</span>
                  </div>
                  <div className="space-y-1 text-center">
                    <div
                      className="aspect-square rounded-md flex items-center justify-center text-xs border border-white/5"
                      style={{
                        background: `linear-gradient(135deg, rgba(139,92,246,0.15), rgba(${styleDNA.warmth > 0 ? "249,115,22" : "59,130,246"},0.15))`,
                        filter: `brightness(${styleDNA.adjustments.brightness / 100}) contrast(${styleDNA.adjustments.contrast / 100}) saturate(${styleDNA.adjustments.saturation / 100})`,
                      }}
                      data-testid="preview-after"
                    >
                      <span className="text-muted-foreground">With DNA</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">After</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">Auto-Apply on Upload</span>
                    <p className="text-xs text-muted-foreground">
                      {autoApply
                        ? "New photos will automatically get your signature look"
                        : "Toggle on to auto-apply your style to new uploads"}
                    </p>
                  </div>
                  <Switch
                    checked={autoApply}
                    onCheckedChange={handleAutoApplyChange}
                    data-testid="switch-auto-apply"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Computed Adjustments</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Brightness", value: styleDNA.adjustments.brightness, unit: "%" },
                      { label: "Contrast", value: styleDNA.adjustments.contrast, unit: "%" },
                      { label: "Saturation", value: styleDNA.adjustments.saturation, unit: "%" },
                      { label: "Temperature", value: styleDNA.adjustments.temperature, unit: "" },
                    ].map((adj) => (
                      <div key={adj.label} className="flex items-center justify-between rounded-md bg-white/5 px-3 py-2" data-testid={`adjustment-${adj.label.toLowerCase()}`}>
                        <span className="text-xs text-muted-foreground">{adj.label}</span>
                        <span className="text-xs font-mono font-medium">
                          {adj.value}{adj.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Style History */}
        <AnimatePresence>
          {history.length > 1 && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Card className="p-5 space-y-3 border-white/10 bg-[rgba(15,15,30,0.6)] backdrop-blur-xl" data-testid="card-style-history">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold">Your style has evolved!</h3>
                  <InfoBubble text="Track how your visual preferences have changed over time." side="right" />
                </div>
                <div className="space-y-2">
                  {history.map((entry, idx) => (
                    <motion.div
                      key={entry.analyzedAt}
                      className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-3 py-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      data-testid={`history-entry-${idx}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex gap-0.5 shrink-0">
                          {entry.colorPalette.slice(0, 3).map((c, ci) => (
                            <div
                              key={`${c}-${ci}`}
                              className="w-3 h-3 rounded-full border border-white/10"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{entry.mood}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px]">
                          {entry.imageCount} images
                        </Badge>
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(entry.analyzedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
