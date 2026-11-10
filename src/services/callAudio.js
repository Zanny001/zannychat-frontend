import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// A single local ringtone player is shared by incoming and outgoing call
// screens so navigation transitions cannot leave multiple tones running.
const source = require('../../assets/sounds/call_ring.wav');
let player = null;
let starting = null;
let generation = 0;

function getPlayer() {
  if (!player) {
    player = createAudioPlayer(source);
    player.loop = true;
    player.volume = 0.72;
  }
  return player;
}

export async function startCallTone() {
  if (starting) return starting;
  const token = ++generation;
  const task = (async () => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      // Answer/decline may happen while the audio mode is being prepared.
      // Never let a late async completion restart a ringtone after stop.
      if (token !== generation) return false;
      const activePlayer = getPlayer();
      activePlayer.loop = true;
      activePlayer.play();
      return true;
    } catch (error) {
      console.warn('[calls] local ringtone unavailable:', error?.message || error);
      return false;
    } finally {
      if (starting === task) starting = null;
    }
  })();
  starting = task;
  return task;
}

export function stopCallTone() {
  generation += 1;
  starting = null;
  if (!player) return;
  try {
    player.pause();
    Promise.resolve(player.seekTo?.(0)).catch(() => {});
  } catch (_) {
    // A ringtone is best-effort; it must never block answering or ending calls.
  }
}
