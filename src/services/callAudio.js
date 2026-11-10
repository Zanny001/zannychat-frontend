import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const sources = {
  incoming: require('../../assets/sounds/call_ring.wav'),
  outgoing: require('../../assets/sounds/call_dialtone.wav'),
};
const players = { incoming: null, outgoing: null };
let starting = null;
let generation = 0;

function getPlayer(mode) {
  if (!players[mode]) {
    players[mode] = createAudioPlayer(sources[mode]);
    players[mode].loop = true;
    players[mode].volume = mode === 'incoming' ? 0.78 : 0.62;
  }
  return players[mode];
}

export async function startCallTone(mode = 'incoming') {
  const selectedMode = mode === 'outgoing' ? 'outgoing' : 'incoming';
  if (starting) return starting;
  const token = ++generation;
  const task = (async () => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      // Answer/decline/cancel may happen while audio mode is being prepared.
      if (token !== generation) return false;
      const activePlayer = getPlayer(selectedMode);
      activePlayer.loop = true;
      activePlayer.play();
      return true;
    } catch (error) {
      console.warn('[calls] local call tone unavailable:', error?.message || error);
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
  for (const activePlayer of Object.values(players)) {
    if (!activePlayer) continue;
    try {
      activePlayer.pause();
      Promise.resolve(activePlayer.seekTo?.(0)).catch(() => {});
    } catch (_) {
      // Audio is best-effort; it must never block answering or ending calls.
    }
  }
}
