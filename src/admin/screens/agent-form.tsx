/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useReducer } from 'react'
import { useAdminApi, useCreateAgent, useUpdateAgent } from '../api/hooks'
import type { AgentCategory, AgentInput, TeamAgentWithCapabilities } from '../api/types'

/**
 * v1 admin agent form (PRD Rev 3.2). Company agents are ACP endpoints that
 * "arrive pre-configured": their name, icon, description, capabilities, and
 * advertised models all come from the agent's own card — none are authored
 * here. The admin only points at the endpoint and picks the category
 * (sealed/extensible, admin-set per Rev 3.2). Registering connects to the
 * endpoint and derives the display name from its card when none is typed.
 *
 * Deliberately absent: draft/published status (a P1 fast-follow, P1-2) and any
 * editing of description / capabilities / advertised models / icon / managed-by.
 */

/** Fields an admin does NOT author for an ACP agent — they come from its card. */
const DEFAULT_ICON = 'bot'
const DEFAULT_MANAGED_BY = 'Your organization'

type FormState = {
  name: string
  acpUrl: string
  category: AgentCategory
}

type FormAction =
  | { type: 'SET'; field: 'name' | 'acpUrl'; value: string }
  | { type: 'SET_CATEGORY'; value: AgentCategory }

const emptyState: FormState = { name: '', acpUrl: '', category: 'sealed' }

const initFromAgent = (agent: TeamAgentWithCapabilities | null): FormState =>
  agent === null ? emptyState : { name: agent.name, acpUrl: agent.acpUrl, category: agent.category }

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value }
    case 'SET_CATEGORY':
      return { ...state, category: action.value }
    default:
      return state
  }
}

/** S1 register/edit form. Owns the connection-test call; the endpoint's card
 *  supplies the name (and every other card field) — the admin only sets the
 *  category. */
export const AgentForm = ({ agent, onDone }: { agent: TeamAgentWithCapabilities | null; onDone: () => void }) => {
  const [state, dispatch] = useReducer(formReducer, agent, initFromAgent)
  const api = useAdminApi()
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()

  // The name comes from the endpoint's card — only fall back to it when the
  // admin hasn't typed one, so a manual override is never clobbered.
  const resolveName = async (acpUrl: string): Promise<string> => {
    const typed = state.name.trim()
    if (typed) {
      return typed
    }
    const result = await api.testConnection(acpUrl)
    return result.reachable && result.name ? result.name : ''
  }

  const handleSave = async () => {
    const acpUrl = state.acpUrl.trim()
    if (agent) {
      // Patch only the admin-set fields; the card's own fields are left as-is.
      await updateAgent.mutateAsync({
        id: agent.id,
        patch: { name: state.name.trim(), acpUrl, category: state.category },
      })
    } else {
      const input: AgentInput = {
        name: await resolveName(acpUrl),
        acpUrl,
        category: state.category,
        // Non-authored card fields: defaults until a live card fetch populates them.
        icon: DEFAULT_ICON,
        managedBy: DEFAULT_MANAGED_BY,
        advertisedModels: [],
        status: 'published',
        capabilities: [],
      }
      await createAgent.mutateAsync(input)
    }
    onDone()
  }

  const saving = createAgent.isPending || updateAgent.isPending
  const canSave = state.acpUrl.trim() !== '' && (!agent || state.name.trim() !== '')

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">{agent ? 'Edit agent' : 'Register agent'}</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="agent-acp-url">ACP URL</Label>
        <Input
          id="agent-acp-url"
          placeholder="wss://agent.company.com/acp"
          value={state.acpUrl}
          onChange={(event) => dispatch({ type: 'SET', field: 'acpUrl', value: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="agent-name">Name</Label>
        <Input
          id="agent-name"
          placeholder="Derived from the agent's endpoint"
          value={state.name}
          onChange={(event) => dispatch({ type: 'SET', field: 'name', value: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Category</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={state.category}
          onValueChange={(value) => value && dispatch({ type: 'SET_CATEGORY', value: value as AgentCategory })}
          className="w-full"
        >
          <ToggleGroupItem value="sealed" className="flex-1 px-4">
            Sealed
          </ToggleGroupItem>
          <ToggleGroupItem value="extensible" className="flex-1 px-4">
            Extensible
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave || saving}>
          {saving ? (agent ? 'Saving…' : 'Connecting…') : agent ? 'Save changes' : 'Connect'}
        </Button>
      </div>
    </div>
  )
}
