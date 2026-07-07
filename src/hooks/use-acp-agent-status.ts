/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useEffect, useState } from 'react'
import { testAcpConnection as defaultTestAcpConnection } from '@/acp'
import { isDemoMode } from '@/lib/demo-mode'
import type { TestAcpConnectionFn } from '@/components/settings/agents/add-custom-agent-dialog'

/** Live connection state of a personal ACP endpoint. `checking` is the initial
 *  probe-in-flight state; `unknown` means no URL to probe. */
export type AcpAgentStatus = 'checking' | 'online' | 'offline' | 'unknown'

/**
 * Probe a personal ACP endpoint once on mount and report its reachability, for
 * the "live-ish status dot" on the Agents list row and the personal-agent
 * detail Status line (agents-page-spec §1 / §4).
 *
 * The probe fn is injectable so component tests drive a stub instead of opening
 * a real WebSocket. Nothing is cached across a disconnect — a fresh mount (or a
 * `refresh()`) always re-probes, so a stale "online" can never lie.
 */
export const useAcpAgentStatus = (
  url: string | null,
  testAcpConnection: TestAcpConnectionFn = defaultTestAcpConnection,
): { status: AcpAgentStatus; refresh: () => void } => {
  const [status, setStatus] = useState<AcpAgentStatus>(url ? (isDemoMode() ? 'online' : 'checking') : 'unknown')
  // Bumping this re-runs the probe effect (manual Test / retry).
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!url) {
      setStatus('unknown')
      return
    }
    // Demo mode has no real endpoints — the seeded agents are fakes that should
    // read as connected, so skip the (always-failing) probe.
    if (isDemoMode()) {
      setStatus('online')
      return
    }
    let cancelled = false
    setStatus('checking')
    void testAcpConnection({ url }).then((result) => {
      if (!cancelled) {
        setStatus(result.success ? 'online' : 'offline')
      }
    })
    return () => {
      cancelled = true
    }
    // `testAcpConnection` is a stable module fn / test stub; excluded to keep the
    // probe from re-firing on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce])

  return { status, refresh: () => setNonce((n) => n + 1) }
}
