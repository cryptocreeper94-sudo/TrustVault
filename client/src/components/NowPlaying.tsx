import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Music,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { MediaResponse } from "@shared/routes";

interface NowPlayingProps {
  item: MediaResponse;
  playlist?: MediaResponse[];
  open: boolean;
  onClose: () => void;
  onTrackChange?: (item: MediaResponse) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function NowPlaying({ item, playlist = [], open, onClose, onTrackChange }: NowPlayingProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mediaUrl = `/objects/${item.url}`;

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;

    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (e) {
      // Audio context already created for this element
    }
  }, []);

  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.min(w, h) * 0.25;
      const barCount = 64;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * (bufferLength / barCount));
        const value = dataArray[dataIndex] / 255;
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const barHeight = value * radius * 0.8 + 2;

        const x1 = centerX + Math.cos(angle) * (radius + 4);
        const y1 = centerY + Math.sin(angle) * (radius + 4);
        const x2 = centerX + Math.cos(angle) * (radius + 4 + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + 4 + barHeight);

        const style = getComputedStyle(document.documentElement);
        const primaryHSL = style.getPropertyValue("--primary").trim();

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsla(${primaryHSL}, ${0.3 + value * 0.7})`;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()}, 0.15)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    draw();
  }, []);

  useEffect(() => {
    if (open && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [open, item.id]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
        analyserRef.current = null;
        sourceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      initAudioContext();
      drawVisualizer();
    } else {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying, initAudioContext, drawVisualizer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [open]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    initAudioContext();
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const seek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const changeVolume = (value: number[]) => {
    if (!audioRef.current) return;
    const vol = value[0];
    audioRef.current.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const currentIndex = playlist.findIndex(p => p.id === item.id);

  const skipNext = () => {
    if (!playlist.length || !onTrackChange) return;
    let nextIndex: number;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    onTrackChange(playlist[nextIndex]);
  };

  const skipPrev = () => {
    if (!playlist.length || !onTrackChange) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIndex = currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1;
    onTrackChange(playlist[prevIndex]);
  };

  const handleEnded = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else if (playlist.length > 1) {
      skipNext();
    } else {
      setIsPlaying(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col"
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, hsl(var(--primary) / 0.3) 0%, transparent 50%),
                         radial-gradient(ellipse at 70% 80%, hsl(var(--accent) / 0.2) 0%, transparent 50%)`,
          }}
        />

        <header className="relative z-10 flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-nowplaying"
          >
            <X className="h-5 w-5" />
          </Button>
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Now Playing</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            data-testid="button-fullscreen-nowplaying"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </header>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-8">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/10"
                animate={isPlaying ? { rotate: 360 } : {}}
                transition={isPlaying ? { duration: 8, repeat: Infinity, ease: "linear" } : {}}
              >
                <Music className="w-12 h-12 sm:w-16 sm:h-16 text-primary/60" />
              </motion.div>
            </div>
          </div>

          <div className="text-center space-y-1 max-w-md">
            <h2 className="text-xl sm:text-2xl font-display font-bold truncate" data-testid="text-nowplaying-title">
              {item.title}
            </h2>
            {item.artist && (
              <p className="text-muted-foreground text-sm" data-testid="text-nowplaying-artist">{item.artist}</p>
            )}
            {item.description && !item.artist && (
              <p className="text-muted-foreground text-sm">{item.description}</p>
            )}
          </div>

          <div className="w-full max-w-md space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.5}
              onValueChange={seek}
              className="cursor-pointer"
              data-testid="slider-progress"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsShuffle(!isShuffle)}
              className={isShuffle ? "text-primary" : "text-muted-foreground"}
              data-testid="button-shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={skipPrev}
              disabled={playlist.length < 2}
              data-testid="button-prev"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={togglePlay}
              data-testid="button-play-pause"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={skipNext}
              disabled={playlist.length < 2}
              data-testid="button-next"
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsRepeat(!isRepeat)}
              className={isRepeat ? "text-primary" : "text-muted-foreground"}
              data-testid="button-repeat"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full max-w-xs">
            <Button variant="ghost" size="icon" onClick={toggleMute} data-testid="button-mute">
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={changeVolume}
              className="flex-1"
              data-testid="slider-volume"
            />
          </div>

          {playlist.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Track {currentIndex + 1} of {playlist.length}
            </p>
          )}
        </div>

        <audio
          ref={audioRef}
          src={mediaUrl}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          crossOrigin="anonymous"
        />
      </motion.div>
    </AnimatePresence>
  );
}
