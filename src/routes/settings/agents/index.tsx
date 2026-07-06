/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useState } from 'react'
import { Navigate } from 'react-router'
import { v7 as uuidv7 } from 'uuid'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { AgentList } from '@/components/settings/agents/agent-list'
import { AgentCatalog } from '@/components/settings/agents/agent-catalog'
import { AddCustomAgentDialog, type AddCustomAgentPayload } from '@/components/settings/agents/add-custom-agent-dialog'
import { testAcpConnection } from '@/acp'
import { createAgent, deleteAgent, updateAgent, useAllAgents } from '@/dal'
import { useDatabase } from '@/contexts'
import { useAuth } from '@/contexts'
import { selectAllowCustomAgents, useConfigStore } from '@/api/config-store'
import { useAgentsSettingsHidden } from '@/hooks/use-agents-settings-hidden'
import type { Agent } from '@/types/acp'

type AgentsSettingsPageProps = {
  /** Test seam — production omits; the hidden-check hook falls back to
   *  `isTauri()`. Lets tests exercise Tauri Standalone vs. Hosted code paths
   *  without mocking the shared `@/lib/platform` module (which would leak
   *  across files — see `docs/development/testing.md`). */
  isStandalone?: () => boolean
}

/**
 * Settings page listing every agent the user can chat with: the built-in
 * Thunderbolt assistant (always first, immutable), system-provided agents
 * synced from `/agents` discovery (read-only), and user-added custom remote
 * ACP endpoints. The composition lives in `useAllAgents` — this page is just
 * a thin orchestrator wiring DAL writes to UI events.
 */
export default function AgentsSettingsPage({ isStandalone }: AgentsSettingsPageProps = {}) {
  const db = useDatabase()
  const agents = useAllAgents()
  const authClient = useAuth()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user?.id ?? null
  const agentsHidden = useAgentsSettingsHidden({ isStandalone })
  const allowCustomAgents = useConfigStore((state) => selectAllowCustomAgents(state.config))

  const [dialogOpen, setDialogOpen] = useState(false)
  // `null` ⇒ Add mode; an Agent ⇒ Edit mode. The dialog receives a `key`
  // derived from the agent id so its reducer remounts when switching targets.
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)

  // Defence against direct URL / bookmark when the entry is hidden in the
  // sidebar. Anonymous users behind the proxy can't reach managed agents, so
  // sending them back to the settings index keeps the UI honest.
  if (agentsHidden) {
    return <Navigate to="/settings" replace />
  }

  const handleToggle = async (_agent: Agent, _enabled: boolean) => {
    // Personal agents no longer carry an `enabled` flag — the row is either
    // present (usable) or soft-deleted. The toggle affordance goes away with
    // the Stage 2 agent-access UI; until then this is a no-op.
  }

  const handleDelete = async (agent: Agent) => {
    await deleteAgent(db, agent.id)
  }

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload: AddCustomAgentPayload) => {
    if (editingAgent) {
      // Only customs are editable; system / built-in rows never reach this
      // path (the row hides the Edit affordance).
      await updateAgent(db, editingAgent.id, {
        name: payload.name,
        acpUrl: payload.url,
      })
      return
    }
    if (!currentUserId) {
      // Anonymous sessions can't sync custom agents — the page hides the
      // dialog trigger in that case, but the guard keeps the write safe.
      return
    }
    await createAgent(db, {
      id: uuidv7(),
      name: payload.name,
      acpUrl: payload.url,
      userId: currentUserId,
    })
  }

  const handleDialogOpenChange = (next: boolean) => {
    setDialogOpen(next)
    if (!next) {
      // Drop the edit target so a follow-up "+" opens a fresh Add dialog.
      setEditingAgent(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 w-full max-w-[760px] mx-auto">
      <PageHeader title="Agents">
        {allowCustomAgents && (
          <Button
            variant="outline"
            size="icon"
            className="rounded-lg"
            aria-label="Add Custom Agent"
            onClick={() => {
              setEditingAgent(null)
              setDialogOpen(true)
            }}
            disabled={!currentUserId}
          >
            <Plus />
          </Button>
        )}
      </PageHeader>

      <AgentList
        agents={agents}
        currentUserId={currentUserId}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AgentCatalog />

      <AddCustomAgentDialog
        key={editingAgent?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        onSubmit={handleSubmit}
        editingAgent={editingAgent}
        testAcpConnection={testAcpConnection}
      />
    </div>
  )
}
