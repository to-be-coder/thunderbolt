/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Elysia } from 'elysia'
import type { ServiceDeps } from '../lib/context'
import { authorizeMember } from '../lib/context'

/**
 * Caller-identity endpoint for the admin console's front-end gate.
 *
 *  GET /admin/me   → the caller's live member row { id, email, status, isAdmin }
 *
 * Gated by `authorizeMember` (NOT `authorizeAdmin`) on purpose: it runs the seed-
 * admin bootstrap so the very first admin resolves, returns 403 for non-members,
 * and lets the gate distinguish `isAdmin:false` (a real member — hide /admin)
 * from 403 (not a member at all). No mutation → no audit row.
 */
export const createMeRoutes = (deps: ServiceDeps) =>
  new Elysia({ name: 'admin-me', prefix: '/admin/me' }).get('/', async ({ request, set }) => {
    const authz = await authorizeMember(deps, request.headers)
    if (!authz.ok) {
      set.status = authz.status
      return authz.body
    }
    const member = authz.value
    return { id: member.id, email: member.email, status: member.status, isAdmin: member.isAdmin }
  })
