import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MonthlyProgressChart } from "@/components/charts/monthly-progress-chart"
import { CategoryPieChart } from "@/components/charts/category-pie-chart"
import { CO2ImpactChart } from "@/components/charts/co2-impact-chart"
import { BarChart3, TrendingUp, Award, Target, Download, Leaf, Zap, Recycle } from "lucide-react"

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: userProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()

  // Get user's actions with categories
  const { data: userActions } = await supabase
    .from("user_actions")
    .select(`
      *,
      sustainability_actions (
        title,
        category,
        co2_impact,
        points_value
      )
    `)
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })

  // Get user's challenge participations
  const { data: challengeParticipations } = await supabase
    .from("challenge_participants")
    .select(`
      *,
      challenges (
        title,
        category,
        points_reward
      )
    `)
    .eq("user_id", data.user.id)

  // Get user's badges
  const { data: userBadges } = await supabase
    .from("user_badges")
    .select(`
      *,
      badges (
        name,
        description,
        icon_url
      )
    `)
    .eq("user_id", data.user.id)
    .order("earned_at", { ascending: false })

  // Process data for charts
  const monthlyData =
    userActions?.reduce((acc: any[], action) => {
      const month = new Date(action.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      const existing = acc.find((item) => item.month === month)

      if (existing) {
        existing.actions += 1
        existing.points += action.sustainability_actions?.points_value || 0
        existing.co2 += action.sustainability_actions?.co2_impact || 0
      } else {
        acc.push({
          month,
          actions: 1,
          points: action.sustainability_actions?.points_value || 0,
          co2: action.sustainability_actions?.co2_impact || 0,
        })
      }
      return acc
    }, []) || []

  const categoryData =
    userActions?.reduce((acc: any[], action) => {
      const category = action.sustainability_actions?.category || "Other"
      const existing = acc.find((item) => item.name === category)

      if (existing) {
        existing.value += 1
        existing.co2 += action.sustainability_actions?.co2_impact || 0
      } else {
        acc.push({
          name: category,
          value: 1,
          co2: action.sustainability_actions?.co2_impact || 0,
          color: getCategoryColor(category),
        })
      }
      return acc
    }, []) || []

  function getCategoryColor(category: string) {
    const colors: { [key: string]: string } = {
      Energy: "#0891b2",
      Transportation: "#d97706",
      Waste: "#34d399",
      Water: "#fbbf24",
      Other: "#9ca3af",
    }
    return colors[category] || colors["Other"]
  }

  const totalActions = userActions?.length || 0
  const totalPoints = userProfile?.points || 0
  const totalCO2Saved = userProfile?.total_co2_saved || 0
  const completedChallenges = challengeParticipations?.filter((p) => p.completed).length || 0

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={userProfile} />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                My Analytics
              </h1>
              <p className="text-muted-foreground text-balance">
                Track your sustainability journey, monitor progress, and discover insights about your environmental
                impact.
              </p>
            </div>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{totalActions}</div>
                <p className="text-xs text-muted-foreground">Sustainability actions completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">{totalPoints}</div>
                <p className="text-xs text-muted-foreground">Total sustainability points</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CO₂ Saved</CardTitle>
                <Leaf className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-chart-4">{totalCO2Saved}kg</div>
                <p className="text-xs text-muted-foreground">Carbon footprint reduced</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Challenges</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-chart-2">{completedChallenges}</div>
                <p className="text-xs text-muted-foreground">Challenges completed</p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="impact">Environmental Impact</TabsTrigger>
              <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Progress</CardTitle>
                    <CardDescription>Your sustainability activity over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MonthlyProgressChart data={monthlyData} />
                  </CardContent>
                </Card>

                {/* Action Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle>Action Categories</CardTitle>
                    <CardDescription>Distribution of your sustainability actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CategoryPieChart data={categoryData} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="impact" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Environmental Impact Cards */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Energy Saved</CardTitle>
                    <Zap className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {categoryData.find((c) => c.name === "Energy")?.co2 || 0}kg
                    </div>
                    <p className="text-xs text-muted-foreground">CO₂ from energy actions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Transport Impact</CardTitle>
                    <Target className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {categoryData.find((c) => c.name === "Transportation")?.co2 || 0}kg
                    </div>
                    <p className="text-xs text-muted-foreground">CO₂ from transport actions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Waste Reduced</CardTitle>
                    <Recycle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{categoryData.find((c) => c.name === "Waste")?.co2 || 0}kg</div>
                    <p className="text-xs text-muted-foreground">CO₂ from waste actions</p>
                  </CardContent>
                </Card>
              </div>

              {/* CO2 Impact Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>CO₂ Impact Over Time</CardTitle>
                  <CardDescription>Your cumulative environmental impact</CardDescription>
                </CardHeader>
                <CardContent>
                  <CO2ImpactChart data={monthlyData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              {/* Recent Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Actions</CardTitle>
                  <CardDescription>Your latest sustainability activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userActions?.slice(0, 10).map((action) => (
                      <div key={action.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <Leaf className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{action.sustainability_actions?.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(action.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            {action.sustainability_actions?.category}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            +{action.sustainability_actions?.points_value} pts
                          </p>
                        </div>
                      </div>
                    )) || <p className="text-muted-foreground text-center py-4">No actions logged yet</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              {/* Badges */}
              <Card>
                <CardHeader>
                  <CardTitle>Earned Badges</CardTitle>
                  <CardDescription>Recognition for your sustainability achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  {userBadges && userBadges.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userBadges.map((userBadge) => (
                        <div key={userBadge.id} className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                          <div className="p-3 bg-primary/10 rounded-full">
                            <Award className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{userBadge.badges?.name}</p>
                            <p className="text-sm text-muted-foreground">{userBadge.badges?.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Earned {new Date(userBadge.earned_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Badges Yet</h3>
                      <p className="text-muted-foreground">Complete actions and challenges to earn your first badge!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
