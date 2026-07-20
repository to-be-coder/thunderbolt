/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { setupTestDatabase, teardownTestDatabase } from '@/dal/test-utils'
import { createTestProvider } from '@/test-utils/test-provider'
import { MemoryRouter } from 'react-router'
import { AdminConsoleLayout } from './admin-console-layout'
import { createRecordingClient } from './test-utils'

const realMatchMedia = window.matchMedia

/** Selects the admin console's responsive layout for a fixed viewport width. */
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

const renderLayout = () => {
  const { client } = createRecordingClient(() => ({
    id: 'admin-1',
    email: 'admin@thunderbolt.test',
    status: 'active',
    isAdmin: true,
  }))
  const Provider = createTestProvider({ httpClient: client })
  render(
    <Provider>
      <MemoryRouter>
        <AdminConsoleLayout>
          <div>Admin content</div>
        </AdminConsoleLayout>
      </MemoryRouter>
    </Provider>,
  )
}

describe('AdminConsoleLayout', () => {
  beforeAll(setupTestDatabase)

  afterAll(teardownTestDatabase)

  afterEach(() => {
    cleanup()
    localStorage.clear()
    window.matchMedia = realMatchMedia
  })

  it('uses the collapsed rail at the compact desktop breakpoint', () => {
    setViewportWidth(980)
    renderLayout()

    expect(screen.queryByText('Admin Console')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Expand sidebar' })).not.toBeInTheDocument()
    expect(screen.getByTitle('Agents')).toBeInTheDocument()
  })

  it('shows the panel control for a collapsed sidebar at 981px', () => {
    localStorage.setItem('admin-sidebar-collapsed', 'true')
    setViewportWidth(981)
    renderLayout()

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    expect(screen.getByTitle('Agents')).toBeInTheDocument()
  })

  it('keeps the expanded rail above the compact desktop breakpoint', () => {
    setViewportWidth(981)
    renderLayout()

    expect(screen.getByText('Admin Console')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
    expect(screen.getByText('Agents')).toBeInTheDocument()
  })
})
