import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Play, Pause, Music, Image as ImageIcon, Check, Sparkles, Loader2, Download, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { InfoBubble } from "@/components/InfoBubble";
import type { MediaItem } from "@shared/schema";

type TransitionStyle = "cut" | "fade" | "slide";

async function detectBeats(audioUrl: string, sensitivity: number): Promise<number[]> {
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();
  const offlineCtx = new OfflineAudioContext(1, 1, 44100);
  const tempBuffer = await offlineCtx.decodeAudioData(arrayBuffer.slice(0));
  const sampleRate = tempBuffer.sampleRate;
  const length = tempBuffer.length;
  const duration = tempBuffer.duration;
  const ctx = new OfflineAudioContext(1, length, sampleRate);
  const response2 = await fetch(audioUrl);
  const arrayBuffer2 = await response2.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer2);
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  source.start(0);
  const rendered = await ctx.startRendering();
  const channelData = rendered.getChannelData(0);

  const windowSize = 1024;
  const energies: number[] = [];
  for (let i = 0; i < channelData.length; i += windowSize) {
    let sum = 0;
    const end = Math.min(i + windowSize, channelData.length);
    for (let j = i; j < end; j++) {
      sum += channelData[j] * channelData[j];
    }
    energies.push(Math.sqrt(sum / (end - i)));
  }

  const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
  const threshold = avgEnergy * (2.5 - (sensitivity - 1) * 0.18);

  const beats: number[] = [];
  const minGap = Math.floor(sampleRate * 0.15 / windowSize);
  let lastBeatIdx = -minGap;

  for (let i = 1; i < energies.length - 1; i++) {
    if (
      energies[i] > threshold &&
      energies[i] > energies[i - 1] &&
      energies[i] >= energies[i + 1] &&
      i - lastBeatIdx >= minGap
    ) {
      const timestamp = (i * windowSize) / sampleRate;
      if (timestamp < duration) {
        beats.push(timestamp);
        lastBeatIdx = i;
      }
    }
  }

  if (beats.length === 0) {
    beats.push(0);
  }

  return beats;
}

