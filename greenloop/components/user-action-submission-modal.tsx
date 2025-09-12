"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Plus, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Category {
  id: string
  name: string
  color: string
}

interface UserActionSubmissionModalProps {
  onSubmissionSuccess?: () => void
}

export function UserActionSubmissionModal({ onSubmissionSuccess }: UserActionSubmissionModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    categoryId: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")

  const supabase = createClient()

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from("action_categories")
        .select("id, name, color")
        .eq("is_active", true)
        .order("name")

      setCategories(data || [])
    }

    if (isOpen) {
      loadCategories()
    }
  }, [isOpen, supabase])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setErrors((prev) => ({ ...prev, photo: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }
    if (!formData.categoryId) {
      newErrors.categoryId = "Category is required"
    }
    if (!photoFile) {
      newErrors.photo = "Photo proof is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        throw new Error("User not authenticated")
      }

      // Upload photo to storage
      let photoUrl = ""
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop()
        const fileName = `${userData.user.id}-${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("action-photos")
          .upload(fileName, photoFile)

        if (uploadError) {
          throw new Error("Failed to upload photo")
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("action-photos").getPublicUrl(uploadData.path)

        photoUrl = publicUrl
      }

      // Create the action submission
      const { error: actionError } = await supabase.from("sustainability_actions").insert({
        title: formData.title.trim(),
        description: formData.description.trim(),
        instructions: formData.instructions.trim() || null,
        category_id: formData.categoryId,
        points_value: 0, // Will be set by admin
        co2_impact: 0, // Will be set by admin
        difficulty_level: 1,
        estimated_time_minutes: null,
        verification_required: true,
        is_active: false, // Inactive until approved
        is_user_created: true,
        submitted_by: userData.user.id,
      })

      if (actionError) {
        throw new Error("Failed to submit action")
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        instructions: "",
        categoryId: "",
      })
      setPhotoFile(null)
      setPhotoPreview(null)
      setErrors({})
      setSubmitStatus("success")

      // Close modal after short delay
      setTimeout(() => {
        setIsOpen(false)
        setSubmitStatus("idle")
        onSubmissionSuccess?.()
      }, 2000)
    } catch (error) {
      console.error("Submission error:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetModal = () => {
    setFormData({
      title: "",
      description: "",
      instructions: "",
      categoryId: "",
    })
    setPhotoFile(null)
    setPhotoPreview(null)
    setErrors({})
    setSubmitStatus("idle")
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          resetModal()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Submit Action
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit New Sustainability Action</DialogTitle>
          <DialogDescription>
            Propose a new sustainability action for others to complete. Admin will review and approve your submission.
          </DialogDescription>
        </DialogHeader>

        {submitStatus === "success" && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Action submitted successfully! It will be reviewed by an admin.
            </AlertDescription>
          </Alert>
        )}

        {submitStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to submit action. Please try again.</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Switch to LED Bulbs"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the action and its environmental benefits"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className={errors.description ? "border-red-500" : ""}
              rows={3}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              placeholder="Detailed step-by-step instructions for completing this action"
              value={formData.instructions}
              onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, categoryId: value }))}
            >
              <SelectTrigger className={errors.categoryId ? "border-red-500" : ""}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && <p className="text-sm text-red-500">{errors.categoryId}</p>}
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="photo">Photo Proof *</Label>
            <Card className={`border-dashed ${errors.photo ? "border-red-500" : "border-muted-foreground/25"}`}>
              <CardContent className="pt-6">
                {photoPreview ? (
                  <div className="space-y-4">
                    <img
                      src={photoPreview || "/placeholder.svg"}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPhotoFile(null)
                        setPhotoPreview(null)
                      }}
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Upload a photo as proof of your action</p>
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            {errors.photo && <p className="text-sm text-red-500">{errors.photo}</p>}
          </div>

          {/* Points Note */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Admin will decide how many points this action should get based on its environmental
              impact and difficulty.
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Action"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
