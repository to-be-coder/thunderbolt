/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { toCompilableQuery } from '@powersync/drizzle-driver'
import { useQuery } from '@powersync/tanstack-react-query'
import { useDatabase } from '@/contexts'
import { defaultOrgPolicy, type OrgPolicy } from '@shared/agent-cards'
import { getOrgPolicyQuery } from './org-policy'

/**
 * Live hook over the device-local one-row `org_policy` table (the `OrgPolicy`
 * half of the discovery envelope, shared/agent-cards.ts). No cached row means
 * consumer / no-org mode, so this returns `defaultOrgPolicy` — every consumer
 * can treat the policy as always present.
 *
 * Drives the Agents-page section gating (agents-page-spec §5) and the Library
 * "not allowed by your organization" states reactively, mirroring the async
 * {@link getOrgPolicy} DAL used off the render path.
 */
export const useOrgPolicy = (): OrgPolicy => {
  const db = useDatabase()
  const { data = [] } = useQuery({
    queryKey: ['org-policy'],
    query: toCompilableQuery(getOrgPolicyQuery(db)),
  })
  const row = data[0]
  return row ? row.policy : { ...defaultOrgPolicy, mcpAllowlist: [...defaultOrgPolicy.mcpAllowlist] }
}
