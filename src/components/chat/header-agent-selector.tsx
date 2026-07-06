/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useChat, type Chat } from '@ai-sdk/react'
import { useShallow } from 'zustand/react/shallow'
import { useChatStore } from '@/chats/chat-store'
import type { ThunderboltUIMessage } from '@/types'
import { ChatAgentSelector } from './chat-agent-selector'

/**
 * Mounts the {@link ChatAgentSelector} in the chat header's top-left slot (beside
 * the sidebar toggle), per PRD §2.3. The Header renders outside the chat
 * instance's session context, so the current session is read from the store with
 * optional chaining (never `useCurrentChatSession`, which throws when absent).
 * `readOnly` is derived here — the same `hasMessages` signal the composer uses —
 * so the control locks once the thread has messages (Stage 1 agentRef immutability).
 */
const HeaderAgentSelectorInner = ({ chatInstance }: { chatInstance: Chat<ThunderboltUIMessage> }) => {
  const { messages } = useChat({ chat: chatInstance })
  return <ChatAgentSelector readOnly={messages.length > 0} />
}

export const HeaderAgentSelector = () => {
  const chatInstance = useChatStore(
    useShallow((state) => state.sessions.get(state.currentSessionId ?? '')?.chatInstance),
  )
  if (!chatInstance) {
    return null
  }
  return <HeaderAgentSelectorInner chatInstance={chatInstance} />
}
