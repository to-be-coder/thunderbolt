/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { resetTestDatabase, setupTestDatabase, teardownTestDatabase } from './test-utils'
import { getDb } from '@/db/database'
import { computeNewlyGrantedIds, getSeenTeamAgentIds, markTeamAgentsSeen } from './seen-team-agents'
import type { AgentCard } from '@shared/agent-cards'

const card = (id: string): AgentCard => ({
  id,
  name: `Agent ${id}`,
  icon: '🤖',
  description: '',
  category: 'sealed',
  capabilities: [],
  advertisedModels: [],
  managedBy: 'Platform',
  grantedVia: 'Everyone',
})

describe('computeNewlyGrantedIds', () => {
  it('returns cards whose id is not in the seen set, in card order', () => {
    const cards = [card('a'), card('b'), card('c')]
    expect(computeNewlyGrantedIds(cards, ['b'])).toEqual(['a', 'c'])
  })

  it('returns empty when every card is already seen', () => {
    const cards = [card('a'), card('b')]
    expect(computeNewlyGrantedIds(cards, ['a', 'b'])).toEqual([])
  })

  it('treats an empty seen set as everything-new', () => {
    const cards = [card('a'), card('b')]
    expect(computeNewlyGrantedIds(cards, [])).toEqual(['a', 'b'])
  })
})

describe('seen-team-agents DAL', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await resetTestDatabase()
  })

  it('defaults to an empty seen set when unset', async () => {
    expect(await getSeenTeamAgentIds(getDb())).toEqual([])
  })

  it('persists and unions marked ids (idempotent)', async () => {
    await markTeamAgentsSeen(getDb(), ['a', 'b'])
    expect((await getSeenTeamAgentIds(getDb())).sort()).toEqual(['a', 'b'])

    // Marking an overlapping set adds only the new id, no duplicates.
    await markTeamAgentsSeen(getDb(), ['b', 'c'])
    expect((await getSeenTeamAgentIds(getDb())).sort()).toEqual(['a', 'b', 'c'])
  })

  it('once a card is marked seen it is no longer newly-granted', async () => {
    const cards = [card('a'), card('b')]
    expect(computeNewlyGrantedIds(cards, await getSeenTeamAgentIds(getDb()))).toEqual(['a', 'b'])

    await markTeamAgentsSeen(getDb(), ['a', 'b'])
    expect(computeNewlyGrantedIds(cards, await getSeenTeamAgentIds(getDb()))).toEqual([])
  })
})
