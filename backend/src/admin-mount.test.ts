/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Integration test for the admin-service mount inside backend's app.
 *
 * Proves the CROSS-PACKAGE runtime path works: backend's Drizzle `db` instance
 * executes the admin-service's own table definitions (from the sibling package's
 * separate `drizzle-orm` copy). This works because drizzle keys table identity
 * on global `Symbol.for("drizzle:*")`, shared across module copies — this test
 * would fail loudly if that assumption ever broke.
 */

import { members } from '@admin/db/schema'
import type { AdminDb } from '@admin/index'
import type { Auth } from '@/auth/elysia-plugin'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createApp } from '@/index'
import { createTestDb } from '@/test-utils/db'

const buildAuth = (user: { id: string; email: string; isAnonymous: boolean } | null): Auth =>
  ({
    api: { getSession: () => Promise.resolve(user ? { user, session: {} } : null) },
  }) as unknown as Auth

describe('admin-service mount', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>['db']
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    ;({ db, cleanup } = await createTestDb())
  })
  afterEach(async () => {
    await cleanup()
  })

  it('serves /v1/admin/discovery and returns 401 when unauthenticated', async () => {
    const app = await createApp({ database: db, auth: buildAuth(null) })
    const res = await app.handle(new Request('http://localhost/v1/admin/discovery'))
    expect(res.status).toBe(401)
  })

  it('resolves an active member (backend db + admin-service tables) to a 200 DiscoveryResponse', async () => {
    // Cast bridges backend's vs the admin-service's drizzle copies (nominally
    // distinct Column classes); the insert executes correctly at runtime.
    await (db as unknown as AdminDb)
      .insert(members)
      .values({ id: crypto.randomUUID(), email: 'member@corp.test', status: 'active' })
    const app = await createApp({
      database: db,
      auth: buildAuth({ id: 'u1', email: 'member@corp.test', isAnonymous: false }),
    })
    const res = await app.handle(new Request('http://localhost/v1/admin/discovery'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(['agents', 'policy'])
    expect(body.agents).toEqual([])
  })
})
