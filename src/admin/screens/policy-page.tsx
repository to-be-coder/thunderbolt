/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { X } from 'lucide-react'
import { useReducer, useState } from 'react'
import { usePolicy, useSavePolicy } from '../api/hooks'
import type { McpPolicyMode, OrgPolicy, PersonalAgentPolicy } from '../api/types'

type PolicyAction =
  | { type: 'HYDRATE'; payload: OrgPolicy }
  | { type: 'SET_PERSONAL'; payload: PersonalAgentPolicy }
  | { type: 'SET_USER_MODELS'; payload: boolean }
  | { type: 'SET_MCP_POLICY'; payload: McpPolicyMode }
  | { type: 'ADD_MCP'; payload: string }
  | { type: 'REMOVE_MCP'; payload: string }

const policyReducer = (state: OrgPolicy, action: PolicyAction): OrgPolicy => {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload
    case 'SET_PERSONAL':
      return { ...state, personalAgentPolicy: action.payload }
    case 'SET_USER_MODELS':
      return { ...state, userModelsAllowed: action.payload }
    case 'SET_MCP_POLICY':
      return { ...state, mcpPolicy: action.payload }
    case 'ADD_MCP':
      return state.mcpAllowlist.includes(action.payload)
        ? state
        : { ...state, mcpAllowlist: [...state.mcpAllowlist, action.payload] }
    case 'REMOVE_MCP':
      return { ...state, mcpAllowlist: state.mcpAllowlist.filter((entry) => entry !== action.payload) }
    default:
      return state
  }
}

const emptyPolicy: OrgPolicy = {
  personalAgentPolicy: 'all',
  userModelsAllowed: true,
  mcpPolicy: 'allowlist',
  mcpAllowlist: [],
}

/** S5 — Policy. User models allow/deny, personal-agent policy, MCP allowlist. */
export const PolicyPage = () => {
  const policyQuery = usePolicy()
  const savePolicy = useSavePolicy()
  const [draft, dispatch] = useReducer(policyReducer, emptyPolicy)
  const [mcpEntry, setMcpEntry] = useState('')
  const [hydratedKey, setHydratedKey] = useState<string | null>(null)

  // Hydrate the editable draft once the server value arrives (and again if the
  // server value changes identity), without an effect — compare against the last
  // hydrated snapshot during render.
  if (policyQuery.data && hydratedKey !== JSON.stringify(policyQuery.data)) {
    setHydratedKey(JSON.stringify(policyQuery.data))
    dispatch({ type: 'HYDRATE', payload: policyQuery.data })
  }

  const handleAddMcp = () => {
    const trimmed = mcpEntry.trim()
    if (!trimmed) {
      return
    }
    dispatch({ type: 'ADD_MCP', payload: trimmed })
    setMcpEntry('')
  }

  // The PRD's three-way personal-agent policy expressed as two switches:
  //   personal on  + native on  → 'all'
  //   personal on  + native off → 'no_native'
  //   personal off (native forced off) → 'company_only'
  const personalAllowed = draft.personalAgentPolicy !== 'company_only'
  const nativeAllowed = draft.personalAgentPolicy === 'all'
  const setPersonalAllowed = (on: boolean) => dispatch({ type: 'SET_PERSONAL', payload: on ? 'all' : 'company_only' })
  const setNativeAllowed = (on: boolean) => dispatch({ type: 'SET_PERSONAL', payload: on ? 'all' : 'no_native' })

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Policy" />

      {policyQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Allow personal agents</h2>
                <p className="text-sm text-muted-foreground">
                  Let members connect their own ACP agents alongside company agents. Off = company agents only.
                </p>
              </div>
              <Switch
                checked={personalAllowed}
                onCheckedChange={setPersonalAllowed}
                aria-label="Allow personal agents"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Built-in Thunderbolt agent</h2>
                <p className="text-sm text-muted-foreground">
                  Give members the built-in assistant. {personalAllowed ? '' : 'Turn on personal agents to enable.'}
                </p>
              </div>
              <Switch
                checked={nativeAllowed}
                disabled={!personalAllowed}
                onCheckedChange={setNativeAllowed}
                aria-label="Allow the built-in Thunderbolt agent"
              />
            </div>
          </section>

          <section className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <h2 className="text-sm font-semibold">User models</h2>
              <p className="text-sm text-muted-foreground">Allow members to use their own model providers.</p>
            </div>
            <Switch
              checked={draft.userModelsAllowed}
              onCheckedChange={(checked) => dispatch({ type: 'SET_USER_MODELS', payload: checked })}
              aria-label="Allow user models"
            />
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div>
              <h2 className="text-sm font-semibold">User-added MCP servers</h2>
              <p className="text-sm text-muted-foreground">
                Whether members may connect their own MCP servers. Third-party servers are a supply-chain risk, so the
                launch default is an allowlist. (Extensions are built-in, not user-added, so they aren't governed here.)
              </p>
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              value={draft.mcpPolicy}
              onValueChange={(value) => value && dispatch({ type: 'SET_MCP_POLICY', payload: value as McpPolicyMode })}
              className="justify-start"
            >
              <ToggleGroupItem value="allow" className="px-4">
                Allow all
              </ToggleGroupItem>
              <ToggleGroupItem value="allowlist" className="px-4">
                Allowlist
              </ToggleGroupItem>
              <ToggleGroupItem value="block" className="px-4">
                Block
              </ToggleGroupItem>
            </ToggleGroup>

            {draft.mcpPolicy === 'allowlist' && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="https://mcp.example.com"
                    className="max-w-sm"
                    value={mcpEntry}
                    aria-label="MCP server URL"
                    onChange={(event) => setMcpEntry(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleAddMcp()}
                  />
                  <Button variant="secondary" onClick={handleAddMcp} disabled={!mcpEntry.trim()}>
                    Add
                  </Button>
                </div>
                <ul className="flex flex-col gap-1">
                  {draft.mcpAllowlist.length === 0 && (
                    <li className="text-sm text-muted-foreground">
                      No servers allowlisted yet — members can't add any until you add one.
                    </li>
                  )}
                  {draft.mcpAllowlist.map((entry) => (
                    <li
                      key={entry}
                      className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-sm"
                    >
                      <span className="font-mono text-xs">{entry}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${entry}`}
                        onClick={() => dispatch({ type: 'REMOVE_MCP', payload: entry })}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <div className="flex items-center gap-3">
            <Button onClick={() => savePolicy.mutate(draft)} disabled={savePolicy.isPending}>
              {savePolicy.isPending ? 'Saving…' : 'Save policy'}
            </Button>
            {savePolicy.isSuccess && <span className="text-sm text-muted-foreground">Saved.</span>}
            {savePolicy.isError && (
              <span className="text-sm text-destructive" role="alert">
                Could not save policy.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
