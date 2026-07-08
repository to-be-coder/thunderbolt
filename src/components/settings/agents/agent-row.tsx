/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AgentGlyph } from './detail/agent-icon-picker'
import { NewGrantBadge } from './new-grant-badge'

export type AgentRowProps = {
  /** Stable id used for the row test id and React key. */
  agentId: string
  /** Static Lucide glyph. Used when `iconValue` is not supplied. */
  icon?: LucideIcon
  /** A stored icon value (Lucide KEY or uploaded/remote image URL). When set it
   *  takes precedence over `icon`, so member-editable agents show their override. */
  iconValue?: string
  name: string
  /** Secondary provenance line (agents-page-spec §1, exact copy). Static — the
   *  roster never opens a connection, so no live status is shown here (spec §0/§1). */
  provenanceLine: string
  /** One-time "grant received" highlight — a ring + "New" badge (Stage 7 T2). */
  isNewlyGranted?: boolean
  /** Whether this row's detail is open — brightens the row like other selected
   *  items across the app. */
  selected?: boolean
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
  iconValue,
  name,
  provenanceLine,
  isNewlyGranted,
  selected,
  onOpen,
}: AgentRowProps) => (
  <Card data-testid={`agent-row-${agentId}`} className="border border-border p-0">
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${name}`}
      aria-pressed={selected}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-[inherit] px-4 py-3 text-left transition-colors',
        selected ? 'bg-accent' : 'cursor-pointer hover:bg-secondary/50',
      )}
    >
      <div className="flex aspect-square size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {iconValue ? (
          <AgentGlyph value={iconValue} className="size-5 text-muted-foreground" />
        ) : (
          Icon && <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base font-medium truncate">{name}</span>
          {isNewlyGranted && <NewGrantBadge />}
        </div>
        <div
          className="flex items-center gap-1.5 text-sm truncate text-muted-foreground"
          data-testid={`agent-provenance-${agentId}`}
        >
          <span className="truncate">{provenanceLine}</span>
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
