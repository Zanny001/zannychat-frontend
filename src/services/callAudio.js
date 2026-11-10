import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// A single local ringtone player is shared by incoming and outgoing call
// screens so navigation transitions cannot leave multiple tones running.
const source = require('../../assets/sounds/call-ring.wav');
let player = null;
let starting = null;

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
  starting = (async () => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      const activePlayer = getPlayer();
      activePlayer.loop = true;
      activePlayer.play();
      return true;
    } catch (error) {
      console.warn('[calls] local ringtone unavailable:', error?.message || error);
      return false;
    } finally {
      starting = null;
    }
  })();
  return starting;
}

export function stopCallTone() {
  if (!player) return;
  try {
    player.pause();
    Promise.resolve(player.seekTo?.(0)).catch(() => {});
  } catch (_) {
    // A ringtone is best-effort; it must never block answering or ending calls.
  }
}
