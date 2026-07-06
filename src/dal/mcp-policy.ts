/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * USER-ADDED MCP GATING (P0-8).
 *
 * The org policy for user-added MCP servers is one of three modes:
 *   - `allow`     → unrestricted (consumer / no-org mode).
 *   - `allowlist` → only servers whose URL or name is in `mcpAllowlist` (the
 *                   launch default; an empty allowlist blocks everything until
 *                   the admin adds entries).
 *   - `block`     → no user-added MCP servers at all.
 * A disallowed server surfaces "not allowed by your organization" rather than
 * silently toggling.
 */

/** True when the org policy permits enabling this MCP server, per the mode.
 *  Matches on URL first (the stable identity), then display name. */
export const isMcpServerAllowed = (
  server: { url: string | null; name: string },
  policy: { mcpPolicy: 'allow' | 'allowlist' | 'block'; mcpAllowlist: readonly string[] },
): boolean => {
  if (policy.mcpPolicy === 'allow') {
    return true
  }
  if (policy.mcpPolicy === 'block') {
    return false
  }
  return policy.mcpAllowlist.some((entry) => entry === server.url || entry === server.name)
}
