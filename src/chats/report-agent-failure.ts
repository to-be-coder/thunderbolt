/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { getDemoAdminApi } from '@/admin/api/hooks'
import { isDemoMode } from '@/lib/demo-mode'

/**
 * Report an AGENT-side connection failure to the admin plane (spec §3.1) — the
 * fresh per-chat connection to a team agent failed at session start. Only for
 * agent-side failures (a member's own offline state is never reported), and only
 * for team agents (personal agents have no owning admin).
 *
 * In demo mode this writes into the in-memory admin store so the admin Health
 * line increments live. In production a member→admin-service emission is a
 * backend task (the count is deduped admin-side at read time regardless).
 */
export const reportAgentConnectionFailure = (agentId: string, errorKind: string): void => {
  if (!isDemoMode()) {
    return
  }
  void getDemoAdminApi().recordConnectionFailure({ agentId, memberId: 'demo-current-member', errorKind })
}
