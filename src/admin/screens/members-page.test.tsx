/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import type { Member } from '../api/types'
import { createRecordingClient, flush, renderAdmin } from '../test-utils'
import { MembersPage } from './members-page'

const member = (over: Partial<Member>): Member => ({
  id: 'm1',
  email: 'existing@corp.test',
  status: 'active',
  isAdmin: false,
  createdAt: new Date().toISOString(),
  deletedAt: null,
  ...over,
})

describe('MembersPage', () => {
  afterEach(cleanup)

  it('lists members from GET /v1/admin/members', async () => {
    const { client } = createRecordingClient((call) =>
      call.path === '/v1/admin/members' ? [member({ email: 'existing@corp.test' })] : {},
    )
    renderAdmin(<MembersPage />, client)
    await flush()
    expect(screen.getByText('existing@corp.test')).toBeInTheDocument()
  })

  it('invite POSTs the email to /v1/admin/members', async () => {
    const { client, calls } = createRecordingClient((call) => {
      if (call.path === '/v1/admin/members' && call.method === 'GET') {
        return []
      }
      return member({ email: 'new@corp.test' })
    })
    renderAdmin(<MembersPage />, client)
    await flush()

    // The invite form lives in a modal opened by the "+" action in the title row.
    fireEvent.click(screen.getByRole('button', { name: 'Invite a member' }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@corp.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }))
    await flush()

    const post = calls.find((call) => call.method === 'POST' && call.path === '/v1/admin/members')
    expect(post).toBeDefined()
    expect(post?.body).toEqual({ email: 'new@corp.test', isAdmin: false })
  })

  it('the row menu promotes a member to admin via PATCH', async () => {
    const { client, calls } = createRecordingClient((call) =>
      call.path === '/v1/admin/members' && call.method === 'GET' ? [member({ isAdmin: false })] : {},
    )
    renderAdmin(<MembersPage />, client)
    await flush()

    // Actions live behind the 3-dots menu; Radix opens on pointerdown.
    const trigger = screen.getByRole('button', { name: 'Actions for existing@corp.test' })
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' })
    fireEvent.pointerUp(trigger, { button: 0, pointerType: 'mouse' })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Make admin' }))
    await flush()

    const patch = calls.find((call) => call.method === 'PATCH' && call.path === '/v1/admin/members/m1')
    expect(patch).toBeDefined()
    expect(patch?.body).toEqual({ isAdmin: true })
  })
})
