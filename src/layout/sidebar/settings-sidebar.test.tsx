/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { AuthClient } from '@/contexts'
import { SignInModalProvider } from '@/contexts'
import { SidebarProvider } from '@/components/ui/sidebar'
import { resetTestDatabase, setupTestDatabase, teardownTestDatabase } from '@/dal/test-utils'
import { createMockAuthClient } from '@/test-utils/auth-client'
import { createTestProvider } from '@/test-utils/test-provider'
import '@testing-library/jest-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { SettingsSidebarContent } from './settings-sidebar'

const realMatchMedia = window.matchMedia

/** Keeps settings-sidebar tests on the desktop rendering path. */
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

beforeEach(setDesktopViewport)

afterEach(() => {
  window.matchMedia = realMatchMedia
})

const anonSession = {
  user: { id: 'anon-1', email: '', name: '', isAnonymous: true },
}

const authedSession = {
  user: { id: 'user-1', email: 'a@b.com', name: 'Alice', isAnonymous: false },
}

const renderSidebar = (
  authClient: AuthClient,
  isStandalone: () => boolean,
  sidebarState: { defaultOpen?: boolean; responsiveCollapse?: boolean } = {},
) => {
  const TestProvider = createTestProvider({ authClient })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <TestProvider>
      <SignInModalProvider>
        <MemoryRouter initialEntries={['/settings']}>
          <SidebarProvider {...sidebarState}>{children}</SidebarProvider>
        </MemoryRouter>
      </SignInModalProvider>
    </TestProvider>
  )
  return render(
    <SettingsSidebarContent onBackClick={() => {}} onSettingsNavigate={() => {}} isStandalone={isStandalone} />,
    { wrapper: Wrapper },
  )
}

const onTauri = () => true
const offTauri = () => false

describe('SettingsSidebarContent — header controls', () => {
  beforeAll(setupTestDatabase)

  afterAll(teardownTestDatabase)

  afterEach(cleanup)

  it('places the back control below expand when the wide sidebar is collapsed', () => {
    renderSidebar(createMockAuthClient({ session: anonSession }), offTauri, { defaultOpen: false })

    const expandButton = screen.getByText('Expand Sidebar').closest('button')!
    const backButton = screen.getByText('Back').closest('button')!

    expect(expandButton).toBeInTheDocument()
    expect(backButton).toBeInTheDocument()
    expect(expandButton.compareDocumentPosition(backButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(expandButton.parentElement).not.toBe(backButton.parentElement)
    expect(screen.queryByText('Toggle Sidebar')).not.toBeInTheDocument()
  })

  it('shows only the back control in the compact collapsed rail', () => {
    renderSidebar(createMockAuthClient({ session: anonSession }), offTauri, { responsiveCollapse: true })

    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.queryByText('Expand Sidebar')).not.toBeInTheDocument()
    expect(screen.queryByText('Toggle Sidebar')).not.toBeInTheDocument()
  })

  it('shows back and collapse controls when the wide sidebar is expanded', () => {
    renderSidebar(createMockAuthClient({ session: anonSession }), offTauri)

    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument()
    expect(screen.queryByText('Expand Sidebar')).not.toBeInTheDocument()
  })
})

describe('SettingsSidebarContent — Agents entry visibility', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await resetTestDatabase()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('hides the Agents entry for anonymous users when the proxy is effectively on (web)', () => {
    const authClient = createMockAuthClient({ session: anonSession })
    renderSidebar(authClient, offTauri)

    expect(screen.queryByText('Agents')).not.toBeInTheDocument()
  })

  it('hides the Agents entry for anonymous users on Tauri Connected (proxy_enabled=true)', () => {
    localStorage.setItem('proxy_enabled', 'true')
    const authClient = createMockAuthClient({ session: anonSession })
    renderSidebar(authClient, onTauri)

    expect(screen.queryByText('Agents')).not.toBeInTheDocument()
  })

  it('shows the Agents entry for anonymous users on Tauri Standalone (proxy off)', () => {
    // localStorage has no `proxy_enabled` — defaults to false on Tauri.
    const authClient = createMockAuthClient({ session: anonSession })
    renderSidebar(authClient, onTauri)

    expect(screen.getByText('All agents')).toBeInTheDocument()
  })

  it('shows the Agents entry for authenticated users behind the proxy (web)', () => {
    const authClient = createMockAuthClient({ session: authedSession })
    renderSidebar(authClient, offTauri)

    expect(screen.getByText('All agents')).toBeInTheDocument()
  })

  it('shows the Agents entry for authenticated users on Tauri Standalone (proxy off)', () => {
    const authClient = createMockAuthClient({ session: authedSession })
    renderSidebar(authClient, onTauri)

    expect(screen.getByText('All agents')).toBeInTheDocument()
  })
})

describe('SettingsSidebarContent — Devices entry visibility', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await resetTestDatabase()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('shows the Devices entry for an authenticated user', () => {
    const authClient = createMockAuthClient({ session: authedSession })
    renderSidebar(authClient, offTauri)

    expect(screen.getByText('Devices')).toBeInTheDocument()
  })

  it('hides the Devices entry for an anonymous user', () => {
    const authClient = createMockAuthClient({ session: anonSession })
    renderSidebar(authClient, offTauri)

    expect(screen.queryByText('Devices')).not.toBeInTheDocument()
  })

  it('hides the Devices entry when there is no session', () => {
    const authClient = createMockAuthClient({ session: null })
    renderSidebar(authClient, offTauri)

    expect(screen.queryByText('Devices')).not.toBeInTheDocument()
  })
})
