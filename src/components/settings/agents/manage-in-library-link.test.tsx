/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { ManageInLibraryLink } from './manage-in-library-link'

afterEach(() => {
  cleanup()
})

describe('ManageInLibraryLink', () => {
  it('instruments the tap as the demand-signal event and navigates into the Library', () => {
    const navigate = mock((_: string) => {})
    const trackEvent = mock((_: string, __?: Record<string, unknown>) => {})
    render(
      <ManageInLibraryLink
        agentKind="thunderbolt"
        agentId="thunderbolt-built-in"
        useNavigate={() => navigate as never}
        trackEvent={trackEvent as never}
      />,
    )

    fireEvent.click(screen.getByTestId('manage-in-library-link'))

    expect(trackEvent).toHaveBeenCalledWith('agent_manage_library_tap', {
      agentKind: 'thunderbolt',
      agentId: 'thunderbolt-built-in',
    })
    expect(navigate).toHaveBeenCalledWith('/settings/skills')
  })
})
