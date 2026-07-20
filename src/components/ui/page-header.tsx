/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  children?: ReactNode
  /** Override the default title size/weight (e.g. `text-[32px]`). */
  titleClassName?: string
  /** Optional element rendered before the title (e.g. a mobile sidebar burger on
   *  pages that own their header and so miss the shared mobile `Header`). */
  leading?: ReactNode
  /** Absolutely center the title in the row (leading stays left, actions stay
   *  right) — mirrors the skills page's mobile header. */
  centerTitle?: boolean
}

/**
 * Consistent page header with title and optional action buttons.
 *
 * @example
 * ```tsx
 * <PageHeader title="Models">
 *   <Button size="icon" className="rounded-lg bg-card hover:bg-accent">
 *     <Plus />
 *   </Button>
 * </PageHeader>
 * ```
 */
export const PageHeader = ({ title, children, titleClassName, leading, centerTitle }: PageHeaderProps) => {
  const titleClasses = cn('text-[24px] leading-[32px] font-bold tracking-tight text-primary', titleClassName)
  return (
    <div className="relative flex min-h-[var(--touch-height-xl)] items-center justify-between">
      <div className="flex min-w-0 items-center gap-2">
        {leading}
        {!centerTitle && <h1 className={titleClasses}>{title}</h1>}
      </div>
      {centerTitle && (
        <h1
          className={cn(
            'pointer-events-none absolute left-1/2 max-w-[60%] -translate-x-1/2 truncate text-center',
            titleClasses,
          )}
        >
          {title}
        </h1>
      )}
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
