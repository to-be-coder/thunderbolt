/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { toCompilableQuery } from '@powersync/drizzle-driver'
import { useQuery } from '@powersync/tanstack-react-query'
import { useDatabase } from '@/contexts'
import type { AgentCard } from '@shared/agent-cards'
import { getTeamAgentsCacheQuery, rowToCard } from './team-agents-cache'

/**
 * Live hook over the device-local `team_agents_cache` table — the grant-filtered
 * team agent cards from org discovery (Stage 3). In dev / consumer mode the cache
 * is empty, so this returns `[]`; component tests inject a fixture `AgentCard[]`
 * via the `useTeamAgents` prop the composer surfaces accept.
 */
export const useTeamAgents = (): AgentCard[] => {
  const db = useDatabase()
  const { data = [] } = useQuery({
    queryKey: ['team-agents'],
    query: toCompilableQuery(getTeamAgentsCacheQuery(db)),
  })
  return data.map(rowToCard)
}
