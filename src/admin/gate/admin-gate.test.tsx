/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { HttpClientProvider } from '@/contexts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { MemoryRouter, Route, Routes } from 'react-router'
import { createRecordingClient, flush, type RouteHandler } from '../test-utils'
import { AdminGate } from './admin-gate'

const renderGate = (handler: RouteHandler) => {
  const { client, calls } = createRecordingClient(handler)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } } })
  render(
    <QueryClientProvider client={queryClient}>
      <HttpClientProvider httpClient={client}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/admin" element={<AdminGate />}>
              <Route index element={<div>ADMIN CONSOLE</div>} />
            </Route>
            <Route path="/not-found" element={<div>NOT FOUND</div>} />
          </Routes>
        </MemoryRouter>
      </HttpClientProvider>
    </QueryClientProvider>,
  )
  return { calls }
}

describe('AdminGate', () => {
  afterEach(cleanup)

  it('queries GET /v1/admin/me', async () => {
    const { calls } = renderGate(() => ({ id: '1', email: 'a@corp.test', status: 'active', isAdmin: true }))
    await flush()
    const meCall = calls.find((call) => call.path === '/v1/admin/me')
    expect(meCall).toBeDefined()
    expect(meCall?.method).toBe('GET')
  })

  it('renders the console for an admin', async () => {
    renderGate(() => ({ id: '1', email: 'a@corp.test', status: 'active', isAdmin: true }))
    await flush()
    expect(screen.getByText('ADMIN CONSOLE')).toBeInTheDocument()
  })

  it('hides the console from a non-admin member (redirects to /not-found)', async () => {
    renderGate(() => ({ id: '2', email: 'plain@corp.test', status: 'active', isAdmin: false }))
    await flush()
    expect(screen.queryByText('ADMIN CONSOLE')).not.toBeInTheDocument()
    expect(screen.getByText('NOT FOUND')).toBeInTheDocument()
  })

  it('hides the console when /admin/me errors (non-member, 403)', async () => {
    renderGate(() => new Response(JSON.stringify({ error: 'Forbidden', code: 'NOT_A_MEMBER' }), { status: 403 }))
    await flush()
    expect(screen.queryByText('ADMIN CONSOLE')).not.toBeInTheDocument()
    expect(screen.getByText('NOT FOUND')).toBeInTheDocument()
  })
})
