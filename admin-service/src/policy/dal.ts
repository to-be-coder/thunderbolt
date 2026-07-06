/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { eq } from 'drizzle-orm'
import { defaultOrgPolicy, type OrgPolicy } from '@shared/agent-cards'
import type { AdminDb } from '../db/types'
import { orgPolicy } from '../db/schema'

/** Fixed primary key enforcing a single org_policy row. */
export const orgPolicyRowId = 'org'

/** Read the org policy as the shared `OrgPolicy` envelope shape. Falls back to
 *  `defaultOrgPolicy` when no row has been configured (consumer / no-org mode). */
export const getOrgPolicy = async (db: AdminDb): Promise<OrgPolicy> => {
  const row = await db
    .select()
    .from(orgPolicy)
    .where(eq(orgPolicy.id, orgPolicyRowId))
    .limit(1)
    .then((rows) => rows[0] ?? null)
  if (!row) {
    return defaultOrgPolicy
  }
  return {
    personalAgentPolicy: row.personalAgentPolicy,
    userModelsAllowed: row.userModelsAllowed,
    mcpPolicy: row.mcpPolicy,
    mcpAllowlist: row.mcpAllowlist,
    blockedExtensions: row.blockedExtensions,
    blockedIntegrations: row.blockedIntegrations,
  }
}

/** Upsert the single org policy row. */
export const putOrgPolicy = async (db: AdminDb, policy: OrgPolicy): Promise<OrgPolicy> => {
  await db
    .insert(orgPolicy)
    .values({
      id: orgPolicyRowId,
      personalAgentPolicy: policy.personalAgentPolicy,
      userModelsAllowed: policy.userModelsAllowed,
      mcpPolicy: policy.mcpPolicy,
      mcpAllowlist: policy.mcpAllowlist,
      blockedExtensions: policy.blockedExtensions,
      blockedIntegrations: policy.blockedIntegrations,
    })
    .onConflictDoUpdate({
      target: orgPolicy.id,
      set: {
        personalAgentPolicy: policy.personalAgentPolicy,
        userModelsAllowed: policy.userModelsAllowed,
        mcpPolicy: policy.mcpPolicy,
        mcpAllowlist: policy.mcpAllowlist,
        blockedExtensions: policy.blockedExtensions,
        blockedIntegrations: policy.blockedIntegrations,
      },
    })
  return policy
}
