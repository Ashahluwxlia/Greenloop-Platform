"use client"

import { useState, useEffect } from "react"
import { Plus, Search, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface AddMemberModalProps {
  teamId: string
}

export function AddMemberModal({ teamId }: AddMemberModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadAvailableUsers()
    }
  }, [open])

  const loadAvailableUsers = async () => {
    try {
      // Get users who are not already in this team
      const { data: existingMembers } = await supabase.from("team_members").select("user_id").eq("team_id", teamId)

      const existingMemberIds = existingMembers?.map((m) => m.user_id) || []

      // Get team leader
      const { data: team } = await supabase.from("teams").select("team_leader_id").eq("id", teamId).single()

      const excludeIds = [...existingMemberIds]
      if (team?.team_leader_id) {
        excludeIds.push(team.team_leader_id)
      }

      const { data: users } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("is_active", true)
        .not("id", "in", `(${excludeIds.join(",")})`)
        .order("first_name")

      setAvailableUsers(users || [])
    } catch (error) {
      console.error("Failed to load available users:", error)
    }
  }

  const filteredUsers = availableUsers.filter((user) =>
    `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddMember = async () => {
    if (!selectedUser) return

    setLoading(true)
    try {
      const { error } = await supabase.from("team_members").insert([
        {
          team_id: teamId,
          user_id: selectedUser.id,
          joined_at: new Date().toISOString(),
        },
      ])

      if (error) throw error

      toast({
        title: "Success",
        description: `${selectedUser.first_name} ${selectedUser.last_name} has been added to the team`,
      })

      setOpen(false)
      setSelectedUser(null)
      setSearchTerm("")
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add member",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>Search and select a user to add to this team.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.id === user.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {user.first_name[0]}
                      {user.last_name[0]}
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="mx-auto h-12 w-12 mb-4" />
                <p>No available users found</p>
                <p className="text-sm">All active users are already in this team</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddMember} disabled={!selectedUser || loading}>
            {loading ? "Adding..." : "Add Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
