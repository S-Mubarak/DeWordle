type SoundType = "keypress" | "submit" | "win";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume: number = 0.3) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

const SOUND_CONFIGS: Record<SoundType, () => void> = {
  keypress: () => playTone(440, 0.05, "square", 0.1),
  submit: () => {
    playTone(330, 0.1, "sine", 0.2);
    setTimeout(() => playTone(440, 0.1, "sine", 0.2), 50);
  },
  win: () => {
    playTone(523, 0.15, "sine", 0.3);
    setTimeout(() => playTone(659, 0.15, "sine", 0.3), 100);
    setTimeout(() => playTone(784, 0.2, "sine", 0.3), 200);
  },
};

export function playSound(type: SoundType) {
  try {
    SOUND_CONFIGS[type]();
  } catch {
    // Audio context may not be available or user hasn't interacted yet
  }
}

export function initAudioContext() {
  getAudioContext();
}
