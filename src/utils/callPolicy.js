export const TERMINAL_CALL_STATUSES = Object.freeze(['declined', 'cancelled', 'ended', 'missed', 'failed']);

export function isTerminalCallStatus(status) {
  return TERMINAL_CALL_STATUSES.includes(status);
}

export function canStartCall({ conversationId, participantId, isGroup, callType }) {
  return Boolean(conversationId && participantId && !isGroup && ['audio', 'video'].includes(callType));
}

export function formatCallDuration(totalSeconds) {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getCallEndStatus({ isCaller = false, status = 'accepted' } = {}) {
  // The database accepts only caller-cancel or callee-decline while ringing.
  // Once accepted, either participant ends the active media session.
  if (status === 'ringing') return isCaller ? 'cancelled' : 'declined';
  return 'ended';
}
