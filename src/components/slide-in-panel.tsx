/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

/** Detail column width when open. The width animation reflows the sibling list;
 *  the content translate slides it in — together they read as one motion. */
const DETAIL_WIDTH = 'clamp(360px, 42vw, 560px)'
// Linear's spring curve — fast start, smooth tail, no overshoot.
const SLIDE = 'cubic-bezier(0.32, 0.72, 0, 1)'

/**
 * A right-side detail panel with two responsive shapes, so a list→detail flow
 * matches the rest of the app at every width. The caller styles/scrolls the
 * `children`; the panel keeps them mounted while closed so a latched last-detail
 * animates out cleanly.
 *
 *  • Desktop — an inline flex child (no overlay). Opening animates a width +
 *    translate combo: the width reflows the list smaller while the content slides
 *    in from the right; the two together read as one motion.
 *  • Mobile — a full-screen page that slides over the list (like navigating
 *    between pages), so the detail isn't crammed beside a squeezed list. It
 *    overlays absolutely, so the list underneath needs no layout change; the
 *    detail's own header/back (the X) returns to the list. The PARENT must be
 *    `relative` for the overlay to anchor to the content area.
 */
export const SlideInPanel = ({ open, children }: { open: boolean; children: ReactNode }) => {
  const { isMobile } = useIsMobile()

  if (isMobile) {
    return (
      <div
        className={cn(
          'absolute inset-0 z-30 bg-background transition-transform duration-300 motion-reduce:transition-none',
          !open && 'pointer-events-none',
        )}
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transitionTimingFunction: SLIDE,
        }}
        aria-hidden={!open}
      >
        {children}
      </div>
    )
  }

  return (
    <aside
      className="h-full shrink-0 overflow-hidden transition-[width] duration-300 motion-reduce:transition-none"
      style={{ width: open ? DETAIL_WIDTH : '0px', transitionTimingFunction: SLIDE }}
      aria-hidden={!open}
    >
      <div
        className="h-full transition-transform duration-300 motion-reduce:transition-none"
        style={{
          width: DETAIL_WIDTH,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transitionTimingFunction: SLIDE,
        }}
      >
        {children}
      </div>
    </aside>
  )
}
