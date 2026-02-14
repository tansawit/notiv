import { STORAGE_KEYS } from '../shared/constants';
import { getLocalStorageItems } from '../shared/chrome-storage';

let audioContext: AudioContext | null = null;
let soundEnabled: boolean | null = null;

async function loadSoundPreference(): Promise<boolean> {
  if (soundEnabled !== null) {
    return soundEnabled;
  }
  try {
    const items = await getLocalStorageItems<Record<string, unknown>>([STORAGE_KEYS.captureSoundEnabled]);
    soundEnabled = items?.[STORAGE_KEYS.captureSoundEnabled] === true;
    return soundEnabled;
  } catch {
    soundEnabled = false;
    return false;
  }
}

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export async function playCapturePop(): Promise<void> {
  const enabled = await loadSoundPreference();
  if (!enabled) {
    return;
  }

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = 0.08;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(440, now + duration);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch {
    // Audio playback failed silently
  }
}

export function invalidateSoundPreference(): void {
  soundEnabled = null;
}
