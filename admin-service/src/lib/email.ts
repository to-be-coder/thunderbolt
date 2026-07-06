/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/** Normalize an email for matching — mirrors backend's `@/lib/email`
 *  (`.toLowerCase().trim()`) so member rows key on the same value Better Auth
 *  stores on the `user` table. */
export const normalizeEmail = (email: string): string => email.toLowerCase().trim()
