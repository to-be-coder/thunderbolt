/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import '@testing-library/jest-dom'
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import type { AuditEvent } from '../api/types'
import { createRecordingClient, flush, renderAdmin } from '../test-utils'
import { AuditPage } from './audit-page'

const event = (over: Partial<AuditEvent>): AuditEvent => ({
  id: 'a1',
  actor: 'admin@corp.test',
  action: 'member.invite',
  target: 'member:m1',
  diff: { email: 'new@corp.test' },
  ts: new Date('2026-07-01T12:00:00Z').toISOString(),
  ...over,
})

describe('AuditPage', () => {
  afterEach(cleanup)

  it('renders Stage-3 audit events from GET /v1/admin/audit', async () => {
    const { client, calls } = createRecordingClient((call) =>
      call.path === '/v1/admin/audit'
        ? [event({ action: 'grant.create', target: 'grant:x' }), event({ action: 'member.invite' })]
        : {},
    )
    renderAdmin(<AuditPage />, client)
    await flush()

    expect(calls.some((call) => call.path === '/v1/admin/audit' && call.method === 'GET')).toBe(true)
    expect(screen.getByText('grant.create')).toBeInTheDocument()
    expect(screen.getByText('member.invite')).toBeInTheDocument()
    expect(screen.getAllByText('admin@corp.test')).toHaveLength(2)
  })
})
