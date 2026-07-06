/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Server-side ACP reachability probe for the registry's connection-test
 * endpoint. A thin port of the frontend `src/acp/connection-test.ts` (which
 * imports frontend-only `@/` aliases and can't be shared across the package
 * boundary): open the endpoint, run the ACP `initialize` handshake, race a
 * timeout, and report reachable / unreachable. Always tears the socket down.
 *
 * The probe opens the raw endpoint with no invoker identity — consistent with
 * the ACP-identity finding (external ACP agents get a service/anonymous
 * identity today; see the note in `discovery/routes.ts`).
 */

import type { Agent as AcpSdkAgent, AnyMessage, Client, ClientSideConnection, Stream } from '@agentclientprotocol/sdk'
import { ClientSideConnection as ClientSideConnectionImpl } from '@agentclientprotocol/sdk'

const protocolVersion = 1
const clientName = 'thunderbolt-admin'
const clientVersion = '0.1.0'
const defaultTimeoutMs = 10000

/** The probe never drives a session: session updates are dropped and any
 *  permission prompt is auto-cancelled. */
const probeClient: Client = {
  sessionUpdate: async () => {},
  requestPermission: async () => ({ outcome: { outcome: 'cancelled' } }),
}

/** Minimal WebSocket surface the probe needs — lets tests inject a fake socket. */
export type ProbeSocket = {
  readyState: number
  send: (data: string) => void
  close: (code?: number) => void
  addEventListener: (type: string, listener: (event: { data?: string; message?: string }) => void) => void
}

export type ProbeWebSocketFactory = (url: string) => ProbeSocket

type ClientSideConnectionCtor = new (
  toClient: (agent: AcpSdkAgent) => Client,
  stream: Stream,
) => ClientSideConnection

const defaultWebSocketFactory: ProbeWebSocketFactory = (url) => new WebSocket(url) as unknown as ProbeSocket

export type TestAcpConnectionOptions = {
  url: string
  timeoutMs?: number
  /** Test seam — DI a fake socket factory. Production opens a native WebSocket. */
  webSocketFactory?: ProbeWebSocketFactory
  /** Test seam — DI the SDK connection constructor. */
  ClientSideConnection?: ClientSideConnectionCtor
}

export type TestAcpConnectionResult = { reachable: true } | { reachable: false; error: string }

/** Open a socket and adapt it to the ACP SDK `Stream` (one JSON-RPC object per
 *  WS message). Resolves once the socket is open so the handshake can start. */
const openProbeStream = (
  factory: ProbeWebSocketFactory,
  url: string,
): Promise<{ stream: Stream; close: () => void }> =>
  new Promise((resolve, reject) => {
    const socket = factory(url)
    let controller: ReadableStreamDefaultController<AnyMessage> | null = null

    const readable = new ReadableStream<AnyMessage>({
      start: (c) => {
        controller = c
      },
    })
    const writable = new WritableStream<AnyMessage>({
      write: (msg) => {
        socket.send(JSON.stringify(msg))
      },
    })

    socket.addEventListener('message', (event) => {
      if (event.data === undefined) {
        return
      }
      controller?.enqueue(JSON.parse(event.data) as AnyMessage)
    })
    socket.addEventListener('error', (event) => {
      reject(new Error(event.message ?? 'WebSocket error'))
    })
    socket.addEventListener('open', () => {
      resolve({ stream: { readable, writable }, close: () => socket.close() })
    })
  })

/**
 * Open `url`, run the ACP `initialize` handshake, and report reachability. Races
 * the handshake against `timeoutMs`; always closes the transport.
 */
export const testAcpConnection = async (opts: TestAcpConnectionOptions): Promise<TestAcpConnectionResult> => {
  const factory = opts.webSocketFactory ?? defaultWebSocketFactory
  const ConnectionCtor = opts.ClientSideConnection ?? ClientSideConnectionImpl
  const timeoutMs = opts.timeoutMs ?? defaultTimeoutMs

  let close: (() => void) | null = null
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    const opened = await openProbeStream(factory, opts.url)
    close = opened.close
    const connection = new ConnectionCtor(() => probeClient, opened.stream)

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Connection timed out')), timeoutMs)
    })

    await Promise.race([
      connection.initialize({
        protocolVersion,
        clientInfo: { name: clientName, version: clientVersion },
        clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      }),
      timeoutPromise,
    ])

    return { reachable: true }
  } catch (err) {
    const message = err instanceof TypeError ? 'Could not reach agent' : err instanceof Error ? err.message : String(err)
    return { reachable: false, error: message }
  } finally {
    clearTimeout(timeoutId)
    close?.()
  }
}
