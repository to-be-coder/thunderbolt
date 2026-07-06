/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import type { AdminDb } from '../db/types'
import { groupMembers, groups, members } from '../db/schema'
import { buildDeps, fakeUser } from '../test-utils/harness'
import { createTestDb } from '../test-utils/db'
import { createGroupsRoutes } from './routes'

const adminEmail = 'admin@corp.test'

const buildApp = (db: AdminDb, callerEmail: string | null): Elysia => {
  const user = callerEmail ? fakeUser({ email: callerEmail }) : null
  const deps = buildDeps({ db, user, seedAdminEmail: adminEmail })
  return new Elysia().use(createGroupsRoutes(deps)) as unknown as Elysia
}

describe('groups routes — membership list', () => {
  let db: AdminDb
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    ;({ db, cleanup } = await createTestDb())
  })
  afterEach(async () => {
    await cleanup()
  })

  it('rejects a non-admin caller with 403', async () => {
    await db.insert(members).values({ id: crypto.randomUUID(), email: 'plain@corp.test', status: 'active' })
    const groupId = crypto.randomUUID()
    await db.insert(groups).values({ id: groupId, name: 'Legal' })
    const res = await buildApp(db, 'plain@corp.test').handle(
      new Request(`http://localhost/admin/groups/${groupId}/members`),
    )
    expect(res.status).toBe(403)
  })

  it('404 for a missing group', async () => {
    const res = await buildApp(db, adminEmail).handle(
      new Request('http://localhost/admin/groups/nope/members'),
    )
    expect(res.status).toBe(404)
  })

  it('lists live members of a group, excluding soft-deleted edges', async () => {
    const groupId = crypto.randomUUID()
    await db.insert(groups).values({ id: groupId, name: 'Legal' })
    const memberId = crypto.randomUUID()
    const goneId = crypto.randomUUID()
    await db.insert(members).values([
      { id: memberId, email: 'in@corp.test', status: 'active' },
      { id: goneId, email: 'out@corp.test', status: 'active' },
    ])
    await db.insert(groupMembers).values([
      { groupId, memberId },
      { groupId, memberId: goneId, deletedAt: new Date() },
    ])

    const res = await buildApp(db, adminEmail).handle(
      new Request(`http://localhost/admin/groups/${groupId}/members`),
    )
    expect(res.status).toBe(200)
    const list = await res.json()
    expect(list).toHaveLength(1)
    expect(list[0].email).toBe('in@corp.test')
  })
})
