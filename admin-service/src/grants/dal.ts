/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { and, eq, isNull } from 'drizzle-orm'
import type { AdminDb } from '../db/types'
import { grants } from '../db/schema'

export type Grant = typeof grants.$inferSelect
export type GrantTargetType = 'group' | 'everyone' | 'member'

export const listLiveGrants = async (db: AdminDb): Promise<Grant[]> =>
  db.select().from(grants).where(isNull(grants.deletedAt))

export const getLiveGrantById = async (db: AdminDb, id: string): Promise<Grant | null> =>
  db
    .select()
    .from(grants)
    .where(and(eq(grants.id, id), isNull(grants.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null)

/** Find an existing live grant for the exact (agent, target) tuple — dedupe guard. */
export const findLiveGrant = async (
  db: AdminDb,
  agentId: string,
  targetType: GrantTargetType,
  targetId: string | null,
): Promise<Grant | null> => {
  const rows = await db
    .select()
    .from(grants)
    .where(and(eq(grants.agentId, agentId), eq(grants.targetType, targetType), isNull(grants.deletedAt)))
  return rows.find((row) => row.targetId === targetId) ?? null
}

export const insertGrant = async (
  db: AdminDb,
  input: { agentId: string; targetType: GrantTargetType; targetId: string | null },
): Promise<Grant> =>
  db
    .insert(grants)
    .values({
      id: crypto.randomUUID(),
      agentId: input.agentId,
      targetType: input.targetType,
      targetId: input.targetId,
    })
    .returning()
    .then((rows) => rows[0])

export const softDeleteGrant = async (db: AdminDb, id: string): Promise<void> => {
  await db.update(grants).set({ deletedAt: new Date() }).where(eq(grants.id, id))
}
