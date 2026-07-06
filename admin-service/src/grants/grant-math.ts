/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { and, eq, isNull } from 'drizzle-orm'
import type { AdminDb } from '../db/types'
import { grants, groupMembers, groups, teamAgents } from '../db/schema'

/** An agent a member may see, plus the display name of the grant that won. */
export type ResolvedAgentGrant = { agentId: string; grantedVia: string }

/** Display precedence when multiple grants expose the same agent: an individual
 *  member exception is most specific, then group, then everyone. The winning
 *  grant supplies `grantedVia`. */
const precedence: Record<'member' | 'group' | 'everyone', number> = { member: 3, group: 2, everyone: 1 }

/**
 * Resolve which published agents a member may see and why.
 *
 * caller → their live group memberships → live grants (everyone | matching group
 * | member exception) → published, non-deleted agents. Deduped across grants;
 * the highest-precedence grant supplies the `grantedVia` label.
 */
export const resolveVisibleAgents = async (db: AdminDb, memberId: string): Promise<ResolvedAgentGrant[]> => {
  const memberGroups = await db
    .select({ groupId: groupMembers.groupId, groupName: groups.name })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.memberId, memberId), isNull(groupMembers.deletedAt), isNull(groups.deletedAt)))

  const groupNameById = new Map(memberGroups.map((row) => [row.groupId, row.groupName]))

  // Only published, non-deleted agents are ever visible.
  const liveGrants = await db
    .select({
      agentId: grants.agentId,
      targetType: grants.targetType,
      targetId: grants.targetId,
    })
    .from(grants)
    .innerJoin(teamAgents, eq(teamAgents.id, grants.agentId))
    .where(and(isNull(grants.deletedAt), isNull(teamAgents.deletedAt), eq(teamAgents.status, 'published')))

  const winners = new Map<string, { rank: number; grantedVia: string }>()

  for (const grant of liveGrants) {
    const grantedVia = grantAppliesTo(grant, memberId, groupNameById)
    if (grantedVia === null) {
      continue
    }
    const rank = precedence[grant.targetType]
    const current = winners.get(grant.agentId)
    if (!current || rank > current.rank) {
      winners.set(grant.agentId, { rank, grantedVia })
    }
  }

  return [...winners.entries()].map(([agentId, { grantedVia }]) => ({ agentId, grantedVia }))
}

/** Whether a grant applies to this member, returning the `grantedVia` label if
 *  it does, or null if it doesn't. */
const grantAppliesTo = (
  grant: { targetType: 'group' | 'everyone' | 'member'; targetId: string | null },
  memberId: string,
  groupNameById: Map<string, string>,
): string | null => {
  if (grant.targetType === 'everyone') {
    return 'Everyone'
  }
  if (grant.targetType === 'member') {
    return grant.targetId === memberId ? 'Direct grant' : null
  }
  // group
  if (grant.targetId !== null && groupNameById.has(grant.targetId)) {
    return groupNameById.get(grant.targetId) ?? null
  }
  return null
}
