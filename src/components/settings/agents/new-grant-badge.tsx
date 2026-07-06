/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** The one-time "grant received" highlight badge (Stage 7 T2). Rendered next to
 *  a team agent the member has just been granted, in the composer selector and
 *  the Agents page alike. Display-only — the underlying seen-set latch clears it
 *  on the next reload. */
export const NewGrantBadge = () => (
  <span
    data-testid="new-grant-badge"
    className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[length:var(--font-size-xs)] font-medium text-primary"
  >
    New
  </span>
)
