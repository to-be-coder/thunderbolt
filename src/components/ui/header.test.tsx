/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { resetTestDatabase, setupTestDatabase, teardownTestDatabase } from '@/dal/test-utils'
import { createTestProvider } from '@/test-utils/test-provider'
import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { SignInModalProvider } from '@/contexts'
import { Header } from './header'

/**
 * `useIsMobile` reads `window.matchMedia(...).matches`. happy-dom only updates
 * matchMedia via its `setViewport` control API, which is a silent no-op when
 * `window.happyDOM` is unavailable under some cross-file test orderings — the
 * source of a seed-dependent flake here. Driving matchMedia directly makes the
 * Header's layout branch deterministic; `afterEach` restores the real impl so
 * nothing leaks to other files.
 */
const realMatchMedia = window.matchMedia
const setMatchesMobile = (isMobile: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

const TestWrapper = ({ children }: { children: ReactNode }) => {
  const Provider = createTestProvider()
  return (
    <MemoryRouter initialEntries={['/chats/thread-1']}>
      <Provider>
        <SignInModalProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </SignInModalProvider>
      </Provider>
    </MemoryRouter>
  )
}

describe('Header', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  afterEach(async () => {
    cleanup()
    window.matchMedia = realMatchMedia
    await resetTestDatabase()
  })

  it('renders the sidebar toggle (agent selection now lives in the composer)', () => {
    setMatchesMobile(false)

    render(<Header />, { wrapper: TestWrapper })

    expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument()
  })

  it('shows a new-chat shortcut on the mobile layout', () => {
    setMatchesMobile(true)

    render(<Header />, { wrapper: TestWrapper })

    expect(screen.getByText('New Chat')).toBeInTheDocument()
  })
})
