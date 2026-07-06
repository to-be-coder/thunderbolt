/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Building2, Globe, ListFilter, X, Zap } from 'lucide-react'
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

const quickToggles: ReadonlyArray<{ value: ChatFilters['companyMine']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'company', label: 'Company' },
  { value: 'mine', label: 'Mine' },
]

/**
 * Search-adjacent filter control for the chat history (T4). A single filter
 * button opens a popover with a Company/Mine quick toggle and a by-agent
 * multi-select (icons). Filters are in-memory views — one-tap clear-all, no
 * cross-session persistence.
 */
export const ChatFilterBar = ({ options, filters, dispatch }: ChatFilterBarProps) => {
  const active = hasActiveFilters(filters)

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Filter chats"
            aria-pressed={active}
            className={cn('cursor-pointer', active && 'text-blue-500')}
          >
            <ListFilter className="size-[var(--icon-size-default)]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-64 p-2">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="px-1 text-[length:var(--font-size-xs)] font-medium text-muted-foreground">Show</span>
              <div className="flex gap-1">
                {quickToggles.map((toggle) => (
                  <Button
                    key={toggle.value}
                    variant={filters.companyMine === toggle.value ? 'default' : 'outline'}
                    size="xs"
                    className="flex-1 cursor-pointer"
                    onClick={() => dispatch({ type: 'setCompanyMine', value: toggle.value })}
                  >
                    {toggle.label}
                  </Button>
                ))}
              </div>
            </div>

            {options.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="px-1 text-[length:var(--font-size-xs)] font-medium text-muted-foreground">
                  By agent
                </span>
                <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
                  {options.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'toggleAgent', id: option.id })}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
                      >
                        <Checkbox checked={filters.agentIds.includes(option.id)} className="pointer-events-none" />
                        {kindIcon(option.kind)}
                        <span className="truncate text-[length:var(--font-size-sm)]">{option.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {active && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full cursor-pointer justify-start gap-2 text-muted-foreground"
                onClick={() => dispatch({ type: 'clear' })}
              >
                <X className="size-3.5" />
                Clear all
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {active && (
        <Button
          variant="ghost"
          size="xs"
          aria-label="Clear filters"
          className="cursor-pointer text-muted-foreground"
          onClick={() => dispatch({ type: 'clear' })}
        >
          Clear
        </Button>
      )}
    </div>
  )
}
