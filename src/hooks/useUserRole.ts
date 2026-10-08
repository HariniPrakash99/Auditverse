import { useEffect, useState } from 'react'
import {
  detectUserRole,
  setStoredRoleOverride,
  type UserRole,
  type UserRoleInfo,
} from '../services/roleService'

export function useUserRole() {
  const [roleInfo, setRoleInfo] = useState<UserRoleInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadRole = async () => {
      try {
        const info = await detectUserRole()
        if (isMounted) {
          setRoleInfo(info)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error detecting user role:', err)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadRole()

    return () => {
      isMounted = false
    }
  }, [])

  const switchRole = async (newRole: UserRole) => {
    setStoredRoleOverride(newRole)
    const updated = await detectUserRole()
    setRoleInfo(updated)
  }

  const clearOverride = async () => {
    setStoredRoleOverride(null)
    const updated = await detectUserRole()
    setRoleInfo(updated)
  }

  return {
    roleInfo,
    loading,
    role: roleInfo?.role ?? 'user',
    objectId: roleInfo?.objectId ?? '',
    groupName: roleInfo?.objectId ?? '',
    canManageStructure: roleInfo?.canManageStructure ?? false, // Admin only
    canManageRightSide: roleInfo?.canManageRightSide ?? false, // Admin & Content Manager
    switchRole,
    clearOverride,
  }
}
