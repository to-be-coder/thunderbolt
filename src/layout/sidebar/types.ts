/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { DeleteAllChatsDialogRef } from '@/components/delete-all-chats-dialog'
import type { DeleteChatDialogRef } from '@/components/delete-chat-dialog'
import type { UseMutationResult } from '@tanstack/react-query'
import type { Dispatch, MouseEvent, ReactNode, RefObject } from 'react'
import type { AgentFilterOption, ChatFilterAction, ChatFilters } from './chat-filters'

export type ChatThread = {
  id: string
  title: string | null
  isEncrypted: number
}

export type DeleteChatMutationType = UseMutationResult<void, Error, { id: string }, unknown>

export type DeleteAllChatsMutationType = UseMutationResult<void, Error, void, unknown>

export type ChatActionsProps = {
  isCollapsed: boolean
  debouncedSearchQuery: string
  /** The search input is open — the search button reads as "on" while it is. */
  showSearch: boolean
  deleteAllChatsMutation: DeleteAllChatsMutationType
  deleteAllChatsDialogRef: RefObject<DeleteAllChatsDialogRef | null>
  onSearchClick: (e?: MouseEvent) => void
  /** Rendered between the search and delete buttons (e.g. the filter control),
   *  so the toolbar order reads search · filter · delete. */
  middleSlot?: ReactNode
}

export type ChatListProps = {
  chatThreads: ChatThread[]
  currentChatThreadId?: string
  isCollapsed: boolean
  isMobile: boolean
  debouncedSearchQuery: string
  deleteAllChatsMutation: DeleteAllChatsMutationType
  deleteChatMutation: DeleteChatMutationType
  deleteAllChatsDialogRef: RefObject<DeleteAllChatsDialogRef | null>
  deleteChatDialogRef: RefObject<DeleteChatDialogRef | null>
  threadIdRef: RefObject<string | null>
  searchQuery: string
  showSearch: boolean
  searchInputRef: RefObject<HTMLInputElement | null>
  agentFilterOptions: AgentFilterOption[]
  filters: ChatFilters
  onFilterChange: Dispatch<ChatFilterAction>
  onChatClick: (threadId: string) => void
  onRename: (threadId: string, title: string) => void
  onSearchClick: (e?: MouseEvent) => void
  onSearchQueryChange: (value: string) => void
}

export type ChatListItemProps = {
  thread: ChatThread
  isActive: boolean
  isCollapsed: boolean
  isMobile: boolean
  deleteChatMutation: DeleteChatMutationType
  threadIdRef: RefObject<string | null>
  deleteChatDialogRef: RefObject<DeleteChatDialogRef | null>
  onChatClick: (threadId: string) => void
  onRename: (threadId: string, title: string) => void
}
