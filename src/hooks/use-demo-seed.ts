/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useEffect, useRef } from 'react'
import { useDatabase } from '@/contexts'
import { replaceTeamAgentsCache } from '@/dal/team-agents-cache'
import { setOrgPolicy } from '@/dal/org-policy'
import { createAgent, getAllAgents } from '@/dal/agents'
import { demoTeamAgentDefs, toAgentCard } from '@/lib/demo-team-agents'
import { isDemoMode } from '@/lib/demo-mode'
import type { OrgPolicy } from '@shared/agent-cards'

/** The demo company agents the member sees — projected from the ONE canonical
 *  source so the member card and the admin registry entry are the same object. */
const demoTeamAgents = demoTeamAgentDefs.map(toAgentCard)

/** A demo personal (custom ACP) agent so the Agents page "Yours" section isn't
 *  just the built-in — a pretend endpoint the member connected themselves. */
const demoPersonalAgent = {
  id: 'demo-personal-acp',
  name: 'Research Assistant',
  acpUrl: 'wss://acp.demo.thunderbolt/research',
  userId: 'demo-user',
}

const demoPolicy: OrgPolicy = {
  personalAgentPolicy: 'all',
  userModelsAllowed: true,
  mcpPolicy: 'allow',
  mcpAllowlist: [],
  blockedExtensions: [],
  blockedIntegrations: [],
}

/**
 * Demo mode: seed the device-local team-agents cache + org policy once the DB is
 * ready, so the member selector and Agents page show company agents without any
 * live discovery. No-op unless `VITE_DEMO_MODE=true`.
 */
export const useDemoSeed = (): void => {
  const db = useDatabase()
  const seededRef = useRef(false)

  useEffect(() => {
    if (!isDemoMode() || !db || seededRef.current) {
      return
    }
    seededRef.current = true
    void replaceTeamAgentsCache(db, demoTeamAgents)
    void setOrgPolicy(db, demoPolicy)
    // Insert the demo personal agent once — the seed re-runs on every reload, so
    // guard on its id (createAgent does a plain insert and would collide).
    void (async () => {
      const existing = await getAllAgents(db)
      if (!existing.some((row) => row.id === demoPersonalAgent.id)) {
        await createAgent(db, {
          id: demoPersonalAgent.id,
          name: demoPersonalAgent.name,
          acpUrl: demoPersonalAgent.acpUrl,
          userId: demoPersonalAgent.userId,
        })
      }
    })()
  }, [db])
}
