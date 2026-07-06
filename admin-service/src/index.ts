/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Elysia } from 'elysia'
import type { AdminAuth, ServiceDeps, SessionRevoker } from './lib/context'
import type { AdminDb } from './db/types'
import { createMembersRoutes } from './members/routes'
import { createGroupsRoutes } from './groups/routes'
import { createAgentsRoutes, type ConnectionProbe } from './agents/routes'
import { createGrantsRoutes } from './grants/routes'
import { createPolicyRoutes } from './policy/routes'
import { createDiscoveryRoutes } from './discovery/routes'

export type { AdminDb } from './db/types'
export type { AdminAuth, ServiceDeps, SessionRevoker } from './lib/context'
export { activateMemberByEmail } from './activation'
export { runAdminMigrations, getAdminMigrationsFolder, adminMigrationsTable } from './db/migrate'

/** Options the host (backend, in dev) passes to mount the admin-service. */
export type AdminServiceOptions = {
  db: AdminDb
  auth: AdminAuth
  /** Invalidate live backend sessions for an email on member removal. Backend
   *  supplies the real impl (deletes `session` rows); tests inject a spy. */
  revokeSessionsForEmail: SessionRevoker
  /** Bootstrap admin email. Defaults to `ADMIN_SEED_EMAIL`. */
  seedAdminEmail?: string | null
  /** Test seam — override the ACP connection probe. */
  connectionProbe?: ConnectionProbe
}

/**
 * Build the mountable admin-service Elysia app. Mount it into backend's app
 * (`createApp`) with a single `.use(createAdminServiceRoutes({...}))`. All routes
 * live under `/admin/*` (except discovery, also under `/admin/discovery`, which
 * is member- not admin-gated). When the service is later extracted, this factory
 * moves to its own process and backend swaps the mount for an HTTP client.
 */
export const createAdminServiceRoutes = (options: AdminServiceOptions) => {
  const deps: ServiceDeps = {
    db: options.db,
    auth: options.auth,
    seedAdminEmail: options.seedAdminEmail ?? process.env.ADMIN_SEED_EMAIL ?? null,
    revokeSessionsForEmail: options.revokeSessionsForEmail,
  }

  return new Elysia({ name: 'admin-service' })
    .use(createMembersRoutes(deps))
    .use(createGroupsRoutes(deps))
    .use(createAgentsRoutes(deps, options.connectionProbe))
    .use(createGrantsRoutes(deps))
    .use(createPolicyRoutes(deps))
    .use(createDiscoveryRoutes(deps))
}
