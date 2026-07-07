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
}

/**
 * Consistent page header with title and optional action buttons.
 *
 * @example
 * ```tsx
 * <PageHeader title="Models">
 *   <Button size="icon" className="rounded-lg">
 *     <Plus />
 *   </Button>
 * </PageHeader>
 * ```
 */
export const PageHeader = ({ title, children, titleClassName }: PageHeaderProps) => (
  <div className="flex items-center justify-between mt-4">
    <h1 className={cn('text-4xl font-bold tracking-tight text-primary', titleClassName)}>{title}</h1>
    <div className="flex items-center gap-2">{children}</div>
  </div>
)
