/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

/**
 * The ONE shared detail-view anatomy (agents-page-spec §7): a back link, an
 * identity header (name + provenance subtitle), a body, and a bottom actions
 * row. All three agent-kind detail views (Thunderbolt §2, company §3, personal
 * §4) render through this with three different data sources. Every detail view
 * is READ-ONLY — the only interactive elements live inside `body` (credential
 * connect/disconnect, Test) or `actions` (Start a chat / Remove).
 */
type AgentDetailLayoutProps = {
  name: string
  /** Provenance / attribution subtitle under the name. */
  subtitle: ReactNode
  /** Read-only content sections (what-it-uses / what-it-can-do / about). */
  body: ReactNode
  /** Bottom action row (Start a chat / Remove). Absent when the view is a bare
   *  revoked/collapsed state. */
  actions?: ReactNode
  /** Optional 3-dots menu rendered next to the title (e.g. personal-agent
   *  management — company/native views omit it). */
  menu?: ReactNode
  onBack: () => void
}

export const AgentDetailLayout = ({ name, subtitle, body, actions, menu, onBack }: AgentDetailLayoutProps) => (
  <div
    className="flex h-full flex-col gap-6 overflow-y-auto rounded-lg border border-border p-6"
    data-testid="agent-detail"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-medium truncate">{name}</h1>
          <div className="text-[length:var(--font-size-sm)] text-muted-foreground">{subtitle}</div>
        </div>
        {menu}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground"
        onClick={onBack}
        aria-label="Close details"
        data-testid="agent-detail-back"
      >
        <X className="size-4" />
      </Button>
    </div>

    <div className="flex flex-col gap-6">{body}</div>

    {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
  </div>
)

/** A titled read-only content section inside a detail body (the "── Title ──"
 *  blocks in the spec mocks). */
export const DetailSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h2 className="text-[length:var(--font-size-xs)] font-medium tracking-wide text-muted-foreground uppercase">
      {title}
    </h2>
    {children}
  </section>
)
