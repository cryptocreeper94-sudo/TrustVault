import { useCallback } from "react";
import { useHaptic } from "./use-haptic";

type SoundType = "success" | "delete" | "click" | "save";

const SOUND_FREQUENCIES: Record<SoundType, { freq: number; dur: number; type: OscillatorType; gain: number; freq2?: number }> = {
  success: { freq: 880, dur: 150, type: "sine", gain: 0.08, freq2: 1320 },
  delete: { freq: 330, dur: 200, type: "triangle", gain: 0.06 },
  click: { freq: 1200, dur: 50, type: "sine", gain: 0.04 },
  save: { freq: 660, dur: 120, type: "sine", gain: 0.06, freq2: 880 },
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(sound: SoundType) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const config = SOUND_FREQUENCIES[sound];
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = config.type;
  osc.frequency.setValueAtTime(config.freq, now);
  if (config.freq2) {
    osc.frequency.linearRampToValueAtTime(config.freq2, now + config.dur / 1000);
  }
  gain.gain.setValueAtTime(config.gain, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + config.dur / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + config.dur / 1000 + 0.05);
}

export function useSoundFeedback() {
  const haptic = useHaptic();

  const play = useCallback(
    (type: SoundType) => {
      playTone(type);
      switch (type) {
        case "success":
          haptic("success");
          break;
        case "delete":
          haptic("warning");
          break;
        case "save":
          haptic("tap");
          break;
        case "click":
          haptic("tap");
          break;
      }
    },
    [haptic]
  );

  return play;
}
