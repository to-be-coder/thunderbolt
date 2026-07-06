/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { desc } from 'drizzle-orm'
import type { AdminDb } from '../db/types'
import { auditEvents } from '../db/schema'

/** A single audit entry. `actor` is the resolved admin email; `target` names the
 *  affected entity (e.g. `member:<id>`); `diff` captures the before/after or the
 *  payload of the change. */
export type AuditInput = {
  actor: string
  action: string
  target: string
  diff?: Record<string, unknown>
}

/**
 * Write one audit event. Call this INSIDE the same `db.transaction` as the
 * mutation it records (pass the transaction handle as `db`) so a failed audit
 * write rolls the mutation back — audit completeness is an acceptance criterion.
 */
export const writeAudit = async (db: AdminDb, input: AuditInput): Promise<void> => {
  await db.insert(auditEvents).values({
    id: crypto.randomUUID(),
    actor: input.actor,
    action: input.action,
    target: input.target,
    diff: input.diff ?? {},
  })
}

/** Most-recent-first audit log, capped. Admin-only read surface. */
export const listAuditEvents = async (db: AdminDb, limit = 200) =>
  db.select().from(auditEvents).orderBy(desc(auditEvents.ts)).limit(limit)
