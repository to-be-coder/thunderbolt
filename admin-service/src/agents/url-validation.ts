/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import ipaddr from 'ipaddr.js'

/** IP ranges blocked for SSRF protection — mirrors backend's
 *  `@/utils/url-validation`. The connection-test opens an admin-supplied URL
 *  server-side, so the same private-address guard applies here. */
const blockedRanges = new Set([
  'private',
  'loopback',
  'linkLocal',
  'uniqueLocal',
  'unspecified',
  'carrierGradeNat',
  'reserved',
  'broadcast',
])

/** True if a literal IP hostname falls in a private/internal/reserved range. */
export const isPrivateAddress = (rawHostname: string): boolean => {
  const hostname = rawHostname.startsWith('[') && rawHostname.endsWith(']') ? rawHostname.slice(1, -1) : rawHostname
  if (!ipaddr.isValid(hostname)) {
    return false
  }
  return blockedRanges.has(ipaddr.process(hostname).range())
}

export type ValidatedAcpUrl = { ok: true; url: string } | { ok: false; error: string }

/**
 * Validate an admin-supplied ACP endpoint before probing it server-side.
 * Requires `wss://` (no cleartext) and rejects literal private/loopback hosts.
 */
export const validateAcpUrl = (raw: string): ValidatedAcpUrl => {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, error: 'Invalid URL' }
  }
  if (parsed.protocol !== 'wss:') {
    return { ok: false, error: 'ACP URL must use wss://' }
  }
  if (isPrivateAddress(parsed.hostname)) {
    return { ok: false, error: 'ACP URL host is not allowed' }
  }
  return { ok: true, url: parsed.toString() }
}
