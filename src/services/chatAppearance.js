import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CHAT_CANVAS, normalizeChatCanvas } from '../utils/chatAppearance';

const STORAGE_KEY = 'zannychat.chatCanvas.v1';
let cachedCanvas = DEFAULT_CHAT_CANVAS;
let loadError = '';

export async function loadChatCanvas() {
  try {
    cachedCanvas = normalizeChatCanvas(await AsyncStorage.getItem(STORAGE_KEY));
    loadError = '';
  } catch {
    cachedCanvas = DEFAULT_CHAT_CANVAS;
    loadError = 'Saved chat appearance could not be loaded from this device. The default canvas is active for this session.';
  }
  return cachedCanvas;
}

export function getChatCanvas() {
  return cachedCanvas;
}

export function getChatCanvasLoadError() {
  return loadError;
}

export async function saveChatCanvas(value) {
  cachedCanvas = normalizeChatCanvas(value);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, cachedCanvas);
    loadError = '';
  } catch (error) {
    // Keep the in-memory selection for this session, but let the screen
    // distinguish it from a value that was actually persisted.
    throw error;
  }
  return cachedCanvas;
}
