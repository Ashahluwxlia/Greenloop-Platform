import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Leaf,
  Award,
  Target,
  Calendar,
  Zap,
  Droplets,
  Recycle,
  Car,
  Plus,
  Megaphone,
  Globe,
  GraduationCap,
  BookOpen,
} from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile data
  const { data: userProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()

  const { data: levelThresholds } = await supabase
    .from("level_thresholds")
    .select("level, points_required")
    .order("level", { ascending: true })

  const calculateLevelProgress = (userPoints: number, userLevel: number) => {
    if (!levelThresholds || levelThresholds.length === 0) {
      // Fallback to old calculation if thresholds not available
      const pointsToNextLevel = (userLevel || 1) * 1000 - (userPoints || 0)
      const levelProgress = ((userPoints || 0) % 1000) / 10
      return { pointsToNextLevel, levelProgress }
    }

    const currentThreshold = levelThresholds.find((t) => t.level === userLevel)
    const nextThreshold = levelThresholds.find((t) => t.level === userLevel + 1)

    if (!currentThreshold) {
      return { pointsToNextLevel: 0, levelProgress: 100 }
    }

    if (!nextThreshold) {
      // User is at max level
      return { pointsToNextLevel: 0, levelProgress: 100 }
    }

    const pointsToNextLevel = Math.max(0, nextThreshold.points_required - (userPoints || 0))
    const progressRange = nextThreshold.points_required - currentThreshold.points_required
    const currentProgress = Math.max(0, (userPoints || 0) - currentThreshold.points_required)
    const levelProgress = progressRange > 0 ? (currentProgress / progressRange) * 100 : 100

    return { pointsToNextLevel, levelProgress }
  }

  const { pointsToNextLevel, levelProgress } = calculateLevelProgress(userProfile?.points || 0, userProfile?.level || 1)

  // Get recent actions
  const { data: recentActions } = await supabase
    .from("user_actions")
    .select(`
      *,
      sustainability_actions (
        title,
        points_value,
        co2_impact,
        action_categories (name, icon, color)
      )
    `)
    .eq("user_id", data.user.id)
    .order("completed_at", { ascending: false })
    .limit(5)

  // Get user badges
  const { data: userBadges } = await supabase
    .from("user_badges")
    .select(`
      *,
      badges (name, description, icon_url, badge_color)
    `)
    .eq("user_id", data.user.id)
    .order("earned_at", { ascending: false })
    .limit(3)

  // Get available actions for quick access
  const { data: availableActions } = await supabase
    .from("sustainability_actions")
    .select(`
      *,
      action_categories (name, icon, color)
    `)
    .eq("is_active", true)
    .limit(3)

  const { data: challengeActivities } = await supabase
    .from("recent_challenge_activities")
    .select("*")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(3)

  const { data: recentAnnouncements } = await supabase
    .from("content_items")
    .select("*")
    .eq("type", "announcement")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(2)

  const { data: recentEducationalContent } = await supabase
    .from("content_items")
    .select("*")
    .eq("type", "educational")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(2)

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={userProfile} />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Welcome back, {userProfile?.first_name}!</h1>
            <p className="text-muted-foreground text-balance">
              Ready to make a positive impact today? Let's continue your sustainability journey.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recentAnnouncements && recentAnnouncements.length > 0 && (
              <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Latest Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                      <div className="p-1.5 bg-primary/10 rounded-full flex-shrink-0">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{announcement.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{announcement.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                    <Link href="/announcements">View All Announcements</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {recentEducationalContent && recentEducationalContent.length > 0 && (
              <Card className="bg-gradient-to-r from-accent/10 to-secondary/10 border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-accent" />
                    Latest Educational Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentEducationalContent.map((content) => (
                    <div key={content.id} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                      <div className="p-1.5 bg-accent/10 rounded-full flex-shrink-0">
                        <BookOpen className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{content.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{content.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {content.category}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {new Date(content.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                    <Link href="/education">View All Educational Content</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                <Award className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{userProfile?.points || 0}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={levelProgress} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground">Level {userProfile?.level || 1}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pointsToNextLevel > 0 ? `${pointsToNextLevel} points to next level` : "Max level reached!"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CO₂ Saved</CardTitle>
                <Leaf className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">
                  {userProfile?.total_co2_saved || 0}
                  <span className="text-sm font-normal ml-1">kg</span>
                </div>
                <p className="text-xs text-muted-foreground">Environmental impact</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actions This Week</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentActions?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Keep up the great work!</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userBadges?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Achievements unlocked</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Quick Actions
                    </CardTitle>
                    <CardDescription>Log your sustainability actions and earn points</CardDescription>
                  </div>
                  <Button asChild size="sm">
                    <Link href="/actions">
                      <Plus className="h-4 w-4 mr-2" />
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableActions?.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {action.action_categories?.icon === "🚲" && <Car className="h-4 w-4 text-primary" />}
                        {action.action_categories?.icon === "⚡" && <Zap className="h-4 w-4 text-primary" />}
                        {action.action_categories?.icon === "♻️" && <Recycle className="h-4 w-4 text-primary" />}
                        {action.action_categories?.icon === "💧" && <Droplets className="h-4 w-4 text-primary" />}
                        {!["🚲", "⚡", "♻️", "💧"].includes(action.action_categories?.icon || "") && (
                          <Leaf className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{action.title}</h4>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-primary">+{action.points_value} pts</div>
                        <div className="text-xs text-muted-foreground">{action.co2_impact}kg CO₂</div>
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/actions/log/${action.id}`}>Log</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity & Badges */}
            <div className="space-y-6">
              {/* Recent Badges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Recent Badges
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {userBadges?.length ? (
                    userBadges.map((userBadge) => (
                      <div key={userBadge.id} className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: userBadge.badges?.badge_color || "#10B981" }}
                        >
                          <Award className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{userBadge.badges?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(userBadge.earned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No badges earned yet. Complete actions to unlock achievements!
                    </p>
                  )}
                  <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                    <Link href="/badges">View All Badges</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {challengeActivities?.map((activity) => (
                    <div
                      key={`challenge-${activity.id}`}
                      className="flex items-center justify-between border-l-2 border-primary pl-3"
                    >
                      <div>
                        <p className="font-medium text-sm">Challenge Progress</p>
                        <p className="text-xs text-muted-foreground">{activity.challenge_title}</p>
                        <p className="text-xs text-primary">{activity.activity_description}</p>
                      </div>
                      <div className="text-right">
                        {activity.activity_type === "milestone_reached" && (
                          <Badge variant="secondary" className="text-xs">
                            🎯 Milestone
                          </Badge>
                        )}
                        {activity.activity_type === "challenge_completed" && (
                          <Badge variant="default" className="text-xs bg-green-600">
                            🏆 Completed
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {recentActions?.length ? (
                    recentActions.map((action) => (
                      <div key={action.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{action.sustainability_actions?.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(action.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          +{action.points_earned} pts
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No recent actions. Start logging your sustainability efforts!
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
