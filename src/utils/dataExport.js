// Portable, privacy-conscious personal data export helpers. Never include
// auth tokens, signed media URLs, or private storage paths in a user export.
export function sanitizeExportMessage(row = {}) {
  return {
    id: row.id ?? null,
    conversationId: row.conversation_id ?? row.conversationId ?? null,
    senderId: row.sender_id ?? row.senderId ?? null,
    text: typeof row.text === 'string' ? row.text : '',
    createdAt: row.created_at ?? row.createdAt ?? null,
    editedAt: row.edited_at ?? row.editedAt ?? null,
    deletedAt: row.deleted_at ?? row.deletedAt ?? null,
    replyToId: row.reply_to_id ?? row.replyToId ?? null,
    attachment: row.media_type ? {
      type: row.media_type,
      name: row.media_name ?? null,
      sizeBytes: row.media_size ?? null,
      durationSeconds: row.media_duration ?? null,
      included: false,
    } : null,
    sharedUserId: row.shared_user_id ?? row.sharedUserId ?? null,
  };
}

export function buildPersonalDataExport({ account, profile, memberships, conversations, messages, preferences, exportedAt = new Date().toISOString() }) {
  return {
    product: 'ZannyChat',
    schemaVersion: 1,
    exportedAt,
    notice: 'This export includes account/profile data, your conversation memberships, and message history currently readable by this account. Attachment files and private media URLs are intentionally excluded. Other participants may appear in conversation identifiers and message sender IDs.',
    account: {
      id: account?.id ?? null,
      email: account?.email ?? null,
      createdAt: account?.created_at ?? account?.createdAt ?? null,
      lastSignInAt: account?.last_sign_in_at ?? account?.lastSignInAt ?? null,
    },
    profile: profile ? {
      id: profile.id ?? null,
      name: profile.name ?? null,
      status: profile.status ?? null,
      avatarColor: profile.avatar_color ?? profile.avatarColor ?? null,
      avatarUrl: profile.avatar_url ?? profile.avatarUrl ?? null,
      createdAt: profile.created_at ?? profile.createdAt ?? null,
    } : null,
    conversationMemberships: (memberships || []).map((row) => ({
      conversationId: row.conversation_id ?? row.conversationId ?? null,
      joinedAt: row.joined_at ?? row.joinedAt ?? null,
      lastReadAt: row.last_read_at ?? row.lastReadAt ?? null,
      favorite: Boolean(row.is_favorite ?? row.isFavorite),
      muted: Boolean(row.is_muted ?? row.isMuted),
      archived: Boolean(row.is_archived ?? row.isArchived),
    })),
    conversations: (conversations || []).map((row) => ({
      id: row.id ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      name: row.name ?? null,
      isGroup: Boolean(row.is_group ?? row.isGroup),
    })),
    messages: (messages || []).map(sanitizeExportMessage),
    localPreferences: preferences || {},
  };
}
