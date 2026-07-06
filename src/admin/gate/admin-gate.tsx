/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Navigate, Outlet } from 'react-router'
import Loading from '@/loading'
import { useAdminIdentity } from '../api/hooks'

/**
 * Route guard for `/admin`. Sits INSIDE the app's `AuthGate require="authenticated"`
 * (so unauthenticated users are handled upstream) and asks `GET /admin/me` who the
 * caller is:
 *  - pending            → loading screen
 *  - `isAdmin === true` → render the console (`<Outlet/>`)
 *  - anything else      → 404 semantics (non-admins and non-members must not see
 *                          that an admin console exists), via redirect to /not-found.
 *
 * A 401/403 from `/admin/me` surfaces as a query error and lands in the same
 * redirect, so a non-member is indistinguishable from a stranger — the console
 * is fully hidden.
 */
export const AdminGate = () => {
  const { data, isPending, isError } = useAdminIdentity()

  if (isPending) {
    return <Loading />
  }

  if (isError || !data?.isAdmin) {
    return <Navigate to="/not-found" replace />
  }

  return <Outlet />
}
