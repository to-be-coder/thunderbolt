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

const TestWrapper = ({ children, route = '/chats/thread-1' }: { children: ReactNode; route?: string }) => {
  const Provider = createTestProvider()
  return (
    <MemoryRouter initialEntries={[route]}>
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

  it('renders the sidebar toggle on non-chat routes (desktop)', () => {
    setMatchesMobile(false)

    render(<Header />, { wrapper: ({ children }) => <TestWrapper route="/settings">{children}</TestWrapper> })

    expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument()
  })

  it('gives the top-left slot to the agent selector on chat routes (no burger)', () => {
    setMatchesMobile(false)

    render(<Header />, { wrapper: ({ children }) => <TestWrapper route="/chats/thread-1">{children}</TestWrapper> })

    // The desktop chat header hosts the agent selector instead of the sidebar
    // toggle; the sidebar has its own collapse control + ⌘B.
    expect(screen.queryByText('Toggle Sidebar')).not.toBeInTheDocument()
  })

  it('shows a new-chat shortcut on the mobile layout', () => {
    setMatchesMobile(true)

    render(<Header />, { wrapper: ({ children }) => <TestWrapper route="/chats/thread-1">{children}</TestWrapper> })

    expect(screen.getByText('New Chat')).toBeInTheDocument()
  })
})
