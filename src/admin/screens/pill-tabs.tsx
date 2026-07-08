/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { ComponentType } from 'react'

export type PillTab<T extends string> = {
  id: T
  label: string
  icon?: ComponentType<{ className?: string }>
}

/**
 * Modern underline tab bar: the tabs sit on a hairline rule and an accent
 * indicator glides under the active tab (framer-motion `layoutId`). Used for the
 * agent detail panel's Details / Access / Preview tabs.
 */
export const PillTabs = <T extends string>({
  tabs,
  value,
  onChange,
  layoutId = 'pillTabActiveBg',
}: {
  tabs: PillTab<T>[]
  value: T
  onChange: (id: T) => void
  layoutId?: string
}) => (
  <div role="tablist" className="flex items-center gap-5 border-b border-border">
    {tabs.map((tab) => {
      const active = tab.id === value
      const Icon = tab.icon
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 text-sm font-medium transition-colors',
            active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {Icon && <Icon className="size-4" />}
          <span>{tab.label}</span>
          {active && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
              transition={{ type: 'spring', damping: 35, stiffness: 400, mass: 0.8 }}
            />
          )}
        </button>
      )
    })}
  </div>
)
