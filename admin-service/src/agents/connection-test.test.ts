/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import { testAcpConnection, type ProbeSocket } from './connection-test'
import { validateAcpUrl } from './url-validation'

/** A fake socket that fires `open` on the next tick and answers the ACP
 *  `initialize` request with a minimal success payload. */
const reachableSocketFactory = (): ProbeSocket => {
  const listeners: Record<string, ((event: { data?: string; message?: string }) => void)[]> = {}
  const emit = (type: string, event: { data?: string; message?: string }) =>
    (listeners[type] ?? []).forEach((fn) => fn(event))
  return {
    readyState: 1,
    send: (data: string) => {
      const msg = JSON.parse(data) as { id?: number; method?: string }
      if (msg.method === 'initialize') {
        queueMicrotask(() =>
          emit('message', {
            data: JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: 1, agentCapabilities: {} } }),
          }),
        )
      }
    },
    close: () => {},
    addEventListener: (type, listener) => {
      ;(listeners[type] ??= []).push(listener)
      if (type === 'open') {
        queueMicrotask(() => emit('open', {}))
      }
    },
  }
}

/** A fake socket that never opens and immediately errors. */
const unreachableSocketFactory = (): ProbeSocket => {
  const listeners: Record<string, ((event: { data?: string; message?: string }) => void)[]> = {}
  return {
    readyState: 3,
    send: () => {},
    close: () => {},
    addEventListener: (type, listener) => {
      ;(listeners[type] ??= []).push(listener)
      if (type === 'error') {
        queueMicrotask(() => listener({ message: 'connection refused' }))
      }
    },
  }
}

describe('validateAcpUrl (SSRF guard)', () => {
  it('accepts a public wss URL', () => {
    expect(validateAcpUrl('wss://agent.example.com/acp')).toEqual({ ok: true, url: 'wss://agent.example.com/acp' })
  })
  it('rejects non-wss schemes', () => {
    expect(validateAcpUrl('ws://agent.example.com/acp').ok).toBe(false)
    expect(validateAcpUrl('https://agent.example.com/acp').ok).toBe(false)
  })
  it('rejects loopback / private literal hosts', () => {
    expect(validateAcpUrl('wss://127.0.0.1/acp').ok).toBe(false)
    expect(validateAcpUrl('wss://10.0.0.5/acp').ok).toBe(false)
    expect(validateAcpUrl('wss://[::1]/acp').ok).toBe(false)
  })
})

describe('testAcpConnection', () => {
  it('reports reachable when the ACP initialize handshake succeeds', async () => {
    const result = await testAcpConnection({ url: 'wss://agent.test/acp', webSocketFactory: reachableSocketFactory })
    expect(result).toEqual({ reachable: true })
  })

  it('reports unreachable when the socket errors', async () => {
    const result = await testAcpConnection({ url: 'wss://agent.test/acp', webSocketFactory: unreachableSocketFactory })
    expect(result.reachable).toBe(false)
  })

  it('reports unreachable on handshake timeout', async () => {
    // Socket opens but never answers initialize → timeout fires.
    const silentFactory = (): ProbeSocket => {
      const listeners: Record<string, ((event: { data?: string }) => void)[]> = {}
      return {
        readyState: 1,
        send: () => {},
        close: () => {},
        addEventListener: (type, listener) => {
          ;(listeners[type] ??= []).push(listener)
          if (type === 'open') {
            queueMicrotask(() => listener({}))
          }
        },
      }
    }
    const result = await testAcpConnection({ url: 'wss://agent.test/acp', webSocketFactory: silentFactory, timeoutMs: 20 })
    expect(result).toEqual({ reachable: false, error: 'Connection timed out' })
  })
})
