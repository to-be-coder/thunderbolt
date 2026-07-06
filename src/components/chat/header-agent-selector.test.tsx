/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useChatStore } from '@/chats/chat-store'
import { HeaderAgentSelector } from './header-agent-selector'

afterEach(() => {
  cleanup()
  useChatStore.setState({ sessions: new Map(), currentSessionId: null })
})

describe('HeaderAgentSelector', () => {
  it('renders nothing when there is no current chat session', () => {
    useChatStore.setState({ sessions: new Map(), currentSessionId: null })
    const { container } = render(<HeaderAgentSelector />, { wrapper: MemoryRouter })
    expect(container.firstChild).toBeNull()
  })
})
