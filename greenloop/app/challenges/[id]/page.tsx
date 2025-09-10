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
  current_progress: number
  completed: boolean
  users: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
    department: string | null
    points: number
  }
}

interface LeaderboardEntry {
  current_progress: number
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
  created_at: string
  users: {
    first_name: string
    last_name: string
  } | null
  sustainability_actions: {
    title: string
    points_value: number
  } | null
}

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
        current_progress,
        completed,
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

  // Get leaderboard for this challenge
  const { data: leaderboard } = await supabase
    .from("challenge_participants")
    .select(`
      current_progress,
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

  // Get recent actions related to this challenge
  const { data: recentActions } = await supabase
    .from("user_actions")
    .select(`
      *,
      users (first_name, last_name),
      sustainability_actions (title, points_value)
    `)
    .in(
      "user_id",
      (challenge.challenge_participants as ChallengeParticipant[])?.map((p: ChallengeParticipant) => p.user_id) || [],
    )
    .order("created_at", { ascending: false })
    .limit(10)

  // Calculate challenge statistics
  const totalParticipants = challenge.challenge_participants?.length || 0
  const completedParticipants =
    (challenge.challenge_participants as ChallengeParticipant[])?.filter((p: ChallengeParticipant) => p.completed)
      .length || 0
  const progressPercentage = totalParticipants > 0 ? Math.round((completedParticipants / totalParticipants) * 100) : 0

  const startDate = new Date(challenge.start_date)
  const endDate = new Date(challenge.end_date)
  const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

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
              isCompleted={userParticipation?.completed || false}
              challengeEnded={daysLeft === 0}
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
                  <p className="text-2xl font-bold">{progressPercentage}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <div className="mt-4">
                <Progress value={progressPercentage} />
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
                    <p className="text-2xl font-bold">{challenge.points_reward}</p>
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
                            <p className="font-bold text-primary">{participant.current_progress}%</p>
                            <p className="text-sm text-muted-foreground">progress</p>
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
                <CardDescription>Latest actions logged by participants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActions?.length ? (
                    recentActions.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {activity.users?.first_name?.[0]}
                              {activity.users?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {activity.users?.first_name} {activity.users?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{activity.sustainability_actions?.title}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">+{activity.sustainability_actions?.points_value} pts</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No recent activity</p>
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
                      <li>• Target Value: {challenge.target_value || "N/A"}</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Rewards</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {challenge.challenge_type !== "individual" && (
                        <li>• {challenge.points_reward} points for completion</li>
                      )}
                      <li>• Badge achievement</li>
                      <li>• Leaderboard recognition</li>
                      <li>• Environmental impact tracking</li>
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
