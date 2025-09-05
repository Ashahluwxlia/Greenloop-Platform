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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarIcon, Trophy, Target, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function CreateChallengePage() {
  const [user, setUser] = useState<any>(null)
  const [userTeams, setUserTeams] = useState<any[]>([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    challengeType: "",
    category: "",
    startDate: "",
    endDate: "",
    pointsReward: "",
    targetValue: "",
    maxParticipants: "",
    teamId: "",
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

        // Get user profile
        const { data: userProfile } = await supabase.from("users").select("*").eq("id", userData.user.id).single()
        setUser(userProfile)

        // Get user's teams (for team challenge creation)
        const { data: teams } = await supabase
          .from("team_members")
          .select(`
            teams (id, name)
          `)
          .eq("user_id", userData.user.id)

        setUserTeams(teams?.map((tm) => tm.teams) || [])
      } catch (err) {
        setError("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const getAvailableChallengeTypes = () => {
    const types = [{ value: "individual", label: "Personal Challenge" }]

    // Add team challenges if user is part of any team
    if (userTeams.length > 0) {
      types.push({ value: "team", label: "Team Challenge" })
    }

    // Add company-wide challenges if user is admin
    if (user?.is_admin) {
      types.push({ value: "company", label: "Company-wide Challenge" })
    }

    return types
  }

  const validateForm = () => {
    if (!formData.title.trim()) return "Title is required"
    if (!formData.description.trim()) return "Description is required"
    if (!formData.challengeType) return "Challenge type is required"
    if (!formData.category) return "Category is required"
    if (!formData.startDate) return "Start date is required"
    if (!formData.endDate) return "End date is required"
    if (!formData.pointsReward) return "Points reward is required"
    if (!formData.targetValue) return "Target value is required"

    const startDate = new Date(formData.startDate)
    const endDate = new Date(formData.endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (startDate < today) return "Start date cannot be in the past"
    if (endDate <= startDate) return "End date must be after start date"

    if (formData.challengeType === "team" && !formData.teamId) {
      return "Please select a team for team challenges"
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const challengeData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        challengeType: formData.challengeType,
        category: formData.category,
        startDate: formData.startDate,
        endDate: formData.endDate,
        pointsReward: Number.parseInt(formData.pointsReward),
        targetValue: Number.parseFloat(formData.targetValue),
        maxParticipants: formData.maxParticipants ? Number.parseInt(formData.maxParticipants) : null,
        teamId: formData.challengeType === "team" ? formData.teamId : null,
      }

      const response = await fetch("/api/challenges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(challengeData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create challenge")
      }

      setSuccess(true)

      // Redirect after success
      setTimeout(() => {
        router.push(`/challenges/${result.challenge.id}`)
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Failed to create challenge")
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
                <CardTitle className="text-xl">Challenge Created Successfully!</CardTitle>
                <CardDescription>
                  Your challenge has been created and is now available for participants to join.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/challenges">View All Challenges</Link>
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/challenges">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Challenges
            </Link>
          </Button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-balance mb-2 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              Create New Challenge
            </h1>
            <p className="text-muted-foreground text-pretty">
              Design a sustainability challenge to engage participants and drive positive environmental impact.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Challenge Details
              </CardTitle>
              <CardDescription>Set up your challenge parameters and goals</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Challenge Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Zero Waste Week Challenge"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">
                      Challenge Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.challengeType}
                      onValueChange={(value) => handleInputChange("challengeType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select challenge type" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableChallengeTypes().map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.challengeType === "team" && (
                  <div className="space-y-2">
                    <Label htmlFor="team">
                      Select Team <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.teamId} onValueChange={(value) => handleInputChange("teamId", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        {userTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the challenge goals, rules, and expected outcomes..."
                    className="min-h-[100px]"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">
                      Start Date <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="start-date"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                        required
                      />
                      <CalendarIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-date">
                      End Date <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="end-date"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => handleInputChange("endDate", e.target.value)}
                        required
                      />
                      <CalendarIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="points">
                      Points Reward <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="points"
                      type="number"
                      min="1"
                      placeholder="100"
                      value={formData.pointsReward}
                      onChange={(e) => handleInputChange("pointsReward", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="energy">Energy Conservation</SelectItem>
                        <SelectItem value="waste">Waste Reduction</SelectItem>
                        <SelectItem value="transport">Sustainable Transport</SelectItem>
                        <SelectItem value="water">Water Conservation</SelectItem>
                        <SelectItem value="general">General Sustainability</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target-value">
                      Target Value <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="target-value"
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="e.g., 10 (actions completed)"
                      value={formData.targetValue}
                      onChange={(e) => handleInputChange("targetValue", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-participants">Max Participants</Label>
                    <Input
                      id="max-participants"
                      type="number"
                      min="1"
                      placeholder="Leave empty for unlimited"
                      value={formData.maxParticipants}
                      onChange={(e) => handleInputChange("maxParticipants", e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4 pt-6">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    <Target className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Creating Challenge..." : "Create Challenge"}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href="/challenges">Cancel</Link>
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
