"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash2, Eye, UserPlus, Users, Settings, Ban, CheckCircle } from "lucide-react"

interface ActionDropdownProps {
  onEdit?: () => void
  onDelete?: () => void
  onView?: () => void
  onPromote?: () => void
  onManageMembers?: () => void
  onToggleStatus?: () => void
  onSettings?: () => void
  isActive?: boolean
  type?: "user" | "team" | "challenge" | "content"
}

export function ActionDropdown({
  onEdit,
  onDelete,
  onView,
  onPromote,
  onManageMembers,
  onToggleStatus,
  onSettings,
  isActive = true,
  type = "user",
}: ActionDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
        )}

        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit {type === "user" ? "User" : type === "team" ? "Team" : type === "challenge" ? "Challenge" : "Content"}
          </DropdownMenuItem>
        )}

        {type === "user" && onPromote && (
          <DropdownMenuItem onClick={onPromote}>
            <UserPlus className="h-4 w-4 mr-2" />
            Promote to Admin
          </DropdownMenuItem>
        )}

        {type === "team" && onManageMembers && (
          <DropdownMenuItem onClick={onManageMembers}>
            <Users className="h-4 w-4 mr-2" />
            Manage Members
          </DropdownMenuItem>
        )}

        {onToggleStatus && (
          <DropdownMenuItem onClick={onToggleStatus}>
            {isActive ? (
              <>
                <Ban className="h-4 w-4 mr-2" />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Activate
              </>
            )}
          </DropdownMenuItem>
        )}

        {onSettings && (
          <DropdownMenuItem onClick={onSettings}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
