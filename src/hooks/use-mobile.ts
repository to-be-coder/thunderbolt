/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useSyncExternalStore } from 'react'

const mobileBreakpoint = 768
const compactSidebarBreakpoint = 980
const mobileMql = () => window.matchMedia(`(max-width: ${mobileBreakpoint - 1}px)`)
const compactSidebarMql = () =>
  window.matchMedia(`(min-width: ${mobileBreakpoint}px) and (max-width: ${compactSidebarBreakpoint}px)`)

const subscribe = (mediaQueryList: () => MediaQueryList) => (callback: () => void) => {
  const mediaQuery = mediaQueryList()
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

const getMobileSnapshot = () => mobileMql().matches
const getCompactSidebarSnapshot = () => compactSidebarMql().matches
const subscribeToMobile = subscribe(mobileMql)
const subscribeToCompactSidebar = subscribe(compactSidebarMql)

export const useIsMobile = () => {
  const isMobile = useSyncExternalStore(subscribeToMobile, getMobileSnapshot)
  return { isMobile }
}

/** Returns whether a desktop sidebar should use its compact icon-rail layout. */
export const useIsCompactSidebar = () => {
  const isCompactSidebar = useSyncExternalStore(subscribeToCompactSidebar, getCompactSidebarSnapshot)
  return { isCompactSidebar }
}
