# Pinned messages 1.2.24

Pinned-message bookmarks now include a minimized conversation routing object so the hub can open the source conversation. The chat screen accepts `targetMessageId`, searches the loaded page and up to eight older pages, scrolls to the message, and highlights it using the existing message-search visual treatment. If the target is unavailable in that bounded search, the UI explains that the message may have been deleted or lies further back in history.

This is still local-only bookmarking. It does not create a server-side pin, sync between devices, guarantee that a deleted message can be recovered, or encrypt the AsyncStorage record independently.
