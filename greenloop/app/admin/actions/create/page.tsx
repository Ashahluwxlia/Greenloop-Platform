"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Plus, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function CreateActionPage() {
  const [user, setUser] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructions: "",
    category_id: "",
    points_value: "",
    co2_impact: "",
    difficulty_level: "1",
    estimated_time_minutes: "",
    verification_required: false,
    is_active: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData?.user) {
          router.push("/auth/login")
          return
        }

        // Get user profile and check admin status
        const { data: userProfile } = await supabase.from("users").select("*").eq("id", userData.user.id).single()

        if (!userProfile?.is_admin) {
          router.push("/dashboard")
          return
        }

        setUser(userProfile)

        // Get action categories
        const { data: categoriesData } = await supabase
          .from("action_categories")
          .select("*")
          .eq("is_active", true)
          .order("name")
        setCategories(categoriesData || [])
      } catch (err) {
        setError("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Validate required fields
      if (
        !formData.title ||
        !formData.description ||
        !formData.category_id ||
        !formData.points_value ||
        !formData.co2_impact
      ) {
        throw new Error("Please fill in all required fields")
      }

      const actionData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        instructions: formData.instructions.trim() || null,
        category_id: formData.category_id,
        points_value: Number.parseInt(formData.points_value),
        co2_impact: Number.parseFloat(formData.co2_impact),
        difficulty_level: Number.parseInt(formData.difficulty_level),
        estimated_time_minutes: formData.estimated_time_minutes
          ? Number.parseInt(formData.estimated_time_minutes)
          : null,
        verification_required: formData.verification_required,
        is_active: formData.is_active,
        created_by: user.id,
      }

      const { error: insertError } = await supabase.from("sustainability_actions").insert([actionData])

      if (insertError) throw insertError

      setSuccess(true)

      // Redirect after success
      setTimeout(() => {
        router.push("/admin")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to create action")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto p-3 bg-green-100 rounded-full w-fit mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">Action Created Successfully!</CardTitle>
                <CardDescription>
                  The new sustainability action has been added to the platform and is now available for users.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/admin">Return to Admin Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Dashboard
            </Link>
          </Button>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Plus className="h-8 w-8 text-primary" />
              Create Sustainability Action
            </h1>
            <p className="text-muted-foreground">
              Add a new sustainability action that users can complete to earn points and reduce their environmental
              impact.
            </p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Action Details</CardTitle>
              <CardDescription>Fill in the information for the new sustainability action</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      placeholder="e.g., Switch to LED Bulbs"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Brief description of the action and its environmental benefits"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">Instructions (Optional)</Label>
                    <Textarea
                      id="instructions"
                      value={formData.instructions}
                      onChange={(e) => handleInputChange("instructions", e.target.value)}
                      placeholder="Detailed step-by-step instructions for completing this action"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => handleInputChange("category_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Impact & Difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="points">
                      Points Value <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="points"
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.points_value}
                      onChange={(e) => handleInputChange("points_value", e.target.value)}
                      placeholder="50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="co2">
                      CO₂ Impact (kg) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="co2"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.co2_impact}
                      onChange={(e) => handleInputChange("co2_impact", e.target.value)}
                      placeholder="2.5"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select
                      value={formData.difficulty_level}
                      onValueChange={(value) => handleInputChange("difficulty_level", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 - Very Easy</SelectItem>
                        <SelectItem value="2">Level 2 - Easy</SelectItem>
                        <SelectItem value="3">Level 3 - Medium</SelectItem>
                        <SelectItem value="4">Level 4 - Hard</SelectItem>
                        <SelectItem value="5">Level 5 - Very Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Estimated Time (minutes)</Label>
                    <Input
                      id="time"
                      type="number"
                      min="1"
                      value={formData.estimated_time_minutes}
                      onChange={(e) => handleInputChange("estimated_time_minutes", e.target.value)}
                      placeholder="15"
                    />
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="verification">Requires Verification</Label>
                      <p className="text-sm text-muted-foreground">
                        Actions requiring verification need admin approval before points are awarded
                      </p>
                    </div>
                    <Switch
                      id="verification"
                      checked={formData.verification_required}
                      onCheckedChange={(checked) => handleInputChange("verification_required", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="active">Active</Label>
                      <p className="text-sm text-muted-foreground">Only active actions are visible to users</p>
                    </div>
                    <Switch
                      id="active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? "Creating Action..." : "Create Action"}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/admin">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
