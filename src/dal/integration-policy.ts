/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * OAUTH INTEGRATION GATING (beyond-PRD data-governance extension).
 *
 * Integrations are first-party OAuth account connections (Google, Microsoft) a
 * member makes so agents can act as them. `OrgPolicy.blockedIntegrations` lets
 * an org block a provider org-wide: a blocked provider can't be connected.
 * Empty = all providers allowed.
 */

/** True when the org permits members to connect this integration provider. */
export const isIntegrationAllowed = (provider: string, blockedIntegrations: readonly string[]): boolean =>
  !blockedIntegrations.includes(provider)
