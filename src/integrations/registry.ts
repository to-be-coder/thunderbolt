/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { OAuthProvider } from '@/lib/auth'

/**
 * The OAuth integration providers an org can allow or block org-wide. Members
 * connect their own account for these (Gmail, Calendar, …) so agents can "act
 * as them". Thunderbolt Pro (billing) and the read-only Tools list are not
 * governable, so they aren't here.
 */
export type GovernableIntegration = {
  id: OAuthProvider
  name: string
  description: string
}

export const governableIntegrations: readonly GovernableIntegration[] = [
  { id: 'google', name: 'Google', description: 'Gmail, Calendar, Drive, and other Google account access.' },
  { id: 'microsoft', name: 'Microsoft', description: 'Outlook, Calendar, and other Microsoft account access.' },
]
