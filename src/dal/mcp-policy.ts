/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * MCP ALLOWLIST GATING (Stage 5, T6).
 *
 * `OrgPolicy.mcpAllowlist` is the set of MCP servers the org permits members to
 * enable. An EMPTY allowlist means "no restriction" (consumer / no-org mode);
 * a non-empty allowlist is exhaustive — only servers whose URL or name appears
 * in it may be enabled. Everything else surfaces "not allowed by your
 * organization" rather than silently toggling.
 */

/** True when the org policy permits enabling this MCP server. Empty allowlist =
 *  unrestricted. Matches on URL first (the stable identity), then display name. */
export const isMcpServerAllowed = (
  server: { url: string | null; name: string },
  allowlist: readonly string[],
): boolean => {
  if (allowlist.length === 0) {
    return true
  }
  return allowlist.some((entry) => entry === server.url || entry === server.name)
}
