/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { User } from '@shared/types/auth'
import type { AdminAuth, ServiceDeps, SessionRevoker } from '../lib/context'
import type { AdminDb } from '../db/types'

/** Build a fake session user with sensible defaults. */
export const fakeUser = (overrides: Partial<User> & { email: string }): User => ({
  id: overrides.id ?? crypto.randomUUID(),
  name: overrides.name ?? 'Test User',
  email: overrides.email,
  emailVerified: overrides.emailVerified ?? true,
  image: overrides.image ?? null,
  isNew: overrides.isNew ?? false,
  isAnonymous: overrides.isAnonymous ?? false,
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
})

/** An `AdminAuth` whose `getSession` always returns the given user (or null). */
export const buildAuth = (user: User | null): AdminAuth => ({
  api: {
    getSession: () => Promise.resolve(user ? { user } : null),
  },
})

/** Build `ServiceDeps` for a test — supply the db, the caller, and optionally a
 *  session-revoker spy and a seed admin email. */
export const buildDeps = (params: {
  db: AdminDb
  user: User | null
  seedAdminEmail?: string | null
  revokeSessionsForEmail?: SessionRevoker
}): ServiceDeps => ({
  db: params.db,
  auth: buildAuth(params.user),
  seedAdminEmail: params.seedAdminEmail ?? null,
  revokeSessionsForEmail: params.revokeSessionsForEmail ?? (() => Promise.resolve()),
})
