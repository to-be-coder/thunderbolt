/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { describe, expect, it } from 'bun:test'
import { isExtensionAllowed } from './extension-policy'

describe('isExtensionAllowed', () => {
  it('allows an extension not on the org blocklist', () => {
    expect(isExtensionAllowed('tasks', [])).toBe(true)
    expect(isExtensionAllowed('tasks', ['other'])).toBe(true)
  })

  it('blocks an extension on the org blocklist', () => {
    expect(isExtensionAllowed('tasks', ['tasks'])).toBe(false)
  })
})
