/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * THE LIBRARY-INJECTION FUNCTION (Stage 4, INVARIANT 3 — the seal's payload).
 *
 * `gatherEnabledLibrary` is the ONE function that reads the member's ENABLED
 * Library — skills (`src/skills`), MCP servers, and extensions (`src/extensions`)
 * — and shapes them for an ACP session. It exists so that exactly one code path
 * can expose user-scoped items to a team agent.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS FUNCTION MUST BE REACHABLE ONLY FROM THE EXTENSIBLE SESSION BUILDER.
 *
 * `src/acp/extensible-session.ts` is the sole importer. The sealed builder
 * (`src/acp/sealed-session.ts`) never imports this module — that is the seal.
 * A sealed/personal ACP session is constructed by a type that has no method
 * capable of returning a {@link LibraryInjection}, so a user-scoped
 * skill/MCP/extension call inside a sealed session fails at COMPILE/ROUTE level:
 * the injection function is simply not in scope for that constructor.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { McpServer } from '@agentclientprotocol/sdk'
import type { AnyDrizzleDatabase } from '../db/database-interface'
import { getAllSkills as defaultGetAllSkills } from '@/dal'
import type { NamedMCPClient } from '@/lib/mcp-provider'
import { resolveSkillTokenInstructions } from '@/skills/resolve-skill-system-messages'

/** The member's enabled Library, shaped for injection into an ACP session.
 *  Produced ONLY by {@link gatherEnabledLibrary}. Skills fold into the prompt;
 *  MCP servers ride `session/new`'s `mcpServers`; extension tool names are
 *  carried for exposure/telemetry (the ACP tool channel is future work — see
 *  the transport note in the discovery routes). */
export type LibraryInjection = {
  skillInstructions: string[]
  mcpServers: McpServer[]
  extensionToolNames: string[]
}

/** Convert a connected, enabled MCP client into the ACP HTTP MCP-server config
 *  the agent uses to connect itself. Local (stdio) clients have no URL and are
 *  dropped — an ACP agent can't reach the user's machine. */
export const namedClientToAcpMcpServer = (client: NamedMCPClient): McpServer => ({
  type: 'http',
  name: client.name,
  url: client.url,
  headers: [],
})

export type GatherLibraryInput = {
  db: AnyDrizzleDatabase
  /** Last user message text — skill (`/slug`) tokens resolve against it. */
  lastUserText: string
  /** The member's currently-connected MCP clients (already enabled). */
  mcpClients: NamedMCPClient[]
  /** Names of the member's enabled extension tools. Resolved by the caller so
   *  the heavy `getAvailableTools` gather stays out of this pure function. */
  extensionToolNames: string[]
}

export type GatherLibraryDeps = {
  getAllSkills?: typeof defaultGetAllSkills
}

/**
 * Gather the member's ENABLED skills, MCP servers, and extensions into a
 * {@link LibraryInjection}. Cheap-exits skill resolution when the prompt has no
 * `/` token. This is the injection function guarded by the seal — see the file
 * header.
 */
export const gatherEnabledLibrary = async (
  input: GatherLibraryInput,
  deps: GatherLibraryDeps = {},
): Promise<LibraryInjection> => {
  const getAllSkills = deps.getAllSkills ?? defaultGetAllSkills
  const mcpServers = input.mcpClients.filter((client) => client.url).map(namedClientToAcpMcpServer)

  if (!input.lastUserText.includes('/')) {
    return { skillInstructions: [], mcpServers, extensionToolNames: input.extensionToolNames }
  }

  const instructionBySlug = new Map<string, string>()
  for (const skill of await getAllSkills(input.db)) {
    if (skill.enabled === 1 && skill.name && skill.instruction) {
      instructionBySlug.set(skill.name, skill.instruction)
    }
  }
  return {
    skillInstructions: resolveSkillTokenInstructions(input.lastUserText, instructionBySlug),
    mcpServers,
    extensionToolNames: input.extensionToolNames,
  }
}
