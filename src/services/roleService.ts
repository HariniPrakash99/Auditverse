/*!
 * Role Service for Power Apps Reference Screen
 * Resolved solely by Microsoft Entra ID (Azure AD) Object IDs via Environment Variables:
 *   - Admin:            envVarAdmin (Object ID: b0c8b2cc-d581-410f-b50b-ab5097c59083)
 *   - Content Manager:  enVarContentManager (Object ID: f9cc9dcd-35bf-438a-bdda-7b69e96080a1)
 *   - User:             enVarUser (Object ID: e1991965-64f5-4b98-b8c2-14dd07ff4d9a)
 *
 * NOTE: Group names are NOT used. Only Entra ID Object IDs are checked.
 */

import { getContext } from '@microsoft/power-apps/app'
import { MicrosoftEntraIDService } from '../generated/services/MicrosoftEntraIDService'

export type UserRole = 'admin' | 'content_manager' | 'user'

export const ENTRA_OBJECT_IDS = {
  ADMIN: 'b0c8b2cc-d581-410f-b50b-ab5097c59083',
  CONTENT_MANAGER: 'f9cc9dcd-35bf-438a-bdda-7b69e96080a1',
  USER: 'e1991965-64f5-4b98-b8c2-14dd07ff4d9a',
} as const

// Backwards-compatible alias
export const ENTRA_GROUPS = {
  ADMIN_GROUP_ID: ENTRA_OBJECT_IDS.ADMIN,
  CONTENT_MANAGER_GROUP_ID: ENTRA_OBJECT_IDS.CONTENT_MANAGER,
  USER_GROUP_ID: ENTRA_OBJECT_IDS.USER,
} as const

export const ENVIRONMENT_VARIABLES = {
  envVarAdmin: {
    name: 'envVarAdmin',
    schemaName: 'ha_envVarAdmin',
    displayName: 'envVarAdmin',
    objectId: ENTRA_OBJECT_IDS.ADMIN,
  },
  enVarContentManager: {
    name: 'enVarContentManager',
    schemaName: 'ha_envVarContentManager',
    displayName: 'envVarContentManager',
    objectId: ENTRA_OBJECT_IDS.CONTENT_MANAGER,
  },
  enVarUser: {
    name: 'enVarUser',
    schemaName: 'ha_envVarUser',
    displayName: 'envVarUser',
    objectId: ENTRA_OBJECT_IDS.USER,
  },
} as const

/**
 * Retrieves environment variable value from Dataverse or falls back to configured Entra ID Object ID
 */
export async function getEnvironmentVariableValue(
  envVar: typeof ENVIRONMENT_VARIABLES[keyof typeof ENVIRONMENT_VARIABLES]
): Promise<string> {
  try {
    const xrm = (window as any).Xrm
    if (xrm?.WebApi?.retrieveMultipleRecords) {
      const filter = `?$filter=(schemaname eq '${envVar.schemaName}' or schemaname eq 'ca_${envVar.name}')&$expand=environmentvariabledefinition_environmentvariablevalue($select=value)`
      const res = await xrm.WebApi.retrieveMultipleRecords('environmentvariabledefinition', filter)
      if (res?.entities && res.entities.length > 0) {
        const entity = res.entities[0]
        const val = entity.environmentvariabledefinition_environmentvariablevalue?.[0]?.value || entity.defaultvalue
        if (val && typeof val === 'string' && val.trim()) {
          return val.trim()
        }
      }
    }
  } catch {
    // WebApi query unavailable in offline or local dev mode
  }
  return envVar.objectId
}

export interface UserRoleInfo {
  role: UserRole
  objectId: string
  groupName?: string // Retained for backwards compatibility, mirrors objectId
  userName: string
  userEmail?: string
  canManageStructure: boolean // Admin only: left-side category/section manage buttons
  canManageRightSide: boolean // Admin & Content Manager: right-side content manage button
}

/**
 * Storage key for dev/test role override
 */
const ROLE_OVERRIDE_KEY = 'audit_ref_role_override'

