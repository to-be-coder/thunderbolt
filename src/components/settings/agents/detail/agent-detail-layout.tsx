/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AgentGlyph, AgentIconPicker } from './agent-icon-picker'

/**
 * The ONE shared detail-view anatomy (agents-page-spec §7): a back link, an
 * identity header (name + provenance subtitle), a body, and a bottom actions
 * row. All three agent-kind detail views (Thunderbolt §2, company §3, personal
 * §4) render through this with three different data sources. Every detail view
 * is READ-ONLY — the only interactive elements live inside `body` (credential
 * connect/disconnect, Test) or `actions` (Start a chat / Remove).
 */
type AgentDetailLayoutProps = {
  /** Kind icon shown beside the name (agent-card-content spec §4 header). */
  icon: LucideIcon
  name: string
  /** Provenance / attribution subtitle under the name. Omitted when empty. */
  subtitle?: ReactNode
  /** Read-only content sections (what-it-uses / what-it-can-do / about). */
  body: ReactNode
  /** Bottom action row (Start a chat / Remove). Absent when the view is a bare
   *  revoked/collapsed state. */
  actions?: ReactNode
  /** Optional 3-dots menu rendered next to the title (e.g. personal-agent
   *  management — company/native views omit it). */
  menu?: ReactNode
  /** Editable-icon wiring. When BOTH are supplied the static `icon` is replaced
   *  by a grid picker whose current glyph resolves from `iconKey` — used by the
   *  member's OWN agents (personal + built-in Thunderbolt), whose default comes
   *  from the handshake but is member-overridable. Company agents omit these and
   *  stay read-only. */
  iconKey?: string
  onIconChange?: (key: string) => void
  /** The provider/handshake glyph the icon picker's "Default" tab resets to —
   *  the Thunderbolt brand mark for the built-in agent, else the agent's own
   *  handshake default. Omitted → the picker falls back to its generic default. */
  iconDefaultKey?: string
  onBack: () => void
}

export const AgentDetailLayout = ({
  icon: Icon,
  name,
  subtitle,
  body,
  actions,
  menu,
  iconKey,
  onIconChange,
  iconDefaultKey,
  onBack,
}: AgentDetailLayoutProps) => (
  <div className="flex h-full flex-col" data-testid="agent-detail">
    {/* `overscroll-none` stops the rubber-band bounce at the edges, which would
        otherwise make the sticky header jump when scrolled to the bottom. */}
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-none">
      {/* Sticky frosted header — pinned (incl. the X) with a modal-like blurred
          backdrop, so body content scrolls UNDER it, not behind a hard bar. */}
      <div className="sticky top-0 z-10 bg-background/75 pt-4 pb-3 backdrop-blur-md">
        {/* Inner row is `touch-height-xl` and sits under the `pt-4`, matching the
            list column's `p-4` + PageHeader so the two headers line up. */}
        <div className="flex min-h-[var(--touch-height-xl)] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {onIconChange && iconKey !== undefined ? (
              <AgentIconPicker value={iconKey} onChange={onIconChange} defaultKey={iconDefaultKey} />
            ) : (
              <div className="flex aspect-square size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {/* A stored icon key still renders its real glyph read-only (e.g. when
                the icon is edited elsewhere, like the Configuration section). */}
                {iconKey !== undefined ? (
                  <AgentGlyph value={iconKey} className="size-5 text-muted-foreground" />
                ) : (
                  <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-medium truncate">{name}</h1>
              {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
            </div>
          </div>
          {/* Actions on the right: the ⋯ menu sits next to the close (X). */}
          <div className="flex shrink-0 items-center gap-1">
            {menu}
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
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-1 pb-6">{body}</div>
    </div>

    {actions && <div className="flex shrink-0 flex-wrap gap-3 pt-3">{actions}</div>}
  </div>
)

/** A titled read-only content section inside a detail body (the "── Title ──"
 *  blocks in the spec mocks). `titleExtra` renders inline after the title (e.g.
 *  an info tooltip). */
export const DetailSection = ({
  title,
  titleExtra,
  children,
}: {
  /** Omit when the child renders its own header row (e.g. the Models section,
   *  whose header carries an inline "add" action beside the label). */
  title?: string
  titleExtra?: ReactNode
  children: ReactNode
}) => (
  <section className="flex flex-col gap-2 rounded-xl bg-secondary p-4 dark:bg-sidebar">
    {title && (
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
        {titleExtra}
      </div>
    )}
    {children}
  </section>
)

/** A labeled sub-block inside a {@link DetailSection} — used to nest several
 *  related groups (Integrations / MCP / Skills) under one parent card without
 *  giving each its own card chrome. `labelExtra` renders inline after the label
 *  (e.g. an info tooltip). */
export const SubSection = ({
  label,
  labelExtra,
  children,
}: {
  label: string
  labelExtra?: ReactNode
  children: ReactNode
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-1.5">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      {labelExtra}
    </div>
    {children}
  </div>
)
