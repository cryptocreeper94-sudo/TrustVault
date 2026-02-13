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
  Square,
  Scissors,
  Volume2,
  ArrowLeft,
  Save,
  Loader2,
  Undo,
  FastForward,
  Rewind,
  Clock,
  Waves,
  ChevronDown,
} from "lucide-react";

type AudioTool = "trim" | "fade" | "volume" | "effects";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
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
  view.setUint16(20, format, true);
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

export default function AudioEditor() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { uploadFile, isUploading, progress } = useUpload();
  const createMedia = useCreateMedia();
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [activeTool, setActiveTool] = useState<AudioTool>("trim");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (["fade", "effects"].includes(activeTool)) {
      setShowAdvanced(true);
    }
  }, [activeTool]);

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isDraggingTrim, setIsDraggingTrim] = useState<"start" | "end" | null>(null);

  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [volume, setVolume] = useState(100);

  const [eqBass, setEqBass] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqTreble, setEqTreble] = useState(0);
  const [reverbMix, setReverbMix] = useState(0);
  const [noiseGate, setNoiseGate] = useState(0);

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
    if (!mediaItem?.url) return;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    fetch(`/objects/${mediaItem.url}`)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((decoded) => {
        setAudioBuffer(decoded);
        setDuration(decoded.duration);
        setTrimEnd(decoded.duration);
        setAudioLoaded(true);
      })
      .catch(() => {
        toast({ title: "Failed to load audio", variant: "destructive" });
      });

    return () => {
      ctx.close();
    };
  }, [mediaItem?.url, toast]);

  const drawWaveform = useCallback(
    (time?: number) => {
      const canvas = canvasRef.current;
      const buffer = audioBuffer;
      if (!canvas || !buffer) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const container = canvasContainerRef.current;
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = container ? container.clientWidth : canvas.clientWidth;
      const displayHeight = 200;

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      ctx.scale(dpr, dpr);

      ctx.fillStyle = "hsl(220 15% 8%)";
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      ctx.strokeStyle = "hsl(220 10% 15%)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < displayWidth; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, displayHeight);
        ctx.stroke();
      }
      for (let i = 0; i < displayHeight; i += 25) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(displayWidth, i);
        ctx.stroke();
      }

      const channelData = buffer.getChannelData(0);
      const step = Math.ceil(channelData.length / displayWidth);
      const midY = displayHeight / 2;

      ctx.fillStyle = "hsl(250 80% 60%)";

      for (let i = 0; i < displayWidth; i++) {
        let min = 1.0;
        let max = -1.0;
        const startSample = i * step;
        for (let j = 0; j < step && startSample + j < channelData.length; j++) {
          const val = channelData[startSample + j];
          if (val < min) min = val;
          if (val > max) max = val;
        }
        const yLow = midY + min * midY;
        const yHigh = midY + max * midY;
        ctx.fillRect(i, yLow, 1, yHigh - yLow || 1);
      }

      const trimStartX = (trimStart / duration) * displayWidth;
      const trimEndX = (trimEnd / duration) * displayWidth;

      if (trimStart > 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, trimStartX, displayHeight);
      }
      if (trimEnd < duration) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(trimEndX, 0, displayWidth - trimEndX, displayHeight);
      }

      ctx.fillStyle = "rgba(120, 90, 255, 0.15)";
      ctx.fillRect(trimStartX, 0, trimEndX - trimStartX, displayHeight);

      if (fadeIn > 0) {
        const fadeInEndX = (Math.min(trimStart + fadeIn, trimEnd) / duration) * displayWidth;
        const grad = ctx.createLinearGradient(trimStartX, 0, fadeInEndX, 0);
        grad.addColorStop(0, "rgba(120, 90, 255, 0.4)");
        grad.addColorStop(1, "rgba(120, 90, 255, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(trimStartX, 0, fadeInEndX - trimStartX, displayHeight);
      }

      if (fadeOut > 0) {
        const fadeOutStartX = (Math.max(trimEnd - fadeOut, trimStart) / duration) * displayWidth;
        const grad = ctx.createLinearGradient(fadeOutStartX, 0, trimEndX, 0);
        grad.addColorStop(0, "rgba(120, 90, 255, 0)");
        grad.addColorStop(1, "rgba(120, 90, 255, 0.4)");
        ctx.fillStyle = grad;
        ctx.fillRect(fadeOutStartX, 0, trimEndX - fadeOutStartX, displayHeight);
      }

      ctx.fillStyle = "hsl(250 80% 60%)";
      ctx.fillRect(trimStartX - 2, 0, 4, displayHeight);
      ctx.fillRect(trimEndX - 2, 0, 4, displayHeight);

      const playheadTime = time !== undefined ? time : currentTime;
      const playheadX = (playheadTime / duration) * displayWidth;
      ctx.fillStyle = "hsl(0 80% 60%)";
      ctx.fillRect(playheadX - 1, 0, 2, displayHeight);
    },
    [audioBuffer, duration, trimStart, trimEnd, fadeIn, fadeOut, currentTime]
  );

  useEffect(() => {
    if (audioLoaded) {
      drawWaveform();
    }
  }, [audioLoaded, drawWaveform]);

  useEffect(() => {
    const handleResize = () => {
      if (audioLoaded) drawWaveform();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [audioLoaded, drawWaveform]);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {}
      sourceNodeRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    setIsPlaying(false);
  }, []);

  const updatePlayhead = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;
    const elapsed = (audioContextRef.current.currentTime - startTimeRef.current) * playbackRate;
    const time = pauseOffsetRef.current + elapsed;
    if (time >= trimEnd) {
      stopPlayback();
      setCurrentTime(trimEnd);
      pauseOffsetRef.current = trimStart;
      drawWaveform(trimEnd);
      return;
    }
    setCurrentTime(time);
    drawWaveform(time);
    animFrameRef.current = requestAnimationFrame(updatePlayhead);
  }, [isPlaying, playbackRate, trimEnd, trimStart, stopPlayback, drawWaveform]);

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
    if (!audioBuffer || !audioContextRef.current) return;
    const ctx = audioContextRef.current;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    stopPlayback();

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackRate;

    const gain = ctx.createGain();
    gain.gain.value = volume / 100;
    gainNodeRef.current = gain;

    let lastNode: AudioNode = source;

    if (eqBass !== 0 || eqMid !== 0 || eqTreble !== 0) {
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = "lowshelf";
      bassFilter.frequency.value = 250;
      bassFilter.gain.value = eqBass;

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = "peaking";
      midFilter.frequency.value = 1000;
      midFilter.Q.value = 1;
      midFilter.gain.value = eqMid;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = "highshelf";
      trebleFilter.frequency.value = 4000;
      trebleFilter.gain.value = eqTreble;

      lastNode.connect(bassFilter);
      bassFilter.connect(midFilter);
      midFilter.connect(trebleFilter);
      lastNode = trebleFilter;
    }

    if (noiseGate > 0) {
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -50 + noiseGate * 0.5;
      compressor.knee.value = 0;
      compressor.ratio.value = 20;
      compressor.attack.value = 0.001;
      compressor.release.value = 0.05;
      lastNode.connect(compressor);
      lastNode = compressor;
    }

    if (reverbMix > 0 && audioBuffer) {
      const reverbLength = 2;
      const reverbSamples = audioBuffer.sampleRate * reverbLength;
      const impulseBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, reverbSamples, audioBuffer.sampleRate);
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        const impulseData = impulseBuffer.getChannelData(ch);
        for (let i = 0; i < reverbSamples; i++) {
          impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbSamples, 2);
        }
      }
      const convolver = ctx.createConvolver();
      convolver.buffer = impulseBuffer;

      const dryGain = ctx.createGain();
      dryGain.gain.value = 1 - reverbMix / 100;
      const wetGain = ctx.createGain();
      wetGain.gain.value = reverbMix / 100;
      const merger = ctx.createGain();

      lastNode.connect(dryGain);
      dryGain.connect(merger);
      lastNode.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(merger);
      lastNode = merger;
    }

    lastNode.connect(gain);
    gain.connect(ctx.destination);

    const offset = pauseOffsetRef.current || trimStart;
    const playDuration = (trimEnd - offset) / playbackRate;

    startTimeRef.current = ctx.currentTime;
    pauseOffsetRef.current = offset;

    source.start(0, offset, playDuration);
    sourceNodeRef.current = source;
    setIsPlaying(true);

    source.onended = () => {
      setIsPlaying(false);
      pauseOffsetRef.current = trimStart;
      setCurrentTime(trimStart);
    };
  }, [audioBuffer, playbackRate, volume, trimStart, trimEnd, stopPlayback, eqBass, eqMid, eqTreble, reverbMix, noiseGate]);

  const handlePause = useCallback(() => {
    if (!audioContextRef.current) return;
    const elapsed = (audioContextRef.current.currentTime - startTimeRef.current) * playbackRate;
    pauseOffsetRef.current = pauseOffsetRef.current + elapsed;
    stopPlayback();
  }, [playbackRate, stopPlayback]);

  const handleStop = useCallback(() => {
    stopPlayback();
    pauseOffsetRef.current = trimStart;
    setCurrentTime(trimStart);
    drawWaveform(trimStart);
  }, [stopPlayback, trimStart, drawWaveform]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !duration) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      const time = ratio * duration;

      if (isDraggingTrim) return;

      const wasPlaying = isPlaying;
      if (wasPlaying) {
        handlePause();
      }
      pauseOffsetRef.current = time;
      setCurrentTime(time);
      drawWaveform(time);
    },
    [duration, isDraggingTrim, isPlaying, handlePause, drawWaveform]
  );

  const getCanvasTime = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !duration) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    return { time: ratio * duration, x, rect };
  }, [duration]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!duration || activeTool !== "trim") return;
      const result = getCanvasTime(e.clientX);
      if (!result) return;
      const { x, rect } = result;
      const trimStartX = (trimStart / duration) * rect.width;
      const trimEndX = (trimEnd / duration) * rect.width;

      if (Math.abs(x - trimStartX) < 10) {
        setIsDraggingTrim("start");
        e.preventDefault();
      } else if (Math.abs(x - trimEndX) < 10) {
        setIsDraggingTrim("end");
        e.preventDefault();
      }
    },
    [duration, activeTool, trimStart, trimEnd, getCanvasTime]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDraggingTrim || !duration) return;
      const result = getCanvasTime(e.clientX);
      if (!result) return;
      if (isDraggingTrim === "start") {
        setTrimStart(Math.min(result.time, trimEnd - 0.1));
      } else {
        setTrimEnd(Math.max(result.time, trimStart + 0.1));
      }
    },
    [isDraggingTrim, duration, trimStart, trimEnd, getCanvasTime]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsDraggingTrim(null);
  }, []);

  const handleCanvasTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (activeTool !== "trim" || !duration) return;
      const touch = e.touches[0];
      const result = getCanvasTime(touch.clientX);
      if (!result) return;
      const { x, rect } = result;
      const trimStartX = (trimStart / duration) * rect.width;
      const trimEndX = (trimEnd / duration) * rect.width;

      if (Math.abs(x - trimStartX) < 20) {
        setIsDraggingTrim("start");
        e.preventDefault();
      } else if (Math.abs(x - trimEndX) < 20) {
        setIsDraggingTrim("end");
        e.preventDefault();
      }
    },
    [duration, activeTool, trimStart, trimEnd, getCanvasTime]
  );

  const handleCanvasTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDraggingTrim || !duration) return;
      e.preventDefault();
      const touch = e.touches[0];
      const result = getCanvasTime(touch.clientX);
      if (!result) return;
      if (isDraggingTrim === "start") {
        setTrimStart(Math.min(result.time, trimEnd - 0.1));
      } else {
        setTrimEnd(Math.max(result.time, trimStart + 0.1));
      }
    },
    [isDraggingTrim, duration, trimStart, trimEnd, getCanvasTime]
  );

  const handleCanvasTouchEnd = useCallback(() => {
    setIsDraggingTrim(null);
  }, []);

  const handleApplyTrim = useCallback(() => {
    if (!audioBuffer) return;
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(trimStart * sampleRate);
    const endSample = Math.floor(trimEnd * sampleRate);
    const length = endSample - startSample;

    if (length <= 0) return;

    const newBuffer = ctx.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      sampleRate
    );

    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const oldData = audioBuffer.getChannelData(ch);
      const newData = newBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        newData[i] = oldData[startSample + i];
      }
    }

    stopPlayback();
    setAudioBuffer(newBuffer);
    setDuration(newBuffer.duration);
    setTrimStart(0);
    setTrimEnd(newBuffer.duration);
    setCurrentTime(0);
    pauseOffsetRef.current = 0;
    toast({ title: "Trim applied" });
  }, [audioBuffer, trimStart, trimEnd, stopPlayback, toast]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  const handleReset = useCallback(() => {
    if (!mediaItem?.url) return;
    stopPlayback();
    setAudioLoaded(false);
    setCurrentTime(0);
    pauseOffsetRef.current = 0;
    setTrimStart(0);
    setFadeIn(0);
    setFadeOut(0);
    setVolume(100);
    setPlaybackRate(1);
    setEqBass(0);
    setEqMid(0);
    setEqTreble(0);
    setReverbMix(0);
    setNoiseGate(0);

    const ctx = audioContextRef.current;
    if (!ctx) return;

    fetch(`/objects/${mediaItem.url}`)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((decoded) => {
        setAudioBuffer(decoded);
        setDuration(decoded.duration);
        setTrimEnd(decoded.duration);
        setAudioLoaded(true);
      })
      .catch(() => {
        toast({ title: "Failed to reload audio", variant: "destructive" });
      });
  }, [mediaItem?.url, stopPlayback, toast]);

  const handleSave = async () => {
    if (!audioBuffer || !mediaItem) return;
    setSaving(true);
    try {
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(trimStart * sampleRate);
      const endSample = Math.floor(trimEnd * sampleRate);
      const length = endSample - startSample;
      const numChannels = audioBuffer.numberOfChannels;

      const offlineCtx = new OfflineAudioContext(numChannels, length, sampleRate);

      const trimmedBuffer = offlineCtx.createBuffer(numChannels, length, sampleRate);
      for (let ch = 0; ch < numChannels; ch++) {
        const src = audioBuffer.getChannelData(ch);
        const dst = trimmedBuffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          dst[i] = src[startSample + i];
        }
      }

      const source = offlineCtx.createBufferSource();
      source.buffer = trimmedBuffer;

      const gainNode = offlineCtx.createGain();
      gainNode.gain.setValueAtTime(volume / 100, 0);

      if (fadeIn > 0) {
        gainNode.gain.setValueAtTime(0, 0);
        gainNode.gain.linearRampToValueAtTime(volume / 100, fadeIn);
      }

      if (fadeOut > 0) {
        const fadeOutStart = trimmedBuffer.duration - fadeOut;
        if (fadeOutStart > 0) {
          gainNode.gain.setValueAtTime(volume / 100, fadeOutStart);
          gainNode.gain.linearRampToValueAtTime(0, trimmedBuffer.duration);
        }
      }

      let lastNode: AudioNode = source;

      if (eqBass !== 0 || eqMid !== 0 || eqTreble !== 0) {
        const bassFilter = offlineCtx.createBiquadFilter();
        bassFilter.type = "lowshelf";
        bassFilter.frequency.value = 250;
        bassFilter.gain.value = eqBass;

        const midFilter = offlineCtx.createBiquadFilter();
        midFilter.type = "peaking";
        midFilter.frequency.value = 1000;
        midFilter.Q.value = 1;
        midFilter.gain.value = eqMid;

        const trebleFilter = offlineCtx.createBiquadFilter();
        trebleFilter.type = "highshelf";
        trebleFilter.frequency.value = 4000;
        trebleFilter.gain.value = eqTreble;

        lastNode.connect(bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        lastNode = trebleFilter;
      }

      if (noiseGate > 0) {
        const compressor = offlineCtx.createDynamicsCompressor();
        compressor.threshold.value = -50 + noiseGate * 0.5;
        compressor.knee.value = 0;
        compressor.ratio.value = 20;
        compressor.attack.value = 0.001;
        compressor.release.value = 0.05;
        lastNode.connect(compressor);
        lastNode = compressor;
      }

      if (reverbMix > 0) {
        const reverbLength = 2;
        const reverbSamples = sampleRate * reverbLength;
        const impulseBuffer = offlineCtx.createBuffer(numChannels, reverbSamples, sampleRate);
        for (let ch = 0; ch < numChannels; ch++) {
          const impulseData = impulseBuffer.getChannelData(ch);
          for (let i = 0; i < reverbSamples; i++) {
            impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbSamples, 2);
          }
        }
        const convolver = offlineCtx.createConvolver();
        convolver.buffer = impulseBuffer;

        const dryGain = offlineCtx.createGain();
        dryGain.gain.value = 1 - reverbMix / 100;
        const wetGain = offlineCtx.createGain();
        wetGain.gain.value = reverbMix / 100;

        const merger = offlineCtx.createGain();

        lastNode.connect(dryGain);
        dryGain.connect(merger);

        lastNode.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(merger);

        lastNode = merger;
      }

      lastNode.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      source.start(0);

      const rendered = await offlineCtx.startRendering();
      const wavBlob = audioBufferToWav(rendered);

      const fileName = `edited_${mediaItem.filename || "audio.wav"}`.replace(/\.[^.]+$/, ".wav");
      const file = new File([wavBlob], fileName, { type: "audio/wav" });

      const uploadResult = await uploadFile(file);
      if (!uploadResult) throw new Error("Upload failed");

      await createMedia.mutateAsync({
        title: `${mediaItem.title} (Edited)`,
        description: mediaItem.description || undefined,
        url: uploadResult.objectPath,
        filename: fileName,
        contentType: "audio/wav",
        category: detectCategory("audio/wav"),
        size: wavBlob.size,
        tags: mediaItem.tags || undefined,
        label: mediaItem.label || undefined,
      });

      toast({ title: "Audio saved successfully" });
      navigate("/");
    } catch (err) {
      toast({
        title: "Failed to save audio",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const speedOptions = [0.5, 1, 1.5, 2];

  const essentialTools: { id: AudioTool; icon: typeof Scissors; label: string }[] = [
    { id: "trim", icon: Scissors, label: "Trim" },
    { id: "volume", icon: Volume2, label: "Volume" },
  ];

  const advancedTools: { id: AudioTool; icon: typeof Scissors; label: string }[] = [
    { id: "fade", icon: Clock, label: "Fade" },
    { id: "effects", icon: Waves, label: "Effects" },
  ];

  const advancedToolIds = advancedTools.map(t => t.id);

  if (authLoading || mediaLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background" data-testid="editor-loading">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden" data-testid="audio-editor">
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
          <span className="text-sm font-medium truncate max-w-[200px]" data-testid="text-audio-name">
            {mediaItem?.title || "Audio Editor"}
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
            disabled={saving || isUploading || !audioLoaded}
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

      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-6 py-4 gap-4">
          {!audioLoaded ? (
            <div className="flex flex-col items-center gap-3" data-testid="canvas-loading">
              <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading audio...</span>
            </div>
          ) : (
            <>
              <div className="w-full max-w-4xl" ref={canvasContainerRef}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Click anywhere on the waveform to jump to that point</p>
                  {activeTool === "trim" && (
                    <Badge variant="secondary" className="text-xs">Drag the purple handles to set trim points</Badge>
                  )}
                </div>
                <canvas
                  ref={canvasRef}
                  className="block w-full rounded-md cursor-pointer"
                  style={{ height: "200px" }}
                  onClick={handleCanvasClick}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                  data-testid="editor-canvas"
                />
              </div>

              <div className="flex items-center justify-between w-full max-w-4xl text-xs text-muted-foreground" data-testid="time-display">
                <Badge variant="secondary" className="text-xs font-mono" data-testid="text-current-time">{formatTime(currentTime)}</Badge>
                <span className="text-muted-foreground/50">/</span>
                <Badge variant="secondary" className="text-xs font-mono" data-testid="text-duration">{formatTime(duration)}</Badge>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap" data-testid="playback-controls">
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleStop}
                        data-testid="button-stop"
                      >
                        <Square />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Stop</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          pauseOffsetRef.current = Math.max(trimStart, currentTime - 5);
                          setCurrentTime(pauseOffsetRef.current);
                          drawWaveform(pauseOffsetRef.current);
                        }}
                        data-testid="button-rewind"
                      >
                        <Rewind />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Rewind 5s</TooltipContent>
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
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          pauseOffsetRef.current = Math.min(trimEnd, currentTime + 5);
                          setCurrentTime(pauseOffsetRef.current);
                          drawWaveform(pauseOffsetRef.current);
                        }}
                        data-testid="button-forward"
                      >
                        <FastForward />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Forward 5s</TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center gap-1" data-testid="speed-selector">
                  {speedOptions.map((speed) => (
                    <Button
                      key={speed}
                      size="sm"
                      variant={playbackRate === speed ? "default" : "ghost"}
                      className="toggle-elevate"
                      onClick={() => {
                        setPlaybackRate(speed);
                        if (isPlaying) {
                          handlePause();
                          setTimeout(() => handlePlay(), 50);
                        }
                      }}
                      data-testid={`button-speed-${speed}`}
                    >
                      {speed}x
                    </Button>
                  ))}
                </div>
              </div>

              <div className="w-full max-w-4xl glass-morphism rounded-md p-3 sm:p-4 mt-2" data-testid="editor-panel">
                <div className="flex items-center gap-2 mb-4 flex-wrap" data-testid="tool-tabs">
                  {essentialTools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    return (
                      <Button
                        key={tool.id}
                        variant={isActive ? "default" : "ghost"}
                        onClick={() => setActiveTool(tool.id)}
                        data-testid={`button-tool-${tool.id}`}
                      >
                        <Icon className="w-4 h-4 mr-1.5" />
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
                    const isActive = activeTool === tool.id;
                    return (
                      <Button
                        key={tool.id}
                        variant={isActive ? "default" : "ghost"}
                        onClick={() => setActiveTool(tool.id)}
                        data-testid={`button-tool-${tool.id}`}
                      >
                        <Icon className="w-4 h-4 mr-1.5" />
                        {tool.label}
                      </Button>
                    );
                  })}
                </div>

                {activeTool === "trim" && (
                  <div className="flex flex-col gap-4" data-testid="trim-controls">
                    <p className="text-xs text-muted-foreground">Cut out the part you want to keep. Set the start and end points, then apply.</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Start</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max={trimEnd}
                          value={trimStart.toFixed(1)}
                          onChange={(e) => setTrimStart(Math.max(0, Math.min(parseFloat(e.target.value) || 0, trimEnd - 0.1)))}
                          className="w-24"
                          data-testid="input-trim-start"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">End</label>
                        <Input
                          type="number"
                          step="0.1"
                          min={trimStart}
                          max={duration}
                          value={trimEnd.toFixed(1)}
                          onChange={(e) => setTrimEnd(Math.max(trimStart + 0.1, Math.min(parseFloat(e.target.value) || 0, duration)))}
                          className="w-24"
                          data-testid="input-trim-end"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          onClick={handleApplyTrim}
                          disabled={trimStart === 0 && trimEnd === duration}
                          data-testid="button-apply-trim"
                        >
                          <Scissors className="w-4 h-4 mr-1" />
                          Apply Trim
                        </Button>
                      </div>
                    </div>
                    <Badge variant="secondary" className="self-start text-xs" data-testid="badge-trim-duration">
                      Selection: {formatTime(trimEnd - trimStart)}
                    </Badge>
                  </div>
                )}

                {activeTool === "fade" && (
                  <div className="flex flex-col gap-6" data-testid="fade-controls">
                    <p className="text-xs text-muted-foreground">Add a smooth fade at the beginning or end of your audio. Great for intros and outros.</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Fade In</label>
                        <Badge variant="secondary" className="text-xs" data-testid="badge-fade-in">
                          {fadeIn.toFixed(1)}s
                        </Badge>
                      </div>
                      <Slider
                        min={0}
                        max={5}
                        step={0.1}
                        value={[fadeIn]}
                        onValueChange={([val]) => setFadeIn(val)}
                        data-testid="slider-fade-in"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Fade Out</label>
                        <Badge variant="secondary" className="text-xs" data-testid="badge-fade-out">
                          {fadeOut.toFixed(1)}s
                        </Badge>
                      </div>
                      <Slider
                        min={0}
                        max={5}
                        step={0.1}
                        value={[fadeOut]}
                        onValueChange={([val]) => setFadeOut(val)}
                        data-testid="slider-fade-out"
                      />
                    </div>
                  </div>
                )}

                {activeTool === "volume" && (
                  <div className="flex flex-col gap-4" data-testid="volume-controls">
                    <p className="text-xs text-muted-foreground">Adjust how loud or quiet your audio will be. 100% is the original volume.</p>
                    <div className="flex items-center justify-between">
                      <label className="text-sm flex items-center gap-2">
                        <Volume2 className="w-4 h-4" />
                        Master Volume
                      </label>
                      <Badge variant="secondary" className="text-xs" data-testid="badge-volume">
                        {volume}%
                      </Badge>
                    </div>
                    <Slider
                      min={0}
                      max={200}
                      step={1}
                      value={[volume]}
                      onValueChange={([val]) => setVolume(val)}
                      data-testid="slider-volume"
                    />
                  </div>
                )}

                {activeTool === "effects" && (
                  <div className="flex flex-col gap-5" data-testid="effects-controls">
                    <p className="text-xs text-muted-foreground">Shape your sound with EQ, reverb, and noise control. Effects apply to both playback and the saved file.</p>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-foreground">Equalizer</span>
                      <p className="text-xs text-muted-foreground">Boost or cut frequency ranges to shape the tone.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Bass (low frequencies)</label>
                        <Badge variant="secondary" className="text-xs" data-testid="badge-eq-bass">
                          {eqBass > 0 ? `+${eqBass}` : eqBass} dB
                        </Badge>
                      </div>
                      <Slider
                        min={-12}
                        max={12}
                        step={1}
                        value={[eqBass]}
                        onValueChange={([val]) => setEqBass(val)}
                        data-testid="slider-eq-bass"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Mid (vocal range)</label>
                        <Badge variant="secondary" className="text-xs" data-testid="badge-eq-mid">
                          {eqMid > 0 ? `+${eqMid}` : eqMid} dB
                        </Badge>
                      </div>
                      <Slider
                        min={-12}
                        max={12}
                        step={1}
                        value={[eqMid]}
                        onValueChange={([val]) => setEqMid(val)}
                        data-testid="slider-eq-mid"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Treble (high frequencies)</label>
                        <Badge variant="secondary" className="text-xs" data-testid="badge-eq-treble">
                          {eqTreble > 0 ? `+${eqTreble}` : eqTreble} dB
                        </Badge>
                      </div>
                      <Slider
                        min={-12}
                        max={12}
                        step={1}
                        value={[eqTreble]}
                        onValueChange={([val]) => setEqTreble(val)}
                        data-testid="slider-eq-treble"
                      />
                    </div>

                    <div className="border-t border-border my-1" />

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Reverb (echo/space)</label>
                        <Badge variant="secondary" className="text-xs" data-testid="badge-reverb">
                          {reverbMix}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Adds a sense of space and depth, like playing in a room or hall.</p>
                      <Slider
                        min={0}
                        max={80}
                        step={1}
                        value={[reverbMix]}
                        onValueChange={([val]) => setReverbMix(val)}
                        data-testid="slider-reverb"
                      />
                    </div>

                    <div className="border-t border-border my-1" />

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Noise Gate</label>
                        <Badge variant="secondary" className="text-xs" data-testid="badge-noise-gate">
                          {noiseGate}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Reduces background noise and hiss by silencing quiet parts. Higher values cut more aggressively.</p>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[noiseGate]}
                        onValueChange={([val]) => setNoiseGate(val)}
                        data-testid="slider-noise-gate"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
