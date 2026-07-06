/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AutosizeTextarea } from '@/components/ui/autosize-textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Plus, X } from 'lucide-react'
import { useMemo, useReducer, useState } from 'react'
import { useAdminApi, useCreateAgent, useUpdateAgent } from '../api/hooks'
import type {
  AgentCategory,
  AgentInput,
  AgentStatus,
  CapabilityInput,
  ConnectionTestResult,
  CredentialMode,
  TeamAgentWithCapabilities,
} from '../api/types'
import { AgentCardPreview } from './agent-card-preview'
import { buildPreviewCard } from './build-preview-card'

type FormState = {
  name: string
  icon: string
  acpUrl: string
  description: string
  managedBy: string
  category: AgentCategory
  status: AgentStatus
  advertisedModels: string
  capabilities: CapabilityInput[]
}

type FormAction =
  | { type: 'SET'; field: 'name' | 'icon' | 'acpUrl' | 'description' | 'managedBy' | 'advertisedModels'; value: string }
  | { type: 'SET_CATEGORY'; value: AgentCategory }
  | { type: 'SET_STATUS'; value: AgentStatus }
  | { type: 'ADD_CAPABILITY' }
  | { type: 'REMOVE_CAPABILITY'; index: number }
  | { type: 'SET_CAPABILITY_LABEL'; index: number; value: string }
  | { type: 'SET_CAPABILITY_MODE'; index: number; value: CredentialMode }

const emptyState: FormState = {
  name: '',
  icon: '',
  acpUrl: '',
  description: '',
  managedBy: '',
  category: 'sealed',
  status: 'draft',
  advertisedModels: '',
  capabilities: [],
}

const initFromAgent = (agent: TeamAgentWithCapabilities | null): FormState =>
  agent === null
    ? emptyState
    : {
        name: agent.name,
        icon: agent.icon,
        acpUrl: agent.acpUrl,
        description: agent.description,
        managedBy: agent.managedBy,
        category: agent.category,
        status: agent.status,
        advertisedModels: agent.advertisedModels.join(', '),
        capabilities: agent.capabilities.map((capability) => ({
          label: capability.label,
          ...(capability.credentialMode ? { credentialMode: capability.credentialMode } : {}),
        })),
      }

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value }
    case 'SET_CATEGORY':
      return { ...state, category: action.value }
    case 'SET_STATUS':
      return { ...state, status: action.value }
    case 'ADD_CAPABILITY':
      return { ...state, capabilities: [...state.capabilities, { label: '' }] }
    case 'REMOVE_CAPABILITY':
      return { ...state, capabilities: state.capabilities.filter((_, index) => index !== action.index) }
    case 'SET_CAPABILITY_LABEL':
      return {
        ...state,
        capabilities: state.capabilities.map((capability, index) =>
          index === action.index ? { ...capability, label: action.value } : capability,
        ),
      }
    case 'SET_CAPABILITY_MODE':
      return {
        ...state,
        capabilities: state.capabilities.map((capability, index) =>
          index === action.index ? { ...capability, credentialMode: action.value } : capability,
        ),
      }
    default:
      return state
  }
}

const parseModels = (raw: string): string[] =>
  raw
    .split(',')
    .map((model) => model.trim())
    .filter((model) => model !== '')

const toAgentInput = (state: FormState): AgentInput => ({
  name: state.name.trim(),
  icon: state.icon.trim(),
  description: state.description,
  acpUrl: state.acpUrl.trim(),
  category: state.category,
  status: state.status,
  managedBy: state.managedBy.trim(),
  advertisedModels: parseModels(state.advertisedModels),
  capabilities: state.capabilities
    .filter((capability) => capability.label.trim() !== '')
    .map((capability) => ({
      label: capability.label.trim(),
      ...(capability.credentialMode ? { credentialMode: capability.credentialMode } : {}),
    })),
})

/** S1 register/edit form. Owns the connection-test call, the draft/published
 *  control, the capability editor, and the live read-only member-card preview. */
export const AgentForm = ({ agent, onDone }: { agent: TeamAgentWithCapabilities | null; onDone: () => void }) => {
  const [state, dispatch] = useReducer(formReducer, agent, initFromAgent)
  const api = useAdminApi()
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [testing, setTesting] = useState(false)

  const previewCard = useMemo(
    () =>
      buildPreviewCard({
        name: state.name,
        icon: state.icon,
        description: state.description,
        category: state.category,
        managedBy: state.managedBy,
        advertisedModels: parseModels(state.advertisedModels),
        capabilities: state.capabilities,
      }),
    [state],
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
    const input = toAgentInput(state)
    if (agent) {
      await updateAgent.mutateAsync({ id: agent.id, patch: input })
    } else {
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

        <div className="flex gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="agent-icon">Icon</Label>
            <Input
              id="agent-icon"
              className="w-16 text-center"
              placeholder="🤖"
              value={state.icon}
              onChange={(event) => dispatch({ type: 'SET', field: 'icon', value: event.target.value })}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              placeholder="Research Assistant"
              value={state.name}
              onChange={(event) => dispatch({ type: 'SET', field: 'name', value: event.target.value })}
            />
          </div>
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
          <Label htmlFor="agent-managed-by">Managed by</Label>
          <Input
            id="agent-managed-by"
            placeholder="Platform Team"
            value={state.managedBy}
            onChange={(event) => dispatch({ type: 'SET', field: 'managedBy', value: event.target.value })}
          />
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

        <div className="flex flex-col gap-1">
          <Label htmlFor="agent-models">Advertised models</Label>
          <Input
            id="agent-models"
            placeholder="gpt-5, claude-opus-4 (comma separated)"
            value={state.advertisedModels}
            onChange={(event) => dispatch({ type: 'SET', field: 'advertisedModels', value: event.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Capabilities</Label>
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'ADD_CAPABILITY' })}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
          {state.capabilities.map((capability, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Search Confluence"
                aria-label={`Capability ${index + 1} label`}
                value={capability.label}
                onChange={(event) => dispatch({ type: 'SET_CAPABILITY_LABEL', index, value: event.target.value })}
              />
              <Select
                value={capability.credentialMode ?? ''}
                onValueChange={(value) =>
                  dispatch({ type: 'SET_CAPABILITY_MODE', index, value: value as CredentialMode })
                }
              >
                <SelectTrigger className="w-40" aria-label={`Capability ${index + 1} credential mode`}>
                  <SelectValue placeholder="Credentials" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="as_you">Runs as you</SelectItem>
                  <SelectItem value="service_account">Service account</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove capability ${index + 1}`}
                onClick={() => dispatch({ type: 'REMOVE_CAPABILITY', index })}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <Label>Status</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={state.status}
            onValueChange={(value) => value && dispatch({ type: 'SET_STATUS', value: value as AgentStatus })}
            className="justify-start"
          >
            <ToggleGroupItem value="draft" className="px-4">
              Draft
            </ToggleGroupItem>
            <ToggleGroupItem value="published" className="px-4">
              Published
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
