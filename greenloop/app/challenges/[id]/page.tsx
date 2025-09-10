import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Trophy, Users, Clock, Award, TrendingUp, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ChallengeActions } from "@/components/challenge-actions"

interface ChallengeParticipant {
  id: string
  user_id: string
  completed: boolean
  current_progress: number
  users: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

interface LeaderboardEntry {
  current_progress: number
  progress_percentage: number
  users:
    | {
        id: string
        first_name: string
        last_name: string
        avatar_url: string | null
        department: string | null
        points: number
      }
    | {
        id: string
        first_name: string
        last_name: string
        avatar_url: string | null
        department: string | null
        points: number
      }[]
    | null
}

interface RecentActivity {
  id: string
  completed_at: string
  users: {
    first_name: string
    last_name: string
  } | null
  sustainability_actions: {
    title: string
    points_value: number
    co2_impact: number
    action_categories: {
      name: string
    }
  } | null
}

interface ChallengeActivity {
  id: string
  type: "challenge_activity"
  created_at: string
  activity_type: string
  description: string
  metadata: any
  user: {
    first_name: string
    last_name: string
    avatar_url: string
  }
}

interface UserActionActivity {
  id: string
  type: "user_action"
  created_at: string
  action: {
    title: string
    points_value: number
    co2_impact: number
  } | null
  user: {
    first_name: string
    last_name: string
  } | null
}

type CombinedActivity = ChallengeActivity | UserActionActivity

export default async function ChallengeDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: userProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()

  // Get challenge details
  const { data: challenge } = await supabase
    .from("challenges")
    .select(`
      *,
      challenge_participants (
        id,
        user_id,
        completed,
        current_progress,
        users (first_name, last_name, avatar_url)
      )
    `)
    .eq("id", params.id)
    .single()

  if (!challenge) {
    redirect("/challenges")
  }

  const { data: userParticipation } = await supabase
    .from("challenge_participants")
    .select("*")
    .eq("challenge_id", params.id)
    .eq("user_id", data.user.id)
    .single()

  const { data: userProgressData } = await supabase
    .from("challenge_progress")
    .select("current_progress, progress_percentage, completed")
    .eq("challenge_id", params.id)
    .eq("user_id", data.user.id)
    .single()

  // Get leaderboard for this challenge
  const { data: leaderboard } = await supabase
    .from("challenge_progress")
    .select(`
      current_progress,
      progress_percentage,
      users (
        id,
        first_name,
        last_name,
        avatar_url,
        department,
        points
      )
    `)
    .eq("challenge_id", params.id)
    .order("current_progress", { ascending: false })
    .limit(10)

  console.log("[v0] Challenge ID:", params.id)
  console.log("[v0] Leaderboard data:", leaderboard)
  console.log("[v0] Challenge participants:", challenge.challenge_participants)

  const { data: challengeActivities } = await supabase
    .from("recent_challenge_activities")
    .select("*")
    .eq("challenge_id", params.id)
    .order("created_at", { ascending: false })
    .limit(15)

  const { data: recentActions } = await supabase
    .from("user_actions")
    .select(`
      *,
      users (first_name, last_name),
      sustainability_actions (
        title, 
        points_value,
        co2_impact,
        action_categories (name)
      )
    `)
    .in(
      "user_id",
      (challenge.challenge_participants as ChallengeParticipant[])?.map((p: ChallengeParticipant) => p.user_id) || [],
    )
    .gte("completed_at", challenge.start_date)
    .lte("completed_at", challenge.end_date + "T23:59:59")
    .eq("verification_status", "approved")
    .order("completed_at", { ascending: false })
    .limit(10)

  console.log("[v0] Challenge activities:", challengeActivities)
  console.log("[v0] Recent actions raw:", recentActions)
  console.log("[v0] Challenge category:", challenge.category)

  const filteredRecentActions = recentActions?.filter((action) => {
    if (challenge.category === "general") return true
    const categoryMatch = action.sustainability_actions?.action_categories?.name === challenge.category
    console.log(
      "[v0] Action category:",
      action.sustainability_actions?.action_categories?.name,
      "Challenge category:",
      challenge.category,
      "Match:",
      categoryMatch,
    )
    return categoryMatch
  })

  const combinedActivities: CombinedActivity[] = [
    ...(challengeActivities?.map((activity) => ({
      id: activity.id,
      type: "challenge_activity" as const,
      created_at: activity.created_at,
      activity_type: activity.activity_type,
      description: activity.activity_description,
      metadata: activity.metadata,
      user: {
        first_name: activity.first_name,
        last_name: activity.last_name,
        avatar_url: activity.avatar_url,
      },
    })) || []),
    ...(filteredRecentActions?.map((action) => ({
      id: action.id,
      type: "user_action" as const,
      created_at: action.completed_at,
      action: action.sustainability_actions,
      user: action.users,
    })) || []),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)

  console.log("[v0] Combined activities:", combinedActivities)

  // Calculate challenge statistics
  const totalParticipants = challenge.challenge_participants?.length || 0

  // Get progress data from challenge_progress table
  const { data: progressData } = await supabase
    .from("challenge_progress")
    .select("current_progress, progress_percentage, completed")
    .eq("challenge_id", params.id)

  console.log("[v0] Progress data:", progressData)

  const completedParticipants = progressData?.filter((p) => p.completed).length || 0
  const averageProgress = progressData?.length
    ? Math.round(progressData.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / progressData.length)
    : 0

  const startDate = new Date(challenge.start_date)
  const endDate = new Date(challenge.end_date)
  const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  const formatTargetMetric = (metric: string) => {
    switch (metric) {
      case "actions":
        return "Actions Completed"
      case "points":
        return "Points Earned"
      case "co2_saved":
        return "CO2 Saved (kg)"
      default:
        return metric
    }
  }

