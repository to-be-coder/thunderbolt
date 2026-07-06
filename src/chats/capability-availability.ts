/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * CREDENTIAL-MODE AVAILABILITY (Stage 4, T3).
 *
 * Resolves whether an agent capability is usable, from its `credentialMode`, the
 * member's per-capability `connected` flag, and whether the agent's TRANSPORT can
 * actually pass the invoker's identity upstream. The one hard rule: an `as_you`
 * capability NEVER falls back to another identity. If the member hasn't connected
 * it (or declined the OAuth), the capability is unavailable — it does not quietly
 * run under the service account.
 *
 * Honoring the Stage-3 transport finding: external team agents are
 * SERVICE-IDENTITY-ONLY (the WS relay strips the caller bearer before the
 * upstream connect). For those, `as_you` cannot pass invoker identity at all, so
 * we surface it TRUTHFULLY as `unsupported_as_you` rather than pretending a
 * connect would make it work — and still never fall back to the service account.
 */

import type { AgentCardCapability } from '@shared/agent-cards'

export type CapabilityAvailability =
  /** Runs now: a service-account capability (org identity), or a connected
   *  `as_you` capability on a transport that can pass invoker identity. */
  | { state: 'available' }
  /** `as_you`, transport can pass invoker identity, but the member hasn't
   *  connected yet — surface the first-use OAuth connect prompt. */
  | { state: 'needs_connection' }
  /** `as_you` requested, but the transport CANNOT pass invoker identity (external
   *  team agents). Truthfully unavailable-as-you; NOT silently run as the service
   *  account. */
  | { state: 'unsupported_as_you' }

/**
 * Resolve a capability's availability. `transportPassesInvoker` says whether the
 * agent's transport can authenticate the upstream as the invoker — FALSE for
 * external team agents reached through the service-identity relay (the v1 case).
 *
 * There is intentionally NO branch that maps a declined/unconnected `as_you`
 * capability onto the service account: the absence of that branch IS the
 * "never falls back to another identity" guarantee.
 */
export const resolveCapabilityAvailability = (
  capability: AgentCardCapability,
  transportPassesInvoker: boolean,
): CapabilityAvailability => {
  if (capability.credentialMode !== 'as_you') {
    // service_account or unspecified — runs under the org identity.
    return { state: 'available' }
  }
  if (!transportPassesInvoker) {
    return { state: 'unsupported_as_you' }
  }
  return capability.connected ? { state: 'available' } : { state: 'needs_connection' }
}

/** True when the capability's tool should render as usable in the composer. A
 *  declined/unconnected `as_you` tool is NOT usable — it renders unavailable,
 *  never falling back to the service account. */
export const isCapabilityUsable = (capability: AgentCardCapability, transportPassesInvoker: boolean): boolean =>
  resolveCapabilityAvailability(capability, transportPassesInvoker).state === 'available'
