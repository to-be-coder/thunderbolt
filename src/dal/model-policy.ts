/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * BYO MODEL GATING (Stage 4, T4).
 *
 * The Thunderbolt agent draws models from the inference path: COMPANY-SUPPLIED
 * models (`isSystem === 1`) are pre-connected and always allowed. BYO models
 * (`isSystem !== 1`, a user-added provider/key) are gated by
 * `OrgPolicy.userModelsAllowed` — when the org sets it to `false`, members may
 * not add or enable their own models.
 *
 * ACP agents (team + personal) are unaffected: they run whatever their server
 * runs and the client sends NO model, so this gate governs ONLY the Thunderbolt
 * agent's model supply.
 */

import type { OrgPolicy } from '@shared/agent-cards'
import type { Model } from '@/types'

/** A "bring your own" model — user-added, not a company-supplied system entry. */
export const isByoModel = (model: Pick<Model, 'isSystem'>): boolean => model.isSystem !== 1

/** Thrown when a BYO model is added/enabled while org policy forbids it. */
export class ByoModelNotAllowedError extends Error {
  constructor() {
    super('Your organization does not allow adding your own models.')
    this.name = 'ByoModelNotAllowedError'
  }
}

/**
 * Guard a create/enable of a model against org policy. Company-supplied
 * (`isSystem === 1`) models always pass; BYO models pass only when
 * `policy.userModelsAllowed`. Throws {@link ByoModelNotAllowedError} otherwise so
 * the error surfaces at the DAL boundary rather than being silently dropped.
 */
export const assertByoModelAllowed = (policy: OrgPolicy, model: Pick<Model, 'isSystem'>): void => {
  if (isByoModel(model) && !policy.userModelsAllowed) {
    throw new ByoModelNotAllowedError()
  }
}
