/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AdminDb } from '../db/types'
import type { Member } from '../members/dal'
import { getLiveMemberByEmail, insertMember } from '../members/dal'
import { normalizeEmail } from './email'

/** The only caller fields the admin-service reads off a session. Kept minimal
 *  (and tolerant of Better Auth's optional `isAnonymous`) so backend's richer
 *  session user is structurally assignable. */
export type CallerUser = { id: string; email: string; isAnonymous?: boolean | null }

/** Minimal structural view of Better Auth's `getSession` — the only auth surface
 *  the admin-service touches. Keeps the package decoupled from backend's `Auth`. */
export type AdminAuth = {
  api: {
    getSession: (opts: { headers: Headers }) => Promise<{ user: CallerUser } | null>
  }
}

/** Invalidate all live backend sessions for an email (member removal → live
 *  bearer tokens must stop working). Injected by the host because the `session`
 *  table is backend-owned; when the admin-service is extracted this becomes an
 *  HTTP call. */
export type SessionRevoker = (email: string) => Promise<void>

/** Dependencies every admin-service route factory receives. */
export type ServiceDeps = {
  db: AdminDb
  auth: AdminAuth
  /** Bootstrap admin email (env `ADMIN_SEED_EMAIL`). Ensured active+admin lazily. */
  seedAdminEmail: string | null
  revokeSessionsForEmail: SessionRevoker
}

/** Resolve the authenticated, non-anonymous session user for a request, or null. */
export const resolveCaller = async (auth: AdminAuth, headers: Headers): Promise<CallerUser | null> => {
  const session = await auth.api.getSession({ headers })
  const user = session?.user
  if (!user || user.isAnonymous) {
    return null
  }
  return user
}

export type AuthzOk<T> = { ok: true; value: T }
export type AuthzErr = { ok: false; status: 401 | 403; body: { error: string; code?: string } }
export type AuthzResult<T> = AuthzOk<T> | AuthzErr

/**
 * Resolve the caller to a live, active member — the gate for the member-facing
 * discovery feed. Anonymous/unauthenticated → 401; authenticated non-member (or
 * still-invited) → 403 so the client's clear-on-403 path fires.
 */
export const authorizeMember = async (deps: ServiceDeps, headers: Headers): Promise<AuthzResult<Member>> => {
  const user = await resolveCaller(deps.auth, headers)
  if (!user) {
    return { ok: false, status: 401, body: { error: 'Unauthorized' } }
  }
  const member = await ensureSeedAdmin(deps, user.email)
  if (!member || member.status !== 'active') {
    return { ok: false, status: 403, body: { error: 'Forbidden', code: 'NOT_A_MEMBER' } }
  }
  return { ok: true, value: member }
}

/**
 * Resolve the caller to a live, active ADMIN member — the gate for every
 * `/admin/*` mutation. Same 401/403 semantics; non-admins get 403 FORBIDDEN.
 */
export const authorizeAdmin = async (deps: ServiceDeps, headers: Headers): Promise<AuthzResult<Member>> => {
  const user = await resolveCaller(deps.auth, headers)
  if (!user) {
    return { ok: false, status: 401, body: { error: 'Unauthorized' } }
  }
  const member = await ensureSeedAdmin(deps, user.email)
  if (!member || member.status !== 'active' || !member.isAdmin) {
    return { ok: false, status: 403, body: { error: 'Forbidden', code: 'ADMIN_REQUIRED' } }
  }
  return { ok: true, value: member }
}

/**
 * Look up the caller's member row, bootstrapping the seed admin on the fly: if
 * the caller's email matches `ADMIN_SEED_EMAIL` and no active-admin row exists,
 * create/promote one so the very first admin can authenticate and invite others.
 */
const ensureSeedAdmin = async (deps: ServiceDeps, email: string): Promise<Member | null> => {
  const normalized = normalizeEmail(email)
  const existing = await getLiveMemberByEmail(deps.db, normalized)
  const isSeed = deps.seedAdminEmail !== null && normalizeEmail(deps.seedAdminEmail) === normalized
  if (!isSeed) {
    return existing
  }
  if (!existing) {
    return insertMember(deps.db, { email: normalized, isAdmin: true, status: 'active' })
  }
  return existing
}
