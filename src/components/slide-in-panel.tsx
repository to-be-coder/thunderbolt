/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ReactNode } from 'react'

/** Detail column width when open. The width animation reflows the sibling list;
 *  the content translate slides it in — together they read as one motion. */
const DETAIL_WIDTH = 'clamp(360px, 42vw, 560px)'
// Linear's spring curve — fast start, smooth tail, no overshoot.
const SLIDE = 'cubic-bezier(0.32, 0.72, 0, 1)'

/**
 * An inline right-side detail panel (no overlay, no portal). Rendered as a real
 * flex child so the sibling list to its left shrinks to make room instead of
 * being covered. Opening animates a width + translate combo: the width reflows
 * the list smaller while the content slides in from the right. Fills the height
 * of its flex row; the caller styles/scrolls the `children`.
 */
export const SlideInPanel = ({ open, children }: { open: boolean; children: ReactNode }) => (
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
