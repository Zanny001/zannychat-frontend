import { Platform } from 'react-native';
import { backendFetch, BACKEND_ENABLED } from './backendClient';

// Best-effort, authenticated diagnostics. Never send tokens, IDs, message
// content, full URLs, or arbitrary application state.
export async function reportClientRenderError({ sector, route, error, componentStack }) {
  if (!BACKEND_ENABLED) return null;
  const errorName = typeof error?.name === 'string' ? error.name.slice(0, 80) : 'Error';
  try {
    const result = await backendFetch('/diagnostics/client-error', {
      method: 'POST',
      body: JSON.stringify({
        sector,
        route,
        platform: Platform.OS === 'web' ? 'web' : Platform.OS,
        phase: 'render',
        errorName,
        componentStack: typeof componentStack === 'string' ? componentStack.slice(0, 1800) : '',
        occurredAt: new Date().toISOString(),
      }),
    });
    return result?.eventId || null;
  } catch (_) {
    return null;
  }
}
