import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Plus, Calendar, Clock, Award } from "lucide-react"
import Link from "next/link"
import { ChallengeCardActions } from "@/components/challenge-card-actions"

export default async function ChallengesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: userProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()

  const { data: allChallenges } = await supabase
    .from("challenges")
    .select(`
      *,
      challenge_participants (
        id,
        user_id,
        team_id,
        current_progress,
        completed,
        teams (
          id,
          name,
          description,
          team_members (
            id,
            user_id,
            users (id, first_name, last_name, avatar_url)
          )
        )
      )
    `)
    .eq("is_active", true)
    .gte("end_date", new Date().toISOString())
    .order("start_date", { ascending: false })

  // Get user's participations with progress data
  const { data: userParticipations } = await supabase
    .from("challenge_participants")
    .select(`
      *,
      challenges (*)
    `)
    .eq("user_id", data.user.id)
    .order("joined_at", { ascending: false })

  const { data: userProgressData } = await supabase
    .from("challenge_progress")
    .select("challenge_id, current_progress, progress_percentage, completed")
    .eq("user_id", data.user.id)

  const progressMap = new Map(userProgressData?.map((p) => [p.challenge_id, p]) || [])

  // Get user's team
  const { data: userTeam } = await supabase
    .from("team_members")
    .select(`
      teams (id, name)
    `)
    .eq("user_id", data.user.id)
    .single()

  const { data: allUserParticipations } = await supabase
    .from("challenge_participants")
    .select("challenge_id, completed, current_progress")
    .eq("user_id", data.user.id)

  const participationMap = new Map(allUserParticipations?.map((p) => [p.challenge_id, p]) || [])

  const challengesWithStats =
    allChallenges?.map((challenge) => {
      const participantCount = challenge.challenge_participants?.length || 0
      const userParticipation = participationMap.get(challenge.id)
      const userProgress = progressMap.get(challenge.id)
      const challengeEnded = new Date(challenge.end_date) < new Date()

      let teamCount = 0
      let totalTeamMembers = 0
      let teamName = ""

      if (challenge.challenge_type === "team") {
        const teamParticipant = challenge.challenge_participants?.find(
          (participant: any) => participant.team_id && participant.teams,
        )

        if (teamParticipant?.teams) {
          teamName = teamParticipant.teams.name
          totalTeamMembers = teamParticipant.teams.team_members?.length || 0
          teamCount = 1
        }
      }

      return {
        ...challenge,
        participants: participantCount,
        teamCount,
        totalTeamMembers,
        teamName,
        maxParticipants: challenge.max_participants || 100,
        isParticipating: !!userParticipation,
        isCompleted: userProgress?.completed || false,
        userProgress: userProgress?.current_progress || 0,
        progressPercentage: userProgress?.progress_percentage || 0,
        challengeEnded,
      }
    }) || []

  const myParticipations = userParticipations || []

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={userProfile} />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Trophy className="h-8 w-8 text-primary" />
                Challenges
              </h1>
              <p className="text-muted-foreground text-balance">
                Take on sustainability challenges, compete with colleagues, and make a measurable environmental impact.
              </p>
            </div>
            <Button asChild>
              <Link href="/challenges/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Challenge
              </Link>
            </Button>
          </div>

          {/* Challenge Tabs */}
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active Challenges</TabsTrigger>
              <TabsTrigger value="my-challenges">My Challenges</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              {challengesWithStats.length > 0 ? (
                <div className="space-y-8">
                  {/* Personal Challenges */}
                  {challengesWithStats.filter((c) => c.challenge_type === "individual").length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">Personal Challenges</h2>
                        <Badge variant="outline">Individual</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {challengesWithStats
                          .filter((c) => c.challenge_type === "individual")
                          .map((challenge) => (
                            <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between mb-2">
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Trophy className="h-3 w-3" />
                                    Personal
                                  </Badge>
                                  <Badge variant="outline">{challenge.category}</Badge>
                                </div>
                                <CardTitle className="text-lg text-balance">{challenge.title}</CardTitle>
                                <CardDescription className="text-pretty">{challenge.description}</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Challenge Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="text-lg font-bold text-primary">{challenge.participants}</div>
                                    <p className="text-xs text-muted-foreground">Participants</p>
                                  </div>
                                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="text-lg font-bold text-accent">{challenge.reward_points || 0}</div>
                                    <p className="text-xs text-muted-foreground">Points</p>
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-muted-foreground">Participation</span>
                                    <span className="text-muted-foreground">
                                      {challenge.participants}/{challenge.maxParticipants}
                                    </span>
                                  </div>
                                  <Progress
                                    value={(challenge.participants / challenge.maxParticipants) * 100}
                                    className="h-2"
                                  />
                                </div>

                                {/* Duration */}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {new Date(challenge.start_date).toLocaleDateString()} -{" "}
                                    {new Date(challenge.end_date).toLocaleDateString()}
                                  </span>
                                </div>

                                <ChallengeCardActions
                                  challengeId={challenge.id}
                                  isParticipating={challenge.isParticipating}
                                  isCompleted={challenge.isCompleted}
                                  challengeEnded={challenge.challengeEnded}
                                  challengeType={challenge.challenge_type}
                                  userProgress={challenge.userProgress}
                                  targetValue={challenge.target_value}
                                  progressPercentage={challenge.progressPercentage}
                                />
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Company-wide Challenges */}
                  {challengesWithStats.filter((c) => c.challenge_type === "company").length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">Company-wide Challenges</h2>
                        <Badge variant="outline">Company</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {challengesWithStats
                          .filter((c) => c.challenge_type === "company")
                          .map((challenge) => (
                            <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between mb-2">
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Trophy className="h-3 w-3" />
                                    Company-wide
                                  </Badge>
                                  <Badge variant="outline">{challenge.category}</Badge>
                                </div>
                                <CardTitle className="text-lg text-balance">{challenge.title}</CardTitle>
                                <CardDescription className="text-pretty">{challenge.description}</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Challenge Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="text-lg font-bold text-primary">{challenge.participants}</div>
                                    <p className="text-xs text-muted-foreground">Participants</p>
                                  </div>
                                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="text-lg font-bold text-accent">{challenge.reward_points || 0}</div>
                                    <p className="text-xs text-muted-foreground">Points</p>
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="text-muted-foreground">Participation</span>
                                    <span className="text-muted-foreground">
                                      {challenge.participants}/{challenge.maxParticipants}
                                    </span>
                                  </div>
                                  <Progress
                                    value={(challenge.participants / challenge.maxParticipants) * 100}
                                    className="h-2"
                                  />
                                </div>

                                {/* Duration */}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {new Date(challenge.start_date).toLocaleDateString()} -{" "}
                                    {new Date(challenge.end_date).toLocaleDateString()}
                                  </span>
                                </div>

                                <ChallengeCardActions
                                  challengeId={challenge.id}
                                  isParticipating={challenge.isParticipating}
                                  isCompleted={challenge.isCompleted}
                                  challengeEnded={challenge.challengeEnded}
                                  challengeType={challenge.challenge_type}
                                  userProgress={challenge.userProgress}
                                  targetValue={challenge.target_value}
                                  progressPercentage={challenge.progressPercentage}
                                />
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Team Challenges */}
                  {challengesWithStats.filter((c) => c.challenge_type === "team").length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">Team Challenges</h2>
                        <Badge variant="outline">Team</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {challengesWithStats
                          .filter((c) => c.challenge_type === "team")
                          .map((challenge) => (
                            <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between mb-2">
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Trophy className="h-3 w-3" />
                                    Team
                                  </Badge>
                                  <Badge variant="outline">{challenge.category}</Badge>
                                </div>
                                <CardTitle className="text-lg text-balance">{challenge.title}</CardTitle>
                                <CardDescription className="text-pretty">{challenge.description}</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="text-lg font-bold text-primary">
                                      {challenge.totalTeamMembers || 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Team Members</p>
                                  </div>
                                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <div className="text-lg font-bold text-accent">{challenge.reward_points || 0}</div>
                                    <p className="text-xs text-muted-foreground">Points</p>
                                  </div>
                                </div>

                                {challenge.teamName ? (
                                  <div className="p-3 bg-primary/10 rounded-lg border-2 border-primary/20">
                                    <p className="font-semibold text-primary text-lg">{challenge.teamName}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {challenge.totalTeamMembers} team member
                                      {challenge.totalTeamMembers !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">No team assigned</p>
                                  </div>
                                )}

                                {/* Duration */}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {new Date(challenge.start_date).toLocaleDateString()} -{" "}
                                    {new Date(challenge.end_date).toLocaleDateString()}
                                  </span>
                                </div>

                                <ChallengeCardActions
                                  challengeId={challenge.id}
                                  isParticipating={challenge.isParticipating}
                                  isCompleted={challenge.isCompleted}
                                  challengeEnded={challenge.challengeEnded}
                                  challengeType={challenge.challenge_type}
                                  userProgress={challenge.userProgress}
                                  targetValue={challenge.target_value}
                                  progressPercentage={challenge.progressPercentage}
                                />
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
                    <p className="text-muted-foreground mb-4">
                      There are no active challenges at the moment. Check back later or create your own!
                    </p>
                    <Button asChild>
                      <Link href="/challenges/create">Create Challenge</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="my-challenges" className="space-y-6">
              {myParticipations.length > 0 ? (
                <div className="space-y-4">
                  {myParticipations.map((participation) => {
                    const challenge = participation.challenges
                    const userProgress = progressMap.get(challenge.id)
                    const progress = userProgress?.progress_percentage || 0
                    const daysLeft = Math.ceil(
                      (new Date(challenge.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                    )
                    const pointsEarned = userProgress?.completed
                      ? challenge.reward_points
                      : Math.floor((progress / 100) * (challenge.reward_points || 0))

                    return (
                      <Card key={participation.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">{challenge.title}</h3>
                              <div className="flex items-center gap-4 mt-1">
                                <Badge variant={userProgress?.completed ? "default" : "secondary"}>
                                  {userProgress?.completed ? "Completed" : "In Progress"}
                                </Badge>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  {daysLeft > 0 ? `${daysLeft} days left` : "Ended"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">{pointsEarned}</div>
                              <p className="text-sm text-muted-foreground">Points earned</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>
                                {userProgress?.current_progress || 0} / {challenge.target_value}
                              </span>
                            </div>
                            <Progress value={progress} className="h-3" />
                            <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
                          </div>

                          <div className="flex gap-3 mt-4">
                            <Button asChild>
                              <Link href={`/challenges/${challenge.id}`}>View Details</Link>
                            </Button>
                            {!userProgress?.completed && (
                              <Button variant="outline" asChild>
                                <Link href="/actions">Log Actions</Link>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven't joined any challenges yet. Browse active challenges to get started!
                    </p>
                    <Button asChild>
                      <Link href="#active">Browse Challenges</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-6">
              {myParticipations.filter((p) => progressMap.get(p.challenges.id)?.completed).length > 0 ? (
                <div className="space-y-4">
                  {myParticipations
                    .filter((p) => progressMap.get(p.challenges.id)?.completed)
                    .map((participation) => {
                      const challenge = participation.challenges
                      return (
                        <Card key={participation.id}>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">{challenge.title}</h3>
                                <p className="text-muted-foreground">{challenge.description}</p>
                                <Badge variant="default" className="mt-2 bg-green-600">
                                  <Award className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary">{challenge.reward_points || 0}</div>
                                <p className="text-sm text-muted-foreground">Points earned</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Completed Challenges</h3>
                    <p className="text-muted-foreground">
                      Complete your first challenge to see your achievements here!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
