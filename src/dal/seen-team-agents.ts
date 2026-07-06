/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AnyDrizzleDatabase } from '../db/database-interface'
import type { AgentCard } from '@shared/agent-cards'
import { getSettings, updateSettings } from './settings'

/**
 * Device-local record of which team (company) agent ids the member has already
 * seen. Backs the one-time "grant received" highlight (Stage 7 T2): a card whose
 * id is NOT in this set is newly granted and gets a highlight in BOTH the chat
 * composer's agent selector and the Agents page. Stored as a JSON id array in a
 * single settings row — no migration needed (settings is a generic key/value
 * table). Never a source of truth about grants; purely a "have I shown the
 * highlight yet" latch, so a lost/reset value only re-highlights once.
 */

const seenTeamAgentsKey = 'seen_team_agent_ids'

/** Parse the persisted JSON id array, tolerating an unset/corrupt value. */
const parseSeenIds = (raw: string | null): string[] => {
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** The ids of team agents the member has already been shown. */
export const getSeenTeamAgentIds = async (db: AnyDrizzleDatabase): Promise<string[]> => {
  const { seenTeamAgentIds } = await getSettings(db, { seen_team_agent_ids: String })
  return parseSeenIds(seenTeamAgentIds)
}

/** Union the given ids into the seen set (idempotent). */
export const markTeamAgentsSeen = async (db: AnyDrizzleDatabase, ids: string[]): Promise<void> => {
  if (ids.length === 0) {
    return
  }
  const current = await getSeenTeamAgentIds(db)
  const next = Array.from(new Set([...current, ...ids]))
  // Nothing new to persist — avoid a needless write (and a settings-view churn).
  if (next.length === current.length) {
    return
  }
  await updateSettings(db, { [seenTeamAgentsKey]: JSON.stringify(next) })
}

/** Pure diff: the ids of cards not yet in the seen set, in card order. Exported
 *  for unit testing and reuse by the `useNewlyGrantedTeamAgents` hook. */
export const computeNewlyGrantedIds = (cards: AgentCard[], seenIds: string[]): string[] => {
  const seen = new Set(seenIds)
  return cards.filter((card) => !seen.has(card.id)).map((card) => card.id)
}
