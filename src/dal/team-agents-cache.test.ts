/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { getDb } from '@/db/database'
import { teamAgentsCacheTable } from '@/db/tables'
import { HttpError } from '@/lib/http'
import { clearLocalData } from '@/lib/cleanup'
import { defaultOrgPolicy, type AgentCard } from '@shared/agent-cards'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import {
  clearTeamAgentsCache,
  clearTeamAgentsCacheOnAuthError,
  getTeamAgentsCache,
  replaceTeamAgentsCache,
} from './team-agents-cache'
import { getOrgPolicy, setOrgPolicy } from './org-policy'
import { resetTestDatabase, setupTestDatabase, teardownTestDatabase } from './test-utils'

const card = (id: string, name: string): AgentCard => ({
  id,
  name,
  icon: 'briefcase',
  description: `${name} description`,
  category: 'sealed',
  capabilities: [{ label: 'Search Confluence', credentialMode: 'as_you', connected: false }],
  advertisedModels: ['gpt-oss-120b'],
  managedBy: 'Acme Corp',
  grantedVia: 'Everyone',
})

beforeAll(async () => {
  await setupTestDatabase()
})

afterAll(async () => {
  await teardownTestDatabase()
})

beforeEach(async () => {
  await resetTestDatabase()
})

describe('team agents cache DAL', () => {
  it('round-trips cards through replace/get, alpha by name', async () => {
    await replaceTeamAgentsCache(getDb(), [card('t2', 'Zulu Agent'), card('t1', 'Alpha Agent')])

    const cards = await getTeamAgentsCache(getDb())
    expect(cards).toHaveLength(2)
    expect(cards.map((c) => c.id)).toEqual(['t1', 't2'])
    expect(cards[0]).toEqual(card('t1', 'Alpha Agent'))
  })

  it('replace is a wholesale swap — cards absent from the new set disappear', async () => {
    await replaceTeamAgentsCache(getDb(), [card('old-1', 'Old One'), card('old-2', 'Old Two')])
    await replaceTeamAgentsCache(getDb(), [card('new-1', 'New One')])

    const cards = await getTeamAgentsCache(getDb())
    expect(cards.map((c) => c.id)).toEqual(['new-1'])
  })

  it('stamps fetchedAt on cached rows', async () => {
    await replaceTeamAgentsCache(getDb(), [card('t1', 'Alpha Agent')])
    const row = await getDb().select().from(teamAgentsCacheTable).get()
    expect(row?.fetchedAt).toBeTruthy()
  })

  it('clearTeamAgentsCache empties the table', async () => {
    await replaceTeamAgentsCache(getDb(), [card('t1', 'Alpha Agent')])
    await clearTeamAgentsCache(getDb())
    expect(await getTeamAgentsCache(getDb())).toEqual([])
  })

  describe('clearTeamAgentsCacheOnAuthError', () => {
    it('clears the cache on 403 (org revoked the grant)', async () => {
      await replaceTeamAgentsCache(getDb(), [card('t1', 'Alpha Agent')])

      const cleared = await clearTeamAgentsCacheOnAuthError(getDb(), new HttpError(new Response(null, { status: 403 })))

      expect(cleared).toBe(true)
      expect(await getTeamAgentsCache(getDb())).toEqual([])
    })

    it('clears the cache on 401 (unauthenticated)', async () => {
      await replaceTeamAgentsCache(getDb(), [card('t1', 'Alpha Agent')])

      const cleared = await clearTeamAgentsCacheOnAuthError(getDb(), new HttpError(new Response(null, { status: 401 })))

      expect(cleared).toBe(true)
      expect(await getTeamAgentsCache(getDb())).toEqual([])
    })

    it('preserves the cache on 5xx (user keeps working offline)', async () => {
      await replaceTeamAgentsCache(getDb(), [card('t1', 'Alpha Agent')])

      const cleared = await clearTeamAgentsCacheOnAuthError(getDb(), new HttpError(new Response(null, { status: 503 })))

      expect(cleared).toBe(false)
      expect(await getTeamAgentsCache(getDb())).toHaveLength(1)
    })

    it('preserves the cache on network errors', async () => {
      await replaceTeamAgentsCache(getDb(), [card('t1', 'Alpha Agent')])

      const cleared = await clearTeamAgentsCacheOnAuthError(getDb(), new TypeError('Network down'))

      expect(cleared).toBe(false)
      expect(await getTeamAgentsCache(getDb())).toHaveLength(1)
    })
  })

  describe('sign-out wipe', () => {
    it('clearLocalData clears the team agents cache and org policy', async () => {
      await replaceTeamAgentsCache(getDb(), [card('t1', 'Alpha Agent')])
      await setOrgPolicy(getDb(), { personalAgentPolicy: 'company_only', userModelsAllowed: false, mcpAllowlist: [] })

      // Stub every side-effectful dep so only the cache-clear step touches the
      // (test) database — mirrors the DI approach in src/lib/cleanup.test.ts.
      await clearLocalData({
        clearAuthToken: () => {},
        clearDeviceId: () => {},
        handleFullWipe: async () => {},
        broadcastDbLifecycle: () => {},
        setSyncEnabled: async () => {},
        resetDatabase: async () => {},
        deleteDbFile: async () => {},
      })

      expect(await getTeamAgentsCache(getDb())).toEqual([])
      expect(await getOrgPolicy(getDb())).toEqual(defaultOrgPolicy)
    })
  })
})
