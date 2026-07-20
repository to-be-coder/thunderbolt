/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { SidebarProvider, useSidebar } from './sidebar'

const SidebarStateProbe = () => {
  const { isResponsiveCollapseMode, state, toggleSidebar } = useSidebar()
  return (
    <button type="button" onClick={toggleSidebar}>
      {state}:{String(isResponsiveCollapseMode)}
    </button>
  )
}

describe('SidebarProvider', () => {
  afterEach(cleanup)

  it('keeps compact mode collapsed without overwriting the desktop preference', () => {
    const onOpenChange = () => {
      throw new Error('Forced responsive state must not overwrite the saved preference')
    }
    const view = render(
      <SidebarProvider open responsiveCollapse onOpenChange={onOpenChange}>
        <SidebarStateProbe />
      </SidebarProvider>,
    )

    expect(screen.getByRole('button')).toHaveTextContent('collapsed:true')
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('collapsed:true')

    view.rerender(
      <SidebarProvider open responsiveCollapse={false} onOpenChange={onOpenChange}>
        <SidebarStateProbe />
      </SidebarProvider>,
    )
    expect(screen.getByRole('button')).toHaveTextContent('expanded:false')
  })
})
