"use client"
import { useState } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash2, Eye, UserPlus, Users, Settings, Ban, CheckCircle, UserMinus } from "lucide-react"

interface ActionDropdownProps {
  onEdit?: () => void
  onDelete?: () => void
  onView?: () => void
  onPromote?: () => void
  onManageMembers?: () => void
  onToggleStatus?: () => void
  onSettings?: () => void
  isActive?: boolean
  isAdmin?: boolean
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
  isAdmin = false,
  type = "user",
}: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  console.log("ActionDropdown rendered", { type, isAdmin, isActive, isOpen })

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(open) => {
        console.log("Dropdown state changing", { from: isOpen, to: open })
        setIsOpen(open)
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 bg-red-100 hover:bg-red-200 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 border-2 border-red-300"
          onClick={(e) => {
            console.log("Button clicked directly!", e)
            console.log("Current isOpen state:", isOpen)
          }}
        >
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-6 w-6 text-red-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {onView && (
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              console.log("View clicked")
              onView()
              setIsOpen(false)
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
        )}

        {onEdit && (
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              console.log("Edit clicked")
              onEdit()
              setIsOpen(false)
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit {type === "user" ? "User" : type === "team" ? "Team" : type === "challenge" ? "Challenge" : "Content"}
          </DropdownMenuItem>
        )}

        {type === "user" && onPromote && (
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              console.log("Promote/Demote clicked", { isAdmin })
              onPromote()
              setIsOpen(false)
            }}
          >
            {isAdmin ? (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Remove Admin Role
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Promote to Admin
              </>
            )}
          </DropdownMenuItem>
        )}

        {type === "team" && onManageMembers && (
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              onManageMembers()
              setIsOpen(false)
            }}
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Members
          </DropdownMenuItem>
        )}

        {onToggleStatus && (
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              console.log("Toggle status clicked", { isActive })
              onToggleStatus()
              setIsOpen(false)
            }}
          >
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
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              onSettings()
              setIsOpen(false)
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onDelete && (
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              console.log("Delete clicked")
              onDelete()
              setIsOpen(false)
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
