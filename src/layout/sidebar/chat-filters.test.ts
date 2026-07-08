/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import { builtInAgent } from '@/defaults/agents'
import type { ChatThread } from '@/types'
import {
  chatFiltersReducer,
  hasActiveFilters,
  initialChatFilters,
  passesChatFilters,
  type ChatFilters,
} from './chat-filters'

const thread = (
  agentKind: ChatThread['agentKind'],
  agentId: string | null,
): Pick<ChatThread, 'agentKind' | 'agentId'> => ({ agentKind, agentId }) as Pick<ChatThread, 'agentKind' | 'agentId'>

const thunderbolt = thread('thunderbolt', null)
const personal = thread('personal', 'personal-1')
const team = thread('team', 'team-1')

describe('chatFiltersReducer', () => {
  it('toggles an agent id on and off', () => {
    const once = chatFiltersReducer(initialChatFilters, { type: 'toggleAgent', id: 'team-1' })
    expect(once.agentIds).toEqual(['team-1'])
    const off = chatFiltersReducer(once, { type: 'toggleAgent', id: 'team-1' })
    expect(off.agentIds).toEqual([])
  })

  it('clears every filter in one action', () => {
    const dirty: ChatFilters = { agentIds: ['a', 'b'] }
    expect(chatFiltersReducer(dirty, { type: 'clear' })).toEqual(initialChatFilters)
  })
})

describe('hasActiveFilters', () => {
  it('is active only when at least one agent is selected', () => {
    expect(hasActiveFilters(initialChatFilters)).toBe(false)
    expect(hasActiveFilters({ agentIds: ['x'] })).toBe(true)
  })
})

describe('passesChatFilters', () => {
  it('passes everything with no filters', () => {
    for (const t of [thunderbolt, personal, team]) {
      expect(passesChatFilters(t, initialChatFilters)).toBe(true)
    }
  })

  it('narrows by agent id (built-in matches the built-in id)', () => {
    const filters: ChatFilters = { agentIds: [builtInAgent.id] }
    expect(passesChatFilters(thunderbolt, filters)).toBe(true)
    expect(passesChatFilters(personal, filters)).toBe(false)
    expect(passesChatFilters(team, filters)).toBe(false)
  })

  it('narrows by a personal agent id', () => {
    const filters: ChatFilters = { agentIds: ['personal-1'] }
    expect(passesChatFilters(personal, filters)).toBe(true)
    expect(passesChatFilters(thunderbolt, filters)).toBe(false)
  })
})
