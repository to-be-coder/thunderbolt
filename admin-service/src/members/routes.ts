/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Elysia, t } from 'elysia'
import type { ServiceDeps } from '../lib/context'
import { authorizeAdmin } from '../lib/context'
import { normalizeEmail } from '../lib/email'
import { writeAudit } from '../audit/audit'
import { getLiveMemberByEmail, getLiveMemberById, insertMember, listLiveMembers, softDeleteMember } from './dal'

/**
 * Membership admin API — invite by email on the existing magic-link stack.
 * Invited members activate on first sign-in (see `activation.ts`).
 *
 *  POST   /admin/members       invite (email, isAdmin?)
 *  GET    /admin/members       list live members
 *  DELETE /admin/members/:id   remove → soft delete + cascade grants + kill sessions
 */
export const createMembersRoutes = (deps: ServiceDeps) =>
  new Elysia({ name: 'admin-members', prefix: '/admin/members' })
    .post(
      '/',
      async ({ body, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }

        const email = normalizeEmail(body.email)
        const existing = await getLiveMemberByEmail(deps.db, email)
        if (existing) {
          set.status = 409
          return { error: 'Member already exists', code: 'MEMBER_EXISTS' }
        }

        const isAdmin = body.isAdmin ?? false
        const member = await deps.db.transaction(async (tx) => {
          const created = await insertMember(tx, { email, isAdmin })
          await writeAudit(tx, {
            actor: authz.value.email,
            action: 'member.invite',
            target: `member:${created.id}`,
            diff: { email, isAdmin },
          })
          return created
        })

        set.status = 201
        return member
      },
      {
        body: t.Object({
          email: t.String({ format: 'email' }),
          isAdmin: t.Optional(t.Boolean()),
        }),
      },
    )
    .get('/', async ({ request, set }) => {
      const authz = await authorizeAdmin(deps, request.headers)
      if (!authz.ok) {
        set.status = authz.status
        return authz.body
      }
      return listLiveMembers(deps.db)
    })
    .delete(
      '/:id',
      async ({ params, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }

        const member = await getLiveMemberById(deps.db, params.id)
        if (!member) {
          set.status = 404
          return { error: 'Member not found' }
        }

        await deps.db.transaction(async (tx) => {
          await softDeleteMember(tx, member.id)
          await writeAudit(tx, {
            actor: authz.value.email,
            action: 'member.remove',
            target: `member:${member.id}`,
            diff: { email: member.email },
          })
        })

        // Kill live backend sessions AFTER the soft delete commits so revoked
        // bearer tokens stop working immediately (soft-deleting the member row
        // alone never touches Better Auth's `session` rows).
        await deps.revokeSessionsForEmail(member.email)

        return { success: true }
      },
      { params: t.Object({ id: t.String() }) },
    )
