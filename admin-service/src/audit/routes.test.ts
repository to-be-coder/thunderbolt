/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import type { AdminDb } from '../db/types'
import { members } from '../db/schema'
import { buildDeps, fakeUser } from '../test-utils/harness'
import { createTestDb } from '../test-utils/db'
import { writeAudit } from './audit'
import { createAuditRoutes } from './routes'

const adminEmail = 'admin@corp.test'

const buildApp = (db: AdminDb, callerEmail: string | null): Elysia => {
  const user = callerEmail ? fakeUser({ email: callerEmail }) : null
  const deps = buildDeps({ db, user, seedAdminEmail: adminEmail })
  return new Elysia().use(createAuditRoutes(deps)) as unknown as Elysia
}

const get = (app: Elysia, qs = '') => app.handle(new Request(`http://localhost/admin/audit${qs}`))

describe('audit routes', () => {
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
    const res = await get(buildApp(db, 'plain@corp.test'))
    expect(res.status).toBe(403)
  })

  it('lists audit events most-recent-first', async () => {
    await writeAudit(db, { actor: adminEmail, action: 'member.invite', target: 'member:1' })
    await writeAudit(db, { actor: adminEmail, action: 'group.create', target: 'group:1' })
    const res = await get(buildApp(db, adminEmail))
    expect(res.status).toBe(200)
    const events = await res.json()
    expect(events).toHaveLength(2)
  })

  it('filters by action', async () => {
    await writeAudit(db, { actor: adminEmail, action: 'member.invite', target: 'member:1' })
    await writeAudit(db, { actor: adminEmail, action: 'group.create', target: 'group:1' })
    const res = await get(buildApp(db, adminEmail), '?action=group.create')
    const events = await res.json()
    expect(events).toHaveLength(1)
    expect(events[0].action).toBe('group.create')
  })
})