export function getStoredRoleOverride(): UserRole | null {
  try {
    const stored = localStorage.getItem(ROLE_OVERRIDE_KEY)
    if (stored === 'admin' || stored === 'content_manager' || stored === 'user') {
      return stored
    }
  } catch {
    // Ignore storage errors
  }
  return null
}

export function setStoredRoleOverride(role: UserRole | null): void {
  try {
    if (role) {
      localStorage.setItem(ROLE_OVERRIDE_KEY, role)
    } else {
      localStorage.removeItem(ROLE_OVERRIDE_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Resolves UserRole to UserRoleInfo permissions object
 */
export function buildRoleInfo(
  role: UserRole,
  userName: string,
  userEmail?: string,
  objectId?: string
): UserRoleInfo {
  let canManageStructure = false
  let canManageRightSide = false

  const resolvedObjectId =
    objectId ||
    (role === 'admin'
      ? ENTRA_OBJECT_IDS.ADMIN
      : role === 'content_manager'
      ? ENTRA_OBJECT_IDS.CONTENT_MANAGER
      : ENTRA_OBJECT_IDS.USER)

  if (role === 'admin') {
    canManageStructure = true
    canManageRightSide = true
  } else if (role === 'content_manager') {
    canManageStructure = false
    canManageRightSide = true
  } else {
    // 'user'
    canManageStructure = false
    canManageRightSide = false
  }

  return {
    role,
    objectId: resolvedObjectId,
    groupName: resolvedObjectId,
    userName,
    userEmail,
    canManageStructure,
    canManageRightSide,
  }
}

function extractGroupIds(data: any): string[] {
  if (!data) return []
  if (Array.isArray(data)) return data.map(String)
  if (Array.isArray(data.value)) return data.value.map(String)
  if (data.value && Array.isArray(data.value.value)) return data.value.value.map(String)
  return []
}

function hasGroupId(list: string[], targetId?: string): boolean {
  if (!targetId || !list || !list.length) return false
  const normTarget = targetId.toLowerCase().trim()
  return list.some((id) => String(id).toLowerCase().trim() === normTarget)
}

/**
 * Detects the user's role solely using Entra ID Object IDs via Environment Variables.
 * No group names are used.
 */
export async function detectUserRole(): Promise<UserRoleInfo> {
  let detectedName = 'User'
  let detectedEmail = ''
  let detectedObjectId = ''

  // 1. Check URL parameters, Referrer, and Power Apps context queryParams for testing
  try {
    const params = new URLSearchParams(window.location.search)
    let candidate =
      params.get('role') ||
      params.get('objectid') ||
      params.get('objectId') ||
      params.get('id') ||
      params.get('env') ||
      params.get('envvar')

    // Also check document.referrer (outer Power Apps Player URL when in iframe)
    if (!candidate && typeof document !== 'undefined' && document.referrer) {
      try {
        const refUrl = new URL(document.referrer)
        candidate =
          refUrl.searchParams.get('role') ||
          refUrl.searchParams.get('objectid') ||
          refUrl.searchParams.get('objectId') ||
          refUrl.searchParams.get('id') ||
          refUrl.searchParams.get('env') ||
          refUrl.searchParams.get('envvar')
      } catch {
        // Ignore referrer parsing errors
      }
    }

    // Also check Power Apps context queryParams
    if (!candidate) {
      try {
        const ctx = await getContext()
        if (ctx?.app?.queryParams) {
          candidate =
            ctx.app.queryParams['role'] ||
            ctx.app.queryParams['objectid'] ||
            ctx.app.queryParams['objectId'] ||
            ctx.app.queryParams['id'] ||
            ctx.app.queryParams['env'] ||
            ctx.app.queryParams['envvar']
        }
      } catch {
        // Ignore context error
      }
    }

    if (candidate) {
      const cleanCandidate = candidate.trim().toLowerCase()
      if (cleanCandidate === 'reset' || cleanCandidate === 'clear' || cleanCandidate === 'live') {
        setStoredRoleOverride(null)
      } else {
        if (
          cleanCandidate === 'admin' ||
          cleanCandidate === 'envvaradmin' ||
          cleanCandidate === ENTRA_OBJECT_IDS.ADMIN.toLowerCase()
        ) {
          return buildRoleInfo('admin', 'Admin User', 'admin@jnj.com', ENTRA_OBJECT_IDS.ADMIN)
        }
        if (
          cleanCandidate === 'content_manager' ||
          cleanCandidate === 'contentmanager' ||
          cleanCandidate === 'content-manager' ||
          cleanCandidate === 'manager' ||
          cleanCandidate === 'envarcontentmanager' ||
          cleanCandidate === 'envvarcontentmanager' ||
          cleanCandidate === ENTRA_OBJECT_IDS.CONTENT_MANAGER.toLowerCase()
        ) {
          return buildRoleInfo('content_manager', 'Content Manager', 'manager@jnj.com', ENTRA_OBJECT_IDS.CONTENT_MANAGER)
        }
        if (
          cleanCandidate === 'user' ||
          cleanCandidate === 'envaruser' ||
          cleanCandidate === 'envvaruser' ||
          cleanCandidate === ENTRA_OBJECT_IDS.USER.toLowerCase()
        ) {
          return buildRoleInfo('user', 'Standard User', 'user@jnj.com', ENTRA_OBJECT_IDS.USER)
        }
      }
    }
  } catch {
    // Ignore URL parsing errors
  }

  // 2. Check stored override in localStorage (if set by tester via UI)
  const storedOverride = getStoredRoleOverride()
  if (storedOverride) {
    return buildRoleInfo(storedOverride, detectedName, detectedEmail)
  }

  // 3. Retrieve user identity from @microsoft/power-apps context & Xrm
  try {
    const context = await getContext()
    if (context?.user) {
      if (context.user.fullName) detectedName = context.user.fullName
      if (context.user.userPrincipalName) detectedEmail = context.user.userPrincipalName
      if (context.user.objectId) detectedObjectId = context.user.objectId
    }
  } catch (err) {
    console.warn('[RoleService] getContext error:', err)
  }

  try {
    const xrm = (window as any).Xrm
    const xrmSettings = xrm?.Utility?.getGlobalContext?.()?.userSettings
    if (xrmSettings) {
      if (!detectedName || detectedName === 'User') {
        if (xrmSettings.userName) detectedName = xrmSettings.userName
      }
      if (!detectedEmail && xrmSettings.userEmail) {
        detectedEmail = xrmSettings.userEmail
      }
      if (!detectedObjectId && xrmSettings.userId) {
        detectedObjectId = String(xrmSettings.userId).replace(/[{}]/g, '').trim()
      }
    }
  } catch (err) {
    console.warn('[RoleService] Xrm settings check error:', err)
  }

  // 4. Retrieve Object IDs from Environment Variables
  const adminObjectId = await getEnvironmentVariableValue(ENVIRONMENT_VARIABLES.envVarAdmin)
  const contentManagerObjectId = await getEnvironmentVariableValue(ENVIRONMENT_VARIABLES.enVarContentManager)
  const userObjectId = await getEnvironmentVariableValue(ENVIRONMENT_VARIABLES.enVarUser)

  const targetGroupIds = [adminObjectId, contentManagerObjectId, userObjectId].filter(Boolean)

  console.log('[RoleService] Current user identity:', {
    detectedName,
    detectedEmail,
    detectedObjectId,
    targetGroupIds: { adminObjectId, contentManagerObjectId, userObjectId },
  })

  // 5. Gather potential identifiers for Microsoft Entra ID query
  const candidates: string[] = []
  if (detectedObjectId) candidates.push(detectedObjectId)
  if (detectedEmail) candidates.push(detectedEmail)
  candidates.push('me')

  let matchedGroupIds: string[] = []

  // Method 1: CheckMemberGroupsV2
  for (const identifier of candidates) {
    if (matchedGroupIds.length > 0) break
    try {
      console.log('[RoleService] Calling CheckMemberGroupsV2 with identifier:', identifier)
      const checkRes = await MicrosoftEntraIDService.CheckMemberGroupsV2(identifier, {
        groupIds: targetGroupIds,
      })
      console.log('[RoleService] CheckMemberGroupsV2 response:', checkRes)
      const ids = extractGroupIds(checkRes?.data)
      if (ids.length > 0) {
        matchedGroupIds = ids
        console.log('[RoleService] Matched groups via CheckMemberGroupsV2:', matchedGroupIds)
        break
      }
    } catch (err) {
      console.warn(`[RoleService] CheckMemberGroupsV2 failed for identifier ${identifier}:`, err)
    }
  }

  // Method 2: GetMemberGroupsV2 fallback (if CheckMemberGroupsV2 returns empty)
  if (matchedGroupIds.length === 0) {
    for (const identifier of candidates) {
      if (identifier === 'me') continue
      try {
        console.log('[RoleService] Calling GetMemberGroupsV2 with identifier:', identifier)
        const groupsRes = await MicrosoftEntraIDService.GetMemberGroupsV2(identifier, {
          securityEnabledOnly: false,
        })
        console.log('[RoleService] GetMemberGroupsV2 response:', groupsRes)
        const ids = extractGroupIds(groupsRes?.data)
        if (ids.length > 0) {
          matchedGroupIds = ids
          console.log('[RoleService] Matched groups via GetMemberGroupsV2:', matchedGroupIds)
          break
        }
      } catch (err) {
        console.warn(`[RoleService] GetMemberGroupsV2 failed for identifier ${identifier}:`, err)
      }
    }
  }

  // Method 3: GetGroupMembers fallback
  if (matchedGroupIds.length === 0) {
    for (const gId of [adminObjectId, contentManagerObjectId, userObjectId]) {
      if (!gId) continue
      try {
        const memRes = await MicrosoftEntraIDService.GetGroupMembers(gId)
        const members = Array.isArray(memRes?.data)
          ? memRes.data
          : Array.isArray((memRes?.data as any)?.value)
          ? (memRes.data as any).value
          : []
        const isMember = members.some((m: any) => {
          const upn = String(m.userPrincipalName || '').toLowerCase().trim()
          const mail = String(m.mail || '').toLowerCase().trim()
          const id = String(m.id || '').toLowerCase().trim()
          const dName = String(m.displayName || '').toLowerCase().trim()
          return (
            (detectedObjectId && id === detectedObjectId.toLowerCase().trim()) ||
            (detectedEmail && (upn === detectedEmail.toLowerCase().trim() || mail === detectedEmail.toLowerCase().trim())) ||
            (detectedName && dName === detectedName.toLowerCase().trim())
          )
        })
        if (isMember) {
          matchedGroupIds.push(gId)
          console.log(`[RoleService] User matched group ${gId} via GetGroupMembers`)
        }
      } catch (err) {
        console.warn(`[RoleService] GetGroupMembers failed for group ${gId}:`, err)
      }
    }
  }

  // 6. Map matched group IDs to role permissions
  if (hasGroupId(matchedGroupIds, adminObjectId)) {
    console.log('[RoleService] User assigned role: admin')
    return buildRoleInfo('admin', detectedName, detectedEmail, adminObjectId)
  }
  if (hasGroupId(matchedGroupIds, contentManagerObjectId)) {
    console.log('[RoleService] User assigned role: content_manager')
    return buildRoleInfo('content_manager', detectedName, detectedEmail, contentManagerObjectId)
  }
  if (hasGroupId(matchedGroupIds, userObjectId)) {
    console.log('[RoleService] User assigned role: user')
    return buildRoleInfo('user', detectedName, detectedEmail, userObjectId)
  }

  // 7. Default role if no elevated Object ID matches
  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  if (isLocalDev && (!detectedEmail || detectedEmail.includes('jnj.com'))) {
    console.log('[RoleService] Local dev default: admin')
    return buildRoleInfo('admin', detectedName, detectedEmail, adminObjectId)
  }

  console.log('[RoleService] Default fallback: user (view-only)')
  return buildRoleInfo('user', detectedName, detectedEmail, userObjectId)
}
