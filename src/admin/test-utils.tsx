/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { HttpClientProvider } from '@/contexts'
import { createClient, type HttpClient } from '@/lib/http'
import { getClock } from '@/testing-library'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router'

export type RecordedCall = { method: string; path: string; search: string; body: unknown }

/** Routing function: given a recorded call, return the JSON body to respond with
 *  (or a full `Response` for status control). Return `undefined` for `{}`. */
export type RouteHandler = (call: RecordedCall) => unknown

/**
 * Build a real {@link HttpClient} backed by a recording fake `fetch`. Every call
 * is captured in `calls` so a test can assert the exact method + path a screen's
 * primary action hit; `handler` decides the response per call.
 */
export const createRecordingClient = (handler: RouteHandler): { client: HttpClient; calls: RecordedCall[] } => {
  const calls: RecordedCall[] = []
  const fetchFn = async (input: RequestInfo | URL): Promise<Response> => {
    const request = input as Request
    const url = new URL(request.url)
    const hasBody = request.method !== 'GET' && request.method !== 'DELETE'
    const body = hasBody
      ? await request
          .clone()
          .json()
          .catch(() => undefined)
      : undefined
    const call: RecordedCall = { method: request.method, path: url.pathname, search: url.search, body }
    calls.push(call)
    const result = handler(call)
    if (result instanceof Response) {
      return result
    }
    return new Response(JSON.stringify(result ?? {}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const client = createClient({ fetch: fetchFn, prefixUrl: 'http://admin.test/v1' })
  return { client, calls }
}

/** Flush pending timers + microtasks (react-query fetches resolve here). */
export const flush = async (): Promise<void> => {
  await act(async () => {
    await getClock().runAllAsync()
  })
}

const AdminTestProviders = ({ client, children }: { client: HttpClient; children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <HttpClientProvider httpClient={client}>
        <MemoryRouter>{children}</MemoryRouter>
      </HttpClientProvider>
    </QueryClientProvider>
  )
}

/** Render an admin screen with a recording client + the providers it depends on. */
export const renderAdmin = (ui: ReactElement, client: HttpClient) =>
  render(<AdminTestProviders client={client}>{ui}</AdminTestProviders>)
