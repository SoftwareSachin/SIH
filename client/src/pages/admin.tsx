import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, UserPlus, UserMinus, Eye, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isActive: boolean;
}

interface UserWithRoles {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  state?: string;
  district?: string;
  roleAssignments: Array<{
    id: string;
    roleId: string;
    assignedAt: string;
    expiresAt?: string;
    isActive: boolean;
    notes?: string;
    role: Role;
  }>;
}

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [assignmentNotes, setAssignmentNotes] = useState<string>("");

  // Fetch all roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
  });

  // Fetch all users with roles
  const { data: users = [], isLoading: usersLoading } = useQuery<UserWithRoles[]>({
    queryKey: ["/api/admin/users"],
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, notes }: { userId: string; roleId: string; notes?: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/roles`, { roleId, notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role Assigned",
        description: "User role has been successfully assigned.",
      });
      setSelectedUserId("");
      setSelectedRoleId("");
      setAssignmentNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}/roles/${roleId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role Removed",
        description: "User role has been successfully removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove role",
        variant: "destructive",
      });
    },
  });

  const handleAssignRole = () => {
    if (!selectedUserId || !selectedRoleId) {
      toast({
        title: "Selection Required",
        description: "Please select both a user and a role",
        variant: "destructive",
      });
      return;
    }

    assignRoleMutation.mutate({
      userId: selectedUserId,
      roleId: selectedRoleId,
      notes: assignmentNotes || undefined,
    });
  };

  const handleRemoveRole = (userId: string, roleId: string) => {
    removeRoleMutation.mutate({ userId, roleId });
  };

  const getRoleColor = (roleName: string) => {
    const colors: { [key: string]: string } = {
      admin: "bg-red-100 text-red-800",
      state: "bg-blue-100 text-blue-800",
      district: "bg-green-100 text-green-800",
      field: "bg-yellow-100 text-yellow-800",
      ngo: "bg-purple-100 text-purple-800",
      public: "bg-gray-100 text-gray-800",
    };
    return colors[roleName] || "bg-gray-100 text-gray-800";
  };

  if (rolesLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" data-testid="admin-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              Role-Based Access Control
            </h1>
          </div>
          <p className="text-gray-600" data-testid="page-description">
            Manage user roles and permissions for the FRA Atlas system
          </p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users & Assignments
            </TabsTrigger>
            <TabsTrigger value="roles" data-testid="tab-roles">
              <Shield className="h-4 w-4 mr-2" />
              Roles & Permissions
            </TabsTrigger>
            <TabsTrigger value="assign" data-testid="tab-assign">
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="users-card-title">System Users</CardTitle>
                <CardDescription>
                  View all users and their current role assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`user-card-${user.id}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h4 className="font-medium text-gray-900" data-testid={`user-name-${user.id}`}>
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user.email
                              }
                            </h4>
                            <p className="text-sm text-gray-500" data-testid={`user-email-${user.id}`}>{user.email}</p>
                            {(user.state || user.district) && (
                              <p className="text-sm text-gray-500" data-testid={`user-location-${user.id}`}>
                                {user.state}{user.district ? ` - ${user.district}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {user.roleAssignments
                            .filter(assignment => assignment.isActive)
                            .map((assignment) => (
                              <div key={assignment.id} className="flex items-center gap-2">
                                <Badge 
                                  className={getRoleColor(assignment.role.name)}
                                  data-testid={`role-badge-${user.id}-${assignment.role.name}`}
                                >
                                  {assignment.role.displayName}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemoveRole(user.id, assignment.roleId)}
                                  disabled={removeRoleMutation.isPending}
                                  data-testid={`remove-role-${user.id}-${assignment.role.name}`}
                                >
                                  <UserMinus className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map((role) => (
                <Card key={role.id} data-testid={`role-card-${role.name}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge className={getRoleColor(role.name)}>
                        {role.displayName}
                      </Badge>
                    </CardTitle>
                    <CardDescription data-testid={`role-description-${role.name}`}>
                      {role.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-sm text-gray-700 mb-2">Permissions:</h5>
                        <div className="space-y-1">
                          {role.permissions.map((permission) => (
                            <div 
                              key={permission} 
                              className="text-xs bg-gray-100 px-2 py-1 rounded"
                              data-testid={`permission-${role.name}-${permission}`}
                            >
                              {permission.replace(/_/g, ' ').toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assign" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="assign-role-title">Assign Role to User</CardTitle>
                <CardDescription>
                  Grant or modify user permissions by assigning roles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="user-select">Select User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger data-testid="select-user">
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id} data-testid={`user-option-${user.id}`}>
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName} (${user.email})`
                              : user.email
                            }
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="role-select">Select Role</Label>
                    <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id} data-testid={`role-option-${role.name}`}>
                            {role.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="assignment-notes">Assignment Notes (Optional)</Label>
                  <Input
                    id="assignment-notes"
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder="Add notes about this role assignment"
                    data-testid="input-assignment-notes"
                  />
                </div>

                <Button
                  onClick={handleAssignRole}
                  disabled={assignRoleMutation.isPending || !selectedUserId || !selectedRoleId}
                  className="w-full"
                  data-testid="button-assign-role"
                >
                  {assignRoleMutation.isPending ? "Assigning..." : "Assign Role"}
                </Button>

                {selectedUserId && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Current Roles for Selected User:</h5>
                    <div className="flex gap-2 flex-wrap">
                      {users
                        .find(u => u.id === selectedUserId)
                        ?.roleAssignments
                        .filter(assignment => assignment.isActive)
                        .map((assignment) => (
                          <Badge 
                            key={assignment.id}
                            className={getRoleColor(assignment.role.name)}
                            data-testid={`current-role-${assignment.role.name}`}
                          >
                            {assignment.role.displayName}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <strong>Role Hierarchy:</strong> Admin &gt; State Officer &gt; District Officer &gt; Field Officer &gt; NGO Partner &gt; Public User
              <br />
              <strong>Security Note:</strong> Role changes are audited and logged for security compliance.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}