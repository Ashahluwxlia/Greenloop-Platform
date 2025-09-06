"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Permission {
  id?: string
  user_id: string
  user_name?: string
  user_email?: string
  permission_type: string
  granted_by?: string
  granted_at?: string
  expires_at?: string | null
  is_active: boolean
  notes?: string
}

interface PermissionCrudModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (permission: Permission) => void
  permission?: Permission | null
  mode: "create" | "edit" | "view"
  availableUsers?: Array<{ id: string; name: string; email: string }>
  currentAdminId?: string
}

const AVAILABLE_PERMISSIONS = [
  "manage_users",
  "manage_teams",
  "manage_challenges",
  "manage_content",
  "view_analytics",
  "manage_settings",
  "manage_permissions",
  "export_data",
  "moderate_content",
  "send_notifications",
  "system_admin",
  "content_admin",
  "user_admin",
  "team_admin",
]

export function PermissionCrudModal({
  isOpen,
  onClose,
  onSave,
  permission,
  mode,
  availableUsers = [],
  currentAdminId,
}: PermissionCrudModalProps) {
  const [formData, setFormData] = useState<Permission>({
    user_id: permission?.user_id || "",
    user_name: permission?.user_name || "",
    user_email: permission?.user_email || "",
    permission_type: permission?.permission_type || "manage_content",
    expires_at: permission?.expires_at || null,
    is_active: permission?.is_active ?? true,
    notes: permission?.notes || "",
  })

  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const logAdminActivity = async (action: string, targetId: string, details: any) => {
    if (!currentAdminId) return

    try {
      await supabase.rpc("log_admin_activity", {
        p_admin_user_id: currentAdminId,
        p_action: action,
        p_resource_type: "admin_permissions",
        p_resource_id: targetId,
        p_details: details,
      })
    } catch (error) {
      console.error("Failed to log admin activity:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (permission?.id) {
        const { error } = await supabase
          .from("admin_permissions")
          .update({
            permission_type: formData.permission_type,
            expires_at: formData.expires_at,
            is_active: formData.is_active,
          })
          .eq("id", permission.id)

        if (error) throw error

        await logAdminActivity("permission_updated", permission.id, {
          permission_type: formData.permission_type,
          user_id: formData.user_id,
          is_active: formData.is_active,
        })

        toast({
          title: "Success",
          description: "Permission updated successfully",
        })
      } else {
        const { data, error } = await supabase
          .from("admin_permissions")
          .insert([
            {
              user_id: formData.user_id,
              permission_type: formData.permission_type,
              granted_by: currentAdminId,
              expires_at: formData.expires_at,
              is_active: formData.is_active,
            },
          ])
          .select()
          .single()

        if (error) throw error

        if (data) {
          await logAdminActivity("permission_granted", data.id, {
            permission_type: formData.permission_type,
            user_id: formData.user_id,
            granted_to: formData.user_name,
          })
        }

        toast({
          title: "Success",
          description: "Permission granted successfully",
        })
      }

      await onSave(formData)
      onClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserSelect = (userId: string) => {
    const user = availableUsers.find((u) => u.id === userId)
    if (user) {
      setFormData((prev) => ({
        ...prev,
        user_id: userId,
        user_name: user.name,
        user_email: user.email,
      }))
    }
  }

  const isReadOnly = mode === "view"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" && "Grant Admin Permissions"}
            {mode === "edit" && "Edit Admin Permissions"}
            {mode === "view" && "View Admin Permissions"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" && "Grant administrative permissions to a user."}
            {mode === "edit" && "Update user permissions."}
            {mode === "view" && "View user permission details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user">User</Label>
            {mode === "create" ? (
              <Select value={formData.user_id} onValueChange={handleUserSelect} disabled={isReadOnly}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-2 border rounded-md bg-muted">
                <div className="font-medium">{formData.user_name}</div>
                <div className="text-sm text-muted-foreground">{formData.user_email}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="permission_type">Permission Type</Label>
              <Select
                value={formData.permission_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, permission_type: value }))}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PERMISSIONS.map((permission) => (
                    <SelectItem key={permission} value={permission}>
                      {permission.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires_at">Expires At (Optional)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={formData.expires_at || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, expires_at: e.target.value || null }))}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked as boolean }))}
              disabled={isReadOnly}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes about this permission grant"
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          {!isReadOnly && (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : mode === "create" ? (
                  "Grant Permission"
                ) : (
                  "Update Permission"
                )}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
