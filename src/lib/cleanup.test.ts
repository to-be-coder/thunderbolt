/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { clearLocalData, signOutAndWipe } from './cleanup'
import { initialLocalSettings, useLocalSettingsStore } from '@/stores/local-settings-store'
import { useTrustDomainRegistry } from '@/stores/trust-domain-registry'
import { resetTestDatabase, setupTestDatabase, teardownTestDatabase } from '@/dal/test-utils'
import { getDb } from '@/db/database'
import { getTeamAgentsCache, replaceTeamAgentsCache } from '@/dal/team-agents-cache'
import { getOrgPolicy, setOrgPolicy } from '@/dal/org-policy'
import type { AgentCard } from '@shared/agent-cards'

const calls: string[] = []

// Injected deps — passed directly to clearLocalData/signOutAndWipe rather than
// mocking shared modules globally, per the testing docs DI guideline.
const broadcastDbLifecycle = mock((event: { kind: string }) => {
  calls.push(`broadcast:${event.kind}`)
})
const setSyncEnabled = mock(async (enabled: boolean) => {
  calls.push(`setSyncEnabled:${enabled}`)
})
const resetDatabase = mock(async () => {
  calls.push('resetDatabase')
})
const deleteDbFile = mock(async (filename: string) => {
  calls.push(`deleteDbFile:${filename}`)
})
const clearAuthToken = mock(() => {
  calls.push('clearAuthToken')
})
const clearDeviceId = mock(() => {
  calls.push('clearDeviceId')
})
const handleFullWipe = mock(async () => {
  calls.push('handleFullWipe')
})

const serverId = '00000000-0000-0000-0000-0000000000aa'

const deps = {
  broadcastDbLifecycle,
  setSyncEnabled,
  resetDatabase,
  deleteDbFile,
  clearAuthToken,
  clearDeviceId,
  handleFullWipe,
}

describe('clearLocalData', () => {
  beforeEach(() => {
    calls.length = 0
    broadcastDbLifecycle.mockClear()
    setSyncEnabled.mockClear()
    resetDatabase.mockClear()
    deleteDbFile.mockClear()
    clearAuthToken.mockClear()
    clearDeviceId.mockClear()
    handleFullWipe.mockClear()
    useTrustDomainRegistry.setState({
      servers: { [serverId]: { serverId, cloudUrl: 'http://test.local' } },
      activeTrustDomain: { kind: 'server', serverId },
    })
  })

  afterEach(() => {
    useTrustDomainRegistry.setState({ servers: {}, activeTrustDomain: undefined })
  })

  it('runs the server-mode wipe sequence in order', async () => {
    await clearLocalData(deps)

    expect(calls).toEqual([
      'setSyncEnabled:false',
      'broadcast:db-closing',
      'resetDatabase',
      `deleteDbFile:server-${serverId}.db`,
      'broadcast:db-deleted',
      'clearAuthToken',
      'clearDeviceId',
      'handleFullWipe',
    ])
  })

  it('resets local-settings to their defaults', async () => {
    useLocalSettingsStore.setState({ theme: 'dark', debugPosthog: true, hapticsEnabled: false })

    await clearLocalData(deps)

    const state = useLocalSettingsStore.getState()
    expect(state.theme).toBe(initialLocalSettings.theme)
    expect(state.debugPosthog).toBe(initialLocalSettings.debugPosthog)
    expect(state.hapticsEnabled).toBe(initialLocalSettings.hapticsEnabled)
  })

  it('skips encryption-key wipe in standalone mode', async () => {
    useTrustDomainRegistry.setState({ activeTrustDomain: { kind: 'standalone' } })

    await clearLocalData(deps)

    expect(calls).toContain('deleteDbFile:standalone.db')
    expect(calls).not.toContain('handleFullWipe')
  })

  it('continues through the sequence when a step throws', async () => {
    setSyncEnabled.mockRejectedValueOnce(new Error('powersync hiccup'))
    resetDatabase.mockRejectedValueOnce(new Error('close failed'))
    handleFullWipe.mockRejectedValueOnce(new Error('IDB gone'))

    await clearLocalData(deps)

    // setSyncEnabled, resetDatabase, and handleFullWipe rejected — they don't appear
    // in `calls` because the mocks above only push from the success path. We're
    // verifying the surrounding steps still ran, i.e. failure is non-fatal.
    expect(calls).toContain('broadcast:db-closing')
    expect(calls).toContain(`deleteDbFile:server-${serverId}.db`)
    expect(calls).toContain('broadcast:db-deleted')
    expect(calls).toContain('clearAuthToken')
    expect(calls).toContain('clearDeviceId')
  })

  it('skips all broadcast + file-delete steps when no active trust domain', async () => {
    useTrustDomainRegistry.setState({ activeTrustDomain: undefined })

    await clearLocalData(deps)

    expect(broadcastDbLifecycle).not.toHaveBeenCalled()
    expect(deleteDbFile).not.toHaveBeenCalled()
    expect(calls).toContain('clearAuthToken')
    expect(calls).toContain('clearDeviceId')
  })

  it('clears activeTrustDomain from the registry before broadcasting db-closing', async () => {
    let registryAtBroadcast: ReturnType<typeof useTrustDomainRegistry.getState>['activeTrustDomain']
    broadcastDbLifecycle.mockImplementationOnce((event: { kind: string }) => {
      calls.push(`broadcast:${event.kind}`)
      registryAtBroadcast = useTrustDomainRegistry.getState().activeTrustDomain
    })

    await clearLocalData(deps)

    expect(registryAtBroadcast).toBeUndefined()
  })
})

