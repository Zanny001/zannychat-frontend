export const CHANNEL_POST_DRAFT_PREFIX = '@zannychat/channel-post-draft/';
export const CHANNEL_POST_DRAFT_LIMIT = 4000;

export function channelPostDraftKey(channelId, userId) {
  const id = typeof channelId === 'string' ? channelId.trim() : '';
  const user = typeof userId === 'string' ? userId.trim() : '';
  return id && user ? `${CHANNEL_POST_DRAFT_PREFIX}${user}/${id}` : null;
}

export function normalizeChannelPostDraft(value) {
  return typeof value === 'string' ? value.slice(0, CHANNEL_POST_DRAFT_LIMIT) : '';
}
