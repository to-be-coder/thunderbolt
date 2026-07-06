/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { and, eq, isNull } from 'drizzle-orm'
import { Elysia } from 'elysia'
import type { AdminDb } from '../db/types'
import { auditEvents, grants, groupMembers, groups, members, teamAgents } from '../db/schema'
import type { SessionRevoker } from '../lib/context'
import { buildDeps, fakeUser } from '../test-utils/harness'
import { createTestDb } from '../test-utils/db'
import { createMembersRoutes } from './routes'
import { getLiveMemberByEmail } from './dal'

const adminEmail = 'admin@corp.test'

type AppBundle = { app: Elysia; revoked: string[] }

const buildApp = (db: AdminDb, callerEmail: string | null): AppBundle => {
  const revoked: string[] = []
  const revokeSessionsForEmail: SessionRevoker = (email) => {
    revoked.push(email)
    return Promise.resolve()
  }
  const user = callerEmail ? fakeUser({ email: callerEmail }) : null
  const deps = buildDeps({ db, user, seedAdminEmail: adminEmail, revokeSessionsForEmail })
  return { app: new Elysia().use(createMembersRoutes(deps)) as unknown as Elysia, revoked }
}

const post = (app: Elysia, body: unknown) =>
  app.handle(
    new Request('http://localhost/admin/members', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )

describe('members routes', () => {
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
    const { app } = buildApp(db, 'plain@corp.test')
    const res = await post(app, { email: 'new@corp.test' })
    expect(res.status).toBe(403)
  })

  it('invites a member (status invited) and writes an audit row', async () => {
    const { app } = buildApp(db, adminEmail)
    const res = await post(app, { email: 'New@Corp.test' })
    expect(res.status).toBe(201)
    const created = await res.json()
    expect(created.status).toBe('invited')
    expect(created.email).toBe('new@corp.test') // normalized

    const member = await getLiveMemberByEmail(db, 'new@corp.test')
    expect(member?.status).toBe('invited')

    const audit = await db.select().from(auditEvents).where(eq(auditEvents.action, 'member.invite'))
    expect(audit).toHaveLength(1)
    expect(audit[0].actor).toBe(adminEmail)
  })

  it('can invite an admin', async () => {
    const { app } = buildApp(db, adminEmail)
    const res = await post(app, { email: 'newadmin@corp.test', isAdmin: true })
    expect(res.status).toBe(201)
    expect((await res.json()).isAdmin).toBe(true)
  })

  it('rejects a duplicate live member with 409', async () => {
    const { app } = buildApp(db, adminEmail)
    await post(app, { email: 'dup@corp.test' })
    const res = await post(app, { email: 'dup@corp.test' })
    expect(res.status).toBe(409)
  })

  it('remove: soft-deletes the member, cascades edges + exception grants, kills sessions, audits', async () => {
    // Seed a member with a group edge and a member-exception grant.
    const memberId = crypto.randomUUID()
    await db.insert(members).values({ id: memberId, email: 'gone@corp.test', status: 'active' })
    const groupId = crypto.randomUUID()
    await db.insert(groups).values({ id: groupId, name: 'Legal' })
    await db.insert(groupMembers).values({ groupId, memberId })
    const agentId = crypto.randomUUID()
    await db.insert(teamAgents).values({ id: agentId, name: 'Bot', acpUrl: 'wss://a.test/acp', category: 'sealed' })
    const grantId = crypto.randomUUID()
    await db.insert(grants).values({ id: grantId, agentId, targetType: 'member', targetId: memberId })

    const { app, revoked } = buildApp(db, adminEmail)
    const res = await app.handle(
      new Request(`http://localhost/admin/members/${memberId}`, { method: 'DELETE' }),
    )
    expect(res.status).toBe(200)

    // Member soft-deleted.
    const liveMember = await db
      .select()
      .from(members)
      .where(and(eq(members.id, memberId), isNull(members.deletedAt)))
    expect(liveMember).toHaveLength(0)

    // Group edge soft-deleted.
    const liveEdge = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.memberId, memberId), isNull(groupMembers.deletedAt)))
    expect(liveEdge).toHaveLength(0)

    // Member-exception grant soft-deleted.
    const liveGrant = await db.select().from(grants).where(and(eq(grants.id, grantId), isNull(grants.deletedAt)))
    expect(liveGrant).toHaveLength(0)

    // Sessions killed via the injected revoker.
    expect(revoked).toEqual(['gone@corp.test'])

    // Audit written.
    const audit = await db.select().from(auditEvents).where(eq(auditEvents.action, 'member.remove'))
    expect(audit).toHaveLength(1)
  })

  it('lists live members', async () => {
    const { app } = buildApp(db, adminEmail)
    await post(app, { email: 'one@corp.test' })
    await post(app, { email: 'two@corp.test' })
    const res = await app.handle(new Request('http://localhost/admin/members'))
    const list = await res.json()
    // Includes the bootstrapped seed admin + the two invited members.
    const emails = list.map((m: { email: string }) => m.email).sort()
    expect(emails).toContain('one@corp.test')
    expect(emails).toContain('two@corp.test')
    expect(emails).toContain(adminEmail)
  })
})
