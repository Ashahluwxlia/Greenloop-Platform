import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Users, Plus, Crown, Target, Calendar, UserPlus } from "lucide-react"
import Link from "next/link"

export default async function TeamsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: userProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()

  // Get user's current team
  const { data: userTeamMembership } = await supabase
    .from("team_members")
    .select(`
      *,
      teams (
        *,
        team_members (
          *,
          users (id, first_name, last_name, avatar_url, points, total_co2_saved)
        )
      )
    `)
    .eq("user_id", data.user.id)
    .single()

  // Get all teams for browsing
  const { data: allTeams } = await supabase
    .from("teams")
    .select(`
      *,
      team_members (
        id,
        users (id, first_name, last_name, avatar_url)
      )
    `)
    .eq("is_active", true)
    .order("total_points", { ascending: false })
    .limit(12)

  // Get team challenges if user is in a team
  let teamChallenges = null
  if (userTeamMembership?.teams?.id) {
    const { data: challenges } = await supabase
      .from("challenge_participants")
      .select(`
        *,
        challenges (
          *,
          challenge_participants (
            id,
            current_progress,
            completed
          )
        )
      `)
      .eq("team_id", userTeamMembership.teams.id)
      .order("joined_at", { ascending: false })
      .limit(3)

    teamChallenges = challenges
  }

  const userTeam = userTeamMembership?.teams
  const isTeamLeader = userTeam?.team_leader_id === data.user.id

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={userProfile} />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                Teams
              </h1>
              <p className="text-muted-foreground text-balance">
                Join forces with colleagues to amplify your sustainability impact through teamwork and friendly
                competition.
              </p>
            </div>
            {!userTeam && (
              <Button asChild>
                <Link href="/teams/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Link>
              </Button>
            )}
          </div>

          {/* User's Team Section */}
          {userTeam ? (
            <div className="space-y-6">
              <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{userTeam.name}</CardTitle>
                        <CardDescription>{userTeam.description}</CardDescription>
                      </div>
                    </div>
                    {isTeamLeader && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Crown className="h-3 w-3 mr-1" />
                        Leader
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Team Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-background/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{userTeam.total_points}</div>
                      <p className="text-sm text-muted-foreground">Total Points</p>
                    </div>
                    <div className="text-center p-4 bg-background/50 rounded-lg">
                      <div className="text-2xl font-bold text-accent">{userTeam.total_co2_saved}kg</div>
                      <p className="text-sm text-muted-foreground">CO₂ Saved</p>
                    </div>
                    <div className="text-center p-4 bg-background/50 rounded-lg">
                      <div className="text-2xl font-bold">{userTeam.team_members?.length || 0}</div>
                      <p className="text-sm text-muted-foreground">Members</p>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Team Members
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {userTeam.team_members?.slice(0, 8).map((member: any) => (
                        <div key={member.id} className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.users?.avatar_url || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs">
                              {member.users?.first_name?.[0]}
                              {member.users?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.users?.first_name} {member.users?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.users?.points} pts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button asChild>
                      <Link href={`/teams/${userTeam.id}`}>View Team Dashboard</Link>
                    </Button>
                    {isTeamLeader && (
                      <Button variant="outline" asChild>
                        <Link href={`/teams/${userTeam.id}/manage`}>Manage Team</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Active Team Challenges */}
              {teamChallenges && teamChallenges.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Active Team Challenges
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {teamChallenges.map((participation: any) => {
                        const challenge = participation.challenges
                        const progress = (participation.current_progress / challenge.target_value) * 100

                        return (
                          <div key={participation.id} className="p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-medium mb-2">{challenge.title}</h4>
                            <div className="space-y-2">
                              <Progress value={progress} className="h-2" />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  {participation.current_progress} / {challenge.target_value}
                                </span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              <Calendar className="h-3 w-3" />
                              <span className="text-xs text-muted-foreground">
                                Ends {new Date(challenge.end_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* No Team - Browse Teams */
            <Card>
              <CardHeader>
                <CardTitle>Join a Team</CardTitle>
                <CardDescription>
                  You're not currently part of a team. Join an existing team or create your own to start collaborating
                  on sustainability goals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button asChild>
                    <Link href="/teams/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Team
                    </Link>
                  </Button>
                  <Button variant="outline">Browse Teams Below</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Teams */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">All Teams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allTeams?.map((team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <CardDescription className="mt-1">{team.description}</CardDescription>
                      </div>
                      {team.id === userTeam?.id && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          Your Team
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Team Stats */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-primary">{team.total_points}</div>
                        <p className="text-xs text-muted-foreground">Points</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-accent">{team.total_co2_saved}kg</div>
                        <p className="text-xs text-muted-foreground">CO₂ Saved</p>
                      </div>
                    </div>

                    {/* Team Members Preview */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {team.team_members?.length || 0} / {team.max_members} members
                        </span>
                      </div>
                      <div className="flex -space-x-2">
                        {team.team_members?.slice(0, 5).map((member: any, index: number) => (
                          <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={member.users?.avatar_url || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs">
                              {member.users?.first_name?.[0]}
                              {member.users?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(team.team_members?.length || 0) > 5 && (
                          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs font-medium">+{(team.team_members?.length || 0) - 5}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      variant={team.id === userTeam?.id ? "outline" : "default"}
                      className="w-full"
                      asChild
                      disabled={(team.team_members?.length || 0) >= team.max_members && team.id !== userTeam?.id}
                    >
                      <Link href={`/teams/${team.id}`}>
                        {team.id === userTeam?.id ? "View Dashboard" : "View Team"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
