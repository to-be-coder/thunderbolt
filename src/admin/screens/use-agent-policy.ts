/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { PersonalAgentPolicy } from '../api/types'
import { usePolicyEditor } from './policy-editor'

/** Combine the two independent switches (own ACP agents · built-in Thunderbolt)
 *  into the single `personalAgentPolicy` enum. */
const combinePolicy = (personal: boolean, native: boolean): PersonalAgentPolicy =>
  personal && native ? 'all' : personal ? 'no_native' : native ? 'native_only' : 'company_only'

/**
 * The agent-facing slice of org policy, surfaced on the Agents screen (the
 * Policy page's toggles moved here). Each setter persists immediately — no Save
 * button — computing the next full policy explicitly (rather than `save()`,
 * which would read the pre-dispatch draft), then dispatching to keep the UI in
 * sync. Two INDEPENDENT switches: a member's own ACP agents and the built-in
 * Thunderbolt agent are separate; turning either off never forces the other.
 */
export const useAgentPolicy = () => {
  const { draft, dispatch, isPending, persist } = usePolicyEditor()

  const personalAllowed = draft.personalAgentPolicy === 'all' || draft.personalAgentPolicy === 'no_native'
  const nativeAllowed = draft.personalAgentPolicy === 'all' || draft.personalAgentPolicy === 'native_only'

  const setPersonal = (value: PersonalAgentPolicy) => {
    dispatch({ type: 'SET_PERSONAL', payload: value })
    persist({ ...draft, personalAgentPolicy: value })
  }

  return {
    isPending,
    personalAllowed,
    nativeAllowed,
    userModelsAllowed: draft.userModelsAllowed,
    setPersonalAllowed: (on: boolean) => setPersonal(combinePolicy(on, nativeAllowed)),
    setNativeAllowed: (on: boolean) => setPersonal(combinePolicy(personalAllowed, on)),
    setUserModels: (checked: boolean) => {
      dispatch({ type: 'SET_USER_MODELS', payload: checked })
      persist({ ...draft, userModelsAllowed: checked })
    },
  }
}
