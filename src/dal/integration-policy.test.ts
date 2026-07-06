/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import { isIntegrationAllowed } from './integration-policy'

describe('isIntegrationAllowed', () => {
  it('allows a provider not on the org blocklist', () => {
    expect(isIntegrationAllowed('google', [])).toBe(true)
    expect(isIntegrationAllowed('google', ['microsoft'])).toBe(true)
  })

  it('blocks a provider on the org blocklist', () => {
    expect(isIntegrationAllowed('google', ['google'])).toBe(false)
  })
})
