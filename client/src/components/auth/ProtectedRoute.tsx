import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
  requiredPermission?: string;
  requiredPermissions?: string[];
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredRoles, 
  requiredPermission, 
  requiredPermissions 
}: ProtectedRouteProps) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, hasRole, hasPermission, hasAnyRole } = useAuth();

  // Removed automatic redirect - let users access as guest

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  // Allow anonymous access - users can continue as guest

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You need the <strong>{requiredRole}</strong> role to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You need one of these roles to access this page: <strong>{requiredRoles.join(', ')}</strong>
          </p>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Insufficient Permissions</h2>
          <p className="text-gray-600 mb-4">
            You need the <strong>{requiredPermission.replace(/_/g, ' ')}</strong> permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (requiredPermissions && !requiredPermissions.every(perm => hasPermission(perm))) {
    const missingPermissions = requiredPermissions.filter(perm => !hasPermission(perm));
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Insufficient Permissions</h2>
          <p className="text-gray-600 mb-4">
            You need these permissions to access this page:
          </p>
          <ul className="text-gray-600">
            {missingPermissions.map(perm => (
              <li key={perm}><strong>{perm.replace(/_/g, ' ')}</strong></li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}