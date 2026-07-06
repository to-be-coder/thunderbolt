/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useReducer, useState } from 'react'
import { useAdminApi, useCreateAgent, useUpdateAgent } from '../api/hooks'
import type { AgentCategory, AgentInput, ConnectionTestResult, TeamAgentWithCapabilities } from '../api/types'

/**
 * v1 admin agent form (PRD Rev 3.2). Company agents are ACP endpoints that
 * "arrive pre-configured": their name, icon, description, capabilities, and
 * advertised models all come from the agent's own card — none are authored
 * here. The admin only points at the endpoint and picks the category
 * (sealed/extensible, admin-set per Rev 3.2). The display name is derived from
 * the endpoint's card on a successful connection test (editable if needed).
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
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.testConnection(state.acpUrl.trim())
      setTestResult(result)
      // The name derives from the endpoint's card; only fill an empty field so
      // an admin's manual override is never clobbered.
      if (result.reachable && result.name && state.name.trim() === '') {
        dispatch({ type: 'SET', field: 'name', value: result.name })
      }
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (agent) {
      // Patch only the admin-set fields; the card's own fields are left as-is.
      await updateAgent.mutateAsync({
        id: agent.id,
        patch: { name: state.name.trim(), acpUrl: state.acpUrl.trim(), category: state.category },
      })
    } else {
      const input: AgentInput = {
        name: state.name.trim(),
        acpUrl: state.acpUrl.trim(),
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
  const canSave = state.name.trim() !== '' && state.acpUrl.trim() !== ''

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">{agent ? 'Edit agent' : 'Register agent'}</h2>

      <div className="flex flex-col gap-1">
        <Label htmlFor="agent-acp-url">ACP URL</Label>
        <div className="flex items-center gap-2">
          <Input
            id="agent-acp-url"
            placeholder="wss://agent.company.com/acp"
            value={state.acpUrl}
            onChange={(event) => dispatch({ type: 'SET', field: 'acpUrl', value: event.target.value })}
          />
          <Button variant="secondary" onClick={handleTest} disabled={testing || state.acpUrl.trim() === ''}>
            {testing ? 'Testing…' : 'Test'}
          </Button>
        </div>
        {testResult && (
          <p
            className={testResult.reachable ? 'text-sm text-green-600 dark:text-green-400' : 'text-sm text-destructive'}
            role="status"
          >
            {testResult.reachable ? 'Reachable' : `Unreachable: ${testResult.error}`}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="agent-name">Name</Label>
        <Input
          id="agent-name"
          placeholder="Derived from the agent's endpoint"
          value={state.name}
          onChange={(event) => dispatch({ type: 'SET', field: 'name', value: event.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Category</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={state.category}
          onValueChange={(value) => value && dispatch({ type: 'SET_CATEGORY', value: value as AgentCategory })}
          className="justify-start"
        >
          <ToggleGroupItem value="sealed" className="px-4">
            Sealed
          </ToggleGroupItem>
          <ToggleGroupItem value="extensible" className="px-4">
            Extensible
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={!canSave || saving}>
          {saving ? 'Saving…' : agent ? 'Save changes' : 'Register agent'}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
