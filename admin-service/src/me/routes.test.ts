/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import type { AdminDb } from '../db/types'
import { members } from '../db/schema'
import { buildDeps, fakeUser } from '../test-utils/harness'
import { createTestDb } from '../test-utils/db'
import { createMeRoutes } from './routes'

const adminEmail = 'admin@corp.test'

const buildApp = (db: AdminDb, callerEmail: string | null): Elysia => {
  const user = callerEmail ? fakeUser({ email: callerEmail }) : null
  const deps = buildDeps({ db, user, seedAdminEmail: adminEmail })
  return new Elysia().use(createMeRoutes(deps)) as unknown as Elysia
}

const getMe = (app: Elysia) => app.handle(new Request('http://localhost/admin/me'))

describe('me routes', () => {
  let db: AdminDb
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    ;({ db, cleanup } = await createTestDb())
  })
  afterEach(async () => {
    await cleanup()
  })

  it('401 for an anonymous caller', async () => {
    const res = await getMe(buildApp(db, null))
    expect(res.status).toBe(401)
  })

  it('403 for an authenticated non-member', async () => {
    const res = await getMe(buildApp(db, 'stranger@corp.test'))
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('NOT_A_MEMBER')
  })

  it('returns the caller row with isAdmin:true for the bootstrapped seed admin', async () => {
    const res = await getMe(buildApp(db, adminEmail))
    expect(res.status).toBe(200)
    const me = await res.json()
    expect(me).toMatchObject({ email: adminEmail, status: 'active', isAdmin: true })
  })

  it('returns isAdmin:false for a plain active member', async () => {
    await db.insert(members).values({ id: crypto.randomUUID(), email: 'plain@corp.test', status: 'active' })
    const res = await getMe(buildApp(db, 'plain@corp.test'))
    expect(res.status).toBe(200)
    expect((await res.json()).isAdmin).toBe(false)
  })
})
