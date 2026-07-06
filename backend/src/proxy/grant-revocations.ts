/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * IN-FLIGHT SESSION INVALIDATION (Stage 4, T1).
 *
 * Open team-agent relays register here keyed by `agentId` + caller email. When a
 * grant is revoked, the admin grants route asks the hub to `revalidateAgent` —
 * the hub re-checks each open session for that agent against the CURRENT grant
 * state and closes the ones whose caller lost access. This is the sink for the
 * revocation signal; establishment and revalidation share one grant check
 * (`resolveAgentAccess`) so a revoked grant fails new sessions AND kills live
 * ones with identical semantics.
 *
 * Process-local by design: a socket lives in exactly one backend process, so the
 * registry that can close it lives beside it. Multi-process deployments fan the
 * revoke signal out to every instance (future work) — the contract here is the
 * single-process sink.
 */

/** A registered, still-open team-agent relay. */
type RelayEntry = { email: string; close: () => void }

export type GrantRevocationHub = {
  /** Register an open relay to `agentId` for `email`. Returns an unregister fn
   *  the relay MUST call on close so the registry doesn't leak. */
  register: (agentId: string, email: string, close: () => void) => () => void
  /** Re-validate every open session to `agentId` against current grant state,
   *  closing those whose caller no longer holds a grant. */
  revalidateAgent: (agentId: string, stillGranted: (email: string) => Promise<boolean>) => Promise<void>
  /** Test/introspection helper — open session count for an agent. */
  openCount: (agentId: string) => number
}

export const createGrantRevocationHub = (): GrantRevocationHub => {
  const byAgent = new Map<string, Set<RelayEntry>>()

  const register = (agentId: string, email: string, close: () => void): (() => void) => {
    const entry: RelayEntry = { email, close }
    const set = byAgent.get(agentId) ?? new Set<RelayEntry>()
    set.add(entry)
    byAgent.set(agentId, set)
    return () => {
      const current = byAgent.get(agentId)
      if (!current) {
        return
      }
      current.delete(entry)
      if (current.size === 0) {
        byAgent.delete(agentId)
      }
    }
  }

  const revalidateAgent = async (agentId: string, stillGranted: (email: string) => Promise<boolean>): Promise<void> => {
    const set = byAgent.get(agentId)
    if (!set) {
      return
    }
    // Snapshot — `close()` mutates the set via the relay's unregister.
    for (const entry of [...set]) {
      const granted = await stillGranted(entry.email).catch(() => false)
      if (!granted) {
        entry.close()
      }
    }
  }

  const openCount = (agentId: string): number => byAgent.get(agentId)?.size ?? 0

  return { register, revalidateAgent, openCount }
}
