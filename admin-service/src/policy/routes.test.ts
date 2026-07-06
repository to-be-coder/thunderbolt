/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { defaultOrgPolicy } from '@shared/agent-cards'
import type { AdminDb } from '../db/types'
import { auditEvents } from '../db/schema'
import { buildDeps, fakeUser } from '../test-utils/harness'
import { createTestDb } from '../test-utils/db'
import { createPolicyRoutes } from './routes'

const adminEmail = 'admin@corp.test'
const buildApp = (db: AdminDb) =>
  new Elysia().use(
    createPolicyRoutes(buildDeps({ db, user: fakeUser({ email: adminEmail }), seedAdminEmail: adminEmail })),
  ) as unknown as Elysia

describe('policy routes', () => {
  let db: AdminDb
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    ;({ db, cleanup } = await createTestDb())
  })
  afterEach(async () => {
    await cleanup()
  })

  it('GET returns the default policy when none is configured', async () => {
    const res = await buildApp(db).handle(new Request('http://localhost/admin/policy'))
    expect(await res.json()).toEqual(defaultOrgPolicy)
  })

  it('PUT upserts the policy and audits; GET reflects it', async () => {
    const app = buildApp(db)
    const next = { personalAgentPolicy: 'company_only' as const, userModelsAllowed: false, mcpAllowlist: ['wss://ok'] }
    const putRes = await app.handle(
      new Request('http://localhost/admin/policy', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      }),
    )
    expect(await putRes.json()).toEqual(next)

    const getRes = await app.handle(new Request('http://localhost/admin/policy'))
    expect(await getRes.json()).toEqual(next)

    const audit = await db.select().from(auditEvents).where(eq(auditEvents.action, 'policy.update'))
    expect(audit).toHaveLength(1)
  })
})
