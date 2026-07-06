/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { resetTestDatabase, setupTestDatabase, teardownTestDatabase } from '@/dal/test-utils'

import { createQueryTestWrapper } from '@/test-utils/react-query'
import type { AgentCard } from '@shared/agent-cards'
import { resetGrantEventGuardForTest, useNewlyGrantedTeamAgents } from './use-newly-granted-agents'

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

describe('useNewlyGrantedTeamAgents', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })
  afterAll(async () => {
    await teardownTestDatabase()
  })
  beforeEach(async () => {
    await resetTestDatabase()
    resetGrantEventGuardForTest()
  })
  afterEach(() => {
    cleanup()
  })

  const flushUntil = async (predicate: () => boolean) => {
    for (let i = 0; i < 50; i++) {
      if (predicate()) {
        return
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
    }
    throw new Error('condition never met')
  }

  it('reports newly-granted ids against the seen-set snapshot', async () => {
    const cards = [card('alpha'), card('beta')]
    const useTeamAgents = () => cards

    // Seed the react-query cache so the seen-set snapshot resolves synchronously
    // (the global test setup makes automatic refetch-on-mount timing unreliable).
    const wrapper = createQueryTestWrapper()
    wrapper.queryClient.setQueryData(['seen-team-agents'], ['alpha'])

    const { result } = renderHook(() => useNewlyGrantedTeamAgents(useTeamAgents), { wrapper })

    // Only 'beta' is new — 'alpha' is already in the seen snapshot.
    await flushUntil(() => result.current.size === 1)
    expect(result.current.has('beta')).toBe(true)
    expect(result.current.has('alpha')).toBe(false)

    // The one-time latch (persist to the seen set) is covered by the DAL test
    // `once a card is marked seen it is no longer newly-granted`; here we assert
    // the diff drives the highlight against the snapshot.
  })

  it('highlights nothing when every card is already in the seen snapshot', async () => {
    const cards = [card('alpha'), card('beta')]
    const wrapper = createQueryTestWrapper()
    wrapper.queryClient.setQueryData(['seen-team-agents'], ['alpha', 'beta'])

    const { result } = renderHook(() => useNewlyGrantedTeamAgents(() => cards), { wrapper })
    // Nothing new from the first render onward.
    expect(result.current.size).toBe(0)
  })
})
