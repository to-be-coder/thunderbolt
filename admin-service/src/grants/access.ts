/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * THE PER-SESSION GRANT CHECK (Stage 4, T1).
 *
 * `resolveAgentAccess` is the single server-side authority for "may this caller
 * open a session to this team agent right now?". It is used in TWO places, so
 * establishment and in-flight revalidation can never diverge:
 *
 *   1. Session establishment — `backend/src/proxy/ws.ts` calls it before opening
 *      the upstream socket. No grant → the WebSocket is refused. It also returns
 *      the agent's `acpUrl`, resolved SERVER-SIDE, so the client never supplies a
 *      URL for a team agent (INVARIANT 2 + SSRF).
 *   2. In-flight revalidation — on grant revoke, the backend re-runs this for
 *      every open session to the affected agent and closes those that lost
 *      access (`grantHub.revalidateAgent`).
 *
 * The caller is identified by email (from the validated ws-bearer). It resolves
 * caller → live active member → visible grants → the agent's live row, returning
 * `null` at any miss (unknown/inactive member, no grant, deleted/unpublished
 * agent). `null` ALWAYS means "refuse".
 */

import { normalizeEmail } from '../lib/email'
import { getLiveMemberByEmail } from '../members/dal'
import { getLiveAgentById } from '../agents/dal'
import { resolveVisibleAgents } from './grant-math'
import type { AdminDb } from '../db/types'

/** The upstream ACP endpoint a granted caller is allowed to reach. */
export type AgentAccess = { acpUrl: string }

/**
 * Resolve whether `email` currently holds a grant to team agent `agentId`,
 * returning the agent's ACP URL when granted or `null` when not. This is the
 * grant-membership check that backs both session establishment and in-flight
 * revalidation — one authority, no drift.
 */
export const resolveAgentAccess = async (
  db: AdminDb,
  email: string,
  agentId: string,
): Promise<AgentAccess | null> => {
  const member = await getLiveMemberByEmail(db, normalizeEmail(email))
  if (!member || member.status !== 'active') {
    return null
  }
  const visible = await resolveVisibleAgents(db, member.id)
  if (!visible.some((entry) => entry.agentId === agentId)) {
    return null
  }
  const agent = await getLiveAgentById(db, agentId)
  return agent ? { acpUrl: agent.acpUrl } : null
}
