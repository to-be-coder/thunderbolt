/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import type { AgentCard, DiscoveryResponse } from '@shared/agent-cards'
import type { AdminDb } from '../db/types'
import { agentCapabilities, grants, groupMembers, groups, members, teamAgents } from '../db/schema'
import { buildDeps, fakeUser } from '../test-utils/harness'
import { createTestDb } from '../test-utils/db'
import { createDiscoveryRoutes } from './routes'

const orgPolicyKeys = ['personalAgentPolicy', 'userModelsAllowed', 'mcpAllowlist'].sort()
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

const buildApp = (db: AdminDb, email: string | null) => {
  const user = email ? fakeUser({ email }) : null
  const deps = buildDeps({ db, user })
  return new Elysia().use(createDiscoveryRoutes(deps)) as unknown as Elysia
}

const get = (app: Elysia) => app.handle(new Request('http://localhost/admin/discovery'))

describe('GET /admin/discovery', () => {
  let db: AdminDb
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    ;({ db, cleanup } = await createTestDb())
  })
  afterEach(async () => {
    await cleanup()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await get(buildApp(db, null))
    expect(res.status).toBe(401)
  })

  it('returns 403 when the caller is authenticated but not a member', async () => {
    const res = await get(buildApp(db, 'stranger@corp.test'))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden', code: 'NOT_A_MEMBER' })
  })

  it('returns 403 when the member is still invited (not active)', async () => {
    await db.insert(members).values({ id: crypto.randomUUID(), email: 'invited@corp.test', status: 'invited' })
    const res = await get(buildApp(db, 'invited@corp.test'))
    expect(res.status).toBe(403)
  })

  it('returns a DiscoveryResponse matching shared/agent-cards.ts EXACTLY', async () => {
    const memberId = crypto.randomUUID()
    await db.insert(members).values({ id: memberId, email: 'm@corp.test', status: 'active' })
    const groupId = crypto.randomUUID()
    await db.insert(groups).values({ id: groupId, name: 'Legal' })
    await db.insert(groupMembers).values({ groupId, memberId })
    const agentId = crypto.randomUUID()
    await db.insert(teamAgents).values({
      id: agentId,
      name: 'Legal Research',
      icon: 'scale',
      description: 'Answers legal questions.',
      acpUrl: 'wss://agent.test/acp',
      category: 'sealed',
      status: 'published',
      managedBy: 'Acme Corp',
      advertisedModels: ['gpt-oss-120b'],
    })
    await db
      .insert(agentCapabilities)
      .values({ id: crypto.randomUUID(), agentId, label: 'Search Confluence', credentialMode: 'as_you', position: '0' })
    await db.insert(grants).values({ id: crypto.randomUUID(), agentId, targetType: 'group', targetId: groupId })

    const res = await get(buildApp(db, 'm@corp.test'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as DiscoveryResponse

    expect(Object.keys(body).sort()).toEqual(['agents', 'policy'])
    expect(Object.keys(body.policy).sort()).toEqual(orgPolicyKeys)
    expect(body.policy).toEqual({ personalAgentPolicy: 'all', userModelsAllowed: true, mcpAllowlist: [] })

    expect(body.agents).toHaveLength(1)
    const card: AgentCard = body.agents[0]
    expect(Object.keys(card).sort()).toEqual(agentCardKeys)
    expect(card).toEqual({
      id: agentId,
      name: 'Legal Research',
      icon: 'scale',
      description: 'Answers legal questions.',
      category: 'sealed',
      capabilities: [{ label: 'Search Confluence', credentialMode: 'as_you' }],
      advertisedModels: ['gpt-oss-120b'],
      managedBy: 'Acme Corp',
      grantedVia: 'Legal',
    })
  })

  it('revocation: after a grant is removed, the next discovery fetch excludes the card', async () => {
    const memberId = crypto.randomUUID()
    await db.insert(members).values({ id: memberId, email: 'r@corp.test', status: 'active' })
    const agentId = crypto.randomUUID()
    await db.insert(teamAgents).values({
      id: agentId,
      name: 'Revocable',
      acpUrl: 'wss://agent.test/acp',
      category: 'sealed',
      status: 'published',
    })
    const grantId = crypto.randomUUID()
    await db.insert(grants).values({ id: grantId, agentId, targetType: 'everyone', targetId: null })

    const first = (await get(buildApp(db, 'r@corp.test')).then((r) => r.json())) as DiscoveryResponse
    expect(first.agents).toHaveLength(1)

    await db.update(grants).set({ deletedAt: new Date() }).where(eq(grants.id, grantId))

    const second = (await get(buildApp(db, 'r@corp.test')).then((r) => r.json())) as DiscoveryResponse
    expect(second.agents).toEqual([])
  })
})
