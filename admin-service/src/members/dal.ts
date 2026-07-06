/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { and, eq, isNull } from 'drizzle-orm'
import type { AdminDb } from '../db/types'
import { groupMembers, grants, members } from '../db/schema'
import { normalizeEmail } from '../lib/email'

export type Member = typeof members.$inferSelect

/** Look up the live (non-deleted) member row for a normalized email, if any. */
export const getLiveMemberByEmail = async (db: AdminDb, email: string): Promise<Member | null> =>
  db
    .select()
    .from(members)
    .where(and(eq(members.email, normalizeEmail(email)), isNull(members.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null)

/** Live member by id, or null. */
export const getLiveMemberById = async (db: AdminDb, id: string): Promise<Member | null> =>
  db
    .select()
    .from(members)
    .where(and(eq(members.id, id), isNull(members.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null)

/** All live members. */
export const listLiveMembers = async (db: AdminDb): Promise<Member[]> =>
  db.select().from(members).where(isNull(members.deletedAt))

/** Insert a fresh invited member. Caller guarantees no live row exists for the email. */
export const insertMember = async (
  db: AdminDb,
  input: { email: string; isAdmin: boolean; status?: 'invited' | 'active' },
): Promise<Member> =>
  db
    .insert(members)
    .values({
      id: crypto.randomUUID(),
      email: normalizeEmail(input.email),
      isAdmin: input.isAdmin,
      status: input.status ?? 'invited',
    })
    .returning()
    .then((rows) => rows[0])

/** Flip an invited member to active. Returns the updated row, or null if none matched. */
export const activateMember = async (db: AdminDb, memberId: string): Promise<Member | null> =>
  db
    .update(members)
    .set({ status: 'active' })
    .where(eq(members.id, memberId))
    .returning()
    .then((rows) => rows[0] ?? null)

/**
 * Soft-delete a member and cascade the in-plane effects:
 *  - soft-delete their group memberships,
 *  - soft-delete member-exception grants targeting them.
 * Session invalidation (backend `session` rows) is handled by the caller via the
 * injected session revoker — it lives outside this package's tables.
 */
export const softDeleteMember = async (db: AdminDb, memberId: string): Promise<void> => {
  const now = new Date()
  await db.update(members).set({ deletedAt: now }).where(eq(members.id, memberId))
  await db
    .update(groupMembers)
    .set({ deletedAt: now })
    .where(and(eq(groupMembers.memberId, memberId), isNull(groupMembers.deletedAt)))
  await db
    .update(grants)
    .set({ deletedAt: now })
    .where(and(eq(grants.targetType, 'member'), eq(grants.targetId, memberId), isNull(grants.deletedAt)))
}
