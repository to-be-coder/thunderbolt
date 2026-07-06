/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AdminDb } from './db/types'
import { activateMember, getLiveMemberByEmail } from './members/dal'
import { writeAudit } from './audit/audit'

/**
 * Activate a member on their first successful sign-in.
 *
 * This is the ONE seam backend's auth stack calls into the admin-service: the
 * Better Auth `hooks.after` on `/sign-in/email-otp` invokes this with the
 * signed-in email. Keeping activation logic here (rather than inlining it in
 * `backend/src/auth/auth.ts`) preserves the package boundary — auth.ts only
 * imports this single function.
 *
 * No-op when the email has no invited member row (consumer / non-org sign-ins).
 */
export const activateMemberByEmail = async (db: AdminDb, email: string): Promise<void> => {
  const member = await getLiveMemberByEmail(db, email)
  if (!member || member.status === 'active') {
    return
  }
  await db.transaction(async (tx) => {
    await activateMember(tx, member.id)
    await writeAudit(tx, {
      actor: member.email,
      action: 'member.activate',
      target: `member:${member.id}`,
      diff: { status: { from: 'invited', to: 'active' } },
    })
  })
}
