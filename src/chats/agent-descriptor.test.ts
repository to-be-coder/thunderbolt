/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import { builtInAgent } from '@/defaults/agents'
import { extensibleTeamAgent, sealedTeamAgent } from '@/test-utils/agent-card-fixtures'
import type { Agent } from '@/types/acp'
import { agentCardToAgent, isSealedForSlash, resolveAgentDescriptor, showsSkillsBar } from './agent-descriptor'

const personalAgent: Agent = {
  id: 'personal-1',
  name: 'My Remote Agent',
  type: 'remote-acp',
  transport: 'websocket',
  url: 'wss://example.com',
  description: null,
  icon: null,
  isSystem: 0,
  enabled: 1,
  deletedAt: null,
  userId: 'user-1',
}

describe('resolveAgentDescriptor', () => {
  it('resolves the Thunderbolt agent from a thunderbolt ref', () => {
    const d = resolveAgentDescriptor({
      agentRef: { kind: 'thunderbolt', agentId: null },
      selectedAgent: builtInAgent,
      teamCards: [],
    })
    expect(d.kind).toBe('thunderbolt')
    expect(d.name).toBe('Thunderbolt')
    expect(d.advertisedModels).toEqual([])
  })

  it('resolves a personal ACP agent (advertises nothing)', () => {
    const d = resolveAgentDescriptor({
      agentRef: { kind: 'personal', agentId: personalAgent.id },
      selectedAgent: personalAgent,
      teamCards: [],
    })
    expect(d.kind).toBe('personal')
    expect(d.advertisedModels).toEqual([])
    expect(d.capabilities).toEqual([])
  })

  it('resolves a team agent from the cache by id', () => {
    const d = resolveAgentDescriptor({
      agentRef: { kind: 'team', agentId: sealedTeamAgent.id },
      selectedAgent: builtInAgent,
      teamCards: [sealedTeamAgent, extensibleTeamAgent],
    })
    expect(d.kind).toBe('team')
    expect(d.category).toBe('sealed')
    expect(d.advertisedModels).toEqual(sealedTeamAgent.advertisedModels)
    expect(d.revoked).toBe(false)
  })

  it('marks a team ref revoked when the card is no longer cached', () => {
    const d = resolveAgentDescriptor({
      agentRef: { kind: 'team', agentId: 'gone' },
      selectedAgent: builtInAgent,
      teamCards: [],
    })
    expect(d.kind).toBe('team')
    expect(d.revoked).toBe(true)
  })
})

describe('showsSkillsBar', () => {
  const desc = (agentRef: Parameters<typeof resolveAgentDescriptor>[0]['agentRef'], selectedAgent: Agent) =>
    resolveAgentDescriptor({ agentRef, selectedAgent, teamCards: [sealedTeamAgent, extensibleTeamAgent] })

  it('is true for Thunderbolt and EXTENSIBLE company agents, false for sealed + personal', () => {
    expect(showsSkillsBar(desc({ kind: 'thunderbolt', agentId: null }, builtInAgent))).toBe(true)
    expect(showsSkillsBar(desc({ kind: 'team', agentId: extensibleTeamAgent.id }, builtInAgent))).toBe(true)
    expect(showsSkillsBar(desc({ kind: 'team', agentId: sealedTeamAgent.id }, builtInAgent))).toBe(false)
    expect(showsSkillsBar(desc({ kind: 'personal', agentId: personalAgent.id }, personalAgent))).toBe(false)
  })
})

describe('isSealedForSlash', () => {
  it('is true for sealed company + personal ACP agents only', () => {
    const teamCards = [sealedTeamAgent, extensibleTeamAgent]
    expect(
      isSealedForSlash(
        resolveAgentDescriptor({
          agentRef: { kind: 'team', agentId: sealedTeamAgent.id },
          selectedAgent: builtInAgent,
          teamCards,
        }),
      ),
    ).toBe(true)
    expect(
      isSealedForSlash(
        resolveAgentDescriptor({
          agentRef: { kind: 'personal', agentId: personalAgent.id },
          selectedAgent: personalAgent,
          teamCards,
        }),
      ),
    ).toBe(true)
    expect(
      isSealedForSlash(
        resolveAgentDescriptor({
          agentRef: { kind: 'team', agentId: extensibleTeamAgent.id },
          selectedAgent: builtInAgent,
          teamCards,
        }),
      ),
    ).toBe(false)
    expect(
      isSealedForSlash(
        resolveAgentDescriptor({
          agentRef: { kind: 'thunderbolt', agentId: null },
          selectedAgent: builtInAgent,
          teamCards,
        }),
      ),
    ).toBe(false)
  })
})

describe('agentCardToAgent', () => {
  it('synthesizes a valid Agent carrying the card identity', () => {
    const agent = agentCardToAgent(sealedTeamAgent)
    expect(agent.id).toBe(sealedTeamAgent.id)
    expect(agent.name).toBe(sealedTeamAgent.name)
    expect(agent.type).toBe('managed-acp')
  })
})
