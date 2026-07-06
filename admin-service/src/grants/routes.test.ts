/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import type { AdminDb } from '../db/types'
import { auditEvents, members, teamAgents } from '../db/schema'
import { buildDeps, fakeUser } from '../test-utils/harness'
import { createTestDb } from '../test-utils/db'
import { createGrantsRoutes } from './routes'

const adminEmail = 'admin@corp.test'
const buildApp = (db: AdminDb) =>
  new Elysia().use(
    createGrantsRoutes(buildDeps({ db, user: fakeUser({ email: adminEmail }), seedAdminEmail: adminEmail })),
  ) as unknown as Elysia

const postGrant = (app: Elysia, body: unknown) =>
  app.handle(
    new Request('http://localhost/admin/grants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

describe('grants routes', () => {
  let db: AdminDb
  let cleanup: () => Promise<void>
  let agentId: string

  beforeEach(async () => {
    ;({ db, cleanup } = await createTestDb())
    agentId = crypto.randomUUID()
    await db.insert(teamAgents).values({ id: agentId, name: 'Bot', acpUrl: 'wss://a.test/acp', category: 'sealed' })
  })
  afterEach(async () => {
    await cleanup()
  })

  it('creates an everyone grant and audits as grant.create', async () => {
    const res = await postGrant(buildApp(db), { agentId, targetType: 'everyone' })
    expect(res.status).toBe(201)
    const audit = await db.select().from(auditEvents).where(eq(auditEvents.action, 'grant.create'))
    expect(audit).toHaveLength(1)
  })

  it('logs an individual member grant as an EXCEPTION in audit', async () => {
    const memberId = crypto.randomUUID()
    await db.insert(members).values({ id: memberId, email: 'm@corp.test', status: 'active' })
    const res = await postGrant(buildApp(db), { agentId, targetType: 'member', targetId: memberId })
    expect(res.status).toBe(201)

    const audit = await db.select().from(auditEvents).where(eq(auditEvents.action, 'grant.create.exception'))
    expect(audit).toHaveLength(1)
    expect(audit[0].diff).toMatchObject({ exception: true })
  })

  it('rejects a duplicate grant with 409', async () => {
    const app = buildApp(db)
    await postGrant(app, { agentId, targetType: 'everyone' })
    const res = await postGrant(app, { agentId, targetType: 'everyone' })
    expect(res.status).toBe(409)
  })

  it('revokes a grant (soft delete) and audits', async () => {
    const app = buildApp(db)
    const created = await postGrant(app, { agentId, targetType: 'everyone' }).then((r) => r.json())
    const res = await app.handle(new Request(`http://localhost/admin/grants/${created.id}`, { method: 'DELETE' }))
    expect(res.status).toBe(200)
    const audit = await db.select().from(auditEvents).where(eq(auditEvents.action, 'grant.revoke'))
    expect(audit).toHaveLength(1)
  })
})
