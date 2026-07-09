/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Building2, Globe, ListFilter, Zap } from 'lucide-react'
import type { Dispatch } from 'react'
import type { AgentFilterOption, ChatFilterAction, ChatFilters } from './chat-filters'
import { hasActiveFilters } from './chat-filters'

type ChatFilterBarProps = {
  options: AgentFilterOption[]
  filters: ChatFilters
  dispatch: Dispatch<ChatFilterAction>
}

const kindIcon = (kind: AgentFilterOption['kind']) => {
  if (kind === 'team') {
    return <Building2 className="size-3.5 text-muted-foreground" />
  }
  if (kind === 'thunderbolt') {
    return <Zap className="size-3.5 text-muted-foreground" />
  }
  return <Globe className="size-3.5 text-muted-foreground" />
}

/** One labeled group of agent checkboxes (Company / Personal) — mirrors the
 *  settings-nav group sections: a muted caption over its rows. */
const AgentGroup = ({
  label,
  options,
  filters,
  dispatch,
}: {
  label: string
  options: AgentFilterOption[]
  filters: ChatFilters
  dispatch: Dispatch<ChatFilterAction>
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="px-1 text-[length:var(--font-size-xs)] font-medium text-muted-foreground">{label}</span>
    <ul className="flex flex-col gap-0.5">
      {options.map((option) => (
        <li key={option.id}>
          <button
            type="button"
            onClick={() => dispatch({ type: 'toggleAgent', id: option.id })}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
          >
            <Checkbox
              checked={filters.agentIds.includes(option.id)}
              className="pointer-events-none border-muted-foreground/40"
            />
            {kindIcon(option.kind)}
            <span className="truncate text-[length:var(--font-size-sm)]">{option.label}</span>
          </button>
        </li>
      ))}
    </ul>
  </div>
)

/**
 * Search-adjacent filter control for the chat history (T4). A single filter
 * button opens a popover listing agents split into Company and Personal groups
 * (labeled like the settings nav) — pick any to narrow the history. No
 * company/mine tabs. Filters are in-memory views — one-tap clear-all, no
 * cross-session persistence.
 */
export const ChatFilterBar = ({ options, filters, dispatch }: ChatFilterBarProps) => {
  const active = hasActiveFilters(filters)
  const companyOptions = options.filter((option) => option.kind === 'team')
  const personalOptions = options.filter((option) => option.kind !== 'team')

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Filter chats"
            aria-pressed={active}
            className={cn(
              'cursor-pointer',
              active &&
                'bg-[#5865f0]/15 text-[#5865f0] hover:bg-[#5865f0]/25 hover:text-[#5865f0] dark:text-[#8b95d6] dark:hover:text-[#8b95d6]',
            )}
          >
            <ListFilter className="size-[var(--icon-size-default)]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-64 p-2">
          <div className="flex flex-col gap-3">
            {/* Header — Clear all sits up here so it's always one tap away even
                when the agent list below scrolls. */}
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[length:var(--font-size-xs)] font-medium text-muted-foreground">
                Filter by agent
              </span>
              {active && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'clear' })}
                  className="cursor-pointer rounded-md bg-secondary px-2 py-1 text-[length:var(--font-size-xs)] font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Clear all
                </button>
              )}
            </div>

            {options.length === 0 ? (
              <span className="px-1 py-1 text-[length:var(--font-size-sm)] text-muted-foreground">
                No agents to filter.
              </span>
            ) : (
              <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
                {companyOptions.length > 0 && (
                  <AgentGroup label="Company" options={companyOptions} filters={filters} dispatch={dispatch} />
                )}
                {personalOptions.length > 0 && (
                  <AgentGroup label="Personal" options={personalOptions} filters={filters} dispatch={dispatch} />
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
