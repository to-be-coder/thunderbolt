/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useState } from 'react'
import { Navigate, Outlet, useMatch, useNavigate } from 'react-router'
import { v7 as uuidv7 } from 'uuid'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { SlideInPanel } from '@/components/slide-in-panel'
import { AgentList } from '@/components/settings/agents/agent-list'
import { AgentCatalog } from '@/components/settings/agents/agent-catalog'
import { AddCustomAgentDialog, type AddCustomAgentPayload } from '@/components/settings/agents/add-custom-agent-dialog'
import { testAcpConnection } from '@/acp'
import { createAgent } from '@/dal'
import { useAgents } from '@/dal/agents'
import { useTeamAgents } from '@/dal/use-team-agents'
import { useOrgPolicy } from '@/dal/use-org-policy'
import { useDatabase, useAuth } from '@/contexts'
import { selectAllowCustomAgents, useConfigStore } from '@/api/config-store'
import { useAgentsSettingsHidden } from '@/hooks/use-agents-settings-hidden'

type AgentsSettingsPageProps = {
  /** Test seam — production omits; the hidden-check hook falls back to
   *  `isTauri()`. Lets tests exercise Tauri Standalone vs. Hosted code paths
   *  without mocking the shared `@/lib/platform` module (which would leak
   *  across files — see `docs/development/testing.md`). */
  isStandalone?: () => boolean
}

/**
 * The Agents list (agents-page-spec §1): two labeled sections — the trusted org
 * set then the member's own agents — each row opening a READ-ONLY detail view.
 * The only add path is "＋ Connect an agent" (the native agent is auto-created,
 * company agents arrive via grants). Nothing here is editable; there is no
 * create-native, no duplicate, no search. Sections and the connect button honor
 * the personal-agent policy by absence (spec §5).
 */
export default function AgentsSettingsPage({ isStandalone }: AgentsSettingsPageProps = {}) {
  const db = useDatabase()
  const navigate = useNavigate()
  const detailMatch = useMatch('/settings/agents/:agentId')
  const teamCards = useTeamAgents()
  const personalAgents = useAgents()
  const policy = useOrgPolicy()
  const authClient = useAuth()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user?.id ?? null
  const agentsHidden = useAgentsSettingsHidden({ isStandalone })
  const allowCustomAgents = useConfigStore((state) => selectAllowCustomAgents(state.config))

  const [dialogOpen, setDialogOpen] = useState(false)

  // Defence against direct URL / bookmark when the entry is hidden in the
  // sidebar. Anonymous users behind the proxy can't reach managed agents.
  if (agentsHidden) {
    return <Navigate to="/settings" replace />
  }

  // §5: "company agents only" hides the YOURS section AND the connect button.
  const canConnect = policy.personalAgentPolicy !== 'company_only' && allowCustomAgents && !!currentUserId

  const handleSubmit = async (payload: AddCustomAgentPayload) => {
    if (!currentUserId) {
      return
    }
    await createAgent(db, {
      id: uuidv7(),
      name: payload.name,
      acpUrl: payload.url,
      userId: currentUserId,
    })
  }

  const detailOpen = detailMatch !== null

  return (
    <div className="flex h-full w-full min-h-0">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 p-4">
          <PageHeader title="Agents">
            {canConnect && (
              <Button
                variant="outline"
                size="icon"
                className="rounded-lg"
                onClick={() => setDialogOpen(true)}
                data-testid="connect-an-agent"
                aria-label="Connect an agent"
              >
                <Plus className="size-4" />
              </Button>
            )}
          </PageHeader>

          <AgentList
            teamCards={teamCards}
            personalAgents={personalAgents}
            policy={policy}
            onOpenAgent={(agentId) => navigate(`/settings/agents/${agentId}`)}
          />
        </div>
      </div>

      <SlideInPanel open={detailOpen}>
        <div className="h-full overflow-y-auto border-l border-border">
          <Outlet />
        </div>
      </SlideInPanel>

      <AddCustomAgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        testAcpConnection={testAcpConnection}
        catalogSlot={<AgentCatalog />}
      />
    </div>
  )
}
