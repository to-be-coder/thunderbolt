/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { getDb } from '@/db/database'
import { defaultOrgPolicy, type OrgPolicy } from '@shared/agent-cards'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { clearOrgPolicy, getOrgPolicy, setOrgPolicy } from './org-policy'
import { resetTestDatabase, setupTestDatabase, teardownTestDatabase } from './test-utils'

const orgPolicy: OrgPolicy = {
  personalAgentPolicy: 'no_native',
  userModelsAllowed: false,
  mcpAllowlist: ['https://mcp.acme.example'],
}

beforeAll(async () => {
  await setupTestDatabase()
})

afterAll(async () => {
  await teardownTestDatabase()
})

beforeEach(async () => {
  await resetTestDatabase()
})

describe('org policy DAL', () => {
  it('returns the consumer/no-org default when nothing is cached', async () => {
    expect(await getOrgPolicy(getDb())).toEqual(defaultOrgPolicy)
  })

  it('the returned default is a fresh object (mutation-safe)', async () => {
    const policy = await getOrgPolicy(getDb())
    policy.mcpAllowlist.push('https://mutated.example')
    expect(defaultOrgPolicy.mcpAllowlist).toEqual([])
    expect(await getOrgPolicy(getDb())).toEqual(defaultOrgPolicy)
  })

  it('round-trips a policy through set/get', async () => {
    await setOrgPolicy(getDb(), orgPolicy)
    expect(await getOrgPolicy(getDb())).toEqual(orgPolicy)
  })

  it('set overwrites the previously cached policy (one-row upsert)', async () => {
    await setOrgPolicy(getDb(), orgPolicy)
    await setOrgPolicy(getDb(), { personalAgentPolicy: 'company_only', userModelsAllowed: true, mcpAllowlist: [] })

    expect(await getOrgPolicy(getDb())).toEqual({
      personalAgentPolicy: 'company_only',
      userModelsAllowed: true,
      mcpAllowlist: [],
    })
  })

  it('clear falls back to the default policy', async () => {
    await setOrgPolicy(getDb(), orgPolicy)
    await clearOrgPolicy(getDb())
    expect(await getOrgPolicy(getDb())).toEqual(defaultOrgPolicy)
  })
})
