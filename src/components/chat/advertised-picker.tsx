/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SearchableMenu, type SearchableMenuGroup, type SearchableMenuItem } from '@/components/ui/searchable-menu'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'

type AdvertisedPickerProps = {
  /** Display-only option labels the agent card advertises (models or capabilities). */
  options: string[]
  /** Label rendered in the static chip when the agent advertises nothing (e.g.
   *  "Set by your organization" for the model slot). */
  emptyLabel: string
  ariaLabel: string
  icon?: ReactNode
}

const base =
  'flex min-w-0 max-w-[8.5rem] items-center gap-1.5 px-2 h-[var(--touch-height-control)] rounded-lg text-[length:var(--font-size-sm)] md:max-w-none'
const bordered = cn(base, 'border border-border')

/**
 * Data-driven composer slot for what an agent CARD advertises (T2 — "the picker
 * shows what the agent card advertises"). Zero options renders a static,
 * non-interactive chip (the `emptyLabel` fallback); one or more render a bounded
 * picker — a single option still opens, showing a "No other model available"
 * footer so the user learns there's no choice. The selection is cosmetic — cards
 * are display-only (no model/config wiring), so there is no store write. Shared
 * by the model slot (advertised models) and the mode slot (capability labels).
 */
export const AdvertisedPicker = ({ options, emptyLabel, ariaLabel, icon }: AdvertisedPickerProps) => {
  const { isMobile } = useIsMobile()
  const [selected, setSelected] = useState(options[0] ?? emptyLabel)

  if (options.length === 0) {
    return (
      <div
        data-testid="advertised-static-chip"
        aria-label={ariaLabel}
        className={cn(bordered, 'text-muted-foreground')}
      >
        {icon}
        <span className="font-medium truncate">{emptyLabel}</span>
      </div>
    )
  }

  // Single option: not a real choice — a BORDERLESS label that, when opened,
  // shows only an explanatory message (no lone selectable row).
  if (options.length === 1) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            data-testid="advertised-single"
            className={cn(bordered, 'cursor-pointer text-muted-foreground transition-colors hover:bg-accent/50')}
          >
            {icon}
            <span className="font-medium truncate">{options[0]}</span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side={isMobile ? 'top' : 'bottom'} className="w-auto max-w-64 p-3">
          <p className="text-[length:var(--font-size-sm)] text-muted-foreground">No other options available.</p>
        </PopoverContent>
      </Popover>
    )
  }

  const groups: SearchableMenuGroup<{ value: string }>[] = [
    {
      id: 'advertised',
      label: '',
      items: options.map((value) => ({ id: value, label: value, data: { value } })),
    },
  ]

  const renderItem = (item: SearchableMenuItem<{ value: string }>, isSelected: boolean) => (
    <div
      className={cn(
        'w-full flex items-center px-3 h-[var(--touch-height-sm)] rounded-lg transition-colors text-left cursor-pointer text-[length:var(--font-size-body)]',
        isSelected ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <span className="font-medium truncate">{item.label}</span>
    </div>
  )

  const renderTrigger = (_item: SearchableMenuItem<{ value: string }> | undefined, isOpen: boolean) => (
    <div
      aria-label={ariaLabel}
      className={cn(bordered, 'cursor-pointer transition-colors', isOpen ? 'bg-accent' : 'hover:bg-accent/50')}
    >
      {icon}
      <span className="font-medium text-muted-foreground truncate">{selected}</span>
      <ChevronDown
        className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
      />
    </div>
  )

  return (
    <SearchableMenu
      items={groups}
      value={selected}
      onValueChange={(id) => setSelected(id)}
      searchable={false}
      blurBackdrop
      side={isMobile ? 'top' : 'bottom'}
      align="start"
      trigger={renderTrigger}
      renderItem={renderItem}
      itemGap="gap-0.5"
      width={260}
      maxHeight={300}
    />
  )
}
