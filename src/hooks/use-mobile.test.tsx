/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { useIsCompactSidebar, useIsMobile } from './use-mobile'

const realMatchMedia = window.matchMedia

/** Provides deterministic media-query results for responsive hook tests. */
const setViewportWidth = (width: number) => {
  window.matchMedia = ((query: string) => ({
    matches:
      query === '(max-width: 767px)'
        ? width <= 767
        : query === '(min-width: 768px) and (max-width: 980px)' && width >= 768 && width <= 980,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

describe('responsive sidebar breakpoints', () => {
  afterEach(() => {
    cleanup()
    window.matchMedia = realMatchMedia
  })

  it.each([
    { width: 767, isMobile: true, isCompactSidebar: false },
    { width: 768, isMobile: false, isCompactSidebar: true },
    { width: 980, isMobile: false, isCompactSidebar: true },
    { width: 981, isMobile: false, isCompactSidebar: false },
  ])('uses the expected layout at $width px', ({ width, isMobile, isCompactSidebar }) => {
    setViewportWidth(width)

    const mobile = renderHook(useIsMobile)
    const compactSidebar = renderHook(useIsCompactSidebar)

    expect(mobile.result.current.isMobile).toBe(isMobile)
    expect(compactSidebar.result.current.isCompactSidebar).toBe(isCompactSidebar)
  })
})
