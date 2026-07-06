/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { AdminDb } from '../db/types'
import { grants, groupMembers, groups, members, teamAgents } from '../db/schema'
import { createTestDb } from '../test-utils/db'
import { resolveVisibleAgents } from './grant-math'

/** Insert a published agent and return its id. */
const seedAgent = async (db: AdminDb, name: string, status: 'draft' | 'published' = 'published'): Promise<string> => {
  const id = crypto.randomUUID()
  await db.insert(teamAgents).values({ id, name, acpUrl: 'wss://agent.test/acp', category: 'sealed', status })
  return id
}

const seedMember = async (db: AdminDb, email: string): Promise<string> => {
  const id = crypto.randomUUID()
  await db.insert(members).values({ id, email, status: 'active' })
  return id
}

const seedGroup = async (db: AdminDb, name: string): Promise<string> => {
  const id = crypto.randomUUID()
  await db.insert(groups).values({ id, name })
  return id
}

describe('resolveVisibleAgents (grant math)', () => {
  let db: AdminDb
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    ;({ db, cleanup } = await createTestDb())
  })
  afterEach(async () => {
    await cleanup()
  })

  it('resolves an agent granted to a group the member belongs to', async () => {
    const memberId = await seedMember(db, 'a@corp.test')
    const groupId = await seedGroup(db, 'Legal')
    await db.insert(groupMembers).values({ groupId, memberId })
    const agentId = await seedAgent(db, 'Legal Research')
    await db.insert(grants).values({ id: crypto.randomUUID(), agentId, targetType: 'group', targetId: groupId })

    const visible = await resolveVisibleAgents(db, memberId)
    expect(visible).toEqual([{ agentId, grantedVia: 'Legal' }])
  })

  it('unions agents across TWO groups and dedupes a shared agent (member of 2 groups)', async () => {
    const memberId = await seedMember(db, 'b@corp.test')
    const legal = await seedGroup(db, 'Legal')
    const eng = await seedGroup(db, 'Engineering')
    await db.insert(groupMembers).values({ groupId: legal, memberId })
    await db.insert(groupMembers).values({ groupId: eng, memberId })

    const legalAgent = await seedAgent(db, 'Legal Bot')
    const engAgent = await seedAgent(db, 'Eng Bot')
    const sharedAgent = await seedAgent(db, 'Shared Bot')

    await db.insert(grants).values([
      { id: crypto.randomUUID(), agentId: legalAgent, targetType: 'group', targetId: legal },
      { id: crypto.randomUUID(), agentId: engAgent, targetType: 'group', targetId: eng },
      // Shared agent granted to BOTH groups — must appear exactly once.
      { id: crypto.randomUUID(), agentId: sharedAgent, targetType: 'group', targetId: legal },
      { id: crypto.randomUUID(), agentId: sharedAgent, targetType: 'group', targetId: eng },
    ])

    const visible = await resolveVisibleAgents(db, memberId)
    expect(visible.map((entry) => entry.agentId).sort()).toEqual([legalAgent, engAgent, sharedAgent].sort())
    expect(visible.filter((entry) => entry.agentId === sharedAgent)).toHaveLength(1)
  })

  it('resolves an everyone-grant for a member in no groups', async () => {
    const memberId = await seedMember(db, 'c@corp.test')
    const agentId = await seedAgent(db, 'Company Wide')
    await db.insert(grants).values({ id: crypto.randomUUID(), agentId, targetType: 'everyone', targetId: null })

    const visible = await resolveVisibleAgents(db, memberId)
    expect(visible).toEqual([{ agentId, grantedVia: 'Everyone' }])
  })

  it('resolves an individual member exception grant', async () => {
    const memberId = await seedMember(db, 'd@corp.test')
    const otherId = await seedMember(db, 'other@corp.test')
    const agentId = await seedAgent(db, 'Exception Bot')
    await db.insert(grants).values({ id: crypto.randomUUID(), agentId, targetType: 'member', targetId: memberId })

    expect(await resolveVisibleAgents(db, memberId)).toEqual([{ agentId, grantedVia: 'Direct grant' }])
    // The exception does NOT leak to another member.
    expect(await resolveVisibleAgents(db, otherId)).toEqual([])
  })

  it('member exception wins grantedVia precedence over a group grant', async () => {
    const memberId = await seedMember(db, 'e@corp.test')
    const groupId = await seedGroup(db, 'Legal')
    await db.insert(groupMembers).values({ groupId, memberId })
    const agentId = await seedAgent(db, 'Both Bot')
    await db.insert(grants).values([
      { id: crypto.randomUUID(), agentId, targetType: 'group', targetId: groupId },
      { id: crypto.randomUUID(), agentId, targetType: 'member', targetId: memberId },
    ])

    const visible = await resolveVisibleAgents(db, memberId)
    expect(visible).toEqual([{ agentId, grantedVia: 'Direct grant' }])
  })

  it('excludes draft (unpublished) agents', async () => {
    const memberId = await seedMember(db, 'f@corp.test')
    const draftAgent = await seedAgent(db, 'Draft Bot', 'draft')
    await db.insert(grants).values({ id: crypto.randomUUID(), agentId: draftAgent, targetType: 'everyone', targetId: null })
    expect(await resolveVisibleAgents(db, memberId)).toEqual([])
  })

  it('revocation: removing (soft-deleting) a grant excludes the agent on the NEXT resolve', async () => {
    const memberId = await seedMember(db, 'g@corp.test')
    const groupId = await seedGroup(db, 'Legal')
    await db.insert(groupMembers).values({ groupId, memberId })
    const agentId = await seedAgent(db, 'Revocable Bot')
    const grantId = crypto.randomUUID()
    await db.insert(grants).values({ id: grantId, agentId, targetType: 'group', targetId: groupId })

    expect(await resolveVisibleAgents(db, memberId)).toHaveLength(1)

    await db.update(grants).set({ deletedAt: new Date() }).where(eq(grants.id, grantId))

    expect(await resolveVisibleAgents(db, memberId)).toEqual([])
  })
})
