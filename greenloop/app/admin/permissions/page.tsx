"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { PermissionCrudModal } from "@/components/admin/permission-crud-modal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Shield, Search, Plus, MoreHorizontal, Calendar, User, Settings, Activity, AlertTriangle } from "lucide-react"

interface AdminUser {
  id: string
  first_name: string
  last_name: string
  email: string
  department: string
  is_admin: boolean
  is_active: boolean
  last_login: string
  created_at: string
}

interface Permission {
  id: string
  user_id: string
  permission_type: string
  granted_by: string
  granted_at: string
  expires_at?: string
  is_active: boolean
}

export default function AdminPermissionsPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [adminLogs, setAdminLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<any>(null)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create")

  const { toast } = useToast()
  const supabase = createClient()

  const loadData = async () => {
    try {
      // Check authentication
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData?.user) {
        window.location.href = "/auth/login"
        return
      }

      // Check if user is admin
      const { data: profile } = await supabase.from("users").select("*").eq("id", authData.user.id).single()

      if (!profile?.is_admin) {
        window.location.href = "/dashboard"
        return
      }

      setUserProfile(profile)

      // Get all admin users
      const { data: adminUsersData } = await supabase
        .from("users")
        .select("*")
        .eq("is_admin", true)
        .order("created_at", { ascending: false })

      setAdminUsers(adminUsersData || [])

      // Get all users for potential admin promotion
      const { data: allUsersData } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, department, is_admin, is_active, created_at, last_login")
        .order("created_at", { ascending: false })
        .limit(50)

      setAllUsers(allUsersData || [])

      const { data: permissionsData } = await supabase
        .from("admin_permissions")
        .select(`
          *,
          users!admin_permissions_user_id_fkey (first_name, last_name, email),
          granted_by_user:users!admin_permissions_granted_by_fkey (first_name, last_name)
        `)
        .order("granted_at", { ascending: false })

      setPermissions(permissionsData || [])

      const { data: adminLogsData } = await supabase
        .from("admin_audit_log")
        .select(`
          *,
          users!admin_audit_log_admin_user_id_fkey (first_name, last_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100)

      setAdminLogs(adminLogsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGrantPermission = () => {
    setSelectedPermission(null)
    setModalMode("create")
    setModalOpen(true)
  }

  const handleEditPermission = (permission: any) => {
    setSelectedPermission(permission)
    setModalMode("edit")
    setModalOpen(true)
  }

  const handleViewPermission = (permission: any) => {
    setSelectedPermission(permission)
    setModalMode("view")
    setModalOpen(true)
  }

  const handleToggleAdminStatus = async (user: AdminUser) => {
    try {
      const { error } = await supabase.from("users").update({ is_admin: !user.is_admin }).eq("id", user.id)

      if (error) throw error

      toast({
        title: "Success",
        description: `Admin privileges ${user.is_admin ? "revoked" : "granted"} successfully`,
      })

      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      })
    }
  }

  const handleSavePermission = async (permissionData: any) => {
    // This will be handled by the PermissionCrudModal
    loadData()
  }

  const availableUsers = allUsers
    .filter((user) => !user.is_admin)
    .map((user) => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
    }))

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
                <main className="flex-1 p-8">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
  
      <main className="flex-1 p-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                Admin Permissions
              </h1>
              <p className="text-muted-foreground">
                Manage administrator roles, permissions, and access controls across the platform.
              </p>
            </div>
            <Button onClick={handleGrantPermission}>
              <Plus className="h-4 w-4 mr-2" />
              Grant Permission
            </Button>
          </div>

          {/* Permission Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminUsers?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Active administrator accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Permissions</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{permissions.filter((p) => p.is_active).length}</div>
                <p className="text-xs text-muted-foreground">Currently active permissions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminLogs?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Admin actions logged</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No security issues</p>
              </CardContent>
            </Card>
          </div>

          {/* Permissions Tabs */}
          <Tabs defaultValue="admins" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="admins">Current Admins</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="users">Manage Users</TabsTrigger>
              <TabsTrigger value="activity">Activity Logs</TabsTrigger>
            </TabsList>

            {/* Current Admins Tab */}
            <TabsContent value="admins" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Administrator Accounts ({adminUsers?.length || 0})</CardTitle>
                  <CardDescription>Users with administrative privileges and their access levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Administrator</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Role Level</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminUsers?.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={`/abstract-geometric-shapes.png?key=o2uir&height=40&width=40&query=${admin.first_name}+${admin.last_name}`}
                                />
                                <AvatarFallback>
                                  {admin.first_name?.[0]}
                                  {admin.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {admin.first_name} {admin.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">{admin.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{admin.department || "Not Set"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">{admin.id === userProfile.id ? "Super Admin" : "Admin"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {admin.last_login ? new Date(admin.last_login).toLocaleDateString() : "Never"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={admin.is_active ? "default" : "secondary"}>
                              {admin.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" disabled={admin.id === userProfile.id}>
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" disabled={admin.id === userProfile.id}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Permissions ({permissions.length})</CardTitle>
                  <CardDescription>Detailed permissions granted to administrators</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Permission</TableHead>
                        <TableHead>Granted By</TableHead>
                        <TableHead>Granted Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.map((permission: any) => (
                        <TableRow key={permission.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {permission.users?.first_name} {permission.users?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{permission.users?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {permission.permission_type
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {permission.granted_by_user?.first_name} {permission.granted_by_user?.last_name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {new Date(permission.granted_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={permission.is_active ? "default" : "secondary"}>
                              {permission.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewPermission(permission)}>
                                View
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditPermission(permission)}>
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manage Users Tab */}
            <TabsContent value="users" className="space-y-6">
              {/* Search Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Grant Admin Access</CardTitle>
                  <CardDescription>Search and promote users to administrator roles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search users by name or email..." className="pl-10" />
                    </div>
                    <Button variant="outline">Filter</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Users Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Platform Users</CardTitle>
                  <CardDescription>Manage user permissions and admin access</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Join Date</TableHead>
                        <TableHead>Admin Access</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers?.slice(0, 10).map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {user.first_name?.[0]}
                                  {user.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {user.department || "Not Set"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={user.is_admin}
                              disabled={user.id === userProfile.id}
                              onCheckedChange={() => handleToggleAdminStatus(user)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Logs Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Activity Logs</CardTitle>
                  <CardDescription>Track administrative actions and system changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {adminLogs?.length ? (
                      adminLogs.slice(0, 20).map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                              <Activity className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {log.users?.first_name} {log.users?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{log.action_type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-xs">
                              {log.target_table || "System"}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(log.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No admin activity logs found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Administrative actions will appear here once audit logging is enabled
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <PermissionCrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePermission}
        permission={selectedPermission}
        mode={modalMode}
        availableUsers={availableUsers}
        currentAdminId={userProfile?.id}
      />
    </div>
  )
}
