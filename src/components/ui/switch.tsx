/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useCallback, type ComponentProps } from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { useHaptics } from '@/hooks/use-haptics'
import { cn } from '@/lib/utils'

/**
 * The default pill toggle (shadcn geometry). A transparent 2px border in EVERY
 * state gives an even 2px gap all round — the thumb (one CSS-var size) fills the
 * rest, so the dot is the SAME size and inset for OFF, ON, and DISABLED. Only
 * COLOR changes:
 *  - OFF      → `bg-input` track.
 *  - ON       → the theme's `bg-primary` track.
 *  - DISABLED → the OFF/ON track, dimmed to 50%.
 */
const Switch = ({ className, onCheckedChange, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) => {
  const { triggerSelection } = useHaptics()

  const handleCheckedChange = useCallback(
    (checked: boolean) => {
      triggerSelection()
      onCheckedChange?.(checked)
    },
    [onCheckedChange, triggerSelection],
  )

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      onCheckedChange={handleCheckedChange}
      className={cn(
        'peer inline-flex h-[var(--switch-track-height)] w-[var(--switch-track-width)] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors outline-none',
        'bg-input dark:bg-input/80 data-[state=checked]:bg-primary',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-[var(--switch-thumb-size)] rounded-full bg-background ring-0 transition-transform',
          'data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-[var(--switch-thumb-translate)]',
          'dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
