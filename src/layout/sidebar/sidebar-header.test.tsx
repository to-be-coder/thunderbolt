/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { SidebarProvider } from '@/components/ui/sidebar'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { SidebarHeader } from './sidebar-header'

const realMatchMedia = window.matchMedia

/** Keeps sidebar-header tests on the non-mobile rendering path. */
const setDesktopViewport = () => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

describe('SidebarHeader', () => {
  afterEach(() => {
    cleanup()
    window.matchMedia = realMatchMedia
  })

  it('hides the panel control in compact mode', () => {
    setDesktopViewport()
    render(
      <SidebarProvider responsiveCollapse>
        <SidebarHeader onToggle={() => {}} />
      </SidebarProvider>,
    )

    expect(screen.queryByText('Expand Sidebar')).not.toBeInTheDocument()
  })

  it('shows the panel control for a collapsed wide sidebar', () => {
    setDesktopViewport()
    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarHeader onToggle={() => {}} />
      </SidebarProvider>,
    )

    expect(screen.getByText('Expand Sidebar')).toBeInTheDocument()
  })
})
