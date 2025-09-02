import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import type { User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User & { currentRole?: string; permissions?: string[] };
}

export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'public'
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // For development, allow bypass with simulated admin user
    if (process.env.NODE_ENV === 'development' && req.headers['x-dev-bypass'] === 'true') {
      // Create a mock admin user for development testing
      req.user = {
        id: 'dev-admin-001',
        email: 'admin@fraatlas.gov',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        state: null,
        district: null,
        password: null,
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        currentRole: 'admin',
        permissions: [
          'view_all_claims', 'approve_claims', 'reject_claims', 'upload_documents',
          'verify_documents', 'manage_users', 'manage_system_settings', 'view_public_maps',
          'export_data', 'generate_reports', 'access_admin_panel', 'access_ai_processing', 'access_dss_engine'
        ]
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Get user with roles and permissions
    const user = await storage.getUserWithRoles(payload.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Get user's permissions
    const activeRoles = user.roleAssignments.filter(
      (assignment: any) => assignment.isActive && (!assignment.expiresAt || new Date(assignment.expiresAt) > new Date())
    );

    if (activeRoles.length === 0) {
      // Default to public role if no active roles
      req.user = {
        ...user,
        currentRole: 'public',
        permissions: ['view_public_maps']
      };
    } else {
      // Use the most privileged role
      const roleOrder: { [key: string]: number } = { admin: 0, state: 1, district: 2, field: 3, ngo: 4, public: 5 };
      const primaryRole = activeRoles.sort((a: any, b: any) => {
        return roleOrder[a.role.name] - roleOrder[b.role.name];
      })[0];

      req.user = {
        ...user,
        currentRole: primaryRole.role.name,
        permissions: primaryRole.role.permissions as string[]
      };
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

export const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.currentRole !== role && req.user.currentRole !== 'admin') {
      return res.status(403).json({ message: `${role} role required` });
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Admin users have access to everything
    if (req.user.currentRole === 'admin') {
      return next();
    }

    if (!req.user.permissions?.includes(permission)) {
      return res.status(403).json({ message: `Permission '${permission}' required` });
    }

    next();
  };
};

export const requireAnyRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.currentRole!) && req.user.currentRole !== 'admin') {
      return res.status(403).json({ message: `One of these roles required: ${roles.join(', ')}` });
    }

    next();
  };
};

export const requireAnyPermission = (permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Admin users have access to everything
    if (req.user.currentRole === 'admin') {
      return next();
    }

    const hasPermission = permissions.some(permission => req.user!.permissions?.includes(permission));
    if (!hasPermission) {
      return res.status(403).json({ message: `One of these permissions required: ${permissions.join(', ')}` });
    }

    next();
  };
};