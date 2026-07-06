/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * BUILT-IN EXTENSION GATING (P0-8, extension half).
 *
 * Extensions are Thunderbolt's own built-in tool providers (not user-added), so
 * the org policy is a simple per-extension blocklist: an id in
 * `OrgPolicy.blockedExtensions` may not be enabled by members and never applies
 * to an agent. Everything else is allowed.
 */

/** True when the org permits members to use this built-in extension. */
export const isExtensionAllowed = (extensionId: string, blockedExtensions: readonly string[]): boolean =>
  !blockedExtensions.includes(extensionId)
