/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import { defaultOrgPolicy, type OrgPolicy } from '@shared/agent-cards'
import type { Model } from '@/types'
import { assertByoModelAllowed, ByoModelNotAllowedError, isByoModel } from './model-policy'

const policy = (over: Partial<OrgPolicy>): OrgPolicy => ({ ...defaultOrgPolicy, ...over })
const model = (isSystem: 0 | 1): Pick<Model, 'isSystem'> => ({ isSystem })

describe('BYO model policy (T4)', () => {
  it('classifies a company-supplied (isSystem=1) model as NOT BYO', () => {
    expect(isByoModel(model(1))).toBe(false)
  })

  it('classifies a user-added (isSystem=0) model as BYO', () => {
    expect(isByoModel(model(0))).toBe(true)
  })

  it('allows a company-supplied model even when userModelsAllowed is false', () => {
    expect(() => assertByoModelAllowed(policy({ userModelsAllowed: false }), model(1))).not.toThrow()
  })

  it('allows a BYO model when userModelsAllowed is true (consumer/default)', () => {
    expect(() => assertByoModelAllowed(policy({ userModelsAllowed: true }), model(0))).not.toThrow()
  })

  it('REFUSES a BYO model when the org disables userModelsAllowed', () => {
    expect(() => assertByoModelAllowed(policy({ userModelsAllowed: false }), model(0))).toThrow(ByoModelNotAllowedError)
  })
})