describe('clearLocalData — agent-access cache clearing (T2)', () => {
  // The wipe must drop the device-local agent-access caches on sign-out so no
  // team-agent grant data survives into the next identity. `resetDatabase` is
  // mocked to a no-op here, so the real test DB stays open and we can assert
  // both tables are empty AFTER the wipe (proving the explicit clear ran).
  const sampleCard: AgentCard = {
    id: 'company-agent-1',
    name: 'Company Agent',
    icon: '🏢',
    description: 'A granted team agent',
    category: 'sealed',
    capabilities: [],
    advertisedModels: [],
    managedBy: 'Platform Team',
    grantedVia: 'Everyone',
  }

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await resetTestDatabase()
    broadcastDbLifecycle.mockClear()
    setSyncEnabled.mockClear()
    resetDatabase.mockClear()
    deleteDbFile.mockClear()
    clearAuthToken.mockClear()
    clearDeviceId.mockClear()
    handleFullWipe.mockClear()
    useTrustDomainRegistry.setState({
      servers: { [serverId]: { serverId, cloudUrl: 'http://test.local' } },
      activeTrustDomain: { kind: 'server', serverId },
    })
  })

  afterEach(async () => {
    useTrustDomainRegistry.setState({ servers: {}, activeTrustDomain: undefined })
    await resetTestDatabase()
  })

  it('clears the team-agents cache and org policy', async () => {
    await replaceTeamAgentsCache(getDb(), [sampleCard])
    await setOrgPolicy(getDb(), {
      personalAgentPolicy: 'company_only',
      userModelsAllowed: false,
      mcpPolicy: 'allow',
      mcpAllowlist: [],
      blockedExtensions: [],
      blockedIntegrations: [],
    })

    // Sanity: both caches are populated before the wipe.
    expect(await getTeamAgentsCache(getDb())).toHaveLength(1)
    expect((await getOrgPolicy(getDb())).personalAgentPolicy).toBe('company_only')

    await clearLocalData(deps)

    // Both device-local agent-access caches are gone; org policy falls back to
    // the consumer default (`personalAgentPolicy: 'all'`).
    expect(await getTeamAgentsCache(getDb())).toHaveLength(0)
    expect((await getOrgPolicy(getDb())).personalAgentPolicy).toBe('all')
  })
})

