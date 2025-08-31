import React from 'react';
import { useAuth } from '@/hooks/useAuth';

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Permission-based component that renders children only if user has required permissions/roles
 */
export function PermissionGate({
  permission,
  permissions = [],
  role,
  roles = [],
  fallback = null,
  children
}: PermissionGateProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Check single permission
  if (permission && !user.permissions?.includes(permission)) {
    return <>{fallback}</>;
  }

  // Check multiple permissions (user must have ALL)
  if (permissions.length > 0) {
    const hasAllPermissions = permissions.every(perm => 
      user.permissions?.includes(perm)
    );
    if (!hasAllPermissions) {
      return <>{fallback}</>;
    }
  }

  // Check single role
  if (role && user.currentRole !== role) {
    return <>{fallback}</>;
  }

  // Check multiple roles (user must have ONE of them)
  if (roles.length > 0) {
    const hasAnyRole = user.currentRole ? roles.includes(user.currentRole) : false;
    if (!hasAnyRole) {
      return <>{fallback}</>;
    }
  }

  // User has required permissions/roles
  return <>{children}</>;
}

/**
 * Hook to check if user has specific permission
 */
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  return user?.permissions?.includes(permission) || false;
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useAnyPermission(permissions: string[]): boolean {
  const { user } = useAuth();
  return permissions.some(perm => user?.permissions?.includes(perm)) || false;
}

/**
 * Hook to check if user has specific role
 */
export function useRole(role: string): boolean {
  const { user } = useAuth();
  return user?.currentRole === role || false;
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useAnyRole(roles: string[]): boolean {
  const { user } = useAuth();
  return user?.currentRole ? roles.includes(user.currentRole) : false;
}

/**
 * Get user's role display information
 */
export function useRoleInfo() {
  const { user } = useAuth();
  
  const roleDisplayNames: { [key: string]: string } = {
    admin: 'System Administrator',
    state: 'State Officer',
    district: 'District Officer', 
    field: 'Field Officer',
    ngo: 'NGO Partner',
    public: 'Public User'
  };

  const roleColors: { [key: string]: string } = {
    admin: 'bg-red-100 text-red-800 border-red-200',
    state: 'bg-blue-100 text-blue-800 border-blue-200',
    district: 'bg-green-100 text-green-800 border-green-200',
    field: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    ngo: 'bg-purple-100 text-purple-800 border-purple-200',
    public: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return {
    displayName: roleDisplayNames[user?.currentRole || 'public'] || 'Unknown Role',
    colorClass: roleColors[user?.currentRole || 'public'] || 'bg-gray-100 text-gray-800',
    permissions: user?.permissions || [],
    role: user?.currentRole || 'public'
  };
}