/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import type { AdminDb } from './db/types'
import { auditEvents, members } from './db/schema'
import { activateMemberByEmail } from './activation'
import { getLiveMemberByEmail } from './members/dal'

describe('activateMemberByEmail', () => {
  let db: AdminDb
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const { createTestDb } = await import('./test-utils/db')
    ;({ db, cleanup } = await createTestDb())
  })
  afterEach(async () => {
    await cleanup()
  })

  it('flips an invited member to active on first sign-in and audits', async () => {
    await db.insert(members).values({ id: crypto.randomUUID(), email: 'inv@corp.test', status: 'invited' })
    await activateMemberByEmail(db, 'INV@corp.test') // case-insensitive match

    const member = await getLiveMemberByEmail(db, 'inv@corp.test')
    expect(member?.status).toBe('active')

    const audit = await db.select().from(auditEvents).where(eq(auditEvents.action, 'member.activate'))
    expect(audit).toHaveLength(1)
  })

  it('is a no-op for an already-active member', async () => {
    await db.insert(members).values({ id: crypto.randomUUID(), email: 'act@corp.test', status: 'active' })
    await activateMemberByEmail(db, 'act@corp.test')
    const audit = await db.select().from(auditEvents).where(eq(auditEvents.action, 'member.activate'))
    expect(audit).toHaveLength(0)
  })

  it('is a no-op for a non-member email (consumer sign-in)', async () => {
    await activateMemberByEmail(db, 'stranger@corp.test')
    const audit = await db.select().from(auditEvents)
    expect(audit).toHaveLength(0)
  })
})
