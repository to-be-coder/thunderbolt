/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import type { AgentCard } from '@shared/agent-cards'
import { builtInAgent } from '@/defaults/agents'
import type { Agent } from '@/types/acp'
import { resolveAgentDetailTarget } from './detail'

const card: AgentCard = {
  id: 'sales',
  name: 'Sales Agent',
  icon: 'chart',
  description: 'Drafts outreach',
  category: 'extensible',
  capabilities: [],
  advertisedModels: [],
  managedBy: 'ACME',
  grantedVia: 'Sales (group)',
}

const personal: Agent = {
  id: 'custom-1',
  name: 'my-cli-agent',
  type: 'remote-acp',
  transport: 'websocket',
  url: 'wss://home.example.dev/agent',
  description: null,
  icon: null,
  isSystem: 0,
  enabled: 1,
  deletedAt: null,
  userId: 'user-1',
}

describe('resolveAgentDetailTarget', () => {
  it('resolves the built-in id to the thunderbolt view', () => {
    expect(resolveAgentDetailTarget(builtInAgent.id, [card], [personal])).toEqual({ kind: 'thunderbolt' })
  })

  it('resolves a cached team card id to the team view', () => {
    expect(resolveAgentDetailTarget('sales', [card], [personal])).toEqual({ kind: 'team', card })
  })

  it('resolves a personal agent id to the personal view', () => {
    expect(resolveAgentDetailTarget('custom-1', [card], [personal])).toEqual({ kind: 'personal', agent: personal })
  })

  it('collapses an unknown / revoked id to the revoked state', () => {
    expect(resolveAgentDetailTarget('gone', [card], [personal])).toEqual({ kind: 'revoked' })
  })

  it('collapses a missing id to the revoked state', () => {
    expect(resolveAgentDetailTarget(undefined, [card], [personal])).toEqual({ kind: 'revoked' })
  })
})
