/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { toCompilableQuery } from '@powersync/drizzle-driver'
import { useQuery } from '@powersync/tanstack-react-query'
import { useDatabase } from '@/contexts'
import { getAllMcpServers } from '@/dal/mcp-servers'
import { builtInExtensions } from '@/extensions/registry'
import { isExtensionAllowed } from '@/dal/extension-policy'
import { useOrgPolicy } from '@/dal/use-org-policy'
import { useLibrarySkills } from '@/skills/use-skills'
import { useSettings } from './use-settings'
import type { McpServer } from '@/types'

/** Live counts of the ENABLED items in each Library category, for the universal
 *  "What it uses" summary on the Thunderbolt agent detail (agents-page-spec §2).
 *  Everything counted here is what applies to Thunderbolt and every
 *  non-confidential agent. */
export type LibraryCounts = {
  skills: number
  mcpServers: number
  extensions: number
}

/** Live-count the enabled Library items across skills, MCP servers, and the
 *  built-in extensions registry. */
export const useLibraryCounts = (): LibraryCounts => {
  const db = useDatabase()
  const { skills } = useLibrarySkills()
  const { data: mcpServers = [] } = useQuery({
    queryKey: ['mcp-servers'],
    query: toCompilableQuery(getAllMcpServers(db)),
  })
  const { experimentalFeatureTasks } = useSettings({ experimental_feature_tasks: false })
  const orgPolicy = useOrgPolicy()

  const enabledExtensions = builtInExtensions.filter((extension) => {
    // Org-blocked extensions never apply, even if the member's setting is on.
    if (!isExtensionAllowed(extension.id, orgPolicy.blockedExtensions)) {
      return false
    }
    if (extension.settingKey === 'experimental_feature_tasks') {
      return experimentalFeatureTasks.value
    }
    return false
  })

  return {
    skills: skills.filter((skill) => skill.enabled === 1).length,
    mcpServers: (mcpServers as McpServer[]).filter((server) => server.enabled === 1).length,
    extensions: enabledExtensions.length,
  }
}
