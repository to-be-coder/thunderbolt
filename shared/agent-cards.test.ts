/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import { defaultOrgPolicy, type AgentCard, type AgentCardCapability, type OrgPolicy } from './agent-cards'

/**
 * Key-set contract tests for the frozen AgentCard shape (INVARIANT 2).
 *
 * `AssertExactKeys` fails to compile when the type's key set drifts from the
 * frozen list in EITHER direction — so accidentally adding a field capable of
 * carrying instructions/prompts/tool wiring breaks CI at type-check AND at
 * `bun test`, forcing the change through contract review.
 */
type AssertExactKeys<T, Keys extends PropertyKey> = [keyof T] extends [Keys]
  ? [Keys] extends [keyof T]
    ? true
    : never
  : never

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
] as const

const agentCardCapabilityKeys = ['label', 'credentialMode', 'connected'] as const

const orgPolicyKeys = ['personalAgentPolicy', 'userModelsAllowed', 'mcpPolicy', 'mcpAllowlist', 'blockedExtensions'] as const

// Type-level assertions — these lines stop compiling on any key drift.
const agentCardKeySetIsFrozen: AssertExactKeys<AgentCard, (typeof agentCardKeys)[number]> = true
const capabilityKeySetIsFrozen: AssertExactKeys<AgentCardCapability, (typeof agentCardCapabilityKeys)[number]> = true
const orgPolicyKeySetIsFrozen: AssertExactKeys<OrgPolicy, (typeof orgPolicyKeys)[number]> = true

describe('agent-cards frozen contract', () => {
  it('AgentCard has exactly the frozen key set (INVARIANT 2)', () => {
    expect(agentCardKeySetIsFrozen).toBe(true)

    const card: AgentCard = {
      id: 'team-agent-1',
      name: 'Legal Research',
      icon: 'scale',
      description: 'Answers questions against the legal knowledge base.',
      category: 'sealed',
      capabilities: [{ label: 'Search Confluence', credentialMode: 'as_you', connected: false }],
      advertisedModels: ['gpt-oss-120b'],
      managedBy: 'Acme Corp',
      grantedVia: 'Legal team',
    }
    expect(Object.keys(card).sort()).toEqual([...agentCardKeys].sort())
  })

  it('AgentCardCapability has exactly the frozen key set', () => {
    expect(capabilityKeySetIsFrozen).toBe(true)

    const capability: Required<AgentCardCapability> = {
      label: 'Search Confluence',
      credentialMode: 'service_account',
      connected: true,
    }
    expect(Object.keys(capability).sort()).toEqual([...agentCardCapabilityKeys].sort())
  })

  it('OrgPolicy has exactly the frozen key set', () => {
    expect(orgPolicyKeySetIsFrozen).toBe(true)
    expect(Object.keys(defaultOrgPolicy).sort()).toEqual([...orgPolicyKeys].sort())
  })

  it('defaultOrgPolicy is the documented consumer/no-org default', () => {
    expect(defaultOrgPolicy).toEqual({
      personalAgentPolicy: 'all',
      userModelsAllowed: true,
      mcpPolicy: 'allow',
      mcpAllowlist: [],
      blockedExtensions: [],
    })
  })
})
