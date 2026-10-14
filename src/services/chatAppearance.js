import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CHAT_CANVAS, normalizeChatCanvas } from '../utils/chatAppearance';

const STORAGE_KEY = 'zannychat.chatCanvas.v1';
let cachedCanvas = DEFAULT_CHAT_CANVAS;

export async function loadChatCanvas() {
  try {
    cachedCanvas = normalizeChatCanvas(await AsyncStorage.getItem(STORAGE_KEY));
  } catch (_) {
    cachedCanvas = DEFAULT_CHAT_CANVAS;
  }
  return cachedCanvas;
}

export function getChatCanvas() {
  return cachedCanvas;
}

export async function saveChatCanvas(value) {
  cachedCanvas = normalizeChatCanvas(value);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, cachedCanvas);
  } catch (_) {
    // The in-memory selection remains valid for the current session.
  }
  return cachedCanvas;
}
