/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createModel } from '@/dal'
import { resetTestDatabase, setupTestDatabase, teardownTestDatabase } from '@/dal/test-utils'
import { getDb } from '@/db/database'
import {
  renderWithReactivity,
  waitForElement,
  resetTestTrustDomain,
  seedTestTrustDomain,
} from '@/test-utils/powersync-reactivity-test'
import { getClock } from '@/testing-library'
import '@testing-library/jest-dom'
import { act, cleanup, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { v7 as uuidv7 } from 'uuid'
import { ModelsManager } from './index'

describe('ModelsManager reactivity', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    seedTestTrustDomain()
    await resetTestDatabase()
  })

  afterEach(() => {
    resetTestTrustDomain()
    cleanup()
  })

  it('updates when models table changes', async () => {
    const db = getDb()
    const modelId1 = uuidv7()
    await createModel(db, {
      id: modelId1,
      provider: 'openai',
      name: 'First Model',
      model: 'gpt-4',
      isSystem: 0,
      enabled: 1,
    })

    const { triggerChange } = renderWithReactivity(<ModelsManager />, {
      tables: ['models'],
    })

    await waitForElement(() => screen.queryByText('First Model'))
    expect(screen.getByText('First Model')).toBeInTheDocument()

    const modelId2 = uuidv7()
    await createModel(db, {
      id: modelId2,
      provider: 'anthropic',
      name: 'Second Model',
      model: 'claude-3',
      isSystem: 0,
      enabled: 1,
    })
    triggerChange(['models'])

    await act(async () => {
      await getClock().runAllAsync()
    })

    expect(screen.getByText('Second Model')).toBeInTheDocument()
  })
})

describe('ModelsManager — permission gating', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    seedTestTrustDomain()
    await resetTestDatabase()
  })

  afterEach(() => {
    resetTestTrustDomain()
    cleanup()
  })

  it('renders the empty-state Add Model button', async () => {
    renderWithReactivity(<ModelsManager />, {
      tables: ['models'],
    })

    // No models seeded → the empty-state CTA renders. The header `+` button has
    // no accessible name, so the labelled empty-state button is what we assert.
    await waitForElement(() => screen.queryByRole('button', { name: 'Add Model' }))
    expect(screen.getByRole('button', { name: 'Add Model' })).toBeInTheDocument()
  })
})
