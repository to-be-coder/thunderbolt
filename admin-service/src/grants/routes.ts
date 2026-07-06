/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Elysia, t } from 'elysia'
import type { ServiceDeps } from '../lib/context'
import { authorizeAdmin } from '../lib/context'
import { writeAudit } from '../audit/audit'
import { getLiveAgentById } from '../agents/dal'
import { findLiveGrant, getLiveGrantById, insertGrant, listLiveGrants, softDeleteGrant } from './dal'

/**
 * Grants API — wire an agent to a target (group | everyone | member exception).
 * Individual member grants are logged as EXCEPTIONS in the audit trail (T4).
 *
 *  POST   /admin/grants       create a grant
 *  DELETE /admin/grants/:id   revoke a grant
 *  GET    /admin/grants       grant views
 */
export const createGrantsRoutes = (deps: ServiceDeps) =>
  new Elysia({ name: 'admin-grants', prefix: '/admin/grants' })
    .post(
      '/',
      async ({ body, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }

        const agent = await getLiveAgentById(deps.db, body.agentId)
        if (!agent) {
          set.status = 404
          return { error: 'Agent not found' }
        }

        const targetId = body.targetType === 'everyone' ? null : (body.targetId ?? null)
        if (body.targetType !== 'everyone' && !targetId) {
          set.status = 422
          return { error: 'targetId is required for group and member grants' }
        }

        const existing = await findLiveGrant(deps.db, body.agentId, body.targetType, targetId)
        if (existing) {
          set.status = 409
          return { error: 'Grant already exists', code: 'GRANT_EXISTS' }
        }

        const isException = body.targetType === 'member'
        const grant = await deps.db.transaction(async (tx) => {
          const created = await insertGrant(tx, { agentId: body.agentId, targetType: body.targetType, targetId })
          await writeAudit(tx, {
            actor: authz.value.email,
            // Individual member grants are recorded as explicit exceptions.
            action: isException ? 'grant.create.exception' : 'grant.create',
            target: `grant:${created.id}`,
            diff: { agentId: body.agentId, targetType: body.targetType, targetId, exception: isException },
          })
          return created
        })

        set.status = 201
        return grant
      },
      {
        body: t.Object({
          agentId: t.String({ minLength: 1 }),
          targetType: t.Union([t.Literal('group'), t.Literal('everyone'), t.Literal('member')]),
          targetId: t.Optional(t.String()),
        }),
      },
    )
    .get('/', async ({ request, set }) => {
      const authz = await authorizeAdmin(deps, request.headers)
      if (!authz.ok) {
        set.status = authz.status
        return authz.body
      }
      return listLiveGrants(deps.db)
    })
    .delete(
      '/:id',
      async ({ params, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }
        const grant = await getLiveGrantById(deps.db, params.id)
        if (!grant) {
          set.status = 404
          return { error: 'Grant not found' }
        }
        await deps.db.transaction(async (tx) => {
          await softDeleteGrant(tx, params.id)
          await writeAudit(tx, {
            actor: authz.value.email,
            action: grant.targetType === 'member' ? 'grant.revoke.exception' : 'grant.revoke',
            target: `grant:${params.id}`,
            diff: { agentId: grant.agentId, targetType: grant.targetType, targetId: grant.targetId },
          })
        })
        // Invalidate any IN-FLIGHT ACP sessions to this agent whose caller no
        // longer holds a grant (Stage 4 T1). Runs after the revoke commits so
        // the revalidation sees the new grant state.
        await deps.onGrantRevoked(grant.agentId)
        return { success: true }
      },
      { params: t.Object({ id: t.String() }) },
    )
