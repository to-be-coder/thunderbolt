/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { eq } from 'drizzle-orm'
import type { AnyDrizzleDatabase } from '../db/database-interface'
import { orgPolicyTable } from '../db/tables'
import { nowIso } from '../lib/utils'
import { defaultOrgPolicy, type OrgPolicy } from '@shared/agent-cards'

/**
 * DAL for the device-local one-row `org_policy` table — the `OrgPolicy` half
 * of the discovery envelope (shared/agent-cards.ts). Never synced. No cached
 * row means consumer / no-org mode: {@link getOrgPolicy} returns
 * `defaultOrgPolicy` so every consumer can treat the policy as always present.
 */

const orgPolicyRowId = 'org-policy'

/** The cached org policy, or the consumer/no-org default when none is cached. */
export const getOrgPolicy = async (db: AnyDrizzleDatabase): Promise<OrgPolicy> => {
  const row = await db.select().from(orgPolicyTable).where(eq(orgPolicyTable.id, orgPolicyRowId)).get()
  return row ? row.policy : { ...defaultOrgPolicy, mcpAllowlist: [...defaultOrgPolicy.mcpAllowlist] }
}

/** Persist the policy from a fresh discovery envelope.
 *  PowerSync local-only tables are SQLite views (no ON CONFLICT), so this is
 *  the SELECT-then-INSERT/UPDATE pattern used by the other secrets/cache DALs. */
export const setOrgPolicy = async (db: AnyDrizzleDatabase, policy: OrgPolicy): Promise<void> => {
  const fetchedAt = nowIso()
  const existing = await db
    .select({ id: orgPolicyTable.id })
    .from(orgPolicyTable)
    .where(eq(orgPolicyTable.id, orgPolicyRowId))
    .get()

  if (existing) {
    await db.update(orgPolicyTable).set({ policy, fetchedAt }).where(eq(orgPolicyTable.id, orgPolicyRowId))
    return
  }
  await db.insert(orgPolicyTable).values({ id: orgPolicyRowId, policy, fetchedAt })
}

/** Drop the cached policy — subsequent reads fall back to `defaultOrgPolicy`
 *  (consumer/no-org mode). Called alongside the team-agents cache clear on
 *  discovery 401/403 and from the sign-out wipe. */
export const clearOrgPolicy = async (db: AnyDrizzleDatabase): Promise<void> => {
  await db.delete(orgPolicyTable)
}
