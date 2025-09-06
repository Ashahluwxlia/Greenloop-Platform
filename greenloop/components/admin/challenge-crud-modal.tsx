"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Challenge {
  id?: string
  title: string
  description: string
  category: string
  challenge_type: string
  start_date: string
  end_date: string
  target_metric?: string
  target_value?: number
  reward_points?: number
  max_participants?: number
  is_active: boolean
}

interface ChallengeCrudModalProps {
  isOpen: boolean
  onClose: () => void
  challenge?: Challenge | null
  onSuccess: () => void
  currentAdminId?: string
}

export function ChallengeCrudModal({ isOpen, onClose, challenge, onSuccess, currentAdminId }: ChallengeCrudModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Challenge>({
    title: challenge?.title || "",
    description: challenge?.description || "",
    category: challenge?.category || "",
    challenge_type: challenge?.challenge_type || "individual",
    start_date: challenge?.start_date || new Date().toISOString().split("T")[0],
    end_date: challenge?.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    target_metric: challenge?.target_metric || "",
    target_value: challenge?.target_value || 0,
    reward_points: challenge?.reward_points || 10,
    max_participants: challenge?.max_participants || undefined,
    is_active: challenge?.is_active ?? true,
  })

  const { toast } = useToast()
  const supabase = createClient()

  const logAdminActivity = async (action: string, targetId: string, details: any) => {
    if (!currentAdminId) return

    try {
      await supabase.rpc("log_admin_activity", {
        p_admin_user_id: currentAdminId,
        p_action: action,
        p_resource_type: "challenges",
        p_resource_id: targetId,
        p_details: details,
      })
    } catch (error) {
      console.error("Failed to log admin activity:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const challengeData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        challenge_type: formData.challenge_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        target_metric: formData.target_metric,
        target_value: formData.target_value,
        reward_points: formData.reward_points,
        max_participants: formData.max_participants,
        is_active: formData.is_active,
      }

      if (challenge?.id) {
        // Update existing challenge
        const { error } = await supabase.from("challenges").update(challengeData).eq("id", challenge.id)

        if (error) throw error

        await logAdminActivity("challenge_updated", challenge.id, {
          title: formData.title,
          challenge_type: formData.challenge_type,
          is_active: formData.is_active,
        })

        toast({
          title: "Success",
          description: "Challenge updated successfully",
        })
      } else {
        // Create new challenge
        const { data: userData } = await supabase.auth.getUser()
        const { data, error } = await supabase
          .from("challenges")
          .insert([
            {
              ...challengeData,
              created_by: currentAdminId || userData.user?.id,
            },
          ])
          .select()
          .single()

        if (error) throw error

        if (data) {
          await logAdminActivity("challenge_created", data.id, {
            title: formData.title,
            challenge_type: formData.challenge_type,
            category: formData.category,
          })
        }

        toast({
          title: "Success",
          description: "Challenge created successfully",
        })
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!challenge?.id) return

    setLoading(true)
    try {
      const { error } = await supabase.from("challenges").delete().eq("id", challenge.id)

      if (error) throw error

      await logAdminActivity("challenge_deleted", challenge.id, {
        title: challenge.title,
        challenge_type: challenge.challenge_type,
      })

      toast({
        title: "Success",
        description: "Challenge deleted successfully",
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete challenge",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{challenge?.id ? "Edit Challenge" : "Create New Challenge"}</DialogTitle>
          <DialogDescription>
            {challenge?.id
              ? "Update challenge information and settings."
              : "Create a new sustainability challenge for users."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Challenge Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Energy">Energy</SelectItem>
                  <SelectItem value="Transportation">Transportation</SelectItem>
                  <SelectItem value="Waste">Waste</SelectItem>
                  <SelectItem value="Water">Water</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="challenge_type">Type</Label>
              <Select
                value={formData.challenge_type}
                onValueChange={(value) => setFormData({ ...formData, challenge_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="company">Company-wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_metric">Target Metric</Label>
              <Input
                id="target_metric"
                value={formData.target_metric || ""}
                onChange={(e) => setFormData({ ...formData, target_metric: e.target.value })}
                placeholder="e.g., steps, kg CO2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_value">Target Value</Label>
              <Input
                id="target_value"
                type="number"
                min="0"
                value={formData.target_value || ""}
                onChange={(e) => setFormData({ ...formData, target_value: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward_points">Reward Points</Label>
              <Input
                id="reward_points"
                type="number"
                min="0"
                value={formData.reward_points || 10}
                onChange={(e) => setFormData({ ...formData, reward_points: Number(e.target.value) || 10 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_participants">Maximum Participants (Optional)</Label>
            <Input
              id="max_participants"
              type="number"
              min="1"
              value={formData.max_participants || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_participants: e.target.value ? Number.parseInt(e.target.value) : undefined,
                })
              }
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="is_active">Active Status</Label>
              <p className="text-sm text-muted-foreground">Challenge is active and accepting participants</p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <DialogFooter className="gap-2">
            {challenge?.id && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : challenge?.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
