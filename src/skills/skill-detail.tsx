/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ChevronLeft, Info, MoreHorizontal, Plus, Power, SquarePen, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'

/**
 * Detail / edit panel for a single skill. Pinning is managed from the chat
 * composer; this view shows the skill's content + enable / edit / delete /
 * run-in-chat controls.
 */
export const SkillDetail = ({
  name,
  description,
  instruction,
  enabled,
  canEdit = true,
  canDelete = true,
  onToggleEnabled,
  onEdit,
  onDelete,
  onBack,
}: {
  name: string
  description: string
  instruction: string
  enabled: boolean
  /** Defaults to true; gates the enable toggle + Edit menu item. */
  canEdit?: boolean
  /** Defaults to true; gates the Delete menu item. */
  canDelete?: boolean
  onToggleEnabled: (next: boolean) => void
  onEdit: () => void
  onDelete: () => void
  onBack?: () => void
}) => {
  const { isMobile } = useIsMobile()
  const navigate = useNavigate()

  const runInChat = () => {
    // Router state (not a URL param) by design: the entry point is internal
    // navigation only in v1 — no URL surface, no deep-linkability. Target
    // `/chats/new` directly because the `/` index route's `<Navigate replace />`
    // wrapper drops `location.state` during the redirect.
    navigate('/chats/new', { state: { runSkill: name } })
  }

  return (
    <section className="flex h-full flex-1 flex-col gap-4 overflow-hidden bg-background px-4 pb-4 md:px-5 text-foreground">
      <header className="flex flex-col gap-5 md:gap-2.5">
        {/* Title row matches the sidebar's app-logo height so the skill name
            sits at the same y-position as the Thunderbolt label. */}
        <div className="relative flex h-[var(--touch-height-xl)] shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                aria-label="Back to skills"
                className="size-8 shrink-0 rounded-md border border-border text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="size-5 md:size-4" />
              </Button>
            )}
            {!isMobile && <h2 className="text-xl leading-tight text-foreground">/{name}</h2>}
          </div>
          {isMobile && (
            <h2 className="absolute left-1/2 -translate-x-1/2 truncate max-w-[60%] text-center text-xl text-foreground pointer-events-none">
              /{name}
            </h2>
          )}
          <div className="flex items-center gap-2">
            {!isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Wrap the Switch so the tooltip's own data-state doesn't
                      clobber the Switch's checked|unchecked data-state and
                      break the colored variants. */}
                  <span className="inline-flex">
                    <Switch
                      checked={enabled}
                      disabled={!canEdit}
                      onCheckedChange={onToggleEnabled}
                      aria-label={enabled ? 'Disable skill' : 'Enable skill'}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {enabled ? "Disable skill. The AI won't use it, and it will be unpinned." : 'Enable skill'}
                </TooltipContent>
              </Tooltip>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="More"
                  className="size-8 rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground [&_svg:not([class*='size-'])]:size-5"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                {isMobile && canEdit && (
                  <>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        onToggleEnabled(!enabled)
                      }}
                      className="cursor-pointer"
                    >
                      <Power />
                      {enabled ? 'Disable skill' : 'Enable skill'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {canEdit && (
                  <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                    <SquarePen />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={runInChat} className="cursor-pointer">
                  <Plus />
                  Add to chat
                </DropdownMenuItem>
                {canDelete && (
                  <DropdownMenuItem onClick={onDelete} className="cursor-pointer">
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Continuous scroll (no accordion) — every section stays open and the body
          scrolls as one, matching the agent details page. */}
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-none pb-4">
        <DetailSection
          title="Description"
          titleExtra={
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="img"
                  aria-label="What is this for?"
                  className="inline-flex items-center text-muted-foreground hover:text-foreground"
                >
                  <Info size={14} strokeWidth={1.75} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Helps the agent decide when to use this skill. Be specific about when it applies.
              </TooltipContent>
            </Tooltip>
          }
        >
          <p className="whitespace-pre-wrap text-base leading-snug text-foreground">{description}</p>
        </DetailSection>

        <DetailSection title="Instructions">
          <p className="whitespace-pre-wrap text-base leading-snug text-foreground">{instruction}</p>
        </DetailSection>
      </div>
    </section>
  )
}

/** A titled, always-open content card — mirrors the agent details page's
 *  `DetailSection` so both detail views read the same. */
const DetailSection = ({
  title,
  titleExtra,
  children,
}: {
  title: string
  titleExtra?: ReactNode
  children: ReactNode
}) => (
  <section className="flex flex-col gap-2 rounded-xl bg-secondary p-4 dark:bg-sidebar">
    <div className="flex items-center gap-1.5">
      <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
      {titleExtra}
    </div>
    {children}
  </section>
)
