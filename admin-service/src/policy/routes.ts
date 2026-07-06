/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Elysia, t } from 'elysia'
import type { ServiceDeps } from '../lib/context'
import { authorizeAdmin } from '../lib/context'
import { writeAudit } from '../audit/audit'
import { getOrgPolicy, putOrgPolicy } from './dal'

/**
 * Org policy — the envelope delivered alongside the cards in discovery.
 *
 *  GET /admin/policy   read
 *  PUT /admin/policy   replace
 */
export const createPolicyRoutes = (deps: ServiceDeps) =>
  new Elysia({ name: 'admin-policy', prefix: '/admin/policy' })
    .get('/', async ({ request, set }) => {
      const authz = await authorizeAdmin(deps, request.headers)
      if (!authz.ok) {
        set.status = authz.status
        return authz.body
      }
      return getOrgPolicy(deps.db)
    })
    .put(
      '/',
      async ({ body, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }
        const policy = await deps.db.transaction(async (tx) => {
          const saved = await putOrgPolicy(tx, body)
          await writeAudit(tx, {
            actor: authz.value.email,
            action: 'policy.update',
            target: 'org_policy',
            diff: { policy: body },
          })
          return saved
        })
        return policy
      },
      {
        body: t.Object({
          personalAgentPolicy: t.Union([t.Literal('all'), t.Literal('no_native'), t.Literal('company_only')]),
          userModelsAllowed: t.Boolean(),
          mcpPolicy: t.Union([t.Literal('allow'), t.Literal('allowlist'), t.Literal('block')]),
          mcpAllowlist: t.Array(t.String()),
        }),
      },
    )
