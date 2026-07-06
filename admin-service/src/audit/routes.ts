/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Elysia, t } from 'elysia'
import type { ServiceDeps } from '../lib/context'
import { authorizeAdmin } from '../lib/context'
import { listAuditEvents } from './audit'

const defaultLimit = 200
const maxLimit = 1000

/**
 * Read surface over the append-only audit trail — powers the S6 audit-log screen.
 *
 *  GET /admin/audit?action=&limit=   → AuditEvent[] (most-recent-first)
 *
 * Admin-gated read; no audit row is written for reads. `action` filters to a
 * single action string; `limit` caps the page (defaults to 200, max 1000).
 */
export const createAuditRoutes = (deps: ServiceDeps) =>
  new Elysia({ name: 'admin-audit', prefix: '/admin/audit' }).get(
    '/',
    async ({ query, request, set }) => {
      const authz = await authorizeAdmin(deps, request.headers)
      if (!authz.ok) {
        set.status = authz.status
        return authz.body
      }
      const parsed = query.limit ? Number(query.limit) : defaultLimit
      const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), maxLimit) : defaultLimit
      const events = await listAuditEvents(deps.db, limit)
      if (!query.action) {
        return events
      }
      return events.filter((event) => event.action === query.action)
    },
    { query: t.Object({ action: t.Optional(t.String()), limit: t.Optional(t.String()) }) },
  )
