/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type PillTone = 'success' | 'info' | 'warning' | 'muted'

const toneClasses: Record<PillTone, string> = {
  success: 'bg-green-500/15 text-green-700 dark:text-green-400',
  info: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  muted: 'bg-muted text-muted-foreground',
}

/** Small inline status badge (no shadcn `badge` component exists in this repo). */
export const StatusPill = ({ tone, children }: { tone: PillTone; children: ReactNode }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium capitalize',
      toneClasses[tone],
    )}
  >
    {children}
  </span>
)
