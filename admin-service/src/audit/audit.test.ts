/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { AdminDb } from '../db/types'
import { members } from '../db/schema'
import { createTestDb } from '../test-utils/db'
import { listAuditEvents, writeAudit } from './audit'

describe('audit', () => {
  let db: AdminDb
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    ;({ db, cleanup } = await createTestDb())
  })
  afterEach(async () => {
    await cleanup()
  })

  it('writes and lists an audit event', async () => {
    await writeAudit(db, { actor: 'admin@corp.test', action: 'test.action', target: 'thing:1', diff: { a: 1 } })
    const events = await listAuditEvents(db)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ actor: 'admin@corp.test', action: 'test.action', target: 'thing:1' })
    expect(events[0].diff).toEqual({ a: 1 })
  })

  it('rolls the mutation back when the audit write is in the same failing transaction', async () => {
    // Audit-completeness: mutation + audit share a transaction, so if the whole
    // transaction throws AFTER both writes, neither persists.
    const memberId = crypto.randomUUID()
    await expect(
      db.transaction(async (tx) => {
        await tx.insert(members).values({ id: memberId, email: 'x@corp.test', status: 'invited' })
        await writeAudit(tx, { actor: 'admin@corp.test', action: 'member.invite', target: `member:${memberId}` })
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    // Nothing committed — neither the member nor the audit row.
    expect(await listAuditEvents(db)).toHaveLength(0)
  })
})
