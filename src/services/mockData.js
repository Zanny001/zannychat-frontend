// Used automatically whenever Supabase env vars aren't set (see
// supabaseClient.js). Lets the frontend be demoed standalone in
// snack.expo.dev before the backend exists — matches the "prototype
// first" step of the build plan.

export const CURRENT_USER = {
  id: 'me',
  name: 'You',
  avatarColor: '#6C5CE7',
  status: 'Building ZannyChat 🚀',
};

export const MOCK_CONTACTS = [
  { id: 'u1', name: 'Amara Okafor', avatarColor: '#FF7A59', online: true },
  { id: 'u2', name: 'Daniel Chen', avatarColor: '#00A8CC', online: false },
  { id: 'u3', name: 'Priya Nair', avatarColor: '#00D2A0', online: true },
  { id: 'u4', name: 'ZannyChat Team', avatarColor: '#3E7BFA', online: true },
];

export const MOCK_CONVERSATIONS = [
  {
    id: 'c1',
    participant: MOCK_CONTACTS[0],
    lastMessage: 'Sent you the deck, take a look 👀',
    lastMessageAt: '09:41',
    unreadCount: 2,
  },
  {
    id: 'c2',
    participant: MOCK_CONTACTS[1],
    lastMessage: 'Split the dinner bill — ₦4,200 each',
    lastMessageAt: 'Yesterday',
    unreadCount: 0,
  },
  {
    id: 'c3',
    participant: MOCK_CONTACTS[2],
    lastMessage: 'Sounds good, see you then!',
    lastMessageAt: 'Yesterday',
    unreadCount: 0,
  },
  {
    id: 'c4',
    participant: MOCK_CONTACTS[3],
    lastMessage: 'Welcome to ZannyChat 🎉',
    lastMessageAt: 'Mon',
    unreadCount: 0,
  },
];

export const MOCK_MESSAGES = {
  c1: [
    { id: 'm1', senderId: 'u1', text: 'Hey! Are we still on for the review?', createdAt: '09:20' },
    { id: 'm2', senderId: 'me', text: 'Yep, 3pm works on my end', createdAt: '09:22' },
    { id: 'm3', senderId: 'u1', text: 'Sent you the deck, take a look 👀', createdAt: '09:41' },
  ],
  c2: [
    { id: 'm4', senderId: 'u2', text: 'That was a fun dinner', createdAt: 'Yesterday' },
    { id: 'm5', senderId: 'u2', text: 'Split the dinner bill — ₦4,200 each', createdAt: 'Yesterday' },
  ],
  c3: [
    { id: 'm6', senderId: 'me', text: 'Same time next week?', createdAt: 'Yesterday' },
    { id: 'm7', senderId: 'u3', text: 'Sounds good, see you then!', createdAt: 'Yesterday' },
  ],
  c4: [
    { id: 'm8', senderId: 'u4', text: 'Welcome to ZannyChat 🎉', createdAt: 'Mon' },
    { id: 'm9', senderId: 'u4', text: 'Try switching your theme in Settings!', createdAt: 'Mon' },
  ],
};
