import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { BarChart3, Users, TrendingUp, Download, Calendar, Target, Award, Activity } from "lucide-react"

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: userProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()

  if (!userProfile?.is_admin) {
    redirect("/dashboard")
  }

  // Get comprehensive analytics data
  const { data: totalUsers } = await supabase.from("users").select("id", { count: "exact" })
  const { data: activeUsers } = await supabase
    .from("users")
    .select("id", { count: "exact" })
    .gte("last_login", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  const { data: totalActions } = await supabase.from("user_actions").select("id", { count: "exact" })
  const { data: totalTeams } = await supabase.from("teams").select("id", { count: "exact" }).eq("is_active", true)
  const { data: activeChallenges } = await supabase
    .from("challenges")
    .select("id", { count: "exact" })
    .eq("is_active", true)

  // Get user engagement data
  const { data: userEngagement } = await supabase
    .from("users")
    .select("created_at, last_login, points, total_co2_saved")
    .order("created_at", { ascending: true })

  // Get action trends
  const { data: actionTrends } = await supabase
    .from("user_actions")
    .select(`
      created_at,
      sustainability_actions (
        category,
        co2_impact,
        points_value
      )
    `)
    .order("created_at", { ascending: true })

  // Get team performance
  const { data: teamPerformance } = await supabase
    .from("teams")
    .select("name, total_points, total_co2_saved, created_at")
    .eq("is_active", true)
    .order("total_points", { ascending: false })
    .limit(10)

  // Process data for charts
  const monthlyUserGrowth =
    userEngagement?.reduce((acc: any[], user) => {
      const month = new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      const existing = acc.find((item) => item.month === month)

      if (existing) {
        existing.newUsers += 1
      } else {
        acc.push({ month, newUsers: 1 })
      }
      return acc
    }, []) || []

  const monthlyActionTrends =
    actionTrends?.reduce((acc: any[], action) => {
      const month = new Date(action.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      const existing = acc.find((item) => item.month === month)

      if (existing) {
        existing.actions += 1
        existing.co2 += action.sustainability_actions?.co2_impact || 0
        existing.points += action.sustainability_actions?.points_value || 0
      } else {
        acc.push({
          month,
          actions: 1,
          co2: action.sustainability_actions?.co2_impact || 0,
          points: action.sustainability_actions?.points_value || 0,
        })
      }
      return acc
    }, []) || []

  const categoryBreakdown =
    actionTrends?.reduce((acc: any[], action) => {
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

  const totalCO2Saved = userEngagement?.reduce((sum, user) => sum + (user.total_co2_saved || 0), 0) || 0
  const totalPointsEarned = userEngagement?.reduce((sum, user) => sum + (user.points || 0), 0) || 0

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                Analytics & Reports
              </h1>
              <p className="text-muted-foreground">
                Comprehensive insights into platform performance, user engagement, and environmental impact.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Date Range
              </Button>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-primary">+{activeUsers?.length || 0}</span> active this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalActions?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Sustainability actions logged</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CO₂ Saved</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCO2Saved}kg</div>
                <p className="text-xs text-muted-foreground">Total environmental impact</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTeams?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Collaborative teams</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPointsEarned}</div>
                <p className="text-xs text-muted-foreground">Total platform points</p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">User Analytics</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="impact">Environmental Impact</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth</CardTitle>
                    <CardDescription>New user registrations over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={monthlyUserGrowth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="newUsers"
                          stroke="var(--color-primary)"
                          fill="var(--color-primary)"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Action Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle>Action Categories</CardTitle>
                    <CardDescription>Distribution of sustainability actions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Activity Trends</CardTitle>
                  <CardDescription>Actions, points, and CO₂ impact over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={monthlyActionTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="actions" stroke="var(--color-primary)" strokeWidth={2} />
                      <Line type="monotone" dataKey="points" stroke="var(--color-accent)" strokeWidth={2} />
                      <Line type="monotone" dataKey="co2" stroke="var(--color-chart-4)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              {/* Top Performing Teams */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Teams</CardTitle>
                  <CardDescription>Teams with highest sustainability impact</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamPerformance?.map((team, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                            <span className="text-sm font-bold text-primary">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{team.name}</p>
                            <p className="text-sm text-muted-foreground">{team.total_co2_saved}kg CO₂ saved</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">{team.total_points}</div>
                          <p className="text-xs text-muted-foreground">points</p>
                        </div>
                      </div>
                    )) || <p className="text-muted-foreground text-center py-4">No team data available</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Engagement Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {activeUsers && totalUsers ? Math.round((activeUsers.length / totalUsers.length) * 100) : 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">Users active this month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Avg Actions/User</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-accent">
                      {totalUsers && totalActions ? Math.round((totalActions.length / totalUsers.length) * 10) / 10 : 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Actions per user</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Challenge Participation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-chart-4">{activeChallenges?.length || 0}</div>
                    <p className="text-sm text-muted-foreground">Active challenges</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="impact" className="space-y-6">
              {/* Environmental Impact Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {categoryBreakdown.map((category) => (
                  <Card key={category.name}>
                    <CardHeader>
                      <CardTitle className="text-sm">{category.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" style={{ color: category.color }}>
                        {category.co2}kg
                      </div>
                      <p className="text-xs text-muted-foreground">CO₂ saved</p>
                      <p className="text-xs text-muted-foreground">{category.value} actions</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
