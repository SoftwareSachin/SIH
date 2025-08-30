import type { Request, RequestHandler } from "express";
import { storage } from "./storage";

export interface AuthenticatedRequest extends Request {
  user?: {
    claims?: {
      sub: string;
      email: string;
      first_name?: string;
      last_name?: string;
      profile_image_url?: string;
    };
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };
  userRole?: string;
  userPermissions?: string[];
  userState?: string;
  userDistrict?: string;
}

export interface UserContext {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  state?: string;
  district?: string;
}

/**
 * Enhanced authentication middleware that loads user role and permissions
 */
export const loadUserContext: RequestHandler = async (req: AuthenticatedRequest, res, next) => {
  try {
    // For development, allow bypass
    if (process.env.NODE_ENV === 'development' && req.headers['x-dev-bypass'] === 'true') {
      // Allow development access with admin permissions for testing
      req.userRole = 'admin';
      req.userPermissions = [
        'view_all_claims', 'approve_claims', 'reject_claims', 'upload_documents',
        'verify_documents', 'manage_users', 'manage_system_settings', 'view_public_maps',
        'export_data', 'generate_reports', 'access_admin_panel', 'access_ai_processing', 'access_dss_engine'
      ];
      return next();
    }

    if (!req.isAuthenticated() || !req.user?.claims?.sub) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Get user's active role assignments
    const userWithRoles = await storage.getUserWithRoles(userId);
    
    if (!userWithRoles || userWithRoles.roleAssignments.length === 0) {
      // Default to public role if no roles assigned
      req.userRole = 'public';
      req.userPermissions = ['view_public_maps'];
      req.userState = user.state || undefined;
      req.userDistrict = user.district || undefined;
    } else {
      // Use the primary active role (most privileged)
      const primaryRole = userWithRoles.roleAssignments
        .filter((assignment: any) => assignment.isActive && (!assignment.expiresAt || new Date(assignment.expiresAt) > new Date()))
        .sort((a: any, b: any) => {
          const roleOrder: { [key: string]: number } = { admin: 0, state: 1, district: 2, field: 3, ngo: 4, public: 5 };
          return roleOrder[a.role.name] - roleOrder[b.role.name];
        })[0];

      if (!primaryRole) {
        req.userRole = 'public';
        req.userPermissions = ['view_public_maps'];
      } else {
        req.userRole = primaryRole.role.name;
        req.userPermissions = primaryRole.role.permissions as string[];
        req.userState = user.state || undefined;
        req.userDistrict = user.district || undefined;
      }
    }

    next();
  } catch (error) {
    console.error('Error loading user context:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Role-based authorization middleware
 */
export function requireRole(...allowedRoles: string[]): RequestHandler {
  return (req: AuthenticatedRequest, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        required: allowedRoles,
        current: req.userRole
      });
    }

    next();
  };
}

/**
 * Permission-based authorization middleware
 */
export function requirePermission(...requiredPermissions: string[]): RequestHandler {
  return (req: AuthenticatedRequest, res, next) => {
    if (!req.userPermissions) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const hasAllPermissions = requiredPermissions.every(permission => 
      req.userPermissions!.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        required: requiredPermissions,
        current: req.userPermissions
      });
    }

    next();
  };
}

/**
 * Geographic access control middleware
 */
export function requireGeographicAccess(level: 'state' | 'district'): RequestHandler {
  return (req: AuthenticatedRequest, res, next) => {
    // Admin has access to everything
    if (req.userRole === 'admin') {
      return next();
    }

    if (level === 'state') {
      const requestedState = (req.params as any).stateId || (req.body as any).stateId || (req.query as any).stateId;
      
      if (req.userRole === 'state' && req.userState !== requestedState) {
        return res.status(403).json({ 
          message: "Access denied: You can only access data for your assigned state",
          userState: req.userState,
          requestedState
        });
      }
    }

    if (level === 'district') {
      const requestedDistrict = (req.params as any).districtId || (req.body as any).districtId || (req.query as any).districtId;
      
      if ((req.userRole === 'district' || req.userRole === 'field') && req.userDistrict !== requestedDistrict) {
        return res.status(403).json({ 
          message: "Access denied: You can only access data for your assigned district",
          userDistrict: req.userDistrict,
          requestedDistrict
        });
      }
    }

    next();
  };
}

/**
 * Audit logging middleware
 */
export function auditAction(action: string, entityType: string): RequestHandler {
  return async (req: AuthenticatedRequest, res, next) => {
    const originalSend = res.json;
    
    res.json = function(data: any) {
      // Log successful operations
      if (res.statusCode < 400 && req.user?.claims?.sub) {
        setImmediate(async () => {
          try {
            await storage.createAuditTrail({
              entityType,
              entityId: (req.params as any).id || data?.id || 'unknown',
              action,
              userId: req.user!.claims!.sub,
              oldValues: (req.body as any)?.oldValues || null,
              newValues: req.body || data || null,
              notes: `${action} performed via API by ${req.userRole} user`
            });
          } catch (error) {
            console.error('Audit logging failed:', error);
          }
        });
      }
      
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Helper to get user context from request
 */
export function getUserContext(req: AuthenticatedRequest): UserContext | null {
  if (!req.user?.claims?.sub || !req.userRole || !req.userPermissions) {
    return null;
  }

  return {
    id: req.user.claims.sub,
    email: req.user.claims.email,
    role: req.userRole,
    permissions: req.userPermissions,
    state: req.userState,
    district: req.userDistrict
  };
}

/**
 * Check if user has specific permission
 */
export function hasPermission(req: AuthenticatedRequest, permission: string): boolean {
  return req.userPermissions?.includes(permission) || false;
}

/**
 * Check if user can access specific geographic area
 */
export function canAccessState(req: AuthenticatedRequest, stateId: string): boolean {
  if (req.userRole === 'admin') return true;
  if (req.userRole === 'state') return req.userState === stateId;
  return false;
}

export function canAccessDistrict(req: AuthenticatedRequest, districtId: string): boolean {
  if (req.userRole === 'admin') return true;
  if (req.userRole === 'district' || req.userRole === 'field') return req.userDistrict === districtId;
  return false;
}