import { DropdownMenu, useKumoToastManager } from '@cloudflare/kumo'
import { Bell } from '@phosphor-icons/react'
import type { UserNotification } from '@gadgets/workshop-shared/api'
import { useAuthenticatedApi } from '../../AuthContext'
import { MENU_CONTENT, MENU_ITEM, MENU_POSITIONER_STYLE } from '../../components/menuStyles'
import { logRpcFailure } from '../../rpcErrors'

type NotificationKind = UserNotification['kind']

const KINDS: [NotificationKind, string][] = [
  ['taskCompleted', 'Task finished'],
  ['permissionRequested', 'Needs your permission'],
  ['automationPermissionRequested', 'Background agent needs permission'],
]

/**
 * The "Notifications" submenu of a workspace's menu: a checkbox per kind of notification the
 * workspace can send this user. A checkbox changes only once the server has stored it, and
 * `onDisabledKindsChange` receives what the server stored.
 */
export const WorkspaceNotificationsMenu = ({ workspaceId, disabledKinds = [], onDisabledKindsChange }: {
  workspaceId: string
  disabledKinds?: NotificationKind[]
  onDisabledKindsChange: (disabledKinds: NotificationKind[]) => void
}) => {
  const { authenticatedApi } = useAuthenticatedApi()
  const toasts = useKumoToastManager()

  const setKindEnabled = async (kind: NotificationKind, enabled: boolean) => {
    try {
      onDisabledKindsChange(
        await authenticatedApi.setWorkspaceNotificationKindEnabled(workspaceId, kind, enabled))
    } catch (error) {
      logRpcFailure('Failed to update workspace notifications:', error)
      toasts.add({ title: 'Failed to update notifications', variant: 'error' })
    }
  }

  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className={MENU_ITEM}>
        <Bell size={13} className="mr-2" /> Notifications
      </DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent className={MENU_CONTENT} style={MENU_POSITIONER_STYLE}>
        {KINDS.map(([kind, label]) => (
          <DropdownMenu.CheckboxItem
            key={kind}
            checked={!disabledKinds.includes(kind)}
            onCheckedChange={enabled => setKindEnabled(kind, enabled)}
            className={`${MENU_ITEM} !pl-8`}
          >
            {label}
          </DropdownMenu.CheckboxItem>
        ))}
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  )
}
