// @vitest-environment jsdom
/* eslint-disable react/react-in-jsx-scope */

import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import * as Kumo from '@cloudflare/kumo'
import type { UserNotification } from '@gadgets/workshop-shared/api'

type Kind = UserNotification['kind']

const { api, addToast } = vi.hoisted(() => ({
  api: {
    setWorkspaceNotificationKindEnabled:
      vi.fn<(workspaceId: string, kind: Kind, enabled: boolean) => Promise<Kind[]>>(),
  },
  addToast: vi.fn<(toast: { variant?: string }) => void>(),
}))

vi.mock('@cloudflare/kumo', async (importOriginal) => ({
  ...(await importOriginal<typeof Kumo>()),
  useKumoToastManager: () => ({ add: addToast }),
}))

vi.mock('../../AuthContext', () => ({
  useAuthenticatedApi: () => ({ authenticatedApi: api }),
}))

import { WorkspaceNotificationsMenu } from './WorkspaceNotificationsMenu'

const testGlobal = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
testGlobal.IS_REACT_ACT_ENVIRONMENT = true

// Owns the workspace's disabled kinds as the sidebar and workspace list do.
const WorkspaceMenu = () => {
  const [disabledKinds, setDisabledKinds] = useState<Kind[]>([])
  return (
    <Kumo.DropdownMenu>
      <Kumo.DropdownMenu.Trigger render={<button type="button">Workspace actions</button>} />
      <Kumo.DropdownMenu.Content>
        <WorkspaceNotificationsMenu
          workspaceId="workspace-1"
          disabledKinds={disabledKinds}
          onDisabledKindsChange={setDisabledKinds}
        />
      </Kumo.DropdownMenu.Content>
    </Kumo.DropdownMenu>
  )
}

const byText = (selector: string, text: string) => [...document.body.querySelectorAll<HTMLElement>(selector)]
  .find(element => element.textContent?.trim() === text)!

const checked = () => Object.fromEntries([...document.body.querySelectorAll('[role="menuitemcheckbox"]')]
  .map(item => [item.textContent, item.getAttribute('aria-checked') === 'true']))

let root: Root | undefined

afterEach(() => {
  act(() => root?.unmount())
  document.body.replaceChildren()
})

// The checkboxes show what the server stored, which may include a change made in another list.
it('shows the kinds the server stored, and leaves a kind on when its save fails', async () => {
  using _ = vi.spyOn(console, 'error').mockImplementation(() => {})
  const container = document.body.appendChild(document.createElement('div'))
  root = createRoot(container)
  await act(async () => root!.render(<WorkspaceMenu />))
  await act(async () => byText('button', 'Workspace actions').click())
  await act(async () => byText('[role="menuitem"]', 'Notifications').click())

  api.setWorkspaceNotificationKindEnabled
    .mockResolvedValueOnce(['permissionRequested', 'automationPermissionRequested'])
  await act(async () => byText('[role="menuitemcheckbox"]', 'Background agent needs permission').click())
  expect(api.setWorkspaceNotificationKindEnabled)
    .toHaveBeenCalledWith('workspace-1', 'automationPermissionRequested', false)

  api.setWorkspaceNotificationKindEnabled.mockRejectedValueOnce(new Error('offline'))
  await act(async () => byText('[role="menuitemcheckbox"]', 'Task finished').click())
  expect(api.setWorkspaceNotificationKindEnabled)
    .toHaveBeenLastCalledWith('workspace-1', 'taskCompleted', false)
  expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error' }))

  expect(checked()).toEqual({
    'Task finished': true,
    'Needs your permission': false,
    'Background agent needs permission': false,
  })
})
