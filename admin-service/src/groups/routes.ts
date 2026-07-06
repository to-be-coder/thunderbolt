/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Elysia, t } from 'elysia'
import type { ServiceDeps } from '../lib/context'
import { authorizeAdmin } from '../lib/context'
import { writeAudit } from '../audit/audit'
import { getLiveMemberById } from '../members/dal'
import { addMemberToGroup, getLiveGroupById, insertGroup, listLiveGroups, removeMemberFromGroup, softDeleteGroup } from './dal'

/**
 * Group management — the containers grants target.
 *
 *  POST   /admin/groups                     create
 *  GET    /admin/groups                      list
 *  DELETE /admin/groups/:id                  soft delete (+ cascade edges)
 *  POST   /admin/groups/:id/members          add member { memberId }
 *  DELETE /admin/groups/:id/members/:memberId remove member
 */
export const createGroupsRoutes = (deps: ServiceDeps) =>
  new Elysia({ name: 'admin-groups', prefix: '/admin/groups' })
    .post(
      '/',
      async ({ body, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }
        const group = await deps.db.transaction(async (tx) => {
          const created = await insertGroup(tx, body.name)
          await writeAudit(tx, {
            actor: authz.value.email,
            action: 'group.create',
            target: `group:${created.id}`,
            diff: { name: created.name },
          })
          return created
        })
        set.status = 201
        return group
      },
      { body: t.Object({ name: t.String({ minLength: 1 }) }) },
    )
    .get('/', async ({ request, set }) => {
      const authz = await authorizeAdmin(deps, request.headers)
      if (!authz.ok) {
        set.status = authz.status
        return authz.body
      }
      return listLiveGroups(deps.db)
    })
    .delete(
      '/:id',
      async ({ params, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }
        const group = await getLiveGroupById(deps.db, params.id)
        if (!group) {
          set.status = 404
          return { error: 'Group not found' }
        }
        await deps.db.transaction(async (tx) => {
          await softDeleteGroup(tx, params.id)
          await writeAudit(tx, {
            actor: authz.value.email,
            action: 'group.delete',
            target: `group:${params.id}`,
            diff: { name: group.name },
          })
        })
        return { success: true }
      },
      { params: t.Object({ id: t.String() }) },
    )
    .post(
      '/:id/members',
      async ({ params, body, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }
        const group = await getLiveGroupById(deps.db, params.id)
        if (!group) {
          set.status = 404
          return { error: 'Group not found' }
        }
        const member = await getLiveMemberById(deps.db, body.memberId)
        if (!member) {
          set.status = 404
          return { error: 'Member not found' }
        }
        await deps.db.transaction(async (tx) => {
          await addMemberToGroup(tx, params.id, body.memberId)
          await writeAudit(tx, {
            actor: authz.value.email,
            action: 'group.member.add',
            target: `group:${params.id}`,
            diff: { memberId: body.memberId },
          })
        })
        set.status = 201
        return { success: true }
      },
      { params: t.Object({ id: t.String() }), body: t.Object({ memberId: t.String({ minLength: 1 }) }) },
    )
    .delete(
      '/:id/members/:memberId',
      async ({ params, request, set }) => {
        const authz = await authorizeAdmin(deps, request.headers)
        if (!authz.ok) {
          set.status = authz.status
          return authz.body
        }
        await deps.db.transaction(async (tx) => {
          await removeMemberFromGroup(tx, params.id, params.memberId)
          await writeAudit(tx, {
            actor: authz.value.email,
            action: 'group.member.remove',
            target: `group:${params.id}`,
            diff: { memberId: params.memberId },
          })
        })
        return { success: true }
      },
      { params: t.Object({ id: t.String(), memberId: t.String() }) },
    )
