/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Button } from '@/components/ui/button'
import { useReducer, useState } from 'react'
import { usePolicy, useSavePolicy } from '../api/hooks'
import type { McpPolicyMode, OrgPolicy, PersonalAgentPolicy } from '../api/types'

/**
 * The org policy is ONE object, but its controls are split across several admin
 * pages (Policy = agents + user models; MCP; Integrations; Extensions). Each page
 * edits a disjoint slice of the SAME policy via this shared editor: it hydrates a
 * draft from the server value, dispatches slice edits, and saves the whole object.
 * Because every page re-hydrates from the latest server value on mount, editing
 * one slice and saving never clobbers another page's slice.
 */
export type PolicyAction =
  | { type: 'HYDRATE'; payload: OrgPolicy }
  | { type: 'SET_PERSONAL'; payload: PersonalAgentPolicy }
  | { type: 'SET_USER_MODELS'; payload: boolean }
  | { type: 'SET_MCP_POLICY'; payload: McpPolicyMode }
  | { type: 'ADD_MCP'; payload: string }
  | { type: 'REMOVE_MCP'; payload: string }
  | { type: 'SET_EXTENSION_ALLOWED'; payload: { id: string; allowed: boolean } }
  | { type: 'SET_INTEGRATION_ALLOWED'; payload: { id: string; allowed: boolean } }

export const policyReducer = (state: OrgPolicy, action: PolicyAction): OrgPolicy => {
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
    case 'SET_EXTENSION_ALLOWED':
      return {
        ...state,
        blockedExtensions: action.payload.allowed
          ? state.blockedExtensions.filter((id) => id !== action.payload.id)
          : state.blockedExtensions.includes(action.payload.id)
            ? state.blockedExtensions
            : [...state.blockedExtensions, action.payload.id],
      }
    case 'SET_INTEGRATION_ALLOWED':
      return {
        ...state,
        blockedIntegrations: action.payload.allowed
          ? state.blockedIntegrations.filter((id) => id !== action.payload.id)
          : state.blockedIntegrations.includes(action.payload.id)
            ? state.blockedIntegrations
            : [...state.blockedIntegrations, action.payload.id],
      }
    default:
      return state
  }
}

const emptyPolicy: OrgPolicy = {
  personalAgentPolicy: 'all',
  userModelsAllowed: true,
  mcpPolicy: 'allowlist',
  mcpAllowlist: [],
  blockedExtensions: [],
  blockedIntegrations: [],
}

/** Shared draft + save for any policy sub-page. Hydration happens during render
 *  (no effect) by comparing against the last hydrated snapshot. */
export const usePolicyEditor = () => {
  const policyQuery = usePolicy()
  const savePolicy = useSavePolicy()
  const [draft, dispatch] = useReducer(policyReducer, emptyPolicy)
  const [hydratedKey, setHydratedKey] = useState<string | null>(null)

  if (policyQuery.data && hydratedKey !== JSON.stringify(policyQuery.data)) {
    setHydratedKey(JSON.stringify(policyQuery.data))
    dispatch({ type: 'HYDRATE', payload: policyQuery.data })
  }

  return {
    draft,
    dispatch,
    isPending: policyQuery.isPending,
    save: () => savePolicy.mutate(draft),
    /** Persist an explicit next policy immediately (for auto-saving toggles that
     *  have no Save button — avoids the stale-draft timing of `save()`). */
    persist: (policy: OrgPolicy) => savePolicy.mutate(policy),
    saving: savePolicy.isPending,
    saved: savePolicy.isSuccess,
    error: savePolicy.isError,
  }
}

/** The Save row shared by every policy sub-page. */
export const PolicySaveBar = ({
  save,
  saving,
  saved,
  error,
}: {
  save: () => void
  saving: boolean
  saved: boolean
  error: boolean
}) => (
  <div className="flex items-center gap-3">
    <Button onClick={save} disabled={saving}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
    {saved && <span className="text-sm text-muted-foreground">Saved.</span>}
    {error && (
      <span className="text-sm text-destructive" role="alert">
        Could not save.
      </span>
    )}
  </div>
)
