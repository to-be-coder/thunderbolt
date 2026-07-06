/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useDatabase } from '@/contexts'
import { computeNewlyGrantedIds, getSeenTeamAgentIds, markTeamAgentsSeen } from '@/dal/seen-team-agents'
import { useTeamAgents as useTeamAgents_default } from '@/dal/use-team-agents'
import { trackEvent } from '@/lib/posthog'

/** App-session guard so `agent_grant_received` fires at most once per agent id,
 *  even though both the composer selector and the Agents page mount this hook. */
const firedGrantEvents = new Set<string>()

/** Reset the per-session telemetry guard. Test-only. */
export const resetGrantEventGuardForTest = (): void => {
  firedGrantEvents.clear()
}

/**
 * Backs the one-time "grant received" highlight (Stage 7 T2). Diffs the live
 * team cards against the device-local seen set and returns the ids that are
 * newly granted, so the selector and the Agents page can highlight them with
 * the SAME treatment. Fires `agent_grant_received` once per new id, then marks
 * the cards seen (persisted) — WITHOUT invalidating the seen snapshot, so the
 * highlight stays visible for the current session and disappears on the next
 * reload. `useTeamAgents` is injectable so component tests drive fixture cards.
 */
export const useNewlyGrantedTeamAgents = (useTeamAgents = useTeamAgents_default): Set<string> => {
  const db = useDatabase()
  const teamCards = useTeamAgents()

  // A per-session snapshot of the seen set: `staleTime: Infinity` keeps it from
  // refetching after we mark cards seen below (a refetch would clear the diff
  // and yank the highlight mid-session). The next full app load reads fresh.
  const { data: seenIds } = useQuery({
    queryKey: ['seen-team-agents'],
    queryFn: () => getSeenTeamAgentIds(db),
    staleTime: Infinity,
  })

  const newlyGranted = seenIds === undefined ? [] : computeNewlyGrantedIds(teamCards, seenIds)
  const newlyGrantedKey = newlyGranted.join(',')

  // Persistence + analytics side effect (a legitimate useEffect): fire the
  // grant-received event for ids not yet reported this session, then latch the
  // cards as seen so the highlight is one-time.
  useEffect(() => {
    if (newlyGranted.length === 0) {
      return
    }
    for (const id of newlyGranted) {
      if (!firedGrantEvents.has(id)) {
        firedGrantEvents.add(id)
        trackEvent('agent_grant_received', { agentId: id })
      }
    }
    void markTeamAgentsSeen(db, newlyGranted)
    // `newlyGrantedKey` is the stable identity of the id set; `db` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newlyGrantedKey])

  return new Set(newlyGranted)
}
