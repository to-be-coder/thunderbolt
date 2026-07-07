/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { asc } from 'drizzle-orm'
import type { AnyDrizzleDatabase } from '../db/database-interface'
import { teamAgentsCacheTable } from '../db/tables'
import { HttpError } from '@/lib/http'
import { nowIso } from '../lib/utils'
import type { AgentCard } from '@shared/agent-cards'

/**
 * DAL for the device-local `team_agents_cache` table — grant-filtered team
 * agent cards from org discovery (shared/agent-cards.ts). Never synced;
 * replaced wholesale on every successful discovery, cleared when the org
 * revokes access (401/403) and on sign-out (`src/lib/cleanup.ts`).
 */

type TeamAgentsCacheRow = typeof teamAgentsCacheTable.$inferSelect

/** Map a raw cache row into the display-only {@link AgentCard} shape. Exported
 *  so the live `useTeamAgents` hook can reuse it over a compilable query. */
export const rowToCard = (row: TeamAgentsCacheRow): AgentCard => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  description: row.description,
  category: row.category,
  capabilities: row.capabilities,
  advertisedModels: row.advertisedModels,
  integrations: row.integrations ?? undefined,
  toolKinds: row.toolKinds ?? undefined,
  accepts: row.accepts ?? undefined,
  modes: row.modes ?? undefined,
  managedBy: row.managedBy,
  grantedVia: row.grantedVia,
})

/** Replace the entire cache with the cards from a fresh discovery response.
 *  Wholesale swap (delete-all + insert) — the discovery envelope is always the
 *  complete grant-filtered set, so reconciliation would be busywork. */
export const replaceTeamAgentsCache = async (db: AnyDrizzleDatabase, cards: AgentCard[]): Promise<void> => {
  const fetchedAt = nowIso()
  await db.transaction(async (tx) => {
    await tx.delete(teamAgentsCacheTable)
    for (const card of cards) {
      await tx.insert(teamAgentsCacheTable).values({ ...card, fetchedAt })
    }
  })
}

/** Drizzle select for all cached team agent cards, alpha by name. Shared by the
 *  imperative {@link getTeamAgentsCache} and the live `useTeamAgents` hook (which
 *  wraps it in `toCompilableQuery`). */
export const getTeamAgentsCacheQuery = (db: AnyDrizzleDatabase) =>
  db.select().from(teamAgentsCacheTable).orderBy(asc(teamAgentsCacheTable.name))

/** All cached team agent cards, alpha by name. */
export const getTeamAgentsCache = async (db: AnyDrizzleDatabase): Promise<AgentCard[]> => {
  const rows = await getTeamAgentsCacheQuery(db)
  return rows.map(rowToCard)
}

/** Drop every cached card. Called on discovery 401/403 (grant revoked /
 *  signed out server-side) and from the sign-out wipe. Hard delete is correct
 *  here — this is a device-local cache, not user data. */
export const clearTeamAgentsCache = async (db: AnyDrizzleDatabase): Promise<void> => {
  await db.delete(teamAgentsCacheTable)
}

/** Classify a discovery failure and clear the cache when the org rejected the
 *  caller (401/403 → the user can no longer see team agents on this device).
 *  Network/5xx failures keep the cached cards so the user can keep working
 *  offline. Returns whether the cache was cleared. Stage 3's discovery client
 *  funnels its error path through here (mirrors `refreshSystemAgents`). */
export const clearTeamAgentsCacheOnAuthError = async (db: AnyDrizzleDatabase, error: unknown): Promise<boolean> => {
  if (!(error instanceof HttpError)) {
    return false
  }
  const status = error.response.status
  if (status !== 401 && status !== 403) {
    return false
  }
  await clearTeamAgentsCache(db)
  return true
}
