/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { cn } from '@/lib/utils'
import { useAgentConnectionStatus } from '../api/hooks'
import type { AgentConnectionState } from '../api/types'

/** The state the indicator can render — the endpoint states plus the
 *  client-side `connecting` (probe in flight). */
type IndicatorState = AgentConnectionState | 'connecting'

/** Dot color + label per state (see AgentConnectionState). `pulse` animates the
 *  dot for the transient/active states. Colors are the traffic-light mapping the
 *  spec calls for: green Ready, amber Needs auth, red Error, neutral otherwise. */
const META: Record<IndicatorState, { label: string; dot: string; text: string; pulse?: boolean }> = {
  connecting: { label: 'Connecting…', dot: 'bg-muted-foreground/50', text: 'text-muted-foreground', pulse: true },
  ready: { label: 'Ready', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
  working: { label: 'Working…', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400', pulse: true },
  needs_auth: { label: 'Needs auth', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  error: { label: 'Error', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  not_connected: {
    label: 'Not connected',
    dot: 'border border-muted-foreground bg-transparent',
    text: 'text-muted-foreground',
  },
}

/**
 * Live ACP connection status for a team agent, shown as a colored dot + label on
 * the registry card and the detail header. Probes the endpoint via
 * {@link useAgentConnectionStatus}; renders `Connecting…` while in flight and
 * `Error` if the probe itself fails.
 */
export const AgentConnectionIndicator = ({ acpUrl }: { acpUrl: string }) => {
  const query = useAgentConnectionStatus(acpUrl)
  const state: IndicatorState = query.isPending ? 'connecting' : (query.data?.state ?? 'error')
  const meta = META[state]

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', meta.text)} data-testid="agent-connection-status">
      <span className={cn('inline-block size-2 rounded-full', meta.dot, meta.pulse && 'animate-pulse')} aria-hidden />
      {meta.label}
    </span>
  )
}