  const formatProgressValue = (progress: number, metric: string) => {
    switch (metric) {
      case "actions":
        return `${progress} actions`
      case "points":
        return `${progress} pts`
      case "co2_saved":
        return `${progress} kg CO2`
      default:
        return progress.toString()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={userProfile} />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/challenges">
              <ArrowLeft className="h-4 w-4" />
              Back to Challenges
            </Link>
          </Button>
        </div>

        {/* Challenge Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-balance mb-2">{challenge.title}</h1>
              <p className="text-muted-foreground text-pretty max-w-2xl">{challenge.description}</p>
            </div>
            <ChallengeActions
              challengeId={challenge.id}
              isParticipating={!!userParticipation}
              isCompleted={userProgressData?.completed || false}
              challengeEnded={daysLeft === 0}
              challengeType={challenge.challenge_type}
              userProgress={userProgressData?.current_progress || 0}
              targetValue={challenge.target_value}
              targetMetric={challenge.target_metric}
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              {challenge.challenge_type}
            </Badge>
            <Badge variant="outline">{challenge.category}</Badge>
            <Badge variant={challenge.is_active ? "default" : "secondary"}>
              {challenge.is_active ? "Active" : "Inactive"}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {daysLeft} days left
            </div>
          </div>
        </div>

        {/* Challenge Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Participants</p>
                  <p className="text-2xl font-bold">{totalParticipants}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="mt-4">
                <Progress
                  value={challenge.max_participants ? (totalParticipants / challenge.max_participants) * 100 : 0}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {totalParticipants} of {challenge.max_participants || "unlimited"} max
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold">{averageProgress}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <div className="mt-4">
                <Progress value={averageProgress} />
                <p className="text-xs text-muted-foreground mt-1">Challenge completion</p>
              </div>
            </CardContent>
          </Card>

          {challenge.challenge_type !== "individual" && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reward Points</p>
                    <p className="text-2xl font-bold">{challenge.reward_points || 0}</p>
                  </div>
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mt-4">Points for completion</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duration</p>
                  <p className="text-2xl font-bold">{totalDays}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-4">Days total</p>
            </CardContent>
          </Card>
        </div>

        {/* Challenge Content */}
        <Tabs defaultValue="leaderboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="details">Challenge Details</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Challenge Leaderboard</CardTitle>
                <CardDescription>Top performers in this challenge</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboard?.length ? (
                    leaderboard.map((participant, index) => {
                      const user = Array.isArray(participant.users) ? participant.users[0] : participant.users
                      return user ? (
                        <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                              {index + 1}
                            </div>
                            <Avatar>
                              <AvatarFallback>
                                {user.first_name?.[0]}
                                {user.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{user.department}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {formatProgressValue(participant.current_progress, challenge.target_metric)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(participant.progress_percentage || 0)}% complete
                            </p>
                          </div>
                        </div>
                      ) : null
                    })
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No participants yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest challenge-related actions and progress updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {combinedActivities?.length ? (
                    combinedActivities.map((activity) => (
                      <div
                        key={`${activity.type}-${activity.id}`}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {activity.user?.first_name?.[0]}
                              {activity.user?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {activity.user?.first_name} {activity.user?.last_name}
                            </p>
                            {activity.type === "challenge_activity" ? (
                              <div>
                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                                {activity.activity_type === "milestone_reached" && (
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    🎯 {activity.metadata?.milestone} Milestone
                                  </Badge>
                                )}
                                {activity.activity_type === "challenge_completed" && (
                                  <Badge variant="default" className="mt-1 text-xs bg-green-600">
                                    🏆 Challenge Completed!
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">{activity.action?.title}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {activity.type === "challenge_activity" ? (
                            <div className="space-y-1">
                              {activity.metadata?.points_earned && (
                                <p className="font-bold text-primary">+{activity.metadata.points_earned} pts</p>
                              )}
                              {activity.metadata?.co2_saved && (
                                <p className="text-sm text-green-600">-{activity.metadata.co2_saved} kg CO2</p>
                              )}
                              {activity.metadata?.new_progress && (
                                <p className="text-sm text-blue-600">
                                  Progress:{" "}
                                  {formatProgressValue(activity.metadata.new_progress, activity.metadata.target_metric)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="font-bold text-primary">+{activity.action?.points_value} pts</p>
                              {activity.action?.co2_impact && (
                                <p className="text-sm text-green-600">-{activity.action.co2_impact} kg CO2</p>
                              )}
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No challenge-related activity yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Challenge Information</CardTitle>
                <CardDescription>Complete details about this challenge</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Objective</h4>
                  <p className="text-muted-foreground text-pretty">{challenge.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Challenge Details</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Start Date: {new Date(challenge.start_date).toLocaleDateString()}</li>
                      <li>• End Date: {new Date(challenge.end_date).toLocaleDateString()}</li>
                      <li>• Category: {challenge.category}</li>
                      <li>• Target Metric: {formatTargetMetric(challenge.target_metric)}</li>
                      <li>
                        • Target Value: {formatProgressValue(challenge.target_value || 0, challenge.target_metric)}
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Rewards</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {challenge.challenge_type !== "individual" && challenge.reward_points > 0 && (
                        <li>• {challenge.reward_points} points for completion</li>
                      )}
                      <li>• Badge achievement</li>
                      <li>• Leaderboard recognition</li>
                      <li>• Environmental impact tracking</li>
                      {challenge.reward_description && <li>• {challenge.reward_description}</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
