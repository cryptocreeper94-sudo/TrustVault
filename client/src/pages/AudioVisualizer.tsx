import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Play, Pause, Download, Volume2, Music, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { InfoBubble } from "@/components/InfoBubble";
import type { MediaItem } from "@shared/schema";
import { getMediaUrl } from "@/lib/utils";

type VizStyle = "waveform" | "bars" | "circle" | "particles" | "galaxy";
type ColorThemeName = "neon" | "fire" | "ocean" | "midnight" | "sunset";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const VIZ_STYLES: { id: VizStyle; label: string }[] = [
  { id: "waveform", label: "Waveform" },
  { id: "bars", label: "Bars" },
  { id: "circle", label: "Circle" },
  { id: "particles", label: "Particles" },
  { id: "galaxy", label: "Galaxy" },
];

const COLOR_THEMES: { id: ColorThemeName; label: string; colors: string[] }[] = [
  { id: "neon", label: "Neon", colors: ["#00ffff", "#ff00ff", "#8b5cf6"] },
  { id: "fire", label: "Fire", colors: ["#ef4444", "#f97316", "#eab308"] },
  { id: "ocean", label: "Ocean", colors: ["#3b82f6", "#14b8a6", "#22c55e"] },
  { id: "midnight", label: "Midnight", colors: ["#1e3a5f", "#7c3aed", "#ffffff"] },
  { id: "sunset", label: "Sunset", colors: ["#f97316", "#ec4899", "#8b5cf6"] },
];

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioVisualizer() {
  const { toast } = useToast();
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [vizStyle, setVizStyle] = useState<VizStyle>("bars");
  const [colorTheme, setColorTheme] = useState<ColorThemeName>("neon");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(0);

  const { data: audioItems, isLoading } = useQuery<MediaItem[]>({
    queryKey: ["/api/media", "audio"],
    queryFn: async () => {
      const res = await fetch("/api/media?category=audio");
      if (!res.ok) throw new Error("Failed to fetch audio files");
      return res.json();
    },
  });

  const currentColors = COLOR_THEMES.find((t) => t.id === colorTheme)?.colors ?? COLOR_THEMES[0].colors;

  const stopAudio = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    setIsPlaying(false);
  }, []);

  const loadAndPlayAudio = useCallback(async (media: MediaItem) => {
    stopAudio();

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const response = await fetch(getMediaUrl(media.url));
      if (!response.ok) throw new Error("Failed to load audio file");
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNodeRef.current!);
      source.start(0);
      sourceRef.current = source;
      startTimeRef.current = audioContextRef.current.currentTime;

      source.onended = () => {
        setIsPlaying(false);
      };

      setIsPlaying(true);
    } catch (err: any) {
      toast({ title: "Audio Error", description: err.message || "Could not play audio", variant: "destructive" });
    }
  }, [stopAudio, toast]);

  const togglePlayPause = useCallback(() => {
    if (!selectedMedia) return;

    if (isPlaying) {
      stopAudio();
    } else {
      loadAndPlayAudio(selectedMedia);
    }
  }, [selectedMedia, isPlaying, stopAudio, loadAndPlayAudio]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stopAudio]);

  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeData);

      ctx.fillStyle = "rgba(10, 10, 15, 0.15)";
      ctx.fillRect(0, 0, W, H);

      const colors = currentColors;

      switch (vizStyle) {
        case "waveform":
          drawWaveform(ctx, timeData, bufferLength, W, H, colors);
          break;
        case "bars":
          drawBars(ctx, dataArray, bufferLength, W, H, colors);
          break;
        case "circle":
          drawCircle(ctx, dataArray, bufferLength, W, H, colors);
          break;
        case "particles":
          drawParticles(ctx, dataArray, bufferLength, W, H, colors);
          break;
        case "galaxy":
          drawGalaxy(ctx, dataArray, bufferLength, W, H, colors);
          break;
      }
    };

    draw();
  }, [vizStyle, currentColors]);

  useEffect(() => {
    if (isPlaying && analyserRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      drawVisualization();
    }
  }, [isPlaying, drawVisualization]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  function drawWaveform(ctx: CanvasRenderingContext2D, timeData: Uint8Array, bufferLength: number, W: number, H: number, colors: string[]) {
    const gradient = ctx.createLinearGradient(0, 0, W, 0);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.5, colors[1]);
    gradient.addColorStop(1, colors[2]);

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = gradient;
    ctx.shadowBlur = 8;
    ctx.shadowColor = colors[0];
    ctx.beginPath();

    const sliceWidth = W / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * H) / 2;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawBars(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, bufferLength: number, W: number, H: number, colors: string[]) {
    const barCount = 64;
    const barWidth = W / barCount - 2;
    const step = Math.floor(bufferLength / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i * step];
      const barHeight = (value / 255) * H * 0.85;
      const x = i * (barWidth + 2);
      const y = H - barHeight;

      const gradient = ctx.createLinearGradient(x, H, x, y);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(0.5, colors[1]);
      gradient.addColorStop(1, colors[2]);

      ctx.fillStyle = gradient;
      ctx.shadowBlur = 6;
      ctx.shadowColor = colors[1];
      ctx.fillRect(x, y, barWidth, barHeight);
    }
    ctx.shadowBlur = 0;
  }

  function drawCircle(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, bufferLength: number, W: number, H: number, colors: string[]) {
    const cx = W / 2;
    const cy = H / 2;
    const baseRadius = Math.min(W, H) * 0.25;
    const bars = 128;
    const step = Math.floor(bufferLength / bars);

    for (let i = 0; i < bars; i++) {
      const value = dataArray[i * step];
      const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
      const r1 = baseRadius;
      const r2 = baseRadius + (value / 255) * baseRadius * 1.2;

      const x1 = cx + Math.cos(angle) * r1;
      const y1 = cy + Math.sin(angle) * r1;
      const x2 = cx + Math.cos(angle) * r2;
      const y2 = cy + Math.sin(angle) * r2;

      const colorIdx = Math.floor((i / bars) * colors.length) % colors.length;
      ctx.strokeStyle = colors[colorIdx];
      ctx.lineWidth = 2;
      ctx.shadowBlur = 4;
      ctx.shadowColor = colors[colorIdx];
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    const avgValue = Array.from(dataArray.slice(0, bars * step)).reduce((a, b) => a + b, 0) / (bars * step);
    const pulseRadius = baseRadius * 0.95 + (avgValue / 255) * 10;
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawParticles(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, bufferLength: number, W: number, H: number, colors: string[]) {
    const cx = W / 2;
    const cy = H / 2;

    const bass = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const intensity = bass / 255;

    if (intensity > 0.3) {
      const count = Math.floor(intensity * 8);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3 * intensity;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 60 + Math.random() * 60,
          size: 1.5 + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    if (particlesRef.current.length > 500) {
      particlesRef.current = particlesRef.current.slice(-500);
    }

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      if (p.life >= p.maxLife) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawGalaxy(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, bufferLength: number, W: number, H: number, colors: string[]) {
    const cx = W / 2;
    const cy = H / 2;
    const arms = 5;
    const pointsPerArm = 80;
    const maxRadius = Math.min(W, H) * 0.4;

    const bass = dataArray.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
    const mid = dataArray.slice(20, 100).reduce((a, b) => a + b, 0) / 80;
    const high = dataArray.slice(100, 200).reduce((a, b) => a + b, 0) / 100;

    const time = Date.now() * 0.001;

    for (let a = 0; a < arms; a++) {
      const armOffset = (a / arms) * Math.PI * 2;

      for (let i = 0; i < pointsPerArm; i++) {
        const t = i / pointsPerArm;
        const r = t * maxRadius * (0.8 + (bass / 255) * 0.4);
        const spiralAngle = armOffset + t * 3 + time * 0.3;
        const wobble = Math.sin(t * 10 + time * 2) * (mid / 255) * 15;

        const x = cx + Math.cos(spiralAngle) * (r + wobble);
        const y = cy + Math.sin(spiralAngle) * (r + wobble);

        const size = 1 + t * 2.5 * (high / 255 + 0.3);
        const alpha = (1 - t * 0.6) * (0.4 + (bass / 255) * 0.6);

        const colorIdx = Math.floor(t * colors.length) % colors.length;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colors[colorIdx];
        ctx.shadowBlur = 4;
        ctx.shadowColor = colors[colorIdx];
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  const handleSelectMedia = useCallback((media: MediaItem) => {
    if (isPlaying) {
      stopAudio();
    }
    setSelectedMedia(media);
    particlesRef.current = [];
  }, [isPlaying, stopAudio]);

  const handleSaveFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visualizer-${vizStyle}-${colorTheme}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Frame Saved", description: "Visualization frame downloaded as PNG" });
    }, "image/png");
  }, [vizStyle, colorTheme, toast]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0a0a0f] text-white flex flex-col"
    >
      <header className="flex items-center gap-3 p-4 border-b border-white/5">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h1 className="text-lg font-semibold tracking-tight" data-testid="text-page-title">Audio Visualizer</h1>
        </div>
        <InfoBubble text="Select an audio file from your vault, choose a visualization style and color theme, then press play to generate real-time visual art." side="bottom" />
      </header>

      <div className="flex flex-1 flex-col lg:flex-row gap-0">
        <aside className="lg:w-72 border-b lg:border-b-0 lg:border-r border-white/5 p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Audio Files</span>
            <InfoBubble text="Select an audio file from your vault to visualize. Supported formats include MP3, WAV, OGG, and more." side="right" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" data-testid="loader-audio-files" />
            </div>
          ) : !audioItems || audioItems.length === 0 ? (
            <div className="text-sm text-muted-foreground/60 py-6 text-center" data-testid="text-no-audio">
              No audio files found in your vault.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-60 lg:max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {audioItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectMedia(item)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                    selectedMedia?.id === item.id
                      ? "bg-purple-500/20 border border-purple-500/30"
                      : "hover-elevate border border-transparent"
                  }`}
                  data-testid={`button-audio-item-${item.id}`}
                >
                  <Music className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{item.filename}</span>
                  {item.durationSeconds && (
                    <Badge variant="secondary" className="text-[10px] shrink-0" data-testid={`badge-duration-${item.id}`}>
                      {formatDuration(item.durationSeconds)}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="flex-1 flex flex-col relative">
          <div className="flex-1 relative">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              data-testid="canvas-visualization"
              style={{ minHeight: 300 }}
            />

            {!selectedMedia && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Music className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                  <p className="text-sm text-muted-foreground/40" data-testid="text-select-prompt">
                    Select an audio file to begin
                  </p>
                </div>
              </div>
            )}
          </div>

          <div
            className="border-t border-white/5 bg-[rgba(10,10,15,0.85)] backdrop-blur-xl"
            style={{ padding: "12px 16px" }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Style</span>
                  <InfoBubble text="Choose a visualization style. Each style renders audio data differently for unique visual effects." side="top" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {VIZ_STYLES.map((s) => (
                    <Button
                      key={s.id}
                      variant="ghost"
                      size="sm"
                      className={`toggle-elevate ${vizStyle === s.id ? "toggle-elevated bg-purple-500/20 text-purple-300" : "text-muted-foreground"}`}
                      onClick={() => setVizStyle(s.id)}
                      data-testid={`button-style-${s.id}`}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Theme</span>
                  <InfoBubble text="Pick a color palette for the visualization. Colors are used in gradients and particle effects." side="top" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_THEMES.map((t) => (
                    <Button
                      key={t.id}
                      variant="ghost"
                      size="sm"
                      className={`toggle-elevate ${colorTheme === t.id ? "toggle-elevated" : "text-muted-foreground"}`}
                      onClick={() => setColorTheme(t.id)}
                      data-testid={`button-theme-${t.id}`}
                    >
                      <span
                        className="w-3 h-3 rounded-full mr-1.5 shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]}, ${t.colors[2]})`,
                        }}
                      />
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="icon"
                    onClick={togglePlayPause}
                    disabled={!selectedMedia}
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <InfoBubble text="Play or pause the selected audio track and visualization." side="top" />
                </div>

                <div className="flex items-center gap-2 min-w-[140px]">
                  <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Slider
                    value={[volume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => setVolume(v[0])}
                    className="w-24"
                    data-testid="slider-volume"
                  />
                  <InfoBubble text="Adjust the playback volume." side="top" />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveFrame}
                    disabled={!isPlaying}
                    data-testid="button-save-frame"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Save Frame
                  </Button>
                  <InfoBubble text="Capture the current visualization frame and download it as a PNG image." side="top" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </motion.div>
  );
}