describe('signOutAndWipe', () => {
  const mockReplace = mock()
  const originalLocation = window.location

  beforeEach(() => {
    calls.length = 0
    broadcastDbLifecycle.mockClear()
    setSyncEnabled.mockClear()
    resetDatabase.mockClear()
    deleteDbFile.mockClear()
    clearAuthToken.mockClear()
    clearDeviceId.mockClear()
    handleFullWipe.mockClear()
    mockReplace.mockClear()
    useTrustDomainRegistry.setState({
      servers: { [serverId]: { serverId, cloudUrl: 'http://test.local' } },
      activeTrustDomain: { kind: 'server', serverId },
    })
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, replace: mockReplace },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  it('calls clearLocalData → signOut → onComplete in that order', async () => {
    const signOut = mock(async () => {
      calls.push('signOut')
    })
    const onComplete = mock(() => {
      calls.push('onComplete')
    })

    await signOutAndWipe({ signOut, onComplete, ...deps })

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(calls[0]).toBe('setSyncEnabled:false')
    expect(calls).toContain(`deleteDbFile:server-${serverId}.db`)
    expect(calls[calls.length - 1]).toBe('onComplete')
  })

  it('skips signOut when not provided (revoked-device path)', async () => {
    const onComplete = mock(() => {})

    await signOutAndWipe({ onComplete, ...deps })

    expect(calls[0]).toBe('setSyncEnabled:false')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('still fires onComplete if signOut throws', async () => {
    const signOut = mock(async () => {
      throw new Error('network down')
    })
    const onComplete = mock(() => {})

    await signOutAndWipe({ signOut, onComplete, ...deps })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('still fires onComplete if clearLocalData throws (resetDatabase rejects)', async () => {
    resetDatabase.mockRejectedValueOnce(new Error('close failed'))
    const onComplete = mock(() => {})

    await signOutAndWipe({ onComplete, ...deps })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('clears credentials AFTER signOut so the server can revoke the session', async () => {
    const signOut = mock(async () => {
      calls.push('signOut')
    })
    const onComplete = mock(() => {
      calls.push('onComplete')
    })

    await signOutAndWipe({ signOut, onComplete, ...deps })

    const signOutIdx = calls.indexOf('signOut')
    const authTokenIdx = calls.indexOf('clearAuthToken')
    const deviceIdIdx = calls.indexOf('clearDeviceId')
    const onCompleteIdx = calls.indexOf('onComplete')

    expect(signOutIdx).toBeGreaterThan(-1)
    expect(authTokenIdx).toBeGreaterThan(signOutIdx)
    expect(deviceIdIdx).toBeGreaterThan(signOutIdx)
    expect(onCompleteIdx).toBeGreaterThan(authTokenIdx)
    expect(onCompleteIdx).toBeGreaterThan(deviceIdIdx)
  })

  it('still clears credentials on the revoked-device path (no signOut)', async () => {
    // RevokedDeviceModal doesn't pass `signOut` (the server already
    // invalidated the session). The deferred-credential clear still has to
    // run so the local token is wiped.
    const onComplete = mock(() => {})

    await signOutAndWipe({ onComplete, ...deps })

    expect(clearAuthToken).toHaveBeenCalledTimes(1)
    expect(clearDeviceId).toHaveBeenCalledTimes(1)
  })

  it('passes the captured serverId to the credential clearers (registry already cleared)', async () => {
    const onComplete = mock(() => {})

    await signOutAndWipe({ onComplete, ...deps })

    expect(clearAuthToken).toHaveBeenCalledWith(serverId)
    expect(clearDeviceId).toHaveBeenCalledWith(serverId)
  })

  it('passes the captured serverId to handleFullWipe (registry already cleared)', async () => {
    const onComplete = mock(() => {})

    await signOutAndWipe({ onComplete, ...deps })

    expect(handleFullWipe).toHaveBeenCalledWith(serverId)
  })

  it('keeps getAuthToken() resolvable during signOut even though the registry was cleared', async () => {
    // clearLocalData empties `activeTrustDomain` before signOut runs, so the
    // registry-derived lookup inside `getAuthToken()` would return null and
    // Better Auth's `auth.token` callback would send the sign-out request
    // bearer-less. `withCapturedAuthToken` (used inside `signOutAndWipe`)
    // must replay the pre-wipe token for the duration of the signOut call.
    const { getAuthToken } = await import('@/lib/auth-token')
    const tokenKey = `thunderbolt_auth_token__${serverId}`
    const tokenValue = 'sentinel-token-value'
    localStorage.setItem(tokenKey, tokenValue)

    const observed: { token: string | null } = { token: null }
    const signOut = mock(async () => {
      observed.token = getAuthToken()
    })
    const onComplete = mock(() => {})

    try {
      await signOutAndWipe({ signOut, onComplete, ...deps })
    } finally {
      localStorage.removeItem(tokenKey)
    }

    expect(observed.token).toBe(tokenValue)
    // And after signOut returns, the override is dropped — no leakage.
    expect(getAuthToken()).toBeNull()
  })
})
