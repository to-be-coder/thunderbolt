/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Navigate, Route, Routes } from 'react-router'
import { AdminConsoleLayout } from './admin-console-layout'
import { GroupsPage } from './screens/groups-page'
import { McpPage } from './screens/mcp-page'
import { MembersPage } from './screens/members-page'
import { ModelsPage } from './screens/models-page'
import { PolicyPage } from './screens/policy-page'
import { RegistryPage } from './screens/registry-page'
import { SkillsPage } from './screens/skills-page'

/**
 * Lazy entry for the admin console (loaded off the chat critical path). Owns the
 * descendant routes for its screens, so every screen component is statically
 * imported HERE — inside the lazy chunk — and never leaks into the entry bundle
 * via `src/app.tsx`. The app only references `AdminGate` (static, tiny) and this
 * module (lazy). Grants are managed per-agent on the Registry's Access tab.
 */
const AdminConsole = () => (
  <AdminConsoleLayout>
    <Routes>
      <Route index element={<RegistryPage />} />
      <Route path="members" element={<MembersPage />} />
      <Route path="groups" element={<GroupsPage />} />
      <Route path="skills" element={<SkillsPage />} />
      <Route path="mcp" element={<McpPage />} />
      <Route path="models" element={<ModelsPage />} />
      <Route path="policy" element={<PolicyPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </AdminConsoleLayout>
)

export default AdminConsole
