/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it, mock } from 'bun:test'
import type { NamedMCPClient } from '@/lib/mcp-provider'
import { gatherEnabledLibrary, namedClientToAcpMcpServer } from './session-library'

const client = (over: Partial<NamedMCPClient>): NamedMCPClient => ({
  id: 'm1',
  name: 'Notion',
  url: 'https://mcp.notion.test/sse',
  client: {} as NamedMCPClient['client'],
  ...over,
})

describe('gatherEnabledLibrary', () => {
  it('resolves ENABLED skill tokens, maps MCP clients to ACP servers, and carries extension names', async () => {
    const getAllSkills = mock(async () => [
      { id: 's1', name: 'joke', description: 'd', instruction: 'Tell a cat joke.', enabled: 1 },
      { id: 's2', name: 'off', description: 'd', instruction: 'Never runs.', enabled: 0 },
    ])

    const library = await gatherEnabledLibrary(
      {
        db: {} as never,
        lastUserText: 'please /joke',
        mcpClients: [client({}), client({ id: 'm2', name: 'stdio', url: '' })],
        extensionToolNames: ['tasks_create'],
      },
      { getAllSkills: getAllSkills as never },
    )

    expect(library.skillInstructions).toEqual(['Tell a cat joke.'])
    // Local (urlless) clients are dropped — an ACP agent can't reach the machine.
    expect(library.mcpServers).toEqual([
      { type: 'http', name: 'Notion', url: 'https://mcp.notion.test/sse', headers: [] },
    ])
    expect(library.extensionToolNames).toEqual(['tasks_create'])
  })

  it('cheap-exits skill resolution (no DB read) when the prompt has no slash token', async () => {
    const getAllSkills = mock(async () => [])

    const library = await gatherEnabledLibrary(
      { db: {} as never, lastUserText: 'no tokens here', mcpClients: [client({})], extensionToolNames: [] },
      { getAllSkills: getAllSkills as never },
    )

    expect(library.skillInstructions).toEqual([])
    expect(getAllSkills).not.toHaveBeenCalled()
    expect(library.mcpServers).toHaveLength(1)
  })

  it('namedClientToAcpMcpServer produces an http ACP McpServer with empty headers', () => {
    expect(namedClientToAcpMcpServer(client({ name: 'Linear', url: 'https://x.test' }))).toEqual({
      type: 'http',
      name: 'Linear',
      url: 'https://x.test',
      headers: [],
    })
  })
})
