/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { AdminDb } from '../db/types'
import { grants, members, teamAgents } from '../db/schema'
import { createTestDb } from '../test-utils/db'
import { softDeleteGrant } from './dal'
import { resolveAgentAccess } from './access'

const seedMember = async (db: AdminDb, email: string, status: 'invited' | 'active' = 'active'): Promise<string> => {
  const id = crypto.randomUUID()
  await db.insert(members).values({ id, email, status })
  return id
}

const seedAgent = async (
  db: AdminDb,
  acpUrl: string,
  status: 'draft' | 'published' = 'published',
): Promise<string> => {
  const id = crypto.randomUUID()
  await db.insert(teamAgents).values({ id, name: 'Bot', acpUrl, category: 'sealed', status })
  return id
}

const grantEveryone = async (db: AdminDb, agentId: string): Promise<string> => {
  const id = crypto.randomUUID()
  await db.insert(grants).values({ id, agentId, targetType: 'everyone', targetId: null })
  return id
}

describe('resolveAgentAccess — the per-session grant check', () => {
  let db: AdminDb
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    ;({ db, cleanup } = await createTestDb())
  })
  afterEach(async () => {
    await cleanup()
  })

  it('GRANTED: returns the agent ACP URL (resolved server-side) for a member with a live grant', async () => {
    await seedMember(db, 'm@corp.test')
    const agentId = await seedAgent(db, 'wss://agent.test/acp')
    await grantEveryone(db, agentId)

    expect(await resolveAgentAccess(db, 'm@corp.test', agentId)).toEqual({ acpUrl: 'wss://agent.test/acp' })
  })

  it('is case/space-insensitive on the caller email (normalizes before lookup)', async () => {
    await seedMember(db, 'm@corp.test')
    const agentId = await seedAgent(db, 'wss://agent.test/acp')
    await grantEveryone(db, agentId)

    expect(await resolveAgentAccess(db, '  M@Corp.Test ', agentId)).toEqual({ acpUrl: 'wss://agent.test/acp' })
  })

  it('UNGRANTED: returns null when the member holds no grant to the agent', async () => {
    await seedMember(db, 'm@corp.test')
    const agentId = await seedAgent(db, 'wss://agent.test/acp')
    // No grant inserted.
    expect(await resolveAgentAccess(db, 'm@corp.test', agentId)).toBeNull()
  })

  it('REVOKED: returns null once the grant is soft-deleted (feeds in-flight revalidation)', async () => {
    await seedMember(db, 'm@corp.test')
    const agentId = await seedAgent(db, 'wss://agent.test/acp')
    const grantId = await grantEveryone(db, agentId)

    expect(await resolveAgentAccess(db, 'm@corp.test', agentId)).not.toBeNull()
    await softDeleteGrant(db, grantId)
    expect(await resolveAgentAccess(db, 'm@corp.test', agentId)).toBeNull()
  })

  it('refuses an INACTIVE (invited-only) member even with a matching grant', async () => {
    await seedMember(db, 'pending@corp.test', 'invited')
    const agentId = await seedAgent(db, 'wss://agent.test/acp')
    await grantEveryone(db, agentId)

    expect(await resolveAgentAccess(db, 'pending@corp.test', agentId)).toBeNull()
  })

  it('refuses an unknown caller (no member row)', async () => {
    const agentId = await seedAgent(db, 'wss://agent.test/acp')
    await grantEveryone(db, agentId)

    expect(await resolveAgentAccess(db, 'nobody@corp.test', agentId)).toBeNull()
  })

  it('refuses a DRAFT (unpublished) agent even with a grant (grant math filters it)', async () => {
    await seedMember(db, 'm@corp.test')
    const agentId = await seedAgent(db, 'wss://agent.test/acp', 'draft')
    await grantEveryone(db, agentId)

    expect(await resolveAgentAccess(db, 'm@corp.test', agentId)).toBeNull()
  })
})
