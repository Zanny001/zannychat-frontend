export function getCallHistoryLabel(call, userId, nowMs = Date.now()) {
  if (!call) return 'Call';
  const incoming = call.callee_id === userId;
  const expired = call.status === 'ringing' && Number.isFinite(Date.parse(call.expires_at)) && Date.parse(call.expires_at) <= nowMs;
  const status = expired ? 'missed' : call.status;
  if (status === 'missed') return incoming ? 'Missed incoming call' : 'No answer';
  if (status === 'declined') return incoming ? 'Declined call' : 'Call declined';
  if (status === 'cancelled') return incoming ? 'Caller cancelled' : 'Cancelled call';
  if (status === 'ended') return 'Completed call';
  if (status === 'failed') return 'Call failed';
  if (status === 'accepted') return 'Call in progress';
  return 'Ringing';
}
