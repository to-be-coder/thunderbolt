/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { and, eq, isNull } from 'drizzle-orm'
import type { AdminDb } from '../db/types'
import { groupMembers, groups, members } from '../db/schema'
import type { Member } from '../members/dal'

export type Group = typeof groups.$inferSelect
export type GroupMember = typeof groupMembers.$inferSelect

export const listLiveGroups = async (db: AdminDb): Promise<Group[]> =>
  db.select().from(groups).where(isNull(groups.deletedAt))

export const getLiveGroupById = async (db: AdminDb, id: string): Promise<Group | null> =>
  db
    .select()
    .from(groups)
    .where(and(eq(groups.id, id), isNull(groups.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null)

export const insertGroup = async (db: AdminDb, name: string): Promise<Group> =>
  db
    .insert(groups)
    .values({ id: crypto.randomUUID(), name })
    .returning()
    .then((rows) => rows[0])

/** Soft-delete a group and its live membership edges. */
export const softDeleteGroup = async (db: AdminDb, id: string): Promise<void> => {
  const now = new Date()
  await db.update(groups).set({ deletedAt: now }).where(eq(groups.id, id))
  await db
    .update(groupMembers)
    .set({ deletedAt: now })
    .where(and(eq(groupMembers.groupId, id), isNull(groupMembers.deletedAt)))
}

/** Live members belonging to a group (join `group_members` → `members`). Excludes
 *  soft-deleted edges and soft-deleted members. Powers the S3 membership view. */
export const listGroupMembers = async (db: AdminDb, groupId: string): Promise<Member[]> =>
  db
    .select({
      id: members.id,
      email: members.email,
      status: members.status,
      isAdmin: members.isAdmin,
      createdAt: members.createdAt,
      deletedAt: members.deletedAt,
    })
    .from(groupMembers)
    .innerJoin(members, eq(groupMembers.memberId, members.id))
    .where(and(eq(groupMembers.groupId, groupId), isNull(groupMembers.deletedAt), isNull(members.deletedAt)))

/** Live membership edge for a (group, member) pair, or null. */
export const getLiveEdge = async (db: AdminDb, groupId: string, memberId: string): Promise<GroupMember | null> =>
  db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.memberId, memberId), isNull(groupMembers.deletedAt)))
    .limit(1)
    .then((rows) => rows[0] ?? null)

/** Add a member to a group. Revives a previously soft-deleted edge if present so
 *  the partial unique index never collides. */
export const addMemberToGroup = async (db: AdminDb, groupId: string, memberId: string): Promise<void> => {
  const revived = await db
    .update(groupMembers)
    .set({ deletedAt: null })
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.memberId, memberId)))
    .returning()
  if (revived.length > 0) {
    return
  }
  await db.insert(groupMembers).values({ groupId, memberId })
}

export const removeMemberFromGroup = async (db: AdminDb, groupId: string, memberId: string): Promise<void> => {
  await db
    .update(groupMembers)
    .set({ deletedAt: new Date() })
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.memberId, memberId), isNull(groupMembers.deletedAt)))
}
