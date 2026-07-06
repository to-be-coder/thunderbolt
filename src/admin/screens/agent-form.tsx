/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AutosizeTextarea } from '@/components/ui/autosize-textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMemo, useReducer, useState } from 'react'
import { useAdminApi, useCreateAgent, useUpdateAgent } from '../api/hooks'
import type { AgentCategory, AgentInput, ConnectionTestResult, TeamAgentWithCapabilities } from '../api/types'
import { AgentCardPreview } from './agent-card-preview'
import { buildPreviewCard } from './build-preview-card'

/**
 * v1 admin agent form (PRD Rev 3.2). Company agents are ACP endpoints that
 * "arrive pre-configured": their icon, capabilities, and advertised models come
 * from the agent's own card and are NOT authored here — the admin only chooses
 * the endpoint, the category (sealed/extensible, admin-set per Rev 3.2), a
 * display name, and the plain-language description (admin-written, P0-11).
 *
 * Deliberately absent: draft/published status (a P1 fast-follow, P1-2), and any
 * editing of capabilities / advertised models / icon / managed-by — those are
 * properties of the ACP agent card, shown read-only in the preview.
 */

/** Fields an admin does NOT author for an ACP agent — they come from its card.
 *  Defaults for a newly-registered agent until a live card fetch populates them. */
const DEFAULT_ICON = 'bot'
const DEFAULT_MANAGED_BY = 'Your organization'

type FormState = {
  name: string
  acpUrl: string
  description: string
  category: AgentCategory
}

type FormAction =
  | { type: 'SET'; field: 'name' | 'acpUrl' | 'description'; value: string }
  | { type: 'SET_CATEGORY'; value: AgentCategory }

const emptyState: FormState = { name: '', acpUrl: '', description: '', category: 'sealed' }

const initFromAgent = (agent: TeamAgentWithCapabilities | null): FormState =>
  agent === null
    ? emptyState
    : { name: agent.name, acpUrl: agent.acpUrl, description: agent.description, category: agent.category }

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

/** S1 register/edit form. Owns the connection-test call and the live read-only
 *  member-card preview; the card's own fields (capabilities/models/icon) are
 *  read-only, shown from the agent's card. */
export const AgentForm = ({ agent, onDone }: { agent: TeamAgentWithCapabilities | null; onDone: () => void }) => {
  const [state, dispatch] = useReducer(formReducer, agent, initFromAgent)
  const api = useAdminApi()
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [testing, setTesting] = useState(false)

  // The card fields the admin can't author come from the agent's card (on edit)
  // or defaults (on create), and render read-only in the preview.
  const cardFields = {
    icon: agent?.icon ?? DEFAULT_ICON,
    managedBy: agent?.managedBy ?? DEFAULT_MANAGED_BY,
    advertisedModels: agent?.advertisedModels ?? [],
    capabilities:
      agent?.capabilities.map((c) => ({
        label: c.label,
        ...(c.credentialMode ? { credentialMode: c.credentialMode } : {}),
      })) ?? [],
  }

  const previewCard = useMemo(
    () =>
      buildPreviewCard({
        name: state.name,
        description: state.description,
        category: state.category,
        ...cardFields,
      }),
    [state, cardFields],
  )

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await api.testConnection(state.acpUrl.trim()))
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (agent) {
      // Patch only the admin-authored fields; the card's own fields are left as-is.
      await updateAgent.mutateAsync({
        id: agent.id,
        patch: {
          name: state.name.trim(),
          acpUrl: state.acpUrl.trim(),
          category: state.category,
          description: state.description,
        },
      })
    } else {
      const input: AgentInput = {
        name: state.name.trim(),
        acpUrl: state.acpUrl.trim(),
        category: state.category,
        description: state.description,
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">{agent ? 'Edit agent' : 'Register agent'}</h2>

        <div className="flex flex-col gap-1">
          <Label htmlFor="agent-name">Name</Label>
          <Input
            id="agent-name"
            placeholder="Research Assistant"
            value={state.name}
            onChange={(event) => dispatch({ type: 'SET', field: 'name', value: event.target.value })}
          />
        </div>

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
              className={
                testResult.reachable ? 'text-sm text-green-600 dark:text-green-400' : 'text-sm text-destructive'
              }
              role="status"
            >
              {testResult.reachable ? 'Reachable' : `Unreachable: ${testResult.error}`}
            </p>
          )}
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

        <div className="flex flex-col gap-1">
          <Label htmlFor="agent-description">Description</Label>
          <AutosizeTextarea
            id="agent-description"
            placeholder="What this agent does, in plain language."
            value={state.description}
            onChange={(event) => dispatch({ type: 'SET', field: 'description', value: event.target.value })}
          />
          {/* T5 — prompt-extraction posture (v1: admin-facing warning only, no
              technical countermeasures). The card + description are display copy
              anyone granted the agent can read; the agent's INSTRUCTIONS are
              confidential-not-secret — never rely on secrecy for security. */}
          <p className="text-xs text-muted-foreground" data-testid="prompt-confidentiality-warning">
            Treat this agent's instructions as <strong>confidential, not secret</strong>. Anyone granted the agent can
            read its behavior, and a determined user may be able to extract its underlying prompt — never put passwords,
            keys, or other secrets in the instructions or card copy.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          This agent's icon, capabilities, and models come from its own card (ACP agents arrive pre-configured) and
          aren't edited here — see the preview.
        </p>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? 'Saving…' : agent ? 'Save changes' : 'Register agent'}
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Member card preview</h2>
        <p className="text-xs text-muted-foreground">
          Read-only. This is exactly what a granted member sees — display copy only.
        </p>
        <AgentCardPreview card={previewCard} />
      </div>
    </div>
  )
}
