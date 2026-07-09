/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PageHeader } from '@/components/ui/page-header'
import { Switch } from '@/components/ui/switch'
import type { PersonalAgentPolicy } from '../api/types'
import { usePolicyEditor } from './policy-editor'

/** Combine the two independent switches (own ACP agents · built-in Thunderbolt)
 *  into the single `personalAgentPolicy` enum. */
const combinePolicy = (personal: boolean, native: boolean): PersonalAgentPolicy =>
  personal && native ? 'all' : personal ? 'no_native' : native ? 'native_only' : 'company_only'

/**
 * S5 — Policy. The agent + model rules only: personal-agent policy, the built-in
 * Thunderbolt agent, and user models. Library governance (MCP / Integrations /
 * Extensions) lives on its own admin pages.
 */
export const PolicyPage = () => {
  const { draft, dispatch, isPending, persist } = usePolicyEditor()

  // No Save button — each toggle persists immediately. We compute the next full
  // policy explicitly and persist it (rather than `save()`, which would read the
  // pre-dispatch draft), then dispatch to keep the UI in sync.
  const personalAllowed = draft.personalAgentPolicy === 'all' || draft.personalAgentPolicy === 'no_native'
  const nativeAllowed = draft.personalAgentPolicy === 'all' || draft.personalAgentPolicy === 'native_only'

  const setPersonal = (value: PersonalAgentPolicy) => {
    dispatch({ type: 'SET_PERSONAL', payload: value })
    persist({ ...draft, personalAgentPolicy: value })
  }
  // Two INDEPENDENT switches — a member's own ACP agents and the built-in
  // Thunderbolt agent are separate. Turning either off never forces the other.
  const setPersonalAllowed = (on: boolean) => setPersonal(combinePolicy(on, nativeAllowed))
  const setNativeAllowed = (on: boolean) => setPersonal(combinePolicy(personalAllowed, on))
  const setUserModels = (checked: boolean) => {
    dispatch({ type: 'SET_USER_MODELS', payload: checked })
    persist({ ...draft, userModelsAllowed: checked })
  }

  return (
    <div className="mx-auto flex w-full max-w-[728px] flex-col gap-6">
      <PageHeader title="Policy" />

      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Allow personal agents</h2>
                <p className="text-sm text-muted-foreground">
                  Let members connect their own ACP agents. This is independent of the built-in agent below.
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
                <p className="text-sm text-muted-foreground">Give members the built-in assistant.</p>
              </div>
              <Switch
                checked={nativeAllowed}
                onCheckedChange={setNativeAllowed}
                aria-label="Allow the built-in Thunderbolt agent"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Personal models</h2>
                <p className="text-sm text-muted-foreground">
                  Allow members to use their own models with the built-in Thunderbolt agent.
                </p>
              </div>
              <Switch
                checked={draft.userModelsAllowed}
                onCheckedChange={setUserModels}
                aria-label="Allow user models"
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
