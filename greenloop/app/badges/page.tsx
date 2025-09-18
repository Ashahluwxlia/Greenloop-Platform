import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Award, Lock, CheckCircle, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function BadgesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: userProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()

  // Get all badges
  const { data: allBadges } = await supabase.from("badges").select("*").eq("is_active", true).order("criteria_value")

  // Get user's earned badges
  const { data: userBadges } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", data.user.id)

  const earnedBadgeIds = new Set(userBadges?.map((ub) => ub.badge_id) || [])
  const earnedBadgesMap = new Map(userBadges?.map((ub) => [ub.badge_id, ub.earned_at]) || [])

  // Get user's action count for progress calculation
  const { data: userActions } = await supabase
    .from("user_actions")
    .select("id")
    .eq("user_id", data.user.id)
    .eq("verification_status", "approved")

  const actionCount = userActions?.length || 0

  const calculateProgress = (badge: any) => {
    let currentValue = 0

    switch (badge.criteria_type) {
      case "points":
        currentValue = userProfile?.points || 0
        break
      case "actions":
        currentValue = actionCount
        break
      case "co2_saved":
        currentValue = Math.floor(userProfile?.total_co2_saved || 0)
        break
      default:
        currentValue = 0
    }

    return Math.min((currentValue / badge.criteria_value) * 100, 100)
  }

  const getCriteriaText = (badge: any) => {
    switch (badge.criteria_type) {
      case "points":
        return `Earn ${badge.criteria_value} points`
      case "actions":
        return `Complete ${badge.criteria_value} actions`
      case "co2_saved":
        return `Save ${badge.criteria_value}kg of CO₂`
      default:
        return badge.description
    }
  }

  const getCurrentValueText = (badge: any) => {
    switch (badge.criteria_type) {
      case "points":
        return `${userProfile?.points || 0} / ${badge.criteria_value} points`
      case "actions":
        return `${actionCount} / ${badge.criteria_value} actions`
      case "co2_saved":
        return `${Math.floor(userProfile?.total_co2_saved || 0)} / ${badge.criteria_value}kg CO₂`
      default:
        return ""
    }
  }

  const isAdmin = userProfile?.is_admin || false

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={userProfile} />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Award className="h-8 w-8 text-primary" />
                Badges & Achievements
              </h1>
              <p className="text-muted-foreground text-balance">
                Unlock badges by completing sustainability actions and reaching milestones. Track your progress and
                showcase your environmental commitment.
              </p>
            </div>
            {isAdmin && (
              <Button variant="outline" asChild>
                <Link href="/admin/badges">
                  <Crown className="h-4 w-4 mr-2" />
                  Manage Badges
                </Link>
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{earnedBadgeIds.size}</div>
                <p className="text-xs text-muted-foreground">out of {allBadges?.length || 0} available</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progress</CardTitle>
                <Award className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {allBadges ? Math.round((earnedBadgeIds.size / allBadges.length) * 100) : 0}%
                </div>
                <Progress value={allBadges ? (earnedBadgeIds.size / allBadges.length) * 100 : 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Badge</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {allBadges?.find((badge) => !earnedBadgeIds.has(badge.id))?.name || "All unlocked!"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Keep completing actions</p>
              </CardContent>
            </Card>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allBadges?.map((badge) => {
              const isEarned = earnedBadgeIds.has(badge.id)
              const progress = calculateProgress(badge)
              const earnedDate = earnedBadgesMap.get(badge.id)

              return (
                <Card
                  key={badge.id}
                  className={`relative ${isEarned ? "bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20" : ""}`}
                >
                  {isEarned && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-3">
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          isEarned ? "shadow-lg" : "opacity-50"
                        }`}
                        style={{
                          backgroundColor: isEarned ? badge.badge_color : "#e5e7eb",
                        }}
                      >
                        {isEarned ? (
                          <Award className="h-8 w-8 text-white" />
                        ) : (
                          <Lock className="h-8 w-8 text-gray-500" />
                        )}
                      </div>
                    </div>

                    <CardTitle className={`text-lg ${!isEarned ? "text-muted-foreground" : ""}`}>
                      {badge.name}
                    </CardTitle>

                    <CardDescription className="text-sm">{badge.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <Badge variant={isEarned ? "default" : "secondary"} className="text-xs">
                        {getCriteriaText(badge)}
                      </Badge>
                    </div>

                    {!isEarned && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center">{getCurrentValueText(badge)}</p>
                      </div>
                    )}

                    {isEarned && earnedDate && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          Earned on {new Date(earnedDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
