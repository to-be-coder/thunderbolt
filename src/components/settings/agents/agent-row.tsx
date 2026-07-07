/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AcpAgentStatus } from '@/hooks/use-acp-agent-status'
import { NewGrantBadge } from './new-grant-badge'

/** Live status dot for a personal ACP row (agents-page-spec §1: ● online /
 *  ○ offline). `checking` renders a muted pulsing dot with no label; `unknown`
 *  renders nothing. */
const AgentStatusDot = ({ status }: { status: AcpAgentStatus }) => {
  if (status === 'unknown') {
    return null
  }
  if (status === 'checking') {
    return <span className="inline-block size-2 rounded-full bg-muted-foreground/50 animate-pulse" aria-hidden="true" />
  }
  const online = status === 'online'
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn('inline-block size-2 rounded-full', online ? 'bg-green-500' : 'border border-muted-foreground')}
        aria-hidden="true"
      />
      <span>{online ? 'online' : 'offline'}</span>
    </span>
  )
}

export type AgentRowProps = {
  /** Stable id used for the row test id and React key. */
  agentId: string
  icon: LucideIcon
  name: string
  /** Secondary provenance line (agents-page-spec §1, exact copy). */
  provenanceLine: string
  /** Personal ACP live status; omit for team / native rows. */
  status?: AcpAgentStatus
  /** One-time "grant received" highlight — a ring + "New" badge (Stage 7 T2). */
  isNewlyGranted?: boolean
  /** Opens the read-only detail view. Every row has a chevron and opens. */
  onOpen: () => void
}

/**
 * A single read-only agent list row (agents-page-spec §1). Icon + name on the
 * primary line, provenance (+ optional live status) on the secondary line, and
 * a chevron on EVERY row — every agent opens a read-only detail view. There is
 * NO edit / toggle / delete affordance anywhere; the whole row is the tap
 * target that opens the detail.
 */
export const AgentRow = ({
  agentId,
  icon: Icon,
  name,
  provenanceLine,
  status,
  isNewlyGranted,
  onOpen,
}: AgentRowProps) => (
  <Card
    data-testid={`agent-row-${agentId}`}
    className={cn('border border-border p-0', isNewlyGranted && 'ring-2 ring-primary/40')}
  >
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${name}`}
      className="flex items-center gap-3 w-full text-left px-4 py-3 cursor-pointer rounded-[inherit] hover:bg-secondary/50 transition-colors"
    >
      <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[length:var(--font-size-body)] font-medium truncate">{name}</span>
          {isNewlyGranted && <NewGrantBadge />}
        </div>
        <div
          className="flex items-center gap-1.5 text-[length:var(--font-size-sm)] text-muted-foreground truncate"
          data-testid={`agent-provenance-${agentId}`}
        >
          <span className="truncate">{provenanceLine}</span>
          {status !== undefined && <AgentStatusDot status={status} />}
        </div>
      </div>
      <ChevronRight
        className="size-4 text-muted-foreground shrink-0"
        aria-hidden="true"
        data-testid={`agent-chevron-${agentId}`}
      />
    </button>
  </Card>
)
