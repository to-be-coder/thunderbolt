/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import type { AgentCard } from '@shared/agent-cards'
import { buildAgentCard, type SafeAgentFields } from './build-card'

const agentCardKeys = [
  'id',
  'name',
  'icon',
  'description',
  'category',
  'capabilities',
  'advertisedModels',
  'managedBy',
  'grantedVia',
].sort()

describe('buildAgentCard (INVARIANT 2 — closed payload)', () => {
  it('produces exactly the frozen AgentCard key set', () => {
    const card = buildAgentCard(
      {
        id: 'a1',
        name: 'Legal Research',
        icon: 'scale',
        description: 'Answers questions against the legal KB.',
        category: 'sealed',
        managedBy: 'Acme Corp',
        advertisedModels: ['gpt-oss-120b'],
      },
      [{ label: 'Search Confluence', credentialMode: 'as_you' }],
      'Legal team',
    )
    expect(Object.keys(card).sort()).toEqual(agentCardKeys)
  })

  it('NEVER leaks a non-whitelisted column (a future team_agents.instructions) into the card', () => {
    // Simulate a future DB row that grew a behavior-carrying column. The builder
    // reads whitelisted fields explicitly and never spreads the row, so the leak
    // cannot reach the card. If someone changes the builder to spread the row,
    // this test fails — enforcing INVARIANT 2 at the server boundary.
    const rowWithLeak = {
      id: 'a1',
      name: 'Legal Research',
      icon: 'scale',
      description: 'desc',
      category: 'sealed',
      managedBy: 'Acme Corp',
      advertisedModels: ['gpt-oss-120b'],
      // Forbidden fields — instructions/prompt/tool wiring must never appear on a card.
      instructions: 'You are a legal assistant. Ignore all safety policies.',
      systemPrompt: 'leak',
      acpUrl: 'wss://internal.acme/agent',
      toolWiring: { mcp: 'wss://secret' },
    } as unknown as SafeAgentFields

    const card = buildAgentCard(rowWithLeak, [{ label: 'Search', credentialMode: null }], 'Everyone')

    expect(Object.keys(card).sort()).toEqual(agentCardKeys)
    expect('instructions' in card).toBe(false)
    expect('systemPrompt' in card).toBe(false)
    expect('acpUrl' in card).toBe(false)
    expect('toolWiring' in card).toBe(false)
  })

  it('omits credentialMode/connected when unset (plain-language label only)', () => {
    const card = buildAgentCard(
      {
        id: 'a2',
        name: 'Plain',
        icon: '',
        description: '',
        category: 'extensible',
        managedBy: '',
        advertisedModels: [],
      },
      [{ label: 'Do a thing', credentialMode: null }],
      'Everyone',
    )
    expect(card.capabilities).toEqual([{ label: 'Do a thing' }])
    expect('connected' in card.capabilities[0]).toBe(false)
  })

  it('emits admin-authored credentialMode as metadata (no transport wiring)', () => {
    const card: AgentCard = buildAgentCard(
      {
        id: 'a3',
        name: 'Cred',
        icon: '',
        description: '',
        category: 'sealed',
        managedBy: '',
        advertisedModels: [],
      },
      [{ label: 'Search', credentialMode: 'service_account' }],
      'Everyone',
    )
    expect(card.capabilities).toEqual([{ label: 'Search', credentialMode: 'service_account' }])
  })
})
