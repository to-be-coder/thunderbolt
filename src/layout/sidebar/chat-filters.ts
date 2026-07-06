/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { type AgentKind, getAgentRef } from '@/dal/chat-threads'
import { builtInAgent } from '@/defaults/agents'
import type { ChatThread } from '@/types'

/** A selectable agent in the by-agent filter — the built-in agent, a personal
 *  ACP agent, or a cached team agent. */
export type AgentFilterOption = {
  id: string
  label: string
  kind: AgentKind
}

/** In-memory sidebar filter view. Filters are VIEWS, not modes — cleared in one
 *  tap and never persisted across sessions (per-mount `useReducer` state). */
export type ChatFilters = {
  /** Agent ids to include. Empty = every agent. */
  agentIds: string[]
  /** Quick toggle: all threads, company (team) agents, or mine (built-in + personal). */
  companyMine: 'all' | 'company' | 'mine'
}

export const initialChatFilters: ChatFilters = { agentIds: [], companyMine: 'all' }

export type ChatFilterAction =
  | { type: 'toggleAgent'; id: string }
  | { type: 'setCompanyMine'; value: ChatFilters['companyMine'] }
  | { type: 'clear' }

export const chatFiltersReducer = (state: ChatFilters, action: ChatFilterAction): ChatFilters => {
  switch (action.type) {
    case 'toggleAgent': {
      const agentIds = state.agentIds.includes(action.id)
        ? state.agentIds.filter((id) => id !== action.id)
        : [...state.agentIds, action.id]
      return { ...state, agentIds }
    }
    case 'setCompanyMine':
      return { ...state, companyMine: action.value }
    case 'clear':
      return initialChatFilters
  }
}

/** True when any filter is narrowing the view (so the UI can show a clear-all). */
export const hasActiveFilters = (filters: ChatFilters): boolean =>
  filters.agentIds.length > 0 || filters.companyMine !== 'all'

/** The agent-filter key for a thread — the built-in id for thunderbolt threads,
 *  otherwise the personal/team agent id. Matches {@link AgentFilterOption.id}. */
const threadAgentKey = (thread: Pick<ChatThread, 'agentKind' | 'agentId'>): string => {
  const ref = getAgentRef(thread)
  return ref.kind === 'thunderbolt' ? builtInAgent.id : ref.agentId
}

/** Client-side predicate: does a thread pass the current filters? Threads carry
 *  their agentRef, so filtering by agent is a pure predicate over the list. */
export const passesChatFilters = (thread: Pick<ChatThread, 'agentKind' | 'agentId'>, filters: ChatFilters): boolean => {
  const ref = getAgentRef(thread)

  if (filters.companyMine === 'company' && ref.kind !== 'team') {
    return false
  }
  if (filters.companyMine === 'mine' && ref.kind === 'team') {
    return false
  }
  if (filters.agentIds.length > 0 && !filters.agentIds.includes(threadAgentKey(thread))) {
    return false
  }
  return true
}