function BeatSyncVideo() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animFrameRef = useRef<number>(0);
  const loadedImagesRef = useRef<HTMLImageElement[]>([]);

  const [selectedVisuals, setSelectedVisuals] = useState<MediaItem[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<MediaItem | null>(null);
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>("cut");
  const [beatSensitivity, setBeatSensitivity] = useState(5);
  const [durationPerImage, setDurationPerImage] = useState(2);
  const [beats, setBeats] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerated, setIsGenerated] = useState(false);

  const { data: allMedia = [], isLoading } = useQuery<MediaItem[]>({
    queryKey: ["/api/media"],
  });

  const visuals = allMedia.filter((m) => m.category === "image" || m.category === "video");
  const audioFiles = allMedia.filter((m) => m.category === "audio");

  const hasMedia = selectedVisuals.length >= 2 && selectedAudio !== null;

  const toggleVisual = useCallback((item: MediaItem) => {
    setSelectedVisuals((prev) => {
      const exists = prev.find((v) => v.id === item.id);
      if (exists) return prev.filter((v) => v.id !== item.id);
      return [...prev, item];
    });
    setIsGenerated(false);
  }, []);

  const selectAudioTrack = useCallback((item: MediaItem) => {
    setSelectedAudio((prev) => (prev?.id === item.id ? null : item));
    setIsGenerated(false);
    setBeats([]);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedAudio || selectedVisuals.length < 2) return;
    setIsAnalyzing(true);
    setIsGenerated(false);
    setIsPlaying(false);
    setCurrentIndex(0);

    try {
      const detectedBeats = await detectBeats(selectedAudio.url, beatSensitivity);

      if (detectedBeats.length < 2) {
        const dur = durationPerImage;
        const audioDuration = selectedAudio.durationSeconds || 30;
        const fallbackBeats: number[] = [];
        for (let t = 0; t < audioDuration; t += dur) {
          fallbackBeats.push(t);
        }
        setBeats(fallbackBeats);
      } else {
        setBeats(detectedBeats);
      }

      const images = await Promise.all(
        selectedVisuals.map(
          (v) =>
            new Promise<HTMLImageElement>((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.onerror = () => resolve(img);
              img.src = v.thumbnailUrl || v.url;
            })
        )
      );
      loadedImagesRef.current = images;

      setIsGenerated(true);
      toast({ title: "Preview Ready", description: `Detected ${detectedBeats.length} beats. Press play to preview.` });
    } catch (err) {
      toast({ title: "Analysis Failed", description: "Could not analyze audio beats. Try another track.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedAudio, selectedVisuals, beatSensitivity, durationPerImage, toast]);

  const drawFrame = useCallback(
    (currentTime: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !isGenerated) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const images = loadedImagesRef.current;
      if (images.length === 0) return;

      let idx = 0;
      for (let i = beats.length - 1; i >= 0; i--) {
        if (currentTime >= beats[i]) {
          idx = i % images.length;
          break;
        }
      }
      setCurrentIndex(idx);

      const img = images[idx];
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, w, h);

      if (!img.complete || img.naturalWidth === 0) return;

      if (transitionStyle === "cut") {
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      } else if (transitionStyle === "fade") {
        const beatStart = beats[idx] || 0;
        const nextBeat = beats[idx + 1] || beatStart + durationPerImage;
        const progress = Math.min((currentTime - beatStart) / Math.min(0.3, nextBeat - beatStart), 1);
        ctx.globalAlpha = progress;
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.globalAlpha = 1;
      } else if (transitionStyle === "slide") {
        const beatStart = beats[idx] || 0;
        const nextBeat = beats[idx + 1] || beatStart + durationPerImage;
        const progress = Math.min((currentTime - beatStart) / Math.min(0.3, nextBeat - beatStart), 1);
        const offsetX = (1 - progress) * w;
        const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.drawImage(img, offsetX + (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
    },
    [beats, isGenerated, transitionStyle, durationPerImage]
  );

  const animate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    drawFrame(audio.currentTime);
    animFrameRef.current = requestAnimationFrame(animate);
  }, [drawFrame]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isGenerated) return;

    if (isPlaying) {
      audio.pause();
      cancelAnimationFrame(animFrameRef.current);
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, isGenerated, animate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      cancelAnimationFrame(animFrameRef.current);
      setIsPlaying(false);
      setCurrentIndex(0);
    };
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("ended", onEnded);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (isGenerated && beats.length > 0) {
      drawFrame(0);
    }
  }, [isGenerated, beats, drawFrame]);

  const saveFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `beatsync-frame-${currentIndex}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast({ title: "Frame Saved", description: `Frame ${currentIndex + 1} downloaded.` });
  }, [currentIndex, toast]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <audio ref={audioRef} src={selectedAudio?.url || ""} preload="auto" />

      <motion.div
        className="max-w-6xl mx-auto px-4 py-6 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.header variants={itemVariants} className="flex items-center gap-4 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white/70" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Beat-Sync Video Maker</h1>
              <p className="text-sm text-white/50">Create music videos with cuts synced to the beat</p>
            </div>
          </div>
        </motion.header>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-xl p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-purple-500/40 text-purple-300 text-xs no-default-hover-elevate no-default-active-elevate">Step 1</Badge>
              <h2 className="text-lg font-semibold text-white">Select Media</h2>
              <InfoBubble text="Choose at least 2 images or video clips, and 1 audio track from your vault." />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-white/50" />
                <span className="text-sm font-medium text-white/70">Visual Media</span>
                <InfoBubble text="Select images and video thumbnails. They will cycle through on each beat." />
                {selectedVisuals.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{selectedVisuals.length} selected</Badge>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
              ) : visuals.length === 0 ? (
                <p className="text-sm text-white/40 py-6 text-center" data-testid="text-no-visuals">No images or videos in your vault yet.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {visuals.map((item) => {
                    const isSelected = selectedVisuals.some((v) => v.id === item.id);
                    return (
                      <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleVisual(item)}
                        className={`relative aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                          isSelected ? "border-purple-500" : "border-transparent"
                        }`}
                        data-testid={`button-visual-${item.id}`}
                      >
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center"
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="absolute inset-0 bg-black/20" />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-white/50" />
                <span className="text-sm font-medium text-white/70">Audio Track</span>
                <InfoBubble text="Select one audio file. Beats will be detected automatically from this track." />
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
              ) : audioFiles.length === 0 ? (
                <p className="text-sm text-white/40 py-4 text-center" data-testid="text-no-audio">No audio files in your vault yet.</p>
              ) : (
                <div className="space-y-1">
                  {audioFiles.map((item) => {
                    const isSelected = selectedAudio?.id === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectAudioTrack(item)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left ${
                          isSelected
                            ? "bg-purple-500/20 border border-purple-500/40"
                            : "bg-white/[0.02] border border-transparent hover-elevate"
                        }`}
                        data-testid={`button-audio-${item.id}`}
                      >
                        <Music className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="text-sm text-white/80 truncate flex-1">{item.filename}</span>
                        {item.durationSeconds && (
                          <span className="text-xs text-white/30">{Math.floor(item.durationSeconds / 60)}:{String(item.durationSeconds % 60).padStart(2, "0")}</span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        <AnimatePresence>
          {hasMedia && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-xl p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-purple-500/40 text-purple-300 text-xs no-default-hover-elevate no-default-active-elevate">Step 2</Badge>
                  <h2 className="text-lg font-semibold text-white">Settings</h2>
                  <InfoBubble text="Configure how your video transitions sync with the detected beats." />
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/70">Transition Style</span>
                      <InfoBubble text="Cut: instant switch. Fade: crossfade between images. Slide: slide in from the right." />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(["cut", "fade", "slide"] as TransitionStyle[]).map((style) => (
                        <Button
                          key={style}
                          variant={transitionStyle === style ? "default" : "outline"}
                          onClick={() => { setTransitionStyle(style); setIsGenerated(false); }}
                          className={`capitalize ${transitionStyle === style ? "toggle-elevate toggle-elevated" : "toggle-elevate"}`}
                          data-testid={`button-transition-${style}`}
                        >
                          {style === "cut" ? "Cut" : style === "fade" ? "Fade" : "Slide"}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/70">Beat Sensitivity</span>
                      <InfoBubble text="Higher values detect more beats, creating faster cuts. Lower values detect only strong beats." />
                      <span className="text-xs text-white/40 ml-auto">{beatSensitivity}</span>
                    </div>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[beatSensitivity]}
                      onValueChange={(v) => { setBeatSensitivity(v[0]); setIsGenerated(false); }}
                      data-testid="slider-beat-sensitivity"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/70">Duration Per Image (Fallback)</span>
                      <InfoBubble text="If no beats are detected, images will cycle at this interval instead." />
                      <span className="text-xs text-white/40 ml-auto">{durationPerImage.toFixed(1)}s</span>
                    </div>
                    <Slider
                      min={0.5}
                      max={5}
                      step={0.1}
                      value={[durationPerImage]}
                      onValueChange={(v) => { setDurationPerImage(v[0]); setIsGenerated(false); }}
                      data-testid="slider-duration-per-image"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hasMedia && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-xl p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-purple-500/40 text-purple-300 text-xs no-default-hover-elevate no-default-active-elevate">Step 3</Badge>
                  <h2 className="text-lg font-semibold text-white">Preview & Generate</h2>
                  <InfoBubble text="Generate a live preview of your beat-synced video. Play it back in real time." />
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    onClick={handleGenerate}
                    disabled={isAnalyzing}
                    data-testid="button-generate-preview"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Analyzing Beats...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Preview
                      </>
                    )}
                  </Button>

                  {isGenerated && (
                    <>
                      <Button
                        variant="outline"
                        onClick={togglePlayback}
                        data-testid="button-play-pause"
                      >
                        {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        {isPlaying ? "Pause" : "Play"}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={saveFrame}
                        data-testid="button-save-frame"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Save Frame
                      </Button>
                    </>
                  )}
                </div>

                {isGenerated && beats.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 flex-wrap">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-white/50">{beats.length} beats detected</span>
                    <span className="text-xs text-white/30">|</span>
                    <span className="text-xs text-white/50">Frame {currentIndex + 1} of {selectedVisuals.length}</span>
                  </motion.div>
                )}

                <div className="relative rounded-md overflow-hidden bg-black/50 border border-white/[0.06]">
                  <canvas
                    ref={canvasRef}
                    width={960}
                    height={540}
                    className="w-full aspect-video"
                    data-testid="canvas-preview"
                  />
                  {!isGenerated && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-white/30">Generate a preview to see your beat-synced video here</p>
                    </div>
                  )}
                </div>

                {isGenerated && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-white/30 text-center">
                    Full video export coming soon -- enjoy the live preview!
                  </motion.p>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default BeatSyncVideo;
