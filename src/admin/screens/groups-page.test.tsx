/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { createRecordingClient, flush, renderAdmin } from '../test-utils'
import { GroupsPage } from './groups-page'

describe('GroupsPage', () => {
  afterEach(cleanup)

  it('create POSTs the name to /v1/admin/groups', async () => {
    const { client, calls } = createRecordingClient((call) => {
      if (call.method === 'GET' && call.path === '/v1/admin/groups') {
        return []
      }
      if (call.method === 'GET' && call.path === '/v1/admin/members') {
        return []
      }
      return { id: 'g1', name: 'Legal', createdAt: new Date().toISOString(), deletedAt: null }
    })
    renderAdmin(<GroupsPage />, client)
    await flush()

    // The create form lives in a modal opened by the "+" action in the title row.
    fireEvent.click(screen.getByRole('button', { name: 'Create a group' }))
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Legal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create group' }))
    await flush()

    const post = calls.find((call) => call.method === 'POST' && call.path === '/v1/admin/groups')
    expect(post).toBeDefined()
    expect(post?.body).toEqual({ name: 'Legal' })
  })
})
